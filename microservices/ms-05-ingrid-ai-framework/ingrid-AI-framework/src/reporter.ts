// ═══════════════════════════════════════════════════════════════
// INGRID - CUSTOM PLAYWRIGHT REPORTER
// Sends REAL metrics to Prometheus from LLM-as-Judge evaluations
// ═══════════════════════════════════════════════════════════════

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const PUSHGATEWAY_URL = process.env.PUSHGATEWAY_URL || 'http://localhost:9091';

// ═══════════════════════════════════════════════════════════════
// METRICS STORE - Read real evaluations from tests
// ═══════════════════════════════════════════════════════════════

interface StoredEvaluation {
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

function loadStoredMetrics(): StoredEvaluation[] {
  try {
    const storePath = path.join(process.cwd(), 'reports', 'metrics-store.json');
    console.log(`[INGRID] Looking for metrics at: ${storePath}`);
    if (fs.existsSync(storePath)) {
      const data = fs.readFileSync(storePath, 'utf-8');
      const parsed = JSON.parse(data);
      console.log(`[INGRID] Loaded ${parsed.length} stored evaluations`);
      return parsed;
    } else {
      console.log('[INGRID] ⚠️ metrics-store.json not found');
    }
  } catch (error) {
    console.error('[INGRID] Error loading stored metrics:', error);
  }
  return [];
}

function calculateAggregatedMetrics(evaluations: StoredEvaluation[]) {
  const total = evaluations.length;

  if (total === 0) {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      passRate: 0,
      avgRelevance: 0,
      avgAccuracy: 0,
      avgCoherence: 0,
      avgCompleteness: 0,
      avgHallucination: 0,
      avgResponseTime: 0,
      p95ResponseTime: 0,
      securityVulnerabilities: 0,
      criticalVulnerabilities: 0,
      highVulnerabilities: 0,
      mediumVulnerabilities: 0,
      lowVulnerabilities: 0,
      functional: { passed: 0, failed: 0 },
      security: { passed: 0, failed: 0 },
      performance: { passed: 0, failed: 0 },
      // OWASP LLM Top 10 individual results
      owasp: {
        llm01_prompt_injection: 0,
        llm02_insecure_output: 0,
        llm03_training_poisoning: 0,
        llm04_model_dos: 0,
        llm05_supply_chain: 0,
        llm06_sensitive_info: 0,
        llm07_insecure_plugin: 0,
        llm08_excessive_agency: 0,
        llm09_overreliance: 0,
        llm10_model_theft: 0,
        tests_passed: 0,
      },
      // Advanced security
      piiDetected: 0,
      fuzzingBlocked: 0,
      rateLimiting: 0,
    };
  }

  const passed = evaluations.filter(e => e.evaluation.passed).length;
  const failed = total - passed;

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const relevanceScores = evaluations.map(e => e.evaluation.relevance);
  const accuracyScores = evaluations.map(e => e.evaluation.accuracy);
  const coherenceScores = evaluations.map(e => e.evaluation.coherence);
  const completenessScores = evaluations.map(e => e.evaluation.completeness);
  const hallucinationScores = evaluations.map(e => e.evaluation.hallucination);
  const responseTimes = evaluations.map(e => e.responseTime);

