// ═══════════════════════════════════════════════════════════════
// AI-TESTING-FRAMEWORK - RUNNER
// Orquestador principal que une todos los componentes
// ═══════════════════════════════════════════════════════════════

import { Page } from '@playwright/test';
import { ChatbotClient } from './client';
import { Judge } from './judge';
import { MetricsCalculator } from './metrics';
import { getAllAttacks, getQuickTestAttacks, getCriticalAttacks, Attack } from './attacks';
import {
  TestCase,
  EvaluationResult,
  AttackResult,
  PerformanceResult,
  SecurityReport,
  TestRunReport
} from './types';
import { CONFIG } from '../config';
import { metricsStore } from './metrics-store';
import * as fs from 'fs';

export class TestRunner {
  private client: ChatbotClient;
  private judge: Judge;
  private runId: string;
  private startTime: Date;
  private results: {
    functional: EvaluationResult[];
    security: AttackResult[];
    performance: PerformanceResult[];
  };

  constructor(page: Page) {
    this.client = new ChatbotClient(page);
    this.judge = new Judge();
    this.runId = MetricsCalculator.generateRunId();
    this.startTime = new Date();
    this.results = {
      functional: [],
      security: [],
      performance: [],
    };
  }

  /**
   * Inicializa el runner y navega al chatbot
   */
  async initialize(): Promise<void> {
    await this.client.navigate();
  }

  /**
   * Carga casos de prueba desde archivo JSON
   */
  loadTestCases(filePath: string = 'data/prompts.json'): TestCase[] {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }

  /**
   * Ejecuta un test funcional individual
   */
  async runFunctionalTest(testCase: TestCase): Promise<EvaluationResult> {
    // Enviar mensaje al chatbot
    const response = await this.client.sendMessage(testCase.prompt);

    if (!response.success) {
      // Si falla la comunicación, crear resultado de error
      return {
        testCaseId: testCase.id,
        prompt: testCase.prompt,
        response: response.error || 'Communication failed',
        expectedResponse: testCase.expectedResponse,
        metrics: {
          relevance: { name: 'relevance', score: 0, passed: false, reasoning: 'Communication failed' },
          accuracy: { name: 'accuracy', score: 0, passed: false, reasoning: 'Communication failed' },
          coherence: { name: 'coherence', score: 0, passed: false, reasoning: 'Communication failed' },
          completeness: { name: 'completeness', score: 0, passed: false, reasoning: 'Communication failed' },
          hallucination: { name: 'hallucination', score: 10, passed: false, reasoning: 'Communication failed' },
        },
        overallScore: 0,
        passed: false,
        evaluatedAt: new Date(),
      };
    }

    // Evaluar respuesta con LLM-as-Judge
    const evaluation = await this.judge.evaluate(
      testCase.prompt,
      response.response,
      testCase.expectedResponse,
      testCase.id
    );

    // Guardar métricas para Grafana
    metricsStore.recordFunctionalEvaluation(
      testCase.name,
      evaluation,
      response.responseTime,
      'chatbot'
    );

    this.results.functional.push(evaluation);
    return evaluation;
  }

  /**
   * Ejecuta todos los tests funcionales
   */
  async runAllFunctionalTests(testCases?: TestCase[]): Promise<EvaluationResult[]> {
    const cases = testCases || this.loadTestCases();
    
    for (const testCase of cases) {
      if (testCase.category === 'functional') {
        await this.runFunctionalTest(testCase);
        await this.client.clearChat();
      }
    }

    return this.results.functional;
  }

  /**
   * Ejecuta un ataque de seguridad individual
   */
  async runSecurityAttack(attack: Attack): Promise<AttackResult> {
    // Enviar ataque al chatbot
    const response = await this.client.sendMessage(attack.prompt);

    if (!response.success) {
      return {
        attackType: attack.type,
        attackPrompt: attack.prompt,
        response: response.error || 'Communication failed',
        vulnerable: false,
        severity: 'low',
        recommendation: 'Could not evaluate - communication failed',
      };
    }

    // Evaluar si el ataque tuvo éxito
    const result = await this.judge.evaluateSecurityAttack(
      attack.type,
      attack.prompt,
      response.response
    );

    // Guardar métricas para Grafana
    metricsStore.recordSecurityEvaluation(
      attack.name,
      result,
      response.responseTime,
      'chatbot'
    );

    this.results.security.push(result);
    return result;
  }

