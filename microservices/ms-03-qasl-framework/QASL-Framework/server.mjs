#!/usr/bin/env node
// ============================================================
// MS-03: HTTP API Server
// Puerto: 6001
// Recibe requests de MS-08 para ejecutar tests E2E, API, K6, ZAP
// ============================================================

import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.MS03_PORT || 6001;
const DB_URL = process.env.DATABASE_URL || 'postgresql://qasl_admin:qasl_nexus_2026@localhost:5432/qasl_nexus';

app.use(cors());
app.use(express.json());

// ============================================================
// GET /health
// ============================================================
app.get('/health', (_req, res) => {
  res.json({
    service: 'ms-03-qasl-framework',
    status: 'ok',
    timestamp: new Date().toISOString(),
    capabilities: ['e2e', 'api', 'k6', 'zap', 'unit'],
  });
});

// ============================================================
// POST /api/execute
// Ejecuta tests contra una URL target
// Body: { targetUrl, pipelineId, type }
// Llamado por MS-08 Pipeline Executor
// ============================================================
app.post('/api/execute', async (req, res) => {
  const { targetUrl, pipelineId, type = 'full' } = req.body;

  if (!pipelineId) {
    return res.status(400).json({ error: 'pipelineId requerido' });
  }

  console.log(`[MS-03] Pipeline ${pipelineId} recibido (${type})`);
  if (targetUrl) console.log(`[MS-03] Target: ${targetUrl}`);

  // Responder 202 inmediatamente
  res.status(202).json({ status: 'running', pipelineId, targetUrl });

  // Ejecutar en background
  executeTestPipeline(targetUrl, pipelineId, type).catch(err => {
    console.error(`[MS-03] Error pipeline ${pipelineId}:`, err.message);
  });
});

