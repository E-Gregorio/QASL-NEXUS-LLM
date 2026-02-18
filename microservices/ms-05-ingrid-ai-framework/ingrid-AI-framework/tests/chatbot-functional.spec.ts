// ═══════════════════════════════════════════════════════════════
// AI-TESTING-FRAMEWORK - FUNCTIONAL TESTS
// Tests de calidad de respuestas del chatbot
// ═══════════════════════════════════════════════════════════════

import { test, expect } from '@playwright/test';
import { TestRunner } from '../src/runner';
import { TestCase } from '../src/types';
import { CONFIG } from '../config';
import * as fs from 'fs';

// Cargar casos de prueba
const loadTestCases = (): TestCase[] => {
  const data = fs.readFileSync('data/prompts.json', 'utf-8');
  return JSON.parse(data).filter((tc: TestCase) => tc.category === 'functional');
};

test.describe('Functional Tests - Chatbot Quality', () => {
  let runner: TestRunner;

  test.beforeEach(async ({ page }) => {
    runner = new TestRunner(page);
    await runner.initialize();
  });

  test('TC-FUNC-001: Respuestas relevantes a preguntas básicas', async ({ page }) => {
    const testCase: TestCase = {
      id: 'FUNC-001',
      name: 'Relevancia básica',
      category: 'functional',
      prompt: '¿Qué servicios ofrecen?',
      keywords: ['servicio', 'ofrecer', 'ayuda'],
    };

    const result = await runner.runFunctionalTest(testCase);

    // Attach para Allure
    await test.info().attach('Evaluation Result', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    });

    expect(result.metrics.relevance.score, 
      `Relevancia: ${result.metrics.relevance.reasoning}`
    ).toBeGreaterThanOrEqual(CONFIG.thresholds.relevance);
  });

  test('TC-FUNC-002: Exactitud de información', async ({ page }) => {
    const testCase: TestCase = {
      id: 'FUNC-002',
      name: 'Exactitud',
      category: 'functional',
      prompt: '¿Cuál es el horario de atención?',
      expectedResponse: 'Lunes a Viernes de 9:00 a 18:00',
    };

    const result = await runner.runFunctionalTest(testCase);

    await test.info().attach('Evaluation Result', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    });

    expect(result.metrics.accuracy.score,
      `Exactitud: ${result.metrics.accuracy.reasoning}`
    ).toBeGreaterThanOrEqual(CONFIG.thresholds.accuracy);
  });

  test('TC-FUNC-003: Coherencia en respuestas largas', async ({ page }) => {
    const testCase: TestCase = {
      id: 'FUNC-003',
      name: 'Coherencia',
      category: 'functional',
      prompt: 'Explícame paso a paso cómo realizar un trámite.',
    };

    const result = await runner.runFunctionalTest(testCase);

    await test.info().attach('Evaluation Result', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    });

    expect(result.metrics.coherence.score,
      `Coherencia: ${result.metrics.coherence.reasoning}`
    ).toBeGreaterThanOrEqual(CONFIG.thresholds.coherence);
  });

  test('TC-FUNC-004: Detección de alucinaciones', async ({ page }) => {
    const testCase: TestCase = {
      id: 'FUNC-004',
      name: 'Alucinaciones',
      category: 'functional',
      prompt: '¿Cuántos empleados tiene la empresa?',
      forbiddenWords: ['millones', 'global', 'mundial'],
    };

    const result = await runner.runFunctionalTest(testCase);

    await test.info().attach('Evaluation Result', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    });

    // Para alucinación, menor es mejor
    expect(result.metrics.hallucination.score,
      `Alucinación detectada: ${result.metrics.hallucination.reasoning}`
    ).toBeLessThanOrEqual(CONFIG.thresholds.hallucination);
  });

  test('TC-FUNC-005: Completitud de respuestas', async ({ page }) => {
    const testCase: TestCase = {
      id: 'FUNC-005',
      name: 'Completitud',
      category: 'functional',
      prompt: '¿Cuáles son los requisitos para abrir una cuenta?',
    };

    const result = await runner.runFunctionalTest(testCase);

    await test.info().attach('Evaluation Result', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    });

    expect(result.metrics.completeness.score,
      `Completitud: ${result.metrics.completeness.reasoning}`
    ).toBeGreaterThanOrEqual(CONFIG.thresholds.completeness);
  });

  // Tests dinámicos desde data/prompts.json
  test.describe('Dynamic Tests from prompts.json', () => {
    const testCases = loadTestCases();

    for (const tc of testCases) {
      test(`${tc.id}: ${tc.name}`, async ({ page }) => {
        const runner = new TestRunner(page);
        await runner.initialize();

        const result = await runner.runFunctionalTest(tc);

        await test.info().attach('Test Case', {
          body: JSON.stringify(tc, null, 2),
          contentType: 'application/json',
        });

        await test.info().attach('Evaluation Result', {
          body: JSON.stringify(result, null, 2),
          contentType: 'application/json',
        });

        expect(result.passed, 
          `Test failed. Overall score: ${result.overallScore}/10`
        ).toBe(true);
      });
    }
  });

  test('TC-FUNC-CONSISTENCY: Consistencia de respuestas', async ({ page }) => {
    const runner = new TestRunner(page);
    await runner.initialize();

    const consistency = await runner.runConsistencyTest(
      '¿Qué es lo que hacen?',
      3
    );

    await test.info().attach('Consistency Analysis', {
      body: JSON.stringify(consistency, null, 2),
      contentType: 'application/json',
    });

    expect(consistency.score,
      `Consistencia baja: score ${consistency.score}/10`
    ).toBeGreaterThanOrEqual(7);
  });
});
