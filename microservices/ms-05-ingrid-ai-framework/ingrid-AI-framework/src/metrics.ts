// ═══════════════════════════════════════════════════════════════
// AI-TESTING-FRAMEWORK - METRICS
// Funciones de cálculo y agregación de métricas
// ═══════════════════════════════════════════════════════════════

import {
  EvaluationResult,
  PerformanceResult,
  SecurityReport,
  AttackResult,
  GrafanaMetric,
  TestRunReport
} from './types';
import { CONFIG } from '../config';
import * as fs from 'fs';
import axios from 'axios';

const PUSHGATEWAY_URL = process.env.PUSHGATEWAY_URL || 'http://localhost:9091';
const JOB_NAME = 'ingrid_tests';

export class MetricsCalculator {
  
  /**
   * Calcula estadísticas de evaluaciones funcionales
   */
  static calculateFunctionalStats(results: EvaluationResult[]): {
    avgRelevance: number;
    avgAccuracy: number;
    avgCoherence: number;
    avgCompleteness: number;
    avgHallucination: number;
    overallPassRate: number;
  } {
    if (results.length === 0) {
      return {
        avgRelevance: 0,
        avgAccuracy: 0,
        avgCoherence: 0,
        avgCompleteness: 0,
        avgHallucination: 0,
        overallPassRate: 0,
      };
    }

    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const avg = (arr: number[]) => sum(arr) / arr.length;

    return {
      avgRelevance: avg(results.map(r => r.metrics.relevance.score)),
      avgAccuracy: avg(results.map(r => r.metrics.accuracy.score)),
      avgCoherence: avg(results.map(r => r.metrics.coherence.score)),
      avgCompleteness: avg(results.map(r => r.metrics.completeness.score)),
      avgHallucination: avg(results.map(r => r.metrics.hallucination.score)),
      overallPassRate: (results.filter(r => r.passed).length / results.length) * 100,
    };
  }

  /**
   * Genera reporte de seguridad desde resultados de ataques
   */
  static generateSecurityReport(results: AttackResult[]): SecurityReport {
    const vulnerabilities = results.filter(r => r.vulnerable);
    
    return {
      totalAttacks: results.length,
      vulnerabilitiesFound: vulnerabilities.length,
      criticalCount: vulnerabilities.filter(v => v.severity === 'critical').length,
      highCount: vulnerabilities.filter(v => v.severity === 'high').length,
      mediumCount: vulnerabilities.filter(v => v.severity === 'medium').length,
      lowCount: vulnerabilities.filter(v => v.severity === 'low').length,
      results,
      passedSecurityCheck: vulnerabilities.filter(v => 
        v.severity === 'critical' || v.severity === 'high'
      ).length === 0,
    };
  }

  /**
   * Calcula métricas de performance
   */
  static calculatePerformanceStats(results: PerformanceResult[]): {
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    p95ResponseTime: number;
    withinThresholdRate: number;
  } {
    if (results.length === 0) {
      return {
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        p95ResponseTime: 0,
        withinThresholdRate: 0,
      };
    }

    const times = results.map(r => r.responseTime).sort((a, b) => a - b);
    const p95Index = Math.floor(times.length * 0.95);

    return {
      avgResponseTime: times.reduce((a, b) => a + b, 0) / times.length,
      minResponseTime: times[0],
      maxResponseTime: times[times.length - 1],
      p95ResponseTime: times[p95Index] || times[times.length - 1],
      withinThresholdRate: (results.filter(r => r.withinThreshold).length / results.length) * 100,
    };
  }

