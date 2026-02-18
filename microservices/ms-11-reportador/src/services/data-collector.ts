// ============================================================
// MS-11: Data Collector
// Lee datos de MS-12 para generar reportes
// ============================================================

import { pool } from '../config/database';
import { ExecutiveSummary, TestExecutionMetrics, DefectMetrics } from '../types';

export class DataCollector {

  /**
   * Resumen ejecutivo (usa la view v_executive_summary de MS-12)
   */
  async getExecutiveSummary(): Promise<ExecutiveSummary> {
    const result = await pool.query('SELECT * FROM v_executive_summary');
    return result.rows[0];
  }

  /**
   * Metricas de ejecucion de tests (periodo opcional)
   */
  async getTestExecutionMetrics(dateFrom?: string, dateTo?: string): Promise<TestExecutionMetrics> {
    let query = `
      SELECT
        COUNT(*) AS total_executed,
        COUNT(CASE WHEN resultado = 'pass' THEN 1 END) AS passed,
        COUNT(CASE WHEN resultado = 'fail' THEN 1 END) AS failed,
        COUNT(CASE WHEN resultado = 'skip' THEN 1 END) AS skipped,
        COUNT(CASE WHEN resultado = 'blocked' THEN 1 END) AS blocked
      FROM test_execution
      WHERE 1=1
    `;
    const params: string[] = [];

    if (dateFrom) {
      params.push(dateFrom);
      query += ` AND fecha_ejecucion >= $${params.length}`;
    }
    if (dateTo) {
      params.push(dateTo);
      query += ` AND fecha_ejecucion <= $${params.length}`;
    }

    const result = await pool.query(query, params);
    const row = result.rows[0];
    const total = parseInt(row.total_executed) || 0;

    // Metricas por fuente (ms-03, ms-04, ms-06)
    const bySourceResult = await pool.query(`
      SELECT source_ms,
        COUNT(CASE WHEN resultado = 'pass' THEN 1 END) AS passed,
        COUNT(CASE WHEN resultado = 'fail' THEN 1 END) AS failed,
        COUNT(*) AS total
      FROM test_execution
      GROUP BY source_ms
    `);

    const by_source: Record<string, any> = {};
    bySourceResult.rows.forEach((r: any) => {
      by_source[r.source_ms] = { passed: parseInt(r.passed), failed: parseInt(r.failed), total: parseInt(r.total) };
    });

    return {
      total_executed: total,
      passed: parseInt(row.passed) || 0,
      failed: parseInt(row.failed) || 0,
      skipped: parseInt(row.skipped) || 0,
      blocked: parseInt(row.blocked) || 0,
      pass_rate: total > 0 ? Math.round((parseInt(row.passed) / total) * 10000) / 100 : 0,
      by_source,
    };
  }

  /**
   * Metricas de defectos
   */
  async getDefectMetrics(): Promise<DefectMetrics> {
    const total = await pool.query('SELECT COUNT(*) AS total FROM defect');
    const bySeverity = await pool.query('SELECT severidad, COUNT(*) AS count FROM defect GROUP BY severidad');
    const byStatus = await pool.query('SELECT estado, COUNT(*) AS count FROM defect GROUP BY estado');
    const byClass = await pool.query('SELECT clasificacion, COUNT(*) AS count FROM defect GROUP BY clasificacion');
    const bySource = await pool.query('SELECT source_ms, COUNT(*) AS count FROM defect GROUP BY source_ms');

    const mttr = await pool.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (fecha_cierre::timestamp - created_at)) / 3600) AS mttr
      FROM defect WHERE fecha_cierre IS NOT NULL
    `);

    const toMap = (rows: any[]) => {
      const map: Record<string, number> = {};
      rows.forEach((r) => { map[r[Object.keys(r)[0]]] = parseInt(r.count); });
      return map;
    };

    return {
      total: parseInt(total.rows[0].total) || 0,
      by_severity: toMap(bySeverity.rows),
      by_status: toMap(byStatus.rows),
      by_classification: toMap(byClass.rows),
      by_source: toMap(bySource.rows),
      mttr_hours: Math.round((parseFloat(mttr.rows[0]?.mttr) || 0) * 100) / 100,
    };
  }

  /**
   * Datos de trazabilidad completa
   */
  async getTraceability(): Promise<any[]> {
    const result = await pool.query('SELECT * FROM v_traceability');
    return result.rows;
  }

  /**
   * Deuda tecnica (VCR >= 9 sin automatizar)
   */
  async getTechnicalDebt(): Promise<any[]> {
    const result = await pool.query('SELECT * FROM v_technical_debt');
    return result.rows;
  }
}