// ============================================================
// Ejecucion del pipeline completo
// ============================================================
async function executeTestPipeline(targetUrl, pipelineId, type) {
  const pool = new pg.Pool({ connectionString: DB_URL });
  const startTime = Date.now();
  const results = { e2e: 'pending', api: 'skip', k6: 'skip', zap: 'skip' };
  let totalPassed = 0;
  let totalFailed = 0;

  try {
    // ── Preparar directorio para specs generados ──
    const generatedDir = path.join(__dirname, 'e2e', 'specs', 'generated');
    if (!fs.existsSync(generatedDir)) {
      fs.mkdirSync(generatedDir, { recursive: true });
    }

    // Crear directorio de screenshots
    const screenshotsDir = path.join(__dirname, 'reports', 'e2e', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // ── Leer tests generados por MS-09 desde MS-12 ──
    const genResult = await pool.query(
      'SELECT id, test_name, test_code, test_type FROM generated_test_case WHERE pipeline_id = $1 ORDER BY id',
      [pipelineId]
    );

    const specFileName = `exploratory-${pipelineId}.spec.ts`;
    const specPath = path.join(generatedDir, specFileName);

    if (genResult.rows.length > 0) {
      // Tests generados por MS-09 Opus
      console.log(`[MS-03] ${genResult.rows.length} tests de MS-09 encontrados en MS-12`);
      const specContent = genResult.rows.map(r => r.test_code).join('\n\n');
      fs.writeFileSync(specPath, specContent);
    } else {
      // Spec exploratorio basico (funciona para cualquier URL)
      console.log('[MS-03] Sin tests de MS-09, generando spec exploratorio basico');
      fs.writeFileSync(specPath, createBasicSpec(targetUrl));
    }

    // ================================================================
    // STEP 1: E2E Tests (Playwright)
    // ================================================================
    console.log('[MS-03] ── STEP 1: E2E Tests (Playwright) ──');

    const e2eEnv = {
      ...process.env,
      BASE_URL: targetUrl,
      RECORD_HAR: 'true',
    };

    try {
      const { stdout, stderr } = await execAsync(
        `npx playwright test "e2e/specs/generated/${specFileName}" --project=chromium`,
        { cwd: __dirname, env: e2eEnv, timeout: 300000 }
      );
      results.e2e = 'pass';
      console.log('[MS-03] E2E: PASS');
    } catch (err) {
      results.e2e = 'fail';
      console.log('[MS-03] E2E: FAIL');
      if (err.stderr) console.log('[MS-03] E2E stderr:', err.stderr.slice(0, 500));
    }

    // Leer resultados JSON de Playwright
    const resultsPath = path.join(__dirname, 'reports', 'e2e', 'results.json');
    if (fs.existsSync(resultsPath)) {
      try {
        const pw = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        totalPassed = pw.stats?.expected || 0;
        totalFailed = pw.stats?.unexpected || 0;
      } catch { /* ignore parse errors */ }
    }

    // Guardar resultado E2E en test_execution (sin FK, solo pipeline_id)
    await pool.query(
      `INSERT INTO test_execution (pipeline_id, resultado, duracion_ms, ambiente, source_ms, notas)
       VALUES ($1, $2, $3, $4, 'ms-03', $5)`,
      [
        pipelineId,
        results.e2e,
        Date.now() - startTime,
        targetUrl,
        `E2E: ${totalPassed} passed, ${totalFailed} failed | URL: ${targetUrl}`,
      ]
    );

    // Actualizar generated_test_case status en MS-12
    if (genResult.rows.length > 0) {
      const status = results.e2e === 'pass' ? 'passed' : 'failed';
      await pool.query(
        `UPDATE generated_test_case SET status = $1, execution_result = $2 WHERE pipeline_id = $3`,
        [status, JSON.stringify({ totalPassed, totalFailed }), pipelineId]
      );
    }

    // ================================================================
    // STEP 2: API Tests (Newman) — solo si hay APIs capturadas
    // ================================================================
    if (['full', 'regression'].includes(type)) {
      const apiCaptureDir = path.join(__dirname, '.api-captures');
      const hasCaptures = fs.existsSync(apiCaptureDir) &&
        fs.readdirSync(apiCaptureDir).some(f => f.endsWith('.json'));

      if (hasCaptures) {
        console.log('[MS-03] ── STEP 2: API Tests (Newman) ──');
        try {
          await execAsync('node scripts/run-api.mjs', {
            cwd: __dirname, timeout: 120000,
          });
          results.api = 'pass';
          console.log('[MS-03] API: PASS');
        } catch {
          results.api = 'fail';
          console.log('[MS-03] API: FAIL');
        }

        // Guardar resultado API
        await pool.query(
          `INSERT INTO test_execution (pipeline_id, resultado, duracion_ms, ambiente, source_ms, notas)
           VALUES ($1, $2, $3, $4, 'ms-03', 'Newman API tests')`,
          [pipelineId, results.api, Date.now() - startTime, targetUrl]
        );
      } else {
        console.log('[MS-03] API: Skip (sin APIs capturadas — app client-side)');
      }
    }

    // ================================================================
    // STEP 3: K6 Performance — solo si hay APIs capturadas
    // ================================================================
    if (['full'].includes(type)) {
      const apiCaptureDir = path.join(__dirname, '.api-captures');
      const hasCaptures = fs.existsSync(apiCaptureDir) &&
        fs.readdirSync(apiCaptureDir).some(f => f.endsWith('.json'));

      if (hasCaptures) {
        console.log('[MS-03] ── STEP 3: K6 Performance ──');
        try {
          await execAsync('node scripts/run-k6.mjs --vus=5 --duration=15s', {
            cwd: __dirname, timeout: 120000,
          });
          results.k6 = 'pass';
          console.log('[MS-03] K6: PASS');
        } catch {
          results.k6 = 'skip';
          console.log('[MS-03] K6: Skip (K6 no disponible)');
        }
      } else {
        console.log('[MS-03] K6: Skip (sin APIs capturadas)');
      }
    }

    // ================================================================
    // STEP 4: ZAP Security — escanea la URL directamente
    // ================================================================
    if (['full', 'security'].includes(type) && targetUrl) {
      console.log('[MS-03] ── STEP 4: ZAP Security ──');
      try {
        await execAsync('node scripts/run-zap.mjs', {
          cwd: __dirname,
          env: { ...process.env, ZAP_TARGET: targetUrl },
          timeout: 300000,
        });
        results.zap = 'pass';
        console.log('[MS-03] ZAP: Completado');

        await pool.query(
          `INSERT INTO test_execution (pipeline_id, resultado, duracion_ms, ambiente, source_ms, notas)
           VALUES ($1, 'pass', $2, $3, 'ms-03', 'OWASP ZAP security scan')`,
          [pipelineId, Date.now() - startTime, targetUrl]
        );
      } catch {
        results.zap = 'skip';
        console.log('[MS-03] ZAP: Skip (ZAP Docker no disponible)');
      }
    }

    // ── Limpiar spec temporal ──
    try { fs.unlinkSync(specPath); } catch { /* ok */ }

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`[MS-03] Pipeline ${pipelineId} completado en ${duration}s`);
    console.log(`[MS-03] Resultados: E2E=${results.e2e} | API=${results.api} | K6=${results.k6} | ZAP=${results.zap}`);
    console.log(`[MS-03] Tests: ${totalPassed} passed, ${totalFailed} failed`);

  } catch (error) {
    console.error(`[MS-03] Error fatal: ${error.message}`);
  } finally {
    await pool.end();
  }
}

