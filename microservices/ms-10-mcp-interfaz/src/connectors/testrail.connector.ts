// ============================================================
// MS-10: Conector TestRail
// Crea test cases, runs y reporta resultados
// ============================================================

import axios, { AxiosInstance } from 'axios';
import { TestRailResultPayload } from '../types';

export class TestRailConnector {
  private client: AxiosInstance;
  private projectId: number;

  constructor() {
    this.projectId = parseInt(process.env.TESTRAIL_PROJECT_ID || '1');
    this.client = axios.create({
      baseURL: process.env.TESTRAIL_BASE_URL || 'https://your-domain.testrail.io/index.php?/api/v2',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.TESTRAIL_EMAIL}:${process.env.TESTRAIL_API_KEY}`
        ).toString('base64')}`,
      },
    });
  }

  /**
   * Crea un test case en TestRail
   */
  async createTestCase(sectionId: number, data: {
    title: string;
    type_id?: number;
    priority_id?: number;
    estimate?: string;
    custom_steps?: string;
    custom_expected?: string;
  }): Promise<number> {
    const response = await this.client.post(`/add_case/${sectionId}`, data);
    console.log(`[TestRail] Test Case creado: C${response.data.id}`);
    return response.data.id;
  }

  /**
   * Crea un test run
   */
  async createRun(data: {
    name: string;
    suite_id?: number;
    case_ids?: number[];
    description?: string;
  }): Promise<number> {
    const response = await this.client.post(`/add_run/${this.projectId}`, data);
    console.log(`[TestRail] Run creado: R${response.data.id}`);
    return response.data.id;
  }

  /**
   * Reporta resultado de un test case
   */
  async addResult(runId: number, caseId: number, result: TestRailResultPayload): Promise<void> {
    await this.client.post(`/add_result_for_case/${runId}/${caseId}`, result);
    console.log(`[TestRail] Resultado reportado: Run ${runId}, Case ${caseId}`);
  }

  /**
   * Cierra un test run
   */
  async closeRun(runId: number): Promise<void> {
    await this.client.post(`/close_run/${runId}`);
    console.log(`[TestRail] Run ${runId} cerrado`);
  }
}
