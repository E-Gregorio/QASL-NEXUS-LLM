// ============================================================
// MS-08: Rutas API del CI/CD Pipeline
// Puerto: 8888
// ============================================================

import { Router, Request, Response } from 'express';
import { PipelineExecutor } from '../services/pipeline-executor';
import { pool } from '../config/database';

const router = Router();
const executor = new PipelineExecutor();

// ============================================================
// POST /api/pipeline/run
// Ejecuta pipeline completo
// Triggers: git push, manual, schedule
// ============================================================
router.post('/run', async (req: Request, res: Response) => {
  try {
    const { type = 'full', triggerType = 'manual', triggeredBy = 'api' } = req.body;

    // Ejecutar asincrono (no bloquea la respuesta)
    const resultPromise = executor.execute(type, triggerType, triggeredBy);

    // Responder inmediatamente con el pipeline ID
    const pipelineId = `PL-${Date.now().toString(36).toUpperCase()}`;
    res.json({
      success: true,
      pipelineId,
      message: `Pipeline ${type} iniciado`,
      status: 'Running',
    });

    // Pipeline sigue ejecutandose en background
    resultPromise.catch((err) => {
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
// GET /api/pipeline/health
// ============================================================
router.get('/health', async (_req: Request, res: Response) => {
  // Check health de todos los MS
  const checks: Record<string, string> = {};
  const { MS_URLS } = await import('../config/microservices');
  const axios = (await import('axios')).default;

  for (const [name, url] of Object.entries(MS_URLS)) {
    try {
      await axios.get(url, { timeout: 3000 });
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
