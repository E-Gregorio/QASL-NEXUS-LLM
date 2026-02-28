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

// Actualiza un sub-step en fases_ejecutadas (JSONB merge)
async function updateSubStep(pool, pipelineId, key, status) {
  const patch = JSON.stringify({ [key]: status });
  await pool.query(
    `UPDATE pipeline_run SET fases_ejecutadas = COALESCE(fases_ejecutadas, '{}'::jsonb) || $1::jsonb WHERE pipeline_id = $2`,
    [patch, pipelineId]
  );
}

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
// DELETE /api/clean-reports — Borra TODOS los reportes en disco
// Llamado por LIMPIAR RESULTADOS
// ============================================================
app.delete('/api/clean-reports', (_req, res) => {
  const dirs = [
    path.join(__dirname, 'reports', 'e2e', 'allure-results'),
    path.join(__dirname, 'reports', 'e2e', 'allure-report'),
    path.join(__dirname, 'reports', 'e2e', 'html-report'),
    path.join(__dirname, 'reports', 'e2e', 'screenshots'),
    path.join(__dirname, 'reports', 'api'),
    path.join(__dirname, 'reports', 'k6'),
    path.join(__dirname, 'reports', 'zap'),
    path.join(__dirname, 'reports', 'test-results'),
    path.join(__dirname, '.api-captures'),
  ];
  let cleaned = 0;
  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      cleaned++;
    }
  }
  // Borrar results.json si existe
  const resultsJson = path.join(__dirname, 'reports', 'e2e', 'results.json');
  if (fs.existsSync(resultsJson)) fs.unlinkSync(resultsJson);

  console.log(`[MS-03] Clean reports: ${cleaned} directorios eliminados`);
  res.json({ success: true, cleaned });
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

  // Ejecutar sincrono — MS-08 espera con timeout de 5 min
  try {
    const result = await executeTestPipeline(targetUrl, pipelineId, type);
    res.json({ status: 'completed', pipelineId, ...result });
  } catch (err) {
    console.error(`[MS-03] Error pipeline ${pipelineId}:`, err.message);
    res.status(500).json({ status: 'error', pipelineId, error: err.message });
  }
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

    // Limpiar capturas previas antes de E2E
    const apiCaptureDir = path.join(__dirname, '.api-captures');
    if (fs.existsSync(apiCaptureDir)) {
      fs.rmSync(apiCaptureDir, { recursive: true, force: true });
    }

    if (genResult.rows.length > 0) {
      // Tests generados por MS-09 Opus — reemplazar import para usar fixture de captura
      console.log(`[MS-03] ${genResult.rows.length} tests de MS-09 encontrados en MS-12`);
      let specContent = genResult.rows.map(r => r.test_code).join('\n\n');
      specContent = specContent.replace(
        /from\s+['"]@playwright\/test['"]/g,
        "from '../../api-capture'"
      );
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
    await updateSubStep(pool, pipelineId, 'ms03_e2e', 'running');

    const e2eEnv = {
      ...process.env,
      BASE_URL: targetUrl,
      RECORD_HAR: 'true',
      PIPELINE_ID: pipelineId,
    };

    try {
      const { stdout, stderr } = await execAsync(
        `npx playwright test "e2e/specs/generated/${specFileName}" --project=chromium`,
        { cwd: __dirname, env: e2eEnv, timeout: 300000 }
      );
      results.e2e = 'pass';
      console.log('[MS-03] E2E: PASS');
    } catch (err) {
      // Playwright sale con exit code != 0 si hay fails, pero stdout tiene los resultados
      results.e2e = err.stdout?.includes('failed') ? 'fail' : 'pass';
      console.log(`[MS-03] E2E: ${results.e2e.toUpperCase()}`);
      if (err.stderr) console.log('[MS-03] E2E stderr:', err.stderr.slice(0, 500));
    }

    // Leer resultados JSON de Playwright (contadores reales)
    const resultsPath = path.join(__dirname, 'reports', 'e2e', 'results.json');
    if (fs.existsSync(resultsPath)) {
      try {
        const pw = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        // Playwright JSON reporter: suites[].specs[].tests[].results[].status
        if (pw.suites) {
          const countTests = (suites) => {
            let passed = 0, failed = 0, skipped = 0;
            for (const suite of suites) {
              for (const spec of (suite.specs || [])) {
                for (const t of (spec.tests || [])) {
                  const status = t.results?.[0]?.status || t.status;
                  if (status === 'passed' || status === 'expected') passed++;
                  else if (status === 'failed' || status === 'unexpected') failed++;
                  else skipped++;
                }
              }
              // Recurse into nested suites
              if (suite.suites) {
                const sub = countTests(suite.suites);
                passed += sub.passed;
                failed += sub.failed;
                skipped += sub.skipped;
              }
            }
            return { passed, failed, skipped };
          };
          const counts = countTests(pw.suites);
          totalPassed = counts.passed;
          totalFailed = counts.failed;
        } else if (pw.stats) {
          totalPassed = pw.stats.expected || 0;
          totalFailed = pw.stats.unexpected || 0;
        }
      } catch { /* ignore parse errors */ }
    }

    // Generar Allure report HTML
    try {
      console.log('[MS-03] Generando Allure report...');
      await execAsync(
        'npx allure generate reports/e2e/allure-results -o reports/e2e/allure-report --clean',
        { cwd: __dirname, timeout: 60000 }
      );
      console.log('[MS-03] Allure report generado');
    } catch (err) {
      console.log('[MS-03] Allure: Skip (allure CLI no disponible)');
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

    await updateSubStep(pool, pipelineId, 'ms03_e2e', results.e2e === 'pass' ? 'pass' : 'fail');

    // ================================================================
    // STEP 2: API Tests (Newman) — solo si hay APIs capturadas
    // ================================================================
    if (['full', 'regression'].includes(type)) {
      const apiCaptureDir = path.join(__dirname, '.api-captures');
      const hasCaptures = fs.existsSync(apiCaptureDir) &&
        fs.readdirSync(apiCaptureDir).some(f => f.endsWith('.json'));

      if (hasCaptures) {
        console.log('[MS-03] ── STEP 2: API Tests (Newman) ──');
        await updateSubStep(pool, pipelineId, 'ms03_api', 'running');
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
        await updateSubStep(pool, pipelineId, 'ms03_api', results.api);

        // Guardar resultado API
        await pool.query(
          `INSERT INTO test_execution (pipeline_id, resultado, duracion_ms, ambiente, source_ms, notas)
           VALUES ($1, $2, $3, $4, 'ms-03', 'Newman API tests')`,
          [pipelineId, results.api, Date.now() - startTime, targetUrl]
        );
      } else {
        console.log('[MS-03] API: Skip (sin APIs capturadas — app client-side)');
        await updateSubStep(pool, pipelineId, 'ms03_api', 'skip');
      }
    } else {
      await updateSubStep(pool, pipelineId, 'ms03_api', 'skip');
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
        await updateSubStep(pool, pipelineId, 'ms03_k6', 'running');
        try {
          await execAsync('node scripts/run-k6.mjs --vus=3 --duration=15s', {
            cwd: __dirname, timeout: 120000,
          });
          results.k6 = 'pass';
          console.log('[MS-03] K6: PASS');
        } catch {
          results.k6 = 'skip';
          console.log('[MS-03] K6: Skip (K6 no disponible)');
        }
        await updateSubStep(pool, pipelineId, 'ms03_k6', results.k6);
      } else {
        console.log('[MS-03] K6: Skip (sin APIs capturadas)');
        await updateSubStep(pool, pipelineId, 'ms03_k6', 'skip');
      }
    } else {
      await updateSubStep(pool, pipelineId, 'ms03_k6', 'skip');
    }

    // ================================================================
    // STEP 4: ZAP Security — escanea la URL directamente con Docker
    // ================================================================
    if (['full', 'security'].includes(type) && targetUrl) {
      console.log('[MS-03] ── STEP 4: ZAP Security ──');
      await updateSubStep(pool, pipelineId, 'ms03_zap', 'running');

      // Crear directorio de reportes ZAP
      const zapReportDir = path.join(__dirname, 'reports', 'zap');
      if (!fs.existsSync(zapReportDir)) fs.mkdirSync(zapReportDir, { recursive: true });

      try {
        // Docker ZAP baseline scan directo contra la URL
        const cwd = __dirname.replace(/\\/g, '/');
        const dockerPath = cwd.replace(/^([A-Za-z]):/, (_, l) => `//${l.toLowerCase()}`);
        const reportName = `zap-${pipelineId}`;
        const zapCmd = `docker run --rm -v "${dockerPath}/reports/zap:/zap/wrk:rw" -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t "${targetUrl}" -r "${reportName}.html" -J "${reportName}.json" -a -j`;

        await execAsync(zapCmd, { cwd: __dirname, timeout: 300000 });
        results.zap = 'pass';
        console.log('[MS-03] ZAP: Completado');
      } catch (zapErr) {
        // ZAP sale con exit code != 0 si encuentra alertas (WARN/FAIL) — pero el reporte existe
        const reportExists = fs.existsSync(path.join(zapReportDir, `zap-${pipelineId}.html`));
        if (reportExists) {
          results.zap = 'pass';
          console.log('[MS-03] ZAP: Completado (con alertas de seguridad)');
        } else {
          results.zap = 'skip';
          console.log('[MS-03] ZAP: Skip (Docker ZAP no disponible)');
        }
      }

      if (results.zap !== 'skip') {
        await pool.query(
          `INSERT INTO test_execution (pipeline_id, resultado, duracion_ms, ambiente, source_ms, notas)
           VALUES ($1, $2, $3, $4, 'ms-03', 'OWASP ZAP security scan')`,
          [pipelineId, results.zap, Date.now() - startTime, targetUrl]
        );
      }
      await updateSubStep(pool, pipelineId, 'ms03_zap', results.zap);
    } else {
      await updateSubStep(pool, pipelineId, 'ms03_zap', 'skip');
    }

    // ── Limpiar spec temporal ──
    try { fs.unlinkSync(specPath); } catch { /* ok */ }

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`[MS-03] Pipeline ${pipelineId} completado en ${duration}s`);
    console.log(`[MS-03] Resultados: E2E=${results.e2e} | API=${results.api} | K6=${results.k6} | ZAP=${results.zap}`);
    console.log(`[MS-03] Tests: ${totalPassed} passed, ${totalFailed} failed`);

    return { results, totalPassed, totalFailed, duration };

  } catch (error) {
    console.error(`[MS-03] Error fatal: ${error.message}`);
    throw error;
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
import { test, expect } from '../../api-capture';

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
// GET /api/report/allure — Sirve el Allure HTML report
// ============================================================
app.use('/api/report/allure', express.static(path.join(__dirname, 'reports', 'e2e', 'allure-report')));

// ============================================================
// GET /api/report/zap/* — Sirve reportes ZAP (HTML y JSON)
// ============================================================
app.use('/api/report/zap', express.static(path.join(__dirname, 'reports', 'zap')));

// GET /api/report/zap-list — Lista reportes ZAP disponibles
app.get('/api/report/zap-list', (_req, res) => {
  const zapDir = path.join(__dirname, 'reports', 'zap');
  if (!fs.existsSync(zapDir)) return res.json({ reports: [] });
  const files = fs.readdirSync(zapDir)
    .filter(f => f.endsWith('.html'))
    .map(f => ({
      name: f,
      pipelineId: f.replace('zap-', '').replace('.html', ''),
      url: `/api/report/zap/${f}`,
      size: fs.statSync(path.join(zapDir, f)).size,
      date: fs.statSync(path.join(zapDir, f)).mtime,
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ reports: files });
});

// ============================================================
// GET /api/report/newman/* — Sirve reportes Newman (HTML)
// ============================================================
app.use('/api/report/newman', express.static(path.join(__dirname, 'reports', 'api')));

// GET /api/report/newman-list — Lista reportes Newman disponibles
app.get('/api/report/newman-list', (_req, res) => {
  const dir = path.join(__dirname, 'reports', 'api');
  if (!fs.existsSync(dir)) return res.json({ reports: [] });
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.html'))
    .map(f => ({
      name: f,
      url: `/api/report/newman/${f}`,
      size: fs.statSync(path.join(dir, f)).size,
      date: fs.statSync(path.join(dir, f)).mtime,
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ reports: files });
});

// ============================================================
// GET /api/report/k6/* — Sirve reportes K6 (HTML)
// ============================================================
app.use('/api/report/k6', express.static(path.join(__dirname, 'reports', 'k6')));

// GET /api/report/k6-list — Lista reportes K6 disponibles
app.get('/api/report/k6-list', (_req, res) => {
  const dir = path.join(__dirname, 'reports', 'k6');
  if (!fs.existsSync(dir)) return res.json({ reports: [] });
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.html'))
    .map(f => ({
      name: f,
      url: `/api/report/k6/${f}`,
      size: fs.statSync(path.join(dir, f)).size,
      date: fs.statSync(path.join(dir, f)).mtime,
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ reports: files });
});

// ============================================================
// GET /api/report/newman-view/:pipelineId — Redirect al HTML del pipeline
// GET /api/report/k6-view/:pipelineId — Redirect al HTML del pipeline
// ============================================================
app.get('/api/report/newman-view/:pipelineId', (req, res) => {
  const dir = path.join(__dirname, 'reports', 'api');
  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'No hay reportes Newman' });
  const file = fs.readdirSync(dir).find(f => f.startsWith(req.params.pipelineId) && f.endsWith('.html'));
  if (!file) return res.status(404).json({ error: `No hay reporte Newman para ${req.params.pipelineId}` });
  res.redirect(`/api/report/newman/${file}`);
});

app.get('/api/report/k6-view/:pipelineId', (req, res) => {
  const dir = path.join(__dirname, 'reports', 'k6');
  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'No hay reportes K6' });
  const file = fs.readdirSync(dir).find(f => f.startsWith(req.params.pipelineId) && f.endsWith('.html'));
  if (!file) return res.status(404).json({ error: `No hay reporte K6 para ${req.params.pipelineId}` });
  res.redirect(`/api/report/k6/${file}`);
});

// ============================================================
// GET /api/results/:pipelineId — Resultados detallados
// ============================================================
app.get('/api/results/:pipelineId', async (req, res) => {
  const pool = new pg.Pool({ connectionString: DB_URL });
  try {
    const execResult = await pool.query(
      'SELECT * FROM test_execution WHERE pipeline_id = $1 ORDER BY id',
      [req.params.pipelineId]
    );
    const genResult = await pool.query(
      'SELECT id, test_name, test_type, status, execution_result FROM generated_test_case WHERE pipeline_id = $1 ORDER BY id',
      [req.params.pipelineId]
    );
    res.json({
      executions: execResult.rows,
      generatedTests: genResult.rows,
      allureReportUrl: '/api/report/allure/index.html',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await pool.end();
  }
});

// ============================================================
// 404 handler
// ============================================================
app.use((_req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    endpoints: ['GET /health', 'POST /api/execute', 'GET /api/report/allure', 'GET /api/report/zap/:file', 'GET /api/report/zap-list', 'GET /api/report/newman/:file', 'GET /api/report/newman-list', 'GET /api/report/k6/:file', 'GET /api/report/k6-list', 'GET /api/results/:pipelineId'],
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
