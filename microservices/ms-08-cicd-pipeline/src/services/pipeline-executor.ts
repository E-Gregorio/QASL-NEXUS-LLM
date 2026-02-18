// ============================================================
// MS-08: Pipeline Executor
// Director de orquesta: ejecuta las 3 fases en orden
// ============================================================

import axios from 'axios';
import { pool } from '../config/database';
import { MS_URLS } from '../config/microservices';

export type PipelineType = 'full' | 'regression' | 'smoke' | 'security' | 'mobile';
export type TriggerType = 'git_push' | 'manual' | 'schedule';

interface PipelineResult {
  pipelineId: string;
  status: 'Success' | 'Failed';
  duracionSeg: number;
  totalExecuted: number;
  totalPassed: number;
  totalFailed: number;
  passRate: number;
  bugsCreados: number;
  fases: Record<string, string>;
}

export class PipelineExecutor {

  /**
   * Ejecuta pipeline completo de 3 fases
   */
  async execute(type: PipelineType, triggerType: TriggerType, triggeredBy: string): Promise<PipelineResult> {
    const pipelineId = `PL-${Date.now().toString(36).toUpperCase()}`;
    const startTime = Date.now();
    const fases: Record<string, string> = {};
    let totalPassed = 0;
    let totalFailed = 0;
    let totalExecuted = 0;
    let bugsCreados = 0;

    console.log(`[Pipeline] ${pipelineId} iniciado (${type}) por ${triggeredBy}`);

    // Registrar inicio en MS-12
    await pool.query(
      `INSERT INTO pipeline_run (pipeline_id, tipo, trigger_type, trigger_by, estado)
       VALUES ($1, $2, $3, $4, 'Running')`,
      [pipelineId, type, triggerType, triggeredBy]
    );

    try {
      // ================================================================
      // FASE 1: Analisis (5 min)
      // ================================================================
      console.log(`[Pipeline] FASE 1: Analisis`);

      // MS-02: Analisis estatico
      if (['full', 'regression'].includes(type)) {
        fases['ms02'] = await this.callService(MS_URLS.MS02_STATIC, '/api/analyze', 'POST', {});
      }

      // MS-09: Calculo VCR
      if (['full', 'regression'].includes(type)) {
        fases['ms09_vcr'] = await this.callService(MS_URLS.MS09_LLM, '/api/llm/health', 'GET');
      }

      // ================================================================
      // FASE 2: Ejecucion (20 min, en paralelo)
      // ================================================================
      console.log(`[Pipeline] FASE 2: Ejecucion en paralelo`);

      const executionPromises: Promise<any>[] = [];

      // MS-03: E2E + API + K6 + ZAP
      if (['full', 'regression', 'smoke'].includes(type)) {
        executionPromises.push(
          this.callService(MS_URLS.MS03_FRAMEWORK, '/api/execute', 'POST', { type })
            .then((r) => { fases['ms03'] = r; })
            .catch(() => { fases['ms03'] = 'error'; })
        );
      }

      // MS-04: Mobile
      if (['full', 'mobile'].includes(type)) {
        executionPromises.push(
          this.callService(MS_URLS.MS04_MOBILE, '/api/execute', 'POST', { type })
            .then((r) => { fases['ms04'] = r; })
            .catch(() => { fases['ms04'] = 'skip'; })
        );
      }

      // MS-06: Garak LLM Security
      if (['full', 'security'].includes(type)) {
        executionPromises.push(
          this.callService(MS_URLS.MS06_GARAK, '/api/scan', 'POST', {})
            .then((r) => { fases['ms06'] = r; })
            .catch(() => { fases['ms06'] = 'skip'; })
        );
      }

      await Promise.allSettled(executionPromises);

      // Obtener metricas de MS-12 post-ejecucion
      const metricsResult = await pool.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(CASE WHEN resultado = 'pass' THEN 1 END) AS passed,
          COUNT(CASE WHEN resultado = 'fail' THEN 1 END) AS failed
        FROM test_execution WHERE pipeline_id = $1
      `, [pipelineId]);

      if (metricsResult.rows[0]) {
        totalExecuted = parseInt(metricsResult.rows[0].total) || 0;
        totalPassed = parseInt(metricsResult.rows[0].passed) || 0;
        totalFailed = parseInt(metricsResult.rows[0].failed) || 0;
      }

      // ================================================================
      // FASE 3: Reportes y notificaciones (5 min)
      // ================================================================
      console.log(`[Pipeline] FASE 3: Reportes`);

      // MS-11: Notificar resultado
      const passRate = totalExecuted > 0 ? Math.round((totalPassed / totalExecuted) * 100) : 0;
      fases['ms11'] = await this.callService(MS_URLS.MS11_REPORT, '/api/report/pipeline', 'POST', {
        pipelineId, status: totalFailed > 0 ? 'Failed' : 'Success',
        passRate, totalTests: totalExecuted, failed: totalFailed, bugs: bugsCreados,
      });

      // MS-10: Crear bugs en Jira para failures
      if (totalFailed > 0) {
        fases['ms10'] = 'bugs_pending';
      }

      const duracion = Math.round((Date.now() - startTime) / 1000);
      const status = totalFailed > 0 ? 'Failed' : 'Success';

      // Actualizar pipeline en MS-12
      await pool.query(
        `UPDATE pipeline_run SET
          estado = $1, fecha_fin = NOW(), duracion_seg = $2,
          total_tc_ejecutados = $3, total_passed = $4, total_failed = $5,
          pass_rate = $6, bugs_creados = $7, fases_ejecutadas = $8
        WHERE pipeline_id = $9`,
        [status, duracion, totalExecuted, totalPassed, totalFailed,
         passRate, bugsCreados, JSON.stringify(fases), pipelineId]
      );

      const result: PipelineResult = {
        pipelineId, status: status as 'Success' | 'Failed',
        duracionSeg: duracion, totalExecuted, totalPassed, totalFailed,
        passRate, bugsCreados, fases,
      };

      console.log(`[Pipeline] ${pipelineId} COMPLETADO: ${status} (${duracion}s, ${passRate}% pass rate)`);
      return result;

    } catch (error: any) {
      await pool.query(
        `UPDATE pipeline_run SET estado = 'Failed', fecha_fin = NOW(), notas = $1 WHERE pipeline_id = $2`,
        [error.message, pipelineId]
      );
      throw error;
    }
  }

  /**
   * Llama a un microservicio con timeout
   */
  private async callService(baseUrl: string, path: string, method: string, data?: any): Promise<string> {
    try {
      const response = method === 'GET'
        ? await axios.get(`${baseUrl}${path}`, { timeout: 300000 })
        : await axios.post(`${baseUrl}${path}`, data, { timeout: 300000 });
      return response.data?.status || 'ok';
    } catch {
      return 'unreachable';
    }
  }
}