  /**
   * Genera métricas para Grafana/Prometheus
   */
  static toGrafanaMetrics(report: TestRunReport): GrafanaMetric[] {
    const timestamp = Date.now();
    const labels = { project: report.projectName };

    const metrics: GrafanaMetric[] = [
      // Test summary
      { name: 'ai_test_total', value: report.summary.total, labels, timestamp },
      { name: 'ai_test_passed', value: report.summary.passed, labels, timestamp },
      { name: 'ai_test_failed', value: report.summary.failed, labels, timestamp },
      { name: 'ai_test_pass_rate', value: report.summary.passRate, labels, timestamp },
      { name: 'ai_test_duration_ms', value: report.duration, labels, timestamp },
    ];

    // Functional metrics
    const funcStats = this.calculateFunctionalStats(report.functional);
    metrics.push(
      { name: 'ai_metric_relevance', value: funcStats.avgRelevance, labels, timestamp },
      { name: 'ai_metric_accuracy', value: funcStats.avgAccuracy, labels, timestamp },
      { name: 'ai_metric_coherence', value: funcStats.avgCoherence, labels, timestamp },
      { name: 'ai_metric_completeness', value: funcStats.avgCompleteness, labels, timestamp },
      { name: 'ai_metric_hallucination', value: funcStats.avgHallucination, labels, timestamp },
    );

    // Security metrics
    metrics.push(
      { name: 'ai_security_vulnerabilities', value: report.security.vulnerabilitiesFound, labels, timestamp },
      { name: 'ai_security_critical', value: report.security.criticalCount, labels, timestamp },
      { name: 'ai_security_high', value: report.security.highCount, labels, timestamp },
    );

    // Performance metrics
    const perfStats = this.calculatePerformanceStats(report.performance);
    metrics.push(
      { name: 'ai_perf_avg_response_ms', value: perfStats.avgResponseTime, labels, timestamp },
      { name: 'ai_perf_p95_response_ms', value: perfStats.p95ResponseTime, labels, timestamp },
    );

    return metrics;
  }

  /**
   * Formatea métricas para Prometheus Pushgateway
   */
  static toPrometheusFormat(metrics: GrafanaMetric[]): string {
    return metrics.map(m => {
      const labelStr = Object.entries(m.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      return `${m.name}{${labelStr}} ${m.value} ${m.timestamp}`;
    }).join('\n');
  }

  /**
   * Guarda métricas a archivo JSON
   */
  static saveMetrics(report: TestRunReport): void {
    const metricsDir = CONFIG.reports.outputDir;
    
    if (!fs.existsSync(metricsDir)) {
      fs.mkdirSync(metricsDir, { recursive: true });
    }

    // Guardar reporte completo
    fs.writeFileSync(
      `${metricsDir}/report-${report.runId}.json`,
      JSON.stringify(report, null, 2)
    );

    // Guardar métricas Grafana
    const grafanaMetrics = this.toGrafanaMetrics(report);
    fs.writeFileSync(
      `${metricsDir}/metrics-${report.runId}.json`,
      JSON.stringify(grafanaMetrics, null, 2)
    );

    // Append a histórico
    const historyFile = `${metricsDir}/history.json`;
    let history: any[] = [];
    
    if (fs.existsSync(historyFile)) {
      history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    }
    
    history.push({
      runId: report.runId,
      timestamp: report.startTime,
      passRate: report.summary.passRate,
      vulnerabilities: report.security.vulnerabilitiesFound,
    });
    
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
  }

  /**
   * Genera ID único para cada ejecución
   */
  static generateRunId(): string {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '');
    return `run-${date}-${time}`;
  }
}

/**
 * Envía métricas al Prometheus Pushgateway
 */
export async function pushToPrometheus(report: TestRunReport): Promise<boolean> {
  if (!CONFIG.grafana.enabled) {
    console.log('[INGRID] Grafana disabled, skipping metrics push');
    return false;
  }

  try {
    const metrics = MetricsCalculator.toGrafanaMetrics(report);
    const prometheusFormat = MetricsCalculator.toPrometheusFormat(metrics);

    const url = `${PUSHGATEWAY_URL}/metrics/job/${JOB_NAME}/instance/${report.runId}`;

    await axios.post(url, prometheusFormat, {
      headers: { 'Content-Type': 'text/plain' },
      timeout: 5000,
    });

    console.log(`[INGRID] Metrics pushed to Prometheus: ${metrics.length} metrics`);
    return true;
  } catch (error) {
    console.warn('[INGRID] Pushgateway not available, metrics saved to file only');
    return false;
  }
}

/**
 * Guarda métricas y las envía a Prometheus
 */
export async function saveAndPushMetrics(report: TestRunReport): Promise<void> {
  // Siempre guardar a archivo
  MetricsCalculator.saveMetrics(report);

  // Intentar enviar a Prometheus
  await pushToPrometheus(report);
}

export default MetricsCalculator;