  const sortedTimes = [...responseTimes].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedTimes.length * 0.95);
  const p95ResponseTime = sortedTimes[p95Index] || 0;

  const securityEvals = evaluations.filter(e => e.category === 'security');
  const vulnerabilities = securityEvals.filter(e => e.securityResult && !e.securityResult.wasBlocked);
  const criticalVulns = vulnerabilities.filter(v => v.securityResult?.severity === 'critical').length;
  const highVulns = vulnerabilities.filter(v => v.securityResult?.severity === 'high').length;
  const mediumVulns = vulnerabilities.filter(v => v.securityResult?.severity === 'medium').length;
  const lowVulns = vulnerabilities.filter(v => v.securityResult?.severity === 'low').length;

  const functional = evaluations.filter(e => e.category === 'functional');
  const security = evaluations.filter(e => e.category === 'security');
  const performance = evaluations.filter(e => e.category === 'performance');

  // Calculate OWASP individual results (0 = passed, 1 = failed, -1 = not tested)
  const getOwaspResult = (attackType: string): number => {
    const test = securityEvals.find(e => e.securityResult?.attackType === attackType);
    if (!test) return -1; // No test executed for this attack type
    return test.securityResult?.wasBlocked ? 0 : 1;
  };

  // Calculate OWASP results for each category
  const llm01 = getOwaspResult('prompt_injection');
  const llm02 = getOwaspResult('xss_injection');
  const llm03 = getOwaspResult('bias_detection');
  const llm04 = getOwaspResult('dos_attack');
  const llm05 = getOwaspResult('supply_chain');
  const llm06 = getOwaspResult('system_prompt_leak');
  const llm07 = getOwaspResult('command_injection');
  const llm08 = getOwaspResult('excessive_agency');
  const llm09 = getOwaspResult('hallucination');
  const llm10 = getOwaspResult('model_extraction');

  // Count passed OWASP tests (only count tests that were actually executed)
  // IMPORTANT: Only include LLM01-LLM10 results, NOT tests_passed itself
  const owaspTestResults = [llm01, llm02, llm03, llm04, llm05, llm06, llm07, llm08, llm09, llm10];
  const executedTests = owaspTestResults.filter(v => v !== -1);
  const failedTests = executedTests.filter(v => v === 1).length;
  const tests_passed = executedTests.length > 0 ? executedTests.length - failedTests : -1;

  const owaspResults = {
    llm01_prompt_injection: llm01,
    llm02_insecure_output: llm02,
    llm03_training_poisoning: llm03,
    llm04_model_dos: llm04,
    llm05_supply_chain: llm05,
    llm06_sensitive_info: llm06,
    llm07_insecure_plugin: llm07,
    llm08_excessive_agency: llm08,
    llm09_overreliance: llm09,
    llm10_model_theft: llm10,
    tests_passed,
  };

  // Advanced security metrics
  const piiTest = securityEvals.find(e => e.securityResult?.attackType === 'pii_leak');
  const piiDetected = piiTest ? (piiTest.securityResult?.wasBlocked ? 0 : 1) : 0;

  const fuzzTest = securityEvals.find(e => e.securityResult?.attackType === 'fuzzing');
  const fuzzingBlocked = fuzzTest ? (fuzzTest.securityResult?.wasBlocked ? 5 : 0) : 0;

  const rateTest = securityEvals.find(e => e.securityResult?.attackType === 'rate_limit_test');
  const rateLimiting = rateTest ? 1 : 0;

  return {
    total,
    passed,
    failed,
    passRate: (passed / total) * 100,
    avgRelevance: avg(relevanceScores),
    avgAccuracy: avg(accuracyScores),
    avgCoherence: avg(coherenceScores),
    avgCompleteness: avg(completenessScores),
    avgHallucination: avg(hallucinationScores),
    avgResponseTime: avg(responseTimes),
    p95ResponseTime,
    securityVulnerabilities: vulnerabilities.length,
    criticalVulnerabilities: criticalVulns,
    highVulnerabilities: highVulns,
    mediumVulnerabilities: mediumVulns,
    lowVulnerabilities: lowVulns,
    functional: {
      passed: functional.filter(e => e.evaluation.passed).length,
      failed: functional.filter(e => !e.evaluation.passed).length,
    },
    security: {
      passed: security.filter(e => e.evaluation.passed).length,
      failed: security.filter(e => !e.evaluation.passed).length,
    },
    performance: {
      passed: performance.filter(e => e.evaluation.passed).length,
      failed: performance.filter(e => !e.evaluation.passed).length,
    },
    owasp: owaspResults,
    piiDetected,
    fuzzingBlocked,
    rateLimiting,
  };
}

// ═══════════════════════════════════════════════════════════════
// PLAYWRIGHT REPORTER
// ═══════════════════════════════════════════════════════════════

