// ============================================================
// MS-00: Dashboard Routes
// Queries directas a MS-12 views para el frontend
// ============================================================

import { Router, Request, Response } from 'express';
import { pool } from '../config/database';

const router = Router();

// ============================================================
// GET /api/dashboard/overview
// Agrega: v_executive_summary + pipelines recientes + defectos
// ============================================================
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const [summary, pipelines, defects, coverage] = await Promise.all([
      pool.query('SELECT * FROM v_executive_summary'),
      pool.query('SELECT * FROM v_pipeline_metrics ORDER BY fecha_inicio DESC LIMIT 10'),
      pool.query(`
        SELECT source_ms, type, severidad, estado,
          COUNT(*) AS total
        FROM defect
        GROUP BY source_ms, type, severidad, estado
        ORDER BY total DESC
      `),
      pool.query('SELECT * FROM v_test_coverage'),
    ]);

    res.json({
      summary: summary.rows[0] || {},
      recentPipelines: pipelines.rows,
      defects: defects.rows,
      coverage: coverage.rows,
    });
  } catch (error: any) {
    console.error('[MS-00] Dashboard overview error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /api/dashboard/traceability
// Cadena completa Epic → US → Suite → TC
// ============================================================
router.get('/traceability', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM v_traceability');
    res.json(result.rows);
  } catch (error: any) {
    console.error('[MS-00] Traceability error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /api/dashboard/gaps
// Gaps pendientes de analisis estatico
// ============================================================
router.get('/gaps', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM v_pending_gaps');
    res.json(result.rows);
  } catch (error: any) {
    console.error('[MS-00] Gaps error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /api/dashboard/debt
// Deuda tecnica: VCR >= 9 sin automatizar
// ============================================================
router.get('/debt', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM v_technical_debt');
    res.json(result.rows);
  } catch (error: any) {
    console.error('[MS-00] Tech debt error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /api/dashboard/pass-rate
// Pass rate por suite
// ============================================================
router.get('/pass-rate', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM v_pass_rate');
    res.json(result.rows);
  } catch (error: any) {
    console.error('[MS-00] Pass rate error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