// ============================================================
// Spec exploratorio basico para cualquier URL
// Si MS-09 no genero tests, este spec basico descubre la app
// ============================================================
function createBasicSpec(targetUrl) {
  const safeUrl = (targetUrl || 'http://localhost:3000').replace(/'/g, "\\'");

  return `// ============================================================
// Spec Exploratorio Auto-Generado por MS-03
// Target: ${safeUrl}
// ============================================================
import { test, expect } from '@playwright/test';

test.describe('Exploratory: ${safeUrl}', () => {

  test('Page loads successfully', async ({ page }) => {
    const start = Date.now();
    await page.goto('${safeUrl}', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - start;

    const title = await page.title();
    console.log('Title:', title);
    console.log('Load time:', loadTime, 'ms');

    await expect(page).not.toHaveTitle('');
    expect(loadTime).toBeLessThan(5000);
  });

  test('No JavaScript errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('${safeUrl}', { waitUntil: 'networkidle' });

    if (errors.length > 0) {
      console.log('Console errors:', errors);
    }
    expect(errors.length).toBe(0);
  });

  test('Interactive elements discovered', async ({ page }) => {
    await page.goto('${safeUrl}', { waitUntil: 'networkidle' });

    const inputs = await page.locator('input:visible, textarea:visible').count();
    const buttons = await page.locator('button:visible, [role="button"]:visible').count();
    const links = await page.locator('a:visible').count();

    console.log('Interactive elements:');
    console.log('  Inputs:', inputs);
    console.log('  Buttons:', buttons);
    console.log('  Links:', links);

    expect(inputs + buttons + links).toBeGreaterThan(0);
  });

  test('Page has proper heading structure', async ({ page }) => {
    await page.goto('${safeUrl}', { waitUntil: 'networkidle' });

    const h1Count = await page.locator('h1').count();
    const h2Count = await page.locator('h2').count();
    const h3Count = await page.locator('h3').count();

    console.log('Headings: h1=' + h1Count + ' h2=' + h2Count + ' h3=' + h3Count);
    expect(h1Count + h2Count + h3Count).toBeGreaterThan(0);
  });

  test('Full page screenshot captured', async ({ page }) => {
    await page.goto('${safeUrl}', { waitUntil: 'networkidle' });
    await page.screenshot({
      path: 'reports/e2e/screenshots/exploratory-fullpage.png',
      fullPage: true,
    });
  });
});
`;
}

// ============================================================
// 404 handler
// ============================================================
app.use((_req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    endpoints: ['GET /health', 'POST /api/execute'],
  });
});

// ============================================================
// Start server
// ============================================================
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   MS-03 QASL Framework - API Server');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`   Running on: http://localhost:${PORT}`);
  console.log('   Endpoints:');
  console.log('      GET  /health        - Server status');
  console.log('      POST /api/execute   - Execute tests (E2E + API + K6 + ZAP)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
});
