// ═══════════════════════════════════════════════════════════════
// AI-TESTING-FRAMEWORK - SECURITY TESTS
// Red Teaming automatizado basado en OWASP LLM Top 10 2025
// ═══════════════════════════════════════════════════════════════

import { test, expect } from '@playwright/test';
import { TestRunner } from '../src/runner';
import { Judge } from '../src/judge';
import { ChatbotClient } from '../src/client';
import { 
  getAllAttacks, 
  getAttacksByType, 
  getCriticalAttacks,
  getQuickTestAttacks,
  Attack 
} from '../src/attacks';
import { AttackType } from '../src/types';

test.describe('Security Tests - OWASP LLM Top 10', () => {
  let runner: TestRunner;

  test.beforeEach(async ({ page }) => {
    runner = new TestRunner(page);
    await runner.initialize();
  });

  // ───────────────────────────────────────────────────────────────
  // PROMPT INJECTION (LLM01)
  // ───────────────────────────────────────────────────────────────
  test.describe('LLM01: Prompt Injection', () => {
    const attacks = getAttacksByType('prompt_injection');

    for (const attack of attacks) {
      test(`${attack.id}: ${attack.name}`, async ({ page }) => {
        const result = await runner.runSecurityAttack(attack);

        await test.info().attach('Attack Details', {
          body: JSON.stringify({
            attack,
            result,
          }, null, 2),
          contentType: 'application/json',
        });

        expect(result.vulnerable,
          `VULNERABLE: ${result.evidence || 'Bot siguió instrucciones inyectadas'}`
        ).toBe(false);
      });
    }
  });

  // ───────────────────────────────────────────────────────────────
  // JAILBREAK
  // ───────────────────────────────────────────────────────────────
  test.describe('Jailbreak Attempts', () => {
    const attacks = getAttacksByType('jailbreak');

    for (const attack of attacks) {
      test(`${attack.id}: ${attack.name}`, async ({ page }) => {
        const result = await runner.runSecurityAttack(attack);

        await test.info().attach('Attack Details', {
          body: JSON.stringify({
            attack,
            result,
          }, null, 2),
          contentType: 'application/json',
        });

        // Jailbreaks críticos NO deben pasar
        if (attack.severity === 'critical') {
          expect(result.vulnerable,
            `CRITICAL JAILBREAK: ${result.evidence}`
          ).toBe(false);
        }
      });
    }
  });

  // ───────────────────────────────────────────────────────────────
  // SYSTEM PROMPT LEAK (LLM07)
  // ───────────────────────────────────────────────────────────────
  test.describe('LLM07: System Prompt Leak', () => {
    const attacks = getAttacksByType('system_prompt_leak');

    for (const attack of attacks) {
      test(`${attack.id}: ${attack.name}`, async ({ page }) => {
        const result = await runner.runSecurityAttack(attack);

        await test.info().attach('Attack Details', {
          body: JSON.stringify({
            attack,
            result,
          }, null, 2),
          contentType: 'application/json',
        });

        expect(result.vulnerable,
          `LEAK DETECTED: ${result.evidence || 'System prompt potentially exposed'}`
        ).toBe(false);
      });
    }
  });

  // ───────────────────────────────────────────────────────────────
  // PII LEAK (LLM06)
  // ───────────────────────────────────────────────────────────────
  test.describe('LLM06: Sensitive Data Disclosure', () => {
    const attacks = getAttacksByType('pii_leak');

    for (const attack of attacks) {
      test(`${attack.id}: ${attack.name}`, async ({ page }) => {
        const result = await runner.runSecurityAttack(attack);

        await test.info().attach('Attack Details', {
          body: JSON.stringify({
            attack,
            result,
          }, null, 2),
          contentType: 'application/json',
        });

        expect(result.vulnerable,
          `PII LEAK: ${result.evidence}`
        ).toBe(false);
      });
    }
  });

  // ───────────────────────────────────────────────────────────────
  // TOXICITY
  // ───────────────────────────────────────────────────────────────
  test.describe('Content Safety - Toxicity', () => {
    const attacks = getAttacksByType('toxicity');

    for (const attack of attacks) {
      test(`${attack.id}: ${attack.name}`, async ({ page }) => {
        const result = await runner.runSecurityAttack(attack);

        await test.info().attach('Attack Details', {
          body: JSON.stringify({
            attack,
            result,
          }, null, 2),
          contentType: 'application/json',
        });

        expect(result.vulnerable,
          `TOXIC CONTENT GENERATED: ${result.evidence}`
        ).toBe(false);
      });
    }
  });

  // ───────────────────────────────────────────────────────────────
  // BIAS
  // ───────────────────────────────────────────────────────────────
  test.describe('Fairness - Bias Detection', () => {
    const attacks = getAttacksByType('bias');

    for (const attack of attacks) {
      test(`${attack.id}: ${attack.name}`, async ({ page }) => {
        const result = await runner.runSecurityAttack(attack);

        await test.info().attach('Attack Details', {
          body: JSON.stringify({
            attack,
            result,
          }, null, 2),
          contentType: 'application/json',
        });

        // Bias medium+ debería fallar
        if (attack.severity !== 'low') {
          expect(result.vulnerable,
            `BIAS DETECTED: ${result.evidence}`
          ).toBe(false);
        }
      });
    }
  });

  // ───────────────────────────────────────────────────────────────
  // FULL SECURITY REPORT
  // ───────────────────────────────────────────────────────────────
  test('SECURITY-REPORT: Full Security Assessment', async ({ page }) => {
    const securityReport = await runner.runSecurityTests('critical');

    await test.info().attach('Security Report', {
      body: JSON.stringify(securityReport, null, 2),
      contentType: 'application/json',
    });

    // No debe haber vulnerabilidades críticas o altas
    expect(securityReport.criticalCount,
      `${securityReport.criticalCount} CRITICAL vulnerabilities found`
    ).toBe(0);

    expect(securityReport.highCount,
      `${securityReport.highCount} HIGH vulnerabilities found`
    ).toBe(0);

    expect(securityReport.passedSecurityCheck,
      `Security check failed. Total vulnerabilities: ${securityReport.vulnerabilitiesFound}`
    ).toBe(true);
  });

  // ───────────────────────────────────────────────────────────────
  // QUICK SECURITY SCAN
  // ───────────────────────────────────────────────────────────────
  test('SECURITY-QUICK: Quick Security Scan (5 random attacks)', async ({ page }) => {
    const securityReport = await runner.runSecurityTests('quick');

    await test.info().attach('Quick Security Report', {
      body: JSON.stringify(securityReport, null, 2),
      contentType: 'application/json',
    });

    expect(securityReport.passedSecurityCheck).toBe(true);
  });
});
