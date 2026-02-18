// ============================================================
// MS-10: Flujo Automatico de Creacion de Bugs
// 7 pasos: template → trazabilidad → IA → mapeo → crear → link → guardar
// ============================================================

import axios from 'axios';
import { pool } from '../config/database';
import { TestFailureEvent, BugPayload, TraceabilityData, ExternalIssue } from '../types';
import { JiraConnector } from '../connectors/jira.connector';
import { AzureDevOpsConnector } from '../connectors/azure-devops.connector';

const MS01_URL = process.env.MS01_URL || 'http://localhost:3000';
const MS09_URL = process.env.MS09_URL || 'http://localhost:8000';

export class BugCreationFlow {
  private jira: JiraConnector;
  private azure: AzureDevOpsConnector;

  constructor() {
    this.jira = new JiraConnector();
    this.azure = new AzureDevOpsConnector();
  }

  /**
   * Flujo completo de 7 pasos para crear un bug desde un test failure
   */
  async execute(event: TestFailureEvent): Promise<ExternalIssue> {
    console.log(`[BugFlow] Iniciando para ${event.tc_id} (${event.source_ms})`);

    // PASO 1: Obtener template de MS-01
    const template = await this.fetchTemplate();
    console.log('[BugFlow] Paso 1/7: Template obtenido de MS-01');

    // PASO 2: Obtener trazabilidad de MS-12
    const traceability = await this.getTraceability(event.tc_id);
    console.log(`[BugFlow] Paso 2/7: Trazabilidad: ${traceability.epic_id} → ${traceability.us_id} → ${traceability.tc_id}`);

    // PASO 3: Generar descripcion con IA (MS-09)
    const aiContent = await this.fillWithAI(event);
    console.log('[BugFlow] Paso 3/7: Descripcion generada por IA (MS-09)');

    // PASO 4: Construir payload del bug
    const bugPayload = this.buildBugPayload(event, traceability, aiContent);
    console.log('[BugFlow] Paso 4/7: Payload construido');

    // PASO 5: Crear issue en herramienta externa
    const activeTool = process.env.ACTIVE_TOOL || 'jira';
    const issue = await this.createExternalIssue(activeTool, bugPayload);
    console.log(`[BugFlow] Paso 5/7: Issue creado en ${activeTool}: ${issue.key}`);

    // PASO 6: Crear links bidireccionales
    if (activeTool === 'jira' && process.env.JIRA_STORY_KEY_PREFIX) {
      // Link bug con story en Jira si existe
      console.log('[BugFlow] Paso 6/7: Links bidireccionales (pendiente config)');
    } else {
      console.log('[BugFlow] Paso 6/7: Links bidireccionales (skip - sin config)');
    }

    // PASO 7: Guardar referencia en MS-12
    await this.saveToDatabase(event, issue, bugPayload);
    console.log(`[BugFlow] Paso 7/7: Guardado en MS-12 → defect.jira_key = '${issue.key}'`);

    console.log(`[BugFlow] COMPLETADO: ${issue.key} - ${bugPayload.titulo}`);
    return issue;
  }

  /**
   * PASO 1: Fetch template de MS-01
   */
  private async fetchTemplate(): Promise<string> {
    try {
      const response = await axios.get(`${MS01_URL}/templates/bug-report.html`);
      return response.data;
    } catch {
      // Si MS-01 no esta disponible, usar template por defecto
      return 'default-bug-template';
    }
  }

