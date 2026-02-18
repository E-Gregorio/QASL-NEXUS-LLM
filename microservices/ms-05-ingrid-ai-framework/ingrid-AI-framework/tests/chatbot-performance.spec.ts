// ═══════════════════════════════════════════════════════════════
// AI-TESTING-FRAMEWORK - PERFORMANCE TESTS
// Tests de tiempo de respuesta y carga
// ═══════════════════════════════════════════════════════════════

import { test, expect } from '@playwright/test';
import { TestRunner } from '../src/runner';
import { MetricsCalculator } from '../src/metrics';
import { TestCase } from '../src/types';
import { CONFIG } from '../config';

test.describe('Performance Tests - Response Time', () => {
  let runner: TestRunner;

  test.beforeEach(async ({ page }) => {
    runner = new TestRunner(page);
    await runner.initialize();
  });

  // ───────────────────────────────────────────────────────────────
  // BASIC RESPONSE TIME
  // ───────────────────────────────────────────────────────────────
  test('PERF-001: Response time under threshold', async ({ page }) => {
    const testCase: TestCase = {
      id: 'PERF-001',
      name: 'Basic response time',
      category: 'performance',
      prompt: 'Hola',
      maxResponseTime: CONFIG.performance.maxResponseTime,
    };

    const result = await runner.runPerformanceTest(testCase);

    await test.info().attach('Performance Result', {
      body: JSON.stringify({
        responseTime: `${result.responseTime}ms`,
        threshold: `${CONFIG.performance.maxResponseTime}ms`,
        withinThreshold: result.withinThreshold,
      }, null, 2),
      contentType: 'application/json',
    });

    expect(result.responseTime,
      `Response time ${result.responseTime}ms exceeds threshold ${CONFIG.performance.maxResponseTime}ms`
    ).toBeLessThanOrEqual(CONFIG.performance.maxResponseTime);
  });

  // ───────────────────────────────────────────────────────────────
  // COMPLEX QUERY RESPONSE TIME
  // ───────────────────────────────────────────────────────────────
  test('PERF-002: Complex query response time', async ({ page }) => {
    const testCase: TestCase = {
      id: 'PERF-002',
      name: 'Complex query response time',
      category: 'performance',
      prompt: 'Explícame detalladamente todos los pasos necesarios para completar el trámite de inscripción, incluyendo documentos requeridos, plazos y costos asociados.',
      maxResponseTime: CONFIG.performance.maxResponseTime * 2, // Más tiempo para queries complejas
    };

    const result = await runner.runPerformanceTest(testCase);

    await test.info().attach('Performance Result', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    });

    expect(result.withinThreshold,
      `Complex query too slow: ${result.responseTime}ms`
    ).toBe(true);
  });

  // ───────────────────────────────────────────────────────────────
  // MULTIPLE ITERATIONS (STABILITY)
  // ───────────────────────────────────────────────────────────────
  test('PERF-003: Response time stability (5 iterations)', async ({ page }) => {
    const testCase: TestCase = {
      id: 'PERF-003',
      name: 'Stability test',
      category: 'performance',
      prompt: '¿Cuál es el horario de atención?',
      maxResponseTime: CONFIG.performance.maxResponseTime,
    };

    const results = await runner.runPerformanceTests(testCase, 5);
    const stats = MetricsCalculator.calculatePerformanceStats(results);

    await test.info().attach('Performance Stats', {
      body: JSON.stringify({
        iterations: results.length,
        avgResponseTime: `${Math.round(stats.avgResponseTime)}ms`,
        minResponseTime: `${stats.minResponseTime}ms`,
        maxResponseTime: `${stats.maxResponseTime}ms`,
        p95ResponseTime: `${stats.p95ResponseTime}ms`,
        withinThresholdRate: `${stats.withinThresholdRate}%`,
        threshold: `${CONFIG.performance.maxResponseTime}ms`,
        allResults: results,
      }, null, 2),
      contentType: 'application/json',
    });

    // Al menos 80% debe estar dentro del threshold
    expect(stats.withinThresholdRate,
      `Only ${stats.withinThresholdRate}% within threshold`
    ).toBeGreaterThanOrEqual(80);

    // P95 no debe exceder 2x el threshold
    expect(stats.p95ResponseTime,
      `P95 (${stats.p95ResponseTime}ms) too high`
    ).toBeLessThanOrEqual(CONFIG.performance.maxResponseTime * 2);
  });

  // ───────────────────────────────────────────────────────────────
  // FIRST RESPONSE (COLD START)
  // ───────────────────────────────────────────────────────────────
  test('PERF-004: First response (cold start)', async ({ page }) => {
    // Recargar para simular cold start
    await page.reload();
    await page.waitForLoadState('networkidle');

    const testCase: TestCase = {
      id: 'PERF-004',
      name: 'Cold start',
      category: 'performance',
      prompt: 'Hola',
      maxResponseTime: CONFIG.performance.maxResponseTime * 1.5, // Permitir más tiempo en cold start
    };

    const result = await runner.runPerformanceTest(testCase);

    await test.info().attach('Cold Start Result', {
      body: JSON.stringify({
        responseTime: `${result.responseTime}ms`,
        threshold: `${testCase.maxResponseTime}ms`,
        withinThreshold: result.withinThreshold,
      }, null, 2),
      contentType: 'application/json',
    });

    expect(result.withinThreshold,
      `Cold start too slow: ${result.responseTime}ms`
    ).toBe(true);
  });

  // ───────────────────────────────────────────────────────────────
  // CONVERSATION DEGRADATION
  // ───────────────────────────────────────────────────────────────
  test('PERF-005: Response time degradation in long conversation', async ({ page }) => {
    const prompts = [
      'Hola',
      '¿Qué servicios ofrecen?',
      'Cuéntame más sobre el primer servicio',
      '¿Cuánto cuesta?',
      '¿Cómo me registro?',
      '¿Hay descuentos disponibles?',
      '¿Cuál es el horario?',
      '¿Dónde están ubicados?',
      '¿Tienen sucursales?',
      'Gracias por la información',
    ];

    const responseTimes: number[] = [];

    for (let i = 0; i < prompts.length; i++) {
      const result = await runner.runPerformanceTest({
        id: `PERF-005-${i + 1}`,
        name: `Message ${i + 1}`,
        category: 'performance',
        prompt: prompts[i],
        maxResponseTime: CONFIG.performance.maxResponseTime,
      });
      responseTimes.push(result.responseTime);
    }

    // Calcular degradación
    const firstHalf = responseTimes.slice(0, 5);
    const secondHalf = responseTimes.slice(5);
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const degradation = ((avgSecond - avgFirst) / avgFirst) * 100;

    await test.info().attach('Degradation Analysis', {
      body: JSON.stringify({
        responseTimes: responseTimes.map((t, i) => ({
          message: i + 1,
          prompt: prompts[i],
          responseTime: `${t}ms`,
        })),
        avgFirstHalf: `${Math.round(avgFirst)}ms`,
        avgSecondHalf: `${Math.round(avgSecond)}ms`,
        degradationPercent: `${Math.round(degradation)}%`,
      }, null, 2),
      contentType: 'application/json',
    });

    // Degradación no debe superar 50%
    expect(degradation,
      `Response time degraded ${Math.round(degradation)}% over conversation`
    ).toBeLessThanOrEqual(50);
  });

  // ───────────────────────────────────────────────────────────────
  // PERFORMANCE SUMMARY
  // ───────────────────────────────────────────────────────────────
  test('PERF-SUMMARY: Overall Performance Report', async ({ page }) => {
    const testCases: TestCase[] = [
      { id: 'SUM-1', name: 'Simple', category: 'performance', prompt: 'Hola' },
      { id: 'SUM-2', name: 'Medium', category: 'performance', prompt: '¿Qué servicios ofrecen?' },
      { id: 'SUM-3', name: 'Complex', category: 'performance', prompt: 'Dame una lista completa de requisitos' },
    ];

    for (const tc of testCases) {
      await runner.runPerformanceTest(tc);
    }

    const results = runner.getPerformanceResults();
    const stats = MetricsCalculator.calculatePerformanceStats(results);

    await test.info().attach('Performance Summary', {
      body: JSON.stringify({
        totalTests: results.length,
        stats,
        threshold: `${CONFIG.performance.maxResponseTime}ms`,
      }, null, 2),
      contentType: 'application/json',
    });

    expect(stats.avgResponseTime,
      `Average response time ${Math.round(stats.avgResponseTime)}ms too high`
    ).toBeLessThanOrEqual(CONFIG.performance.maxResponseTime);
  });
});
