// ============================================================
// MS-08: Pipeline Executor
// Director de orquesta: ejecuta las 3 fases en orden
// Soporta flujo exploratorio (targetUrl) y flujo estatico
// ============================================================

import axios from 'axios';
import { pool } from '../config/database';
import { MS_URLS } from '../config/microservices';

export type PipelineType = 'full' | 'regression' | 'smoke' | 'security' | 'mobile' | 'e2e';
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

  // Ejecuta pipeline completo de 3 fases
  async execute(
    type: PipelineType,
    triggerType: TriggerType,
    triggeredBy: string,
    pipelineId?: string,
    targetUrl?: string,
    objective?: string,
  ): Promise<PipelineResult> {
    const id = pipelineId || `PL-${Date.now().toString(36).toUpperCase()}`;
    const startTime = Date.now();
    const fases: Record<string, string> = {};
    let totalPassed = 0;
    let totalFailed = 0;
    let totalExecuted = 0;
    let bugsCreados = 0;

    console.log(`[Pipeline] ${id} iniciado (${type}) por ${triggeredBy}`);
    if (targetUrl) console.log(`[Pipeline] Target URL: ${targetUrl}`);

    // Registrar inicio en MS-12 (ON CONFLICT porque la ruta /run ya inserta la fila)
    await pool.query(
      `INSERT INTO pipeline_run (pipeline_id, tipo, trigger_type, trigger_by, estado, target_url, objective)
       VALUES ($1, $2, $3, $4, 'Running', $5, $6)
       ON CONFLICT (pipeline_id) DO NOTHING`,
      [id, type, triggerType, triggeredBy, targetUrl || null, objective || null]
    );

    try {
      // ================================================================
      // FASE 1: Analisis + Generacion de tests
      // ================================================================
      console.log(`[Pipeline] FASE 1: Analisis`);

      // Si hay targetUrl → flujo exploratorio: MS-09 Opus genera tests E2E
      if (targetUrl) {
        console.log(`[Pipeline] MS-09 generando tests para ${targetUrl}...`);
        fases['ms09_generate'] = 'running';
        await this.updateFases(id, fases);

        fases['ms09_generate'] = await this.callService(
          MS_URLS.MS09_LLM, '/api/llm/exploratory/generate', 'POST',
          { targetUrl, objective, pipelineId: id }
        );
        await this.updateFases(id, fases);
      }

      // Flujo estatico (sin targetUrl)
      if (['full', 'regression'].includes(type) && !targetUrl) {
        // MS-02: Analisis estatico de HU
        fases['ms02'] = await this.callService(MS_URLS.MS02_STATIC, '/api/analyze', 'POST', {});
        await this.updateFases(id, fases);

        // MS-09: Calculo VCR con Opus
        fases['ms09_vcr'] = await this.callService(MS_URLS.MS09_LLM, '/api/llm/process', 'POST', {
          task_type: 'vcr_calculation',
          content: `Pipeline ${id} - VCR calculation for ${type} run`,
        });
        await this.updateFases(id, fases);
      }

      // ================================================================
      // FASE 2: Ejecucion (en paralelo)
      // ================================================================
      console.log(`[Pipeline] FASE 2: Ejecucion en paralelo`);

      const executionPromises: Promise<void>[] = [];

      // MS-03: E2E + API + K6 + ZAP (pasa targetUrl y pipelineId)
      // Usa axios directo para capturar totalPassed/totalFailed del response
      if (['full', 'regression', 'smoke', 'e2e'].includes(type)) {
        fases['ms03'] = 'running';
        await this.updateFases(id, fases);
        executionPromises.push(
          axios.post(`${MS_URLS.MS03_FRAMEWORK}/api/execute`, {
            type, pipelineId: id, targetUrl: targetUrl || null,
          }, { timeout: 300000 })
            .then((response) => {
              fases['ms03'] = response.data?.status || 'ok';
              if (response.data?.totalPassed !== undefined) totalPassed = response.data.totalPassed;
              if (response.data?.totalFailed !== undefined) totalFailed = response.data.totalFailed;
              totalExecuted = totalPassed + totalFailed;
              console.log(`[Pipeline] MS-03 reporta: ${totalPassed} passed, ${totalFailed} failed`);
            })
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
      await this.updateFases(id, fases);

      // Fallback: si MS-03 no devolvio contadores, leer de MS-12
      if (totalExecuted === 0) {
        const metricsResult = await pool.query(`
          SELECT
            COUNT(*) AS total,
            COUNT(CASE WHEN resultado = 'pass' THEN 1 END) AS passed,
            COUNT(CASE WHEN resultado = 'fail' THEN 1 END) AS failed
          FROM test_execution WHERE pipeline_id = $1
        `, [id]);

        if (metricsResult.rows[0] && parseInt(metricsResult.rows[0].total) > 0) {
          totalExecuted = parseInt(metricsResult.rows[0].total) || 0;
          totalPassed = parseInt(metricsResult.rows[0].passed) || 0;
          totalFailed = parseInt(metricsResult.rows[0].failed) || 0;
        }
      }

      // ================================================================
      // FASE 3: Reportes y notificaciones
      // ================================================================
      console.log(`[Pipeline] FASE 3: Reportes`);

      const passRate = totalExecuted > 0 ? Math.round((totalPassed / totalExecuted) * 100) : 0;

      // MS-11: Generar reporte
      fases['ms11'] = 'running';
      await this.updateFases(id, fases);
      fases['ms11'] = await this.callService(MS_URLS.MS11_REPORT, '/api/report/pipeline', 'POST', {
        pipelineId: id, status: totalFailed > 0 ? 'Failed' : 'Success',
        passRate, totalTests: totalExecuted, failed: totalFailed, bugs: bugsCreados,
      });
      await this.updateFases(id, fases);

      // MS-10: Crear bugs en Jira/Azure para failures
      if (totalFailed > 0) {
        fases['ms10'] = await this.callService(MS_URLS.MS10_MCP, '/api/defects/create', 'POST', {
          pipelineId: id, totalFailed, source: 'pipeline-auto',
        });
        bugsCreados = totalFailed;
        await this.updateFases(id, fases);
      }

      const duracion = Math.round((Date.now() - startTime) / 1000);
      const status = totalFailed > 0 ? 'Failed' : 'Success';

      // Actualizar pipeline en MS-12 (fases con merge para preservar sub-steps de MS-03)
      await pool.query(
        `UPDATE pipeline_run SET
          estado = $1, fecha_fin = NOW(), duracion_seg = $2,
          total_tc_ejecutados = $3, total_passed = $4, total_failed = $5,
          pass_rate = $6, bugs_creados = $7,
          fases_ejecutadas = COALESCE(fases_ejecutadas, '{}'::jsonb) || $8::jsonb
        WHERE pipeline_id = $9`,
        [status, duracion, totalExecuted, totalPassed, totalFailed,
         passRate, bugsCreados, JSON.stringify(fases), id]
      );

      const result: PipelineResult = {
        pipelineId: id, status: status as 'Success' | 'Failed',
        duracionSeg: duracion, totalExecuted, totalPassed, totalFailed,
        passRate, bugsCreados, fases,
      };

      console.log(`[Pipeline] ${id} COMPLETADO: ${status} (${duracion}s, ${passRate}% pass rate)`);
      return result;

    } catch (error: any) {
      await pool.query(
        `UPDATE pipeline_run SET estado = 'Failed', fecha_fin = NOW(), notas = $1 WHERE pipeline_id = $2`,
        [error.message, id]
      );
      throw error;
    }
  }

  // Actualiza fases_ejecutadas en MS-12 usando JSONB merge (||)
  // Permite que MS-03 tambien escriba sub-steps sin sobreescribir
  private async updateFases(pipelineId: string, fases: Record<string, string>): Promise<void> {
    await pool.query(
      `UPDATE pipeline_run SET fases_ejecutadas = COALESCE(fases_ejecutadas, '{}'::jsonb) || $1::jsonb WHERE pipeline_id = $2`,
      [JSON.stringify(fases), pipelineId]
    );
  }

  // Llama a un microservicio con timeout de 5 min
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