class IngridReporter implements Reporter {
  private startTime: number = 0;
  private runId: string = `run-${Date.now()}`; // Single runId per test session
  private testResults: { passed: number; failed: number; skipped: number } = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  onBegin(config: FullConfig, suite: Suite): void {
    this.startTime = Date.now();
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   🤖 INGRID - AI Testing Framework');
    console.log('   Intelligent Network for Generative Response Inspection');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n');
  }

  async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    if (result.status === 'passed') {
      this.testResults.passed++;
    } else if (result.status === 'failed') {
      this.testResults.failed++;
    } else if (result.status === 'skipped') {
      this.testResults.skipped++;
    }

    // ENVIAR METRICAS A GRAFANA EN TIEMPO REAL DESPUES DE CADA TEST
    const totalDuration = Date.now() - this.startTime;
    const storedEvaluations = loadStoredMetrics();
    const metrics = calculateAggregatedMetrics(storedEvaluations);
    await this.pushMetricsToPrometheus(metrics, totalDuration);
    console.log(`[INGRID] 📊 Métricas enviadas a Grafana (${this.testResults.passed + this.testResults.failed} tests)`);
  }

  async onEnd(result: FullResult): Promise<void> {
    const totalDuration = Date.now() - this.startTime;

    // Load real metrics from the store
    const storedEvaluations = loadStoredMetrics();
    const metrics = calculateAggregatedMetrics(storedEvaluations);

    // Print summary
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   📊 INGRID - Test Results Summary');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   Total Tests:     ${this.testResults.passed + this.testResults.failed + this.testResults.skipped}`);
    console.log(`   ✓ Passed:        ${this.testResults.passed}`);
    console.log(`   ✗ Failed:        ${this.testResults.failed}`);
    console.log(`   ○ Skipped:       ${this.testResults.skipped}`);
    console.log(`   Duration:        ${(totalDuration / 1000).toFixed(1)}s`);
    console.log('───────────────────────────────────────────────────────────────');

    if (storedEvaluations.length > 0) {
      console.log('   📈 LLM-as-Judge Metrics (Real Evaluations):');
      console.log(`      Relevance:     ${metrics.avgRelevance.toFixed(1)}/10`);
      console.log(`      Accuracy:      ${metrics.avgAccuracy.toFixed(1)}/10`);
      console.log(`      Coherence:     ${metrics.avgCoherence.toFixed(1)}/10`);
      console.log(`      Completeness:  ${metrics.avgCompleteness.toFixed(1)}/10`);
      console.log(`      Hallucination: ${metrics.avgHallucination.toFixed(1)}/10 (lower is better)`);
      console.log('───────────────────────────────────────────────────────────────');
      console.log('   🛡️ Security:');
      console.log(`      Vulnerabilities: ${metrics.securityVulnerabilities} found`);
      console.log(`      Critical:        ${metrics.criticalVulnerabilities}`);
      console.log(`      High:            ${metrics.highVulnerabilities}`);
      console.log('───────────────────────────────────────────────────────────────');
      console.log('   ⚡ Performance:');
      console.log(`      Avg Response:    ${metrics.avgResponseTime.toFixed(0)}ms`);
      console.log(`      P95 Response:    ${metrics.p95ResponseTime.toFixed(0)}ms`);
    } else {
      console.log('   ⚠️  No LLM evaluations recorded. Run tests with LLM-as-Judge.');
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n');

    // Push to Prometheus
    await this.pushMetricsToPrometheus(metrics, totalDuration);
  }

  private async pushMetricsToPrometheus(
    metrics: ReturnType<typeof calculateAggregatedMetrics>,
    totalDuration: number
  ): Promise<void> {
    // Build metrics body with REAL values including OWASP Top 10 individual metrics
    const metricsBody = [
      `# HELP ai_test_total Total AI tests executed`,
      `# TYPE ai_test_total gauge`,
      `ai_test_total ${metrics.total > 0 ? metrics.total : this.testResults.passed + this.testResults.failed}`,
      ``,
      `# HELP ai_test_passed Passed AI tests`,
      `# TYPE ai_test_passed gauge`,
      `ai_test_passed ${metrics.total > 0 ? metrics.passed : this.testResults.passed}`,
      ``,
      `# HELP ai_test_failed Failed AI tests`,
      `# TYPE ai_test_failed gauge`,
      `ai_test_failed ${metrics.total > 0 ? metrics.failed : this.testResults.failed}`,
      ``,
      `# HELP ai_test_pass_rate Pass rate percentage`,
      `# TYPE ai_test_pass_rate gauge`,
      `ai_test_pass_rate ${metrics.passRate.toFixed(2)}`,
      ``,
      `# HELP ai_test_duration_ms Total test duration`,
      `# TYPE ai_test_duration_ms gauge`,
      `ai_test_duration_ms ${totalDuration}`,
      ``,
      `# HELP ai_metric_relevance Average relevance score`,
      `# TYPE ai_metric_relevance gauge`,
      `ai_metric_relevance ${metrics.avgRelevance.toFixed(2)}`,
      ``,
      `# HELP ai_metric_accuracy Average accuracy score`,
      `# TYPE ai_metric_accuracy gauge`,
      `ai_metric_accuracy ${metrics.avgAccuracy.toFixed(2)}`,
      ``,
      `# HELP ai_metric_coherence Average coherence score`,
      `# TYPE ai_metric_coherence gauge`,
      `ai_metric_coherence ${metrics.avgCoherence.toFixed(2)}`,
      ``,
      `# HELP ai_metric_completeness Average completeness score`,
      `# TYPE ai_metric_completeness gauge`,
      `ai_metric_completeness ${metrics.avgCompleteness.toFixed(2)}`,
      ``,
      `# HELP ai_metric_hallucination Average hallucination score`,
      `# TYPE ai_metric_hallucination gauge`,
      `ai_metric_hallucination ${metrics.avgHallucination.toFixed(2)}`,
      ``,
      `# HELP ai_security_vulnerabilities Total vulnerabilities found`,
      `# TYPE ai_security_vulnerabilities gauge`,
      `ai_security_vulnerabilities ${metrics.securityVulnerabilities}`,
      ``,
      `# HELP ai_security_critical Critical vulnerabilities`,
      `# TYPE ai_security_critical gauge`,
      `ai_security_critical ${metrics.criticalVulnerabilities}`,
      ``,
      `# HELP ai_security_high High severity vulnerabilities`,
      `# TYPE ai_security_high gauge`,
      `ai_security_high ${metrics.highVulnerabilities}`,
      ``,
      `# HELP ai_security_medium Medium severity vulnerabilities`,
      `# TYPE ai_security_medium gauge`,
      `ai_security_medium ${metrics.mediumVulnerabilities}`,
      ``,
      `# HELP ai_security_low Low severity vulnerabilities`,
      `# TYPE ai_security_low gauge`,
      `ai_security_low ${metrics.lowVulnerabilities}`,
      ``,
      `# HELP ai_perf_avg_response_ms Average response time`,
      `# TYPE ai_perf_avg_response_ms gauge`,
      `ai_perf_avg_response_ms ${metrics.avgResponseTime.toFixed(0)}`,
      ``,
      `# HELP ai_perf_p95_response_ms P95 response time`,
      `# TYPE ai_perf_p95_response_ms gauge`,
      `ai_perf_p95_response_ms ${metrics.p95ResponseTime.toFixed(0)}`,
      ``,
      `# ═══════════════════════════════════════════════════════════════`,
      `# OWASP LLM TOP 10 - Individual Test Results (-1=N/A, 0=PASS, 1=FAIL)`,
      `# ALWAYS sent - use -1 to indicate test was not executed`,
      `# ═══════════════════════════════════════════════════════════════`,
      ``,
      `# HELP ai_owasp_llm01_prompt_injection LLM01 Prompt Injection result`,
      `# TYPE ai_owasp_llm01_prompt_injection gauge`,
      `ai_owasp_llm01_prompt_injection ${metrics.owasp.llm01_prompt_injection}`,
      ``,
      `# HELP ai_owasp_llm02_insecure_output LLM02 Insecure Output result`,
      `# TYPE ai_owasp_llm02_insecure_output gauge`,
      `ai_owasp_llm02_insecure_output ${metrics.owasp.llm02_insecure_output}`,
      ``,
      `# HELP ai_owasp_llm03_training_poisoning LLM03 Training Data Poisoning result`,
      `# TYPE ai_owasp_llm03_training_poisoning gauge`,
      `ai_owasp_llm03_training_poisoning ${metrics.owasp.llm03_training_poisoning}`,
      ``,
      `# HELP ai_owasp_llm04_model_dos LLM04 Model DoS result`,
      `# TYPE ai_owasp_llm04_model_dos gauge`,
      `ai_owasp_llm04_model_dos ${metrics.owasp.llm04_model_dos}`,
      ``,
      `# HELP ai_owasp_llm05_supply_chain LLM05 Supply Chain result`,
      `# TYPE ai_owasp_llm05_supply_chain gauge`,
      `ai_owasp_llm05_supply_chain ${metrics.owasp.llm05_supply_chain}`,
      ``,
      `# HELP ai_owasp_llm06_sensitive_info LLM06 Sensitive Info Disclosure result`,
      `# TYPE ai_owasp_llm06_sensitive_info gauge`,
      `ai_owasp_llm06_sensitive_info ${metrics.owasp.llm06_sensitive_info}`,
      ``,
      `# HELP ai_owasp_llm07_insecure_plugin LLM07 Insecure Plugin result`,
      `# TYPE ai_owasp_llm07_insecure_plugin gauge`,
      `ai_owasp_llm07_insecure_plugin ${metrics.owasp.llm07_insecure_plugin}`,
      ``,
      `# HELP ai_owasp_llm08_excessive_agency LLM08 Excessive Agency result`,
      `# TYPE ai_owasp_llm08_excessive_agency gauge`,
      `ai_owasp_llm08_excessive_agency ${metrics.owasp.llm08_excessive_agency}`,
      ``,
      `# HELP ai_owasp_llm09_overreliance LLM09 Overreliance result`,
      `# TYPE ai_owasp_llm09_overreliance gauge`,
      `ai_owasp_llm09_overreliance ${metrics.owasp.llm09_overreliance}`,
      ``,
      `# HELP ai_owasp_llm10_model_theft LLM10 Model Theft result`,
      `# TYPE ai_owasp_llm10_model_theft gauge`,
      `ai_owasp_llm10_model_theft ${metrics.owasp.llm10_model_theft}`,
      ``,
      `# HELP ai_owasp_tests_passed Total OWASP tests passed (-1 if none executed)`,
      `# TYPE ai_owasp_tests_passed gauge`,
      `ai_owasp_tests_passed ${metrics.owasp.tests_passed}`,
      ``,
      `# ═══════════════════════════════════════════════════════════════`,
      `# ADVANCED SECURITY - PII, Fuzzing, Rate Limiting`,
      `# ═══════════════════════════════════════════════════════════════`,
      ``,
      `# HELP ai_security_pii_detected PII leak detected (0=safe, 1=leak)`,
      `# TYPE ai_security_pii_detected gauge`,
      `ai_security_pii_detected ${metrics.piiDetected}`,
      ``,
      `# HELP ai_security_fuzzing_blocked Number of fuzzing attempts blocked`,
      `# TYPE ai_security_fuzzing_blocked gauge`,
      `ai_security_fuzzing_blocked ${metrics.fuzzingBlocked}`,
      ``,
      `# HELP ai_security_rate_limiting Rate limiting active (0=no, 1=yes)`,
      `# TYPE ai_security_rate_limiting gauge`,
      `ai_security_rate_limiting ${metrics.rateLimiting}`,
      ``,
    ].join('\n');

    try {
      const url = `${PUSHGATEWAY_URL}/metrics/job/ingrid_tests/instance/${this.runId}`;

      await axios.post(url, metricsBody, {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 5000,
      });

      console.log('[INGRID] ✓ Real metrics pushed to Grafana/Prometheus');
      if (metrics.owasp.tests_passed >= 0) {
        console.log(`[INGRID] ✓ OWASP Score: ${metrics.owasp.tests_passed} security tests passed`);
      }
    } catch (error) {
      console.log('[INGRID] ⚠ Grafana not available (run: npm run grafana:up)');
    }
  }
}

export default IngridReporter;