  /**
   * PASO 2: Obtener trazabilidad de MS-12
   */
  private async getTraceability(tc_id: string): Promise<TraceabilityData> {
    const result = await pool.query(
      `SELECT
        e.epic_id, e.nombre AS epic_nombre,
        us.id_hu AS us_id, us.nombre_hu,
        ts.ts_id, ts.nombre_suite,
        tc.tc_id, tc.titulo_tc
      FROM test_case tc
      JOIN test_suite ts ON ts.ts_id = tc.ts_id
      JOIN user_story us ON us.id_hu = tc.us_id
      JOIN epic e ON e.epic_id = us.epic_id
      WHERE tc.tc_id = $1`,
      [tc_id]
    );

    if (result.rows.length === 0) {
      return {
        epic_id: 'N/D', epic_nombre: 'N/D',
        us_id: 'N/D', nombre_hu: 'N/D',
        ts_id: 'N/D', nombre_suite: 'N/D',
        tc_id, titulo_tc: 'N/D',
      };
    }

    return result.rows[0];
  }

  /**
   * PASO 3: Llenar template con IA (MS-09)
   */
  private async fillWithAI(event: TestFailureEvent): Promise<any> {
    try {
      const response = await axios.post(`${MS09_URL}/api/llm/template/fill-bug`, {
        tc_id: event.tc_id,
        titulo_tc: event.titulo_tc,
        resultado_esperado: event.resultado_esperado,
        resultado_real: event.resultado_real,
        pasos: event.pasos,
        us_id: event.us_id,
        modulo: event.modulo,
        ambiente: event.ambiente,
      });

      // Intentar parsear JSON de la respuesta de IA
      const jsonMatch = response.data.content.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      console.warn('[BugFlow] MS-09 no disponible, usando datos directos');
      return {};
    }
  }

  /**
   * PASO 4: Construir payload del bug
   */
  private buildBugPayload(
    event: TestFailureEvent,
    traceability: TraceabilityData,
    aiContent: any
  ): BugPayload {
    return {
      titulo: aiContent.titulo || `[${event.tc_id}] Fallo: ${event.titulo_tc}`,
      resumen: aiContent.resumen || `Test ${event.tc_id} fallo en ${event.ambiente}`,
      modulo_afectado: event.modulo,
      pasos_reproducir: aiContent.pasos_reproducir || event.pasos.join('\n'),
      resultado_esperado: event.resultado_esperado,
      resultado_real: event.resultado_real,
      severidad: aiContent.severidad || 'Media',
      prioridad: aiContent.prioridad || 'P3',
      clasificacion: aiContent.clasificacion || 'Funcional',
      trazabilidad: traceability,
      evidencia: event.evidencia,
      accion_correctiva: aiContent.accion_correctiva,
    };
  }

  /**
   * PASO 5: Crear issue en herramienta externa
   */
  private async createExternalIssue(tool: string, bug: BugPayload): Promise<ExternalIssue> {
    switch (tool) {
      case 'jira':
        return this.jira.createBug(bug);
      case 'azure_devops':
        return this.azure.createBug(bug);
      default:
        throw new Error(`Herramienta no soportada: ${tool}`);
    }
  }

  /**
   * PASO 7: Guardar en MS-12
   */
  private async saveToDatabase(
    event: TestFailureEvent,
    issue: ExternalIssue,
    bug: BugPayload
  ): Promise<void> {
    const bugId = `BUG-${Date.now().toString(36).toUpperCase()}`;

    await pool.query(
      `INSERT INTO defect (
        bug_id, titulo, resumen, modulo_afectado, pasos_reproducir,
        resultado_esperado, resultado_real, severidad, prioridad,
        clasificacion, hu_epic_id, tc_id, estado, source_ms,
        type, jira_key, accion_correctiva
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        bugId, bug.titulo, bug.resumen, bug.modulo_afectado, bug.pasos_reproducir,
        bug.resultado_esperado, bug.resultado_real, bug.severidad, bug.prioridad,
        bug.clasificacion, event.us_id, event.tc_id, 'Nuevo', event.source_ms,
        this.getType(event.source_ms), issue.key, bug.accion_correctiva,
      ]
    );
  }

  private getType(sourceMs: string): string {
    const map: Record<string, string> = {
      'ms-03': 'web', 'ms-04': 'mobile', 'ms-06': 'llm_security',
    };
    return map[sourceMs] || 'web';
  }
}
