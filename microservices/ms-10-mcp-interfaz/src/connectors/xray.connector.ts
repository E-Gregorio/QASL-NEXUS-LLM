// ============================================================
// MS-10: Conector X-Ray (Jira Plugin para Test Management)
// Importa test cases, reporta ejecuciones
// ============================================================

import axios, { AxiosInstance } from 'axios';
import { XRayExecutionPayload } from '../types';

export class XRayConnector {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.XRAY_BASE_URL || 'https://xray.cloud.getxray.app/api/v2',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.XRAY_API_TOKEN}`,
      },
    });
  }

  /**
   * Autenticacion con X-Ray Cloud
   */
  async authenticate(): Promise<string> {
    const response = await this.client.post('/authenticate', {
      client_id: process.env.XRAY_CLIENT_ID,
      client_secret: process.env.XRAY_CLIENT_SECRET,
    });

    const token = response.data;
    this.client.defaults.headers['Authorization'] = `Bearer ${token}`;
    console.log('[X-Ray] Autenticado correctamente');
    return token;
  }

  /**
   * Importa resultados de ejecucion de tests
   */
  async importExecution(payload: XRayExecutionPayload): Promise<string> {
    const response = await this.client.post('/import/execution', payload);
    const execKey = response.data.key;
    console.log(`[X-Ray] Ejecucion importada: ${execKey}`);
    return execKey;
  }

  /**
   * Importa test cases desde CSV (formato QASL)
   */
  async importTestCases(csvContent: string, projectKey: string): Promise<string[]> {
    const response = await this.client.post('/import/test/csv', csvContent, {
      headers: { 'Content-Type': 'text/csv' },
      params: { projectKey },
    });

    const testKeys = response.data.map((t: any) => t.key);
    console.log(`[X-Ray] ${testKeys.length} test cases importados`);
    return testKeys;
  }

  /**
   * Crea un Test Plan
   */
  async createTestPlan(summary: string, testKeys: string[]): Promise<string> {
    const response = await this.client.post('/testplan', {
      fields: { summary },
      tests: testKeys.map((key) => ({ testKey: key })),
    });

    console.log(`[X-Ray] Test Plan creado: ${response.data.key}`);
    return response.data.key;
  }
}
