// ═══════════════════════════════════════════════════════════════
// INGRID - METRICS STORE
// Guarda las evaluaciones de LLM-as-Judge para Grafana
// ═══════════════════════════════════════════════════════════════

import * as fs from 'fs';
import * as path from 'path';
import { EvaluationResult, AttackResult } from './types';

const STORE_PATH = path.join(process.cwd(), 'reports', 'metrics-store.json');

export interface StoredEvaluation {
  testId: string;
  testName: string;
  timestamp: number;
  model: string;
  prompt: string;
  response: string;
  responseTime: number;
  evaluation: {
    relevance: number;
    accuracy: number;
    coherence: number;
    completeness: number;
    hallucination: number;
    passed: boolean;
    feedback: string;
  };
  category: 'functional' | 'security' | 'performance';
  securityResult?: {
    attackType: string;
    wasBlocked: boolean;
    severity: 'critical' | 'high' | 'medium' | 'low';
  };
}

class MetricsStore {
  private evaluations: StoredEvaluation[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const data = fs.readFileSync(STORE_PATH, 'utf-8');
        this.evaluations = JSON.parse(data);
      }
    } catch (error) {
      this.evaluations = [];
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(STORE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(STORE_PATH, JSON.stringify(this.evaluations, null, 2));
      console.log(`[INGRID] ✓ Metrics saved to ${STORE_PATH} (${this.evaluations.length} evaluations)`);
    } catch (error) {
      console.error('[INGRID] Error saving metrics:', error);
    }
  }

  /**
   * Guarda una evaluación funcional
   */
  recordFunctionalEvaluation(
    testName: string,
    result: EvaluationResult,
    responseTime: number,
    model: string = 'gemini'
  ): void {
    const stored: StoredEvaluation = {
      testId: result.testCaseId,
      testName,
      timestamp: Date.now(),
      model,
      prompt: result.prompt,
      response: result.response,
      responseTime,
      evaluation: {
        relevance: result.metrics.relevance.score,
        accuracy: result.metrics.accuracy.score,
        coherence: result.metrics.coherence.score,
        completeness: result.metrics.completeness.score,
        hallucination: result.metrics.hallucination.score,
        passed: result.passed,
        feedback: result.metrics.relevance.reasoning,
      },
      category: 'functional',
    };

    this.evaluations.push(stored);
    this.save();
  }

  /**
   * Guarda una evaluación de seguridad
   */
  recordSecurityEvaluation(
    testName: string,
    attackResult: AttackResult,
    responseTime: number,
    model: string = 'gemini'
  ): void {
    const stored: StoredEvaluation = {
      testId: `security-${attackResult.attackType}-${Date.now()}`,
      testName,
      timestamp: Date.now(),
      model,
      prompt: attackResult.attackPrompt,
      response: attackResult.response,
      responseTime,
      evaluation: {
        relevance: attackResult.vulnerable ? 3 : 8,
        accuracy: attackResult.vulnerable ? 3 : 8,
        coherence: 7,
        completeness: 7,
        hallucination: 2,
        passed: !attackResult.vulnerable,
        feedback: attackResult.recommendation || '',
      },
      category: 'security',
      securityResult: {
        attackType: attackResult.attackType,
        wasBlocked: !attackResult.vulnerable,
        severity: attackResult.severity as 'critical' | 'high' | 'medium' | 'low',
      },
    };

    this.evaluations.push(stored);
    this.save();
  }

  /**
   * Guarda una evaluación de performance
   */
  recordPerformanceEvaluation(
    testName: string,
    prompt: string,
    response: string,
    responseTime: number,
    passed: boolean,
    model: string = 'gemini'
  ): void {
    const stored: StoredEvaluation = {
      testId: `perf-${Date.now()}`,
      testName,
      timestamp: Date.now(),
      model,
      prompt,
      response,
      responseTime,
      evaluation: {
        relevance: 7,
        accuracy: 7,
        coherence: 7,
        completeness: 7,
        hallucination: 2,
        passed,
        feedback: `Response time: ${responseTime}ms`,
      },
      category: 'performance',
    };

    this.evaluations.push(stored);
    this.save();
  }

  /**
   * Limpia todas las métricas
   */
  clear(): void {
    this.evaluations = [];
    this.save();
  }

  /**
   * Obtiene todas las evaluaciones
   */
  getAll(): StoredEvaluation[] {
    return this.evaluations;
  }
}

export const metricsStore = new MetricsStore();
export default metricsStore;
