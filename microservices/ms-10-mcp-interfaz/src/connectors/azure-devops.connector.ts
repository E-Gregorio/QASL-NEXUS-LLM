// ============================================================
// MS-10: Conector Azure DevOps
// Crea work items (bugs), test plans
// ============================================================

import axios, { AxiosInstance } from 'axios';
import { BugPayload, ExternalIssue, AzureDevOpsPayload } from '../types';

export class AzureDevOpsConnector {
  private client: AxiosInstance;
  private organization: string;
  private project: string;

  constructor() {
    this.organization = process.env.AZURE_ORG || '';
    this.project = process.env.AZURE_PROJECT || '';
    this.client = axios.create({
      baseURL: `https://dev.azure.com/${this.organization}/${this.project}/_apis`,
      headers: {
        'Content-Type': 'application/json-patch+json',
        'Authorization': `Basic ${Buffer.from(`:${process.env.AZURE_PAT}`).toString('base64')}`,
      },
      params: { 'api-version': '7.1' },
    });
  }

  /**
   * Crea un Bug como Work Item en Azure DevOps
   */
  async createBug(bug: BugPayload): Promise<ExternalIssue> {
    const payload: AzureDevOpsPayload[] = [
      { op: 'add', path: '/fields/System.Title', value: bug.titulo },
      { op: 'add', path: '/fields/System.Description', value: this.formatDescription(bug) },
      { op: 'add', path: '/fields/Microsoft.VSTS.Common.Severity', value: this.mapSeverity(bug.severidad) },
      { op: 'add', path: '/fields/Microsoft.VSTS.Common.Priority', value: this.mapPriorityNumber(bug.prioridad) },
      { op: 'add', path: '/fields/System.Tags', value: `qasl-nexus;${bug.trazabilidad.tc_id};${bug.trazabilidad.us_id}` },
      { op: 'add', path: '/fields/Microsoft.VSTS.TCM.ReproSteps', value: bug.pasos_reproducir },
    ];

    const response = await this.client.post('/wit/workitems/$Bug', payload);

    const issue: ExternalIssue = {
      tool: 'azure_devops',
      key: `${response.data.id}`,
      url: response.data._links.html.href,
      status: 'New',
    };

    console.log(`[Azure DevOps] Bug creado: #${issue.key}`);
    return issue;
  }

  /**
   * Crea link entre work items
   */
  async createLink(sourceId: number, targetId: number): Promise<void> {
    const payload: AzureDevOpsPayload[] = [{
      op: 'add',
      path: '/relations/-',
      value: JSON.stringify({
        rel: 'System.LinkTypes.Related',
        url: `https://dev.azure.com/${this.organization}/${this.project}/_apis/wit/workItems/${targetId}`,
      }),
    }];

    await this.client.patch(`/wit/workitems/${sourceId}`, payload);
    console.log(`[Azure DevOps] Link: #${sourceId} ↔ #${targetId}`);
  }

  private formatDescription(bug: BugPayload): string {
    return `<div>
      <p><b>Modulo:</b> ${bug.modulo_afectado}</p>
      <p><b>Resultado esperado:</b> ${bug.resultado_esperado}</p>
      <p><b>Resultado real:</b> ${bug.resultado_real}</p>
      <h3>Trazabilidad</h3>
      <ul>
        <li>Epic: ${bug.trazabilidad.epic_id}</li>
        <li>User Story: ${bug.trazabilidad.us_id}</li>
        <li>Test Case: ${bug.trazabilidad.tc_id}</li>
      </ul>
      <p><i>Generado por QASL NEXUS LLM</i></p>
    </div>`;
  }

  private mapSeverity(sev: string): string {
    const map: Record<string, string> = {
      'Bloqueante': '1 - Critical', 'Alta': '2 - High',
      'Media': '3 - Medium', 'Baja': '4 - Low',
    };
    return map[sev] || '3 - Medium';
  }

  private mapPriorityNumber(pri: string): string {
    const map: Record<string, string> = { 'P1': '1', 'P2': '2', 'P3': '3', 'P4': '4' };
    return map[pri] || '2';
  }
}
