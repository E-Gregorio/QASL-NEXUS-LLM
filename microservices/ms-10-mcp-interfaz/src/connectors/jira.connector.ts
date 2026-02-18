// ============================================================
// MS-10: Conector Jira
// Crea issues, bugs, links bidireccionales
// ============================================================

import axios, { AxiosInstance } from 'axios';
import { BugPayload, JiraIssuePayload, ExternalIssue } from '../types';

export class JiraConnector {
  private client: AxiosInstance;
  private projectKey: string;

  constructor() {
    this.projectKey = process.env.JIRA_PROJECT_KEY || 'QASL';
    this.client = axios.create({
      baseURL: process.env.JIRA_BASE_URL || 'https://your-domain.atlassian.net',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`
        ).toString('base64')}`,
      },
    });
  }

  /**
   * Crea un bug en Jira basado en el payload generado por MS-09
   */
  async createBug(bug: BugPayload): Promise<ExternalIssue> {
    const jiraPayload: JiraIssuePayload = {
      fields: {
        project: { key: this.projectKey },
        summary: bug.titulo,
        description: this.formatDescription(bug),
        issuetype: { name: 'Bug' },
        priority: { name: this.mapPriority(bug.prioridad) },
        labels: [
          'qasl-nexus',
          `severity-${bug.severidad.toLowerCase()}`,
          `ms-${bug.trazabilidad.tc_id}`,
        ],
      },
    };

    const response = await this.client.post('/rest/api/3/issue', jiraPayload);

    const issue: ExternalIssue = {
      tool: 'jira',
      key: response.data.key,
      url: `${process.env.JIRA_BASE_URL}/browse/${response.data.key}`,
      status: 'Nuevo',
    };

    console.log(`[Jira] Bug creado: ${issue.key} - ${bug.titulo}`);
    return issue;
  }

  /**
   * Crea link bidireccional entre bug y user story en Jira
   */
  async createLink(bugKey: string, storyKey: string): Promise<void> {
    await this.client.post('/rest/api/3/issueLink', {
      type: { name: 'Relates' },
      inwardIssue: { key: bugKey },
      outwardIssue: { key: storyKey },
    });

    console.log(`[Jira] Link creado: ${bugKey} ↔ ${storyKey}`);
  }

  /**
   * Obtiene el estado de un issue
   */
  async getIssue(key: string): Promise<ExternalIssue> {
    const response = await this.client.get(`/rest/api/3/issue/${key}`);
    return {
      tool: 'jira',
      key,
      url: `${process.env.JIRA_BASE_URL}/browse/${key}`,
      status: response.data.fields.status.name,
    };
  }

  /**
   * Formatea la descripcion del bug en formato Jira (ADF)
   */
  private formatDescription(bug: BugPayload): string {
    return [
      `*Modulo:* ${bug.modulo_afectado}`,
      `*Severidad:* ${bug.severidad}`,
      `*Clasificacion:* ${bug.clasificacion}`,
      '',
      '*Pasos para reproducir:*',
      bug.pasos_reproducir,
      '',
      `*Resultado esperado:* ${bug.resultado_esperado}`,
      `*Resultado real:* ${bug.resultado_real}`,
      '',
      '*Trazabilidad:*',
      `- Epic: ${bug.trazabilidad.epic_id} - ${bug.trazabilidad.epic_nombre}`,
      `- User Story: ${bug.trazabilidad.us_id} - ${bug.trazabilidad.nombre_hu}`,
      `- Test Suite: ${bug.trazabilidad.ts_id} - ${bug.trazabilidad.nombre_suite}`,
      `- Test Case: ${bug.trazabilidad.tc_id} - ${bug.trazabilidad.titulo_tc}`,
      '',
      bug.accion_correctiva ? `*Accion correctiva sugerida:* ${bug.accion_correctiva}` : '',
      '',
      '_Generado automaticamente por QASL NEXUS LLM_',
    ].join('\n');
  }

  /**
   * Mapea prioridad interna a prioridad Jira
   */
  private mapPriority(prioridad: string): string {
    const map: Record<string, string> = {
      'P1': 'Highest',
      'P2': 'High',
      'P3': 'Medium',
      'P4': 'Low',
    };
    return map[prioridad] || 'Medium';
  }
}