  /**
   * Ejecuta batería de tests de seguridad
   */
  async runSecurityTests(mode: 'quick' | 'critical' | 'full' = 'critical'): Promise<SecurityReport> {
    let attacks: Attack[];
    
    switch (mode) {
      case 'quick':
        attacks = getQuickTestAttacks(5);
        break;
      case 'critical':
        attacks = getCriticalAttacks();
        break;
      case 'full':
        attacks = getAllAttacks();
        break;
    }

    for (const attack of attacks) {
      await this.runSecurityAttack(attack);
      await this.client.clearChat();
    }

    return MetricsCalculator.generateSecurityReport(this.results.security);
  }

  /**
   * Ejecuta test de performance individual
   */
  async runPerformanceTest(testCase: TestCase): Promise<PerformanceResult> {
    const response = await this.client.sendMessage(testCase.prompt);

    const result: PerformanceResult = {
      testCaseId: testCase.id,
      responseTime: response.responseTime,
      withinThreshold: response.responseTime <= (testCase.maxResponseTime || CONFIG.performance.maxResponseTime),
    };

    // Guardar métricas para Grafana
    metricsStore.recordPerformanceEvaluation(
      testCase.name,
      testCase.prompt,
      response.response || '',
      response.responseTime,
      result.withinThreshold,
      'chatbot'
    );

    this.results.performance.push(result);
    return result;
  }

  /**
   * Ejecuta tests de performance (misma pregunta múltiples veces)
   */
  async runPerformanceTests(testCase: TestCase, iterations: number = 5): Promise<PerformanceResult[]> {
    const results: PerformanceResult[] = [];

    for (let i = 0; i < iterations; i++) {
      const result = await this.runPerformanceTest({
        ...testCase,
        id: `${testCase.id}-iter-${i + 1}`,
      });
      results.push(result);
      await this.client.clearChat();
    }

    return results;
  }

  /**
   * Ejecuta test de consistencia (misma pregunta, verificar respuestas similares)
   */
  async runConsistencyTest(prompt: string, iterations: number = 3): Promise<{
    consistent: boolean;
    score: number;
    responses: string[];
  }> {
    const responses: string[] = [];

    for (let i = 0; i < iterations; i++) {
      const response = await this.client.sendMessage(prompt);
      if (response.success) {
        responses.push(response.response);
      }
      await this.client.clearChat();
    }

    const evaluation = await this.judge.evaluateConsistency(prompt, responses);

    return {
      ...evaluation,
      responses,
    };
  }

  /**
   * Genera reporte final
   */
  generateReport(projectName: string = 'AI Testing'): TestRunReport {
    const endTime = new Date();
    const allResults = [...this.results.functional];
    
    const report: TestRunReport = {
      runId: this.runId,
      startTime: this.startTime,
      endTime,
      duration: endTime.getTime() - this.startTime.getTime(),
      projectName,
      chatbotUrl: CONFIG.chatbot.url,
      summary: {
        total: allResults.length,
        passed: allResults.filter(r => r.passed).length,
        failed: allResults.filter(r => !r.passed).length,
        passRate: allResults.length > 0 
          ? (allResults.filter(r => r.passed).length / allResults.length) * 100 
          : 0,
      },
      functional: this.results.functional,
      security: MetricsCalculator.generateSecurityReport(this.results.security),
      performance: this.results.performance,
    };

    // Guardar métricas
    MetricsCalculator.saveMetrics(report);

    return report;
  }

  /**
   * Getters para acceso a resultados parciales
   */
  getFunctionalResults(): EvaluationResult[] {
    return this.results.functional;
  }

  getSecurityResults(): AttackResult[] {
    return this.results.security;
  }

  getPerformanceResults(): PerformanceResult[] {
    return this.results.performance;
  }
}

export default TestRunner;
