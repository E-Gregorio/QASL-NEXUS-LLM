// ============================================================
// MS-08: Rutas API del CI/CD Pipeline
// Puerto: 8888
// ============================================================

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { PipelineExecutor } from '../services/pipeline-executor';
import { pool } from '../config/database';

const MS03_URL = process.env.MS03_URL || 'http://localhost:6001';

const router = Router();
const executor = new PipelineExecutor();

// ============================================================
// POST /api/pipeline/run
// Ejecuta pipeline completo
// Triggers: git push, manual, schedule
// ============================================================
router.post('/run', async (req: Request, res: Response) => {
  try {
    const { type = 'full', triggerType = 'manual', triggeredBy = 'api', targetUrl, objective, importedCode } = req.body;

    // Generar ID antes de ejecutar para devolverlo al frontend
    const pipelineId = `PL-${Date.now().toString(36).toUpperCase()}`;

    // Insertar fila ANTES de responder para que el polling la encuentre
    await pool.query(
      `INSERT INTO pipeline_run (pipeline_id, tipo, trigger_type, trigger_by, estado, target_url, objective)
       VALUES ($1, $2, $3, $4, 'Running', $5, $6)`,
      [pipelineId, type, triggerType, triggeredBy, targetUrl || null, objective || null]
    );

    // Responder inmediatamente con el ID
    res.json({
      success: true,
      pipelineId,
      message: `Pipeline ${type} iniciado`,
      status: 'Running',
    });

    // Pipeline sigue ejecutandose en background (INSERT ya hecho, executor lo detecta)
    executor.execute(type, triggerType, triggeredBy, pipelineId, targetUrl, objective, importedCode)
      .then((result) => {
        console.log(`[MS-08] Pipeline ${result.pipelineId} finalizado: ${result.status}`);
      })
      .catch((err) => {
        console.error(`[MS-08] Pipeline error:`, err.message);
      });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /api/pipeline/status/:id
// Obtiene estado de un pipeline
// ============================================================
router.get('/status/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM pipeline_run WHERE pipeline_id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pipeline no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /api/pipeline/history
// Historial de pipelines
// ============================================================
router.get('/history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await pool.query(
      'SELECT * FROM v_pipeline_metrics LIMIT $1',
      [limit]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// DELETE /api/pipeline/clean-results
// Limpia resultados de corridas anteriores
// ============================================================
router.delete('/clean-results', async (_req: Request, res: Response) => {
  try {
    // 1. Limpiar DB (MS-12)
    const execDel = await pool.query('DELETE FROM test_execution');
    const genDel = await pool.query('DELETE FROM generated_test_case');
    const pipeDel = await pool.query('DELETE FROM pipeline_run');

    const deleted = {
      test_execution: execDel.rowCount || 0,
      generated_test_case: genDel.rowCount || 0,
      pipeline_run: pipeDel.rowCount || 0,
    };

    // 2. Limpiar reportes en disco (MS-03)
    let reportsCleaned = false;
    try {
      await axios.delete(`${MS03_URL}/api/clean-reports`, { timeout: 10000 });
      reportsCleaned = true;
    } catch {
      console.log('[MS-08] MS-03 clean-reports: no disponible (reportes en disco no limpiados)');
    }

    console.log(`[MS-08] Clean results: ${JSON.stringify(deleted)} | reports: ${reportsCleaned}`);
    res.json({ success: true, deleted, reportsCleaned });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /api/pipeline/health
// Health check de todos los microservicios
// ============================================================
router.get('/health', async (_req: Request, res: Response) => {
  const checks: Record<string, string> = {};
  const { MS_URLS } = await import('../config/microservices');
  const axios = (await import('axios')).default;

  // Health paths por microservicio
  const healthPaths: Record<string, string> = {
    MS03_FRAMEWORK: '/health',
    MS09_LLM: '/api/llm/health',
    MS10_MCP: '/api/mcp/health',
    MS11_REPORT: '/api/report/health',
  };

  for (const [name, url] of Object.entries(MS_URLS)) {
    try {
      const path = healthPaths[name] || '/health';
      await axios.get(`${url}${path}`, { timeout: 3000 });
      checks[name] = 'ok';
    } catch {
      checks[name] = 'unreachable';
    }
  }

  res.json({
    service: 'ms-08-cicd-pipeline',
    status: 'ok',
    microservices: checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
