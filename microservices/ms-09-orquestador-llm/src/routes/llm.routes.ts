// ============================================================
// MS-09: Rutas API del Orquestador LLM
// Puerto: 8000
// ============================================================

import { Router, Request, Response } from 'express';
import pg from 'pg';
import { DecisionEngine } from '../services/decision-engine';
import { VCRCalculator } from '../services/vcr-calculator';
import { TemplateFiller } from '../services/template-filler';
import { callClaude } from '../services/llm-providers';
import { LLMRequest } from '../types';

const DB_URL = process.env.DATABASE_URL || 'postgresql://qasl_admin:qasl_nexus_2026@localhost:5432/qasl_nexus';

const router = Router();
const decisionEngine = new DecisionEngine();
const vcrCalculator = new VCRCalculator();
const templateFiller = new TemplateFiller();

// ============================================================
// POST /api/llm/process
// Endpoint principal: recibe tarea, decide LLM, retorna respuesta
// Usado por: MS-02, MS-04, MS-05, MS-10
// ============================================================
router.post('/process', async (req: Request, res: Response) => {
  try {
    const request: LLMRequest = req.body;

    if (!request.taskType || !request.prompt) {
      return res.status(400).json({ error: 'taskType y prompt son requeridos' });
    }

    const response = await decisionEngine.process(request);
    res.json(response);
  } catch (error: any) {
    console.error('[MS-09] Error en /process:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/llm/vcr/calculate
// Calcula VCR para una User Story
// Usado por: MS-02, MS-08
// ============================================================
router.post('/vcr/calculate', async (req: Request, res: Response) => {
  try {
    const { us_id, tc_id, nombre_hu, criterios_aceptacion, reglas_negocio, prioridad } = req.body;

    if (!us_id || !nombre_hu) {
      return res.status(400).json({ error: 'us_id y nombre_hu son requeridos' });
    }

    const result = await vcrCalculator.calculateAndSave({
      us_id, tc_id, nombre_hu, criterios_aceptacion, reglas_negocio, prioridad,
    });

    res.json(result);
  } catch (error: any) {
    console.error('[MS-09] Error en /vcr/calculate:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/llm/template/fill-bug
// Genera descripcion de bug con IA
// Usado por: MS-10 (MCP) para crear bugs en Jira
// ============================================================
router.post('/template/fill-bug', async (req: Request, res: Response) => {
  try {
    const result = await templateFiller.fillBugReport(req.body);
    res.json({ content: result });
  } catch (error: any) {
    console.error('[MS-09] Error en /template/fill-bug:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/llm/template/fill
// Llena una plantilla generica con IA
// Usado por: MS-10 (MCP)
// ============================================================
router.post('/template/fill', async (req: Request, res: Response) => {
  try {
    const result = await templateFiller.fillTemplate(req.body);
    res.json({ content: result });
  } catch (error: any) {
    console.error('[MS-09] Error en /template/fill:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/llm/exploratory/generate
// Genera tests Playwright con Opus para una URL target
// Usado por: MS-08 Pipeline (flujo exploratorio)
// Guarda tests en generated_test_case (MS-12)
// ============================================================
router.post('/exploratory/generate', async (req: Request, res: Response) => {
  const { targetUrl, objective, pipelineId, domStructure, apiCalls } = req.body;

  if (!targetUrl || !pipelineId) {
    return res.status(400).json({ error: 'targetUrl y pipelineId son requeridos' });
  }

  console.log(`[MS-09] Generando tests para ${targetUrl} (pipeline: ${pipelineId})`);
  console.log(`[MS-09] Objetivo: ${objective || 'explorar y validar funcionalidad'}`);
  console.log(`[MS-09] DOM Structure: ${domStructure ? 'SI (' + (domStructure.meta?.totalInteractive || '?') + ' elementos)' : 'NO (modo legacy)'}`);

  try {
    // Si tenemos domStructure (del DOM scan de MS-03), usarla. Si no, modo legacy.
    const prompt = domStructure
      ? buildDOMPrompt(targetUrl, objective || 'explorar y validar funcionalidad', domStructure, apiCalls)
      : buildLegacyPrompt(targetUrl, objective || 'explorar y validar funcionalidad');
    const startTime = Date.now();

    // Opus genera los tests (sincrono — MS-08 espera)
    const result = await callClaude(prompt, 'claude-opus-4-6', 8192, 0.2);

    const elapsed = Date.now() - startTime;
    console.log(`[MS-09] Opus genero tests en ${elapsed}ms (${result.tokensUsed} tokens)`);

    // Parsear los test cases del response
    const tests = parseGeneratedTests(result.content, targetUrl);

    // Guardar en MS-12
    const pool = new pg.Pool({ connectionString: DB_URL });
    try {
      for (const test of tests) {
        await pool.query(
          `INSERT INTO generated_test_case (pipeline_id, test_name, test_type, test_code, target_url, status)
           VALUES ($1, $2, $3, $4, $5, 'generated')`,
          [pipelineId, test.name, test.type, test.code, targetUrl]
        );
      }
      console.log(`[MS-09] ${tests.length} tests guardados en MS-12 para pipeline ${pipelineId}`);
    } finally {
      await pool.end();
    }

    res.json({ status: 'generated', pipelineId, testsCount: tests.length, elapsed });
  } catch (error: any) {
    console.error(`[MS-09] Error generando tests: ${error.message}`);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// ============================================================
// POST /api/llm/import/adapt
// Via 3: Recibe spec Playwright existente, Sonnet agrega Allure
// wrapping sin tocar selectores ni logica de tests
// Usado por: MS-08 Pipeline (flujo import)
// ============================================================
router.post('/import/adapt', async (req: Request, res: Response) => {
  const { code, targetUrl, pipelineId } = req.body;

  if (!code || !pipelineId) {
    return res.status(400).json({ error: 'code y pipelineId son requeridos' });
  }

  console.log(`[MS-09] Import/Adapt para pipeline ${pipelineId}`);
  console.log(`[MS-09] Target URL: ${targetUrl || 'no especificada'}`);
  console.log(`[MS-09] Codigo original: ${code.length} chars`);

  try {
    const startTime = Date.now();

    // Adaptacion PROGRAMATICA — no LLM. El codigo del usuario NO se reescribe.
    const adapted = injectAllureLayer(code, targetUrl);

    const elapsed = Date.now() - startTime;
    console.log(`[MS-09] Spec adaptado programaticamente en ${elapsed}ms (${adapted.length} chars)`);

    // Extraer nombre del primer test para metadata
    const testNames = [...adapted.matchAll(/test\(['"`](.*?)['"`]/g)].map(m => m[1]);
    const testName = testNames[0] || `Imported spec for ${targetUrl || 'app'}`;

    // Guardar en MS-12
    const pool = new pg.Pool({ connectionString: DB_URL });
    try {
      await pool.query(
        `INSERT INTO generated_test_case (pipeline_id, test_name, test_type, test_code, target_url, status)
         VALUES ($1, $2, $3, $4, $5, 'generated')`,
        [pipelineId, testName, 'e2e', adapted, targetUrl || 'imported']
      );
      console.log(`[MS-09] Spec adaptado guardado en MS-12 para pipeline ${pipelineId}`);
    } finally {
      await pool.end();
    }

    res.json({ status: 'generated', pipelineId, testsCount: 1, elapsed });
  } catch (error: any) {
    console.error(`[MS-09] Error adaptando spec: ${error.message}`);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// ============================================================
// GET /api/llm/health
// Health check
// ============================================================
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    service: 'ms-09-orquestador-llm',
    status: 'ok',
    providers: {
      claude: !!process.env.ANTHROPIC_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      gemini: !!process.env.GOOGLE_AI_API_KEY,
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// Helpers para generacion de tests exploratorios
// ============================================================

// Prompt principal: recibe DOM real escaneado por MS-03
function buildDOMPrompt(targetUrl: string, objective: string, dom: any, apiCalls?: any[]): string {
  // Serializar DOM structure compacto para el prompt
  const inputsSummary = (dom.inputs || []).map((i: any) =>
    `  - ${i.tag}[type=${i.type}] selector="${i.selector}" placeholder="${i.placeholder || ''}" name="${i.name || ''}" ${i.required ? 'REQUIRED' : ''}`
  ).join('\n');

  const buttonsSummary = (dom.buttons || []).map((b: any) =>
    `  - text="${b.text}" selector="${b.selector}" ariaLabel="${b.ariaLabel || ''}"`
  ).join('\n');

  const linksSummary = (dom.links || []).slice(0, 30).map((l: any) =>
    `  - "${l.text}" href="${l.href}" selector="${l.selector}"`
  ).join('\n');

  const selectsSummary = (dom.selects || []).map((s: any) =>
    `  - selector="${s.selector}" name="${s.name || ''}" options(${s.totalOptions}): ${s.options.slice(0, 5).map((o: any) => o.text).join(', ')}${s.totalOptions > 5 ? '...' : ''}`
  ).join('\n');

  const tablesSummary = (dom.tables || []).map((t: any) =>
    `  - selector="${t.selector}" headers=[${t.headers.join(', ')}] rows=${t.rowCount}`
  ).join('\n');

  const formsSummary = (dom.forms || []).map((f: any) =>
    `  - selector="${f.selector}" method=${f.method} action="${f.action || ''}"`
  ).join('\n');

  const navSummary = (dom.navigation || []).map((n: any) =>
    `  - selector="${n.selector}" links: ${n.links.map((l: any) => l.text).join(', ')}`
  ).join('\n');

  const apiSummary = (apiCalls || []).map((a: any) =>
    `  - ${a.method} ${a.url}`
  ).join('\n');

  return `You are a world-class QA automation engineer. Generate production-grade Playwright E2E tests.

URL: ${targetUrl}
TITLE: ${dom.title || 'No title'}
OBJECTIVE: ${objective}

═══════════════════════════════════════════════════════
REAL DOM STRUCTURE (scanned by Playwright headless browser)
═══════════════════════════════════════════════════════

HEADINGS:
  H1: ${(dom.headings?.h1 || []).join(' | ') || 'none'}
  H2: ${(dom.headings?.h2 || []).join(' | ') || 'none'}
  H3: ${(dom.headings?.h3 || []).join(' | ') || 'none'}

FORMS (${dom.forms?.length || 0}):
${formsSummary || '  none'}

INPUTS (${dom.inputs?.length || 0}):
${inputsSummary || '  none'}

SELECTS/DROPDOWNS (${dom.selects?.length || 0}):
${selectsSummary || '  none'}

BUTTONS (${dom.buttons?.length || 0}):
${buttonsSummary || '  none'}

LINKS (${dom.links?.length || 0}):
${linksSummary || '  none'}

TABLES (${dom.tables?.length || 0}):
${tablesSummary || '  none'}

NAVIGATION (${dom.navigation?.length || 0}):
${navSummary || '  none'}

DETECTED APIs (${apiCalls?.length || 0}):
${apiSummary || '  none'}

META: ${dom.meta?.totalElements || 0} total elements, ${dom.meta?.totalInteractive || 0} interactive, language: ${dom.meta?.language || 'undefined'}

═══════════════════════════════════════════════════════
IMPORTS — ONLY THESE TWO LINES, NOTHING ELSE
═══════════════════════════════════════════════════════

import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

DO NOT import anything else. No dotenv, no path, no fs, no custom modules.

═══════════════════════════════════════════════════════
MANDATORY RULES
═══════════════════════════════════════════════════════

SELECTORS — Use ONLY selectors from the DOM scan above. Priority:
  1. Exact selector from DOM scan (e.g., '#todo-input', '[data-testid="submit"]')
  2. page.getByRole() with accessible name
  3. page.getByText() for visible text content
  4. page.getByPlaceholder() for input placeholders
  NEVER invent selectors that do not appear in the DOM structure above.

NAVIGATION — Every page.goto() MUST use:
  await page.goto('${targetUrl}', { waitUntil: 'domcontentloaded', timeout: 30000 });
  NEVER use 'networkidle' — it hangs on sites with analytics, ads, websockets, etc.

WAITING — Before interacting with ANY element, wait for it:
  const el = page.locator('selector');
  await el.waitFor({ state: 'visible', timeout: 10000 });
  await el.click(); // or .fill(), .selectOption(), etc.

POPUPS & OVERLAYS — After EVERY page.goto(), dismiss common blockers:
  const dismissPopups = async () => {
    for (const sel of ['[class*="cookie"] button', '[class*="consent"] button', '[class*="accept"]', '[class*="close-modal"]', '[aria-label="Close"]', 'button:has-text("Accept")', 'button:has-text("OK")', 'button:has-text("Got it")']) {
      await page.locator(sel).first().click({ timeout: 2000 }).catch(() => {});
    }
  };
  Call dismissPopups() right after page.goto() in every test.

test.step() — CRITICAL FOR ALLURE NAVIGATION VISIBILITY:
  Wrap EVERY logical action in test.step(). Each step appears as a named block in Allure.
  At the END of each step, take a screenshot and attach it to Allure:

  await test.step('Navigate to page', async () => {
    await page.goto('${targetUrl}', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await dismissPopups();
    await allure.attachment('Page loaded', await page.screenshot(), 'image/png');
  });

  await test.step('Fill search field', async () => {
    const input = page.locator('#search');
    await input.waitFor({ state: 'visible', timeout: 10000 });
    await input.fill('test query');
    await allure.attachment('Field filled', await page.screenshot(), 'image/png');
  });

  This pattern MUST be used in EVERY test. Without test.step() + screenshots, the Allure report is EMPTY.

ALLURE METADATA — In EVERY test, as the FIRST lines inside the test function:
  await allure.epic('QASL NEXUS - Exploratory Testing');
  await allure.feature('Feature name based on what area the test covers');
  await allure.story('Short descriptive story name');
  await allure.severity('critical'); // or 'normal', 'minor'
  await allure.owner('QASL NEXUS AI');
  await allure.tags('exploratory', 'automated', 'dom-scan');
  await allure.description('Detailed description of what this test validates and why');

EACH TEST IS FULLY INDEPENDENT:
  - Each test has its own page.goto()
  - Each test dismisses popups independently
  - Each test has full Allure metadata
  - A failure in one test does NOT affect others

ASSERTIONS — Always with timeout:
  await expect(page.locator('selector')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('selector')).toHaveText('expected', { timeout: 5000 });
  await expect(page).toHaveTitle(/expected/i, { timeout: 5000 });

ERROR PHILOSOPHY:
  A test should ONLY fail if there is a REAL defect in the application.
  Use .catch(() => {}) for optional actions (dismissing popups, closing banners).
  Use hard assertions ONLY for core functionality that MUST work.

SYNTAX RESTRICTIONS — The transpiler does NOT support:
  - NEVER use optional chaining after await: (await x.method())?.prop — FORBIDDEN
  - Instead: const result = await x.method(); const val = result ? result.prop : null;
  - NEVER use ?? (nullish coalescing) — use || instead
  - NEVER use satisfies keyword
  - Keep TypeScript simple: no generics, no complex type annotations

═══════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════

Output ONLY TypeScript code. No markdown. No backticks. No explanations.
One single file with test.describe() containing 8-10 tests.

Generate tests covering:
  1. Page loads correctly (title, heading, key elements visible)
  2. Main interactive elements are visible and accessible
  3. Input field interaction (type, clear, verify value)
  4. Button click actions (click and verify effect)
  5. Navigation/links work correctly
  6. Form submission flow (if forms exist)
  7. Table/list data verification (if tables exist)
  8. Negative/edge case (empty input, boundary values)
  9. Complete user journey (the main flow end-to-end)
  10. Final page state screenshot

REMEMBER: The DOM selectors above are REAL and VERIFIED by Playwright. Use them directly.`;
}

// Prompt legacy (sin DOM scan, para compatibilidad)
function buildLegacyPrompt(targetUrl: string, objective: string): string {
  return `You are a world-class QA automation engineer. Generate Playwright E2E tests for: ${targetUrl}
OBJECTIVE: ${objective}

ONLY ALLOWED IMPORTS (nothing else):
  import { test, expect } from '@playwright/test';
  import { allure } from 'allure-playwright';

RULES:
- waitUntil: 'domcontentloaded' (NEVER 'networkidle')
- Defensive selectors: getByRole > getByText > getByPlaceholder
- Each test independent with its own page.goto()
- After goto(), dismiss popups/banners with .catch(() => {})
- Wait for elements: locator.waitFor({ state: 'visible', timeout: 10000 })
- Assertions with timeout: toBeVisible({ timeout: 10000 })
- Wrap every action in test.step() with screenshot at end of each step:
  await test.step('Step name', async () => {
    // actions...
    await allure.attachment('Step name', await page.screenshot(), 'image/png');
  });
- Allure metadata in EVERY test: epic, feature, story, severity, owner, tags, description

OUTPUT: Only TypeScript code. No markdown, no backticks. 8-10 tests in test.describe().`;
}

// Via 3: Inyeccion programatica de Allure — NO usa LLM
// Procesamiento linea por linea: elimina imports custom (single y multi-linea),
// agrega stubs, allure metadata. Funciona con cualquier spec Playwright.
function injectAllureLayer(code: string, targetUrl?: string): string {

  // PASO 1: Eliminar bloques JSDoc /** ... */
  let cleaned = code.replace(/\/\*\*[\s\S]*?\*\//g, '');

  // PASO 2: Eliminar dotenv.config()
  cleaned = cleaned.replace(/dotenv\.config\(\);?\s*\n?/g, '');

  // PASO 3: Separar imports del codigo — linea por linea para manejar multi-linea
  const lines = cleaned.split('\n');
  const codeLines: string[] = [];
  let inMultiLineImport = false;
  let currentImportBuffer: string[] = [];

  for (const line of lines) {
    if (inMultiLineImport) {
      currentImportBuffer.push(line);
      // Detectar cierre del import multi-linea: tiene `from '...'`
      if (/from\s+['"]/.test(line)) {
        const fullImport = currentImportBuffer.join('\n');
        // Solo conservar imports de @playwright/test y allure-playwright
        if (/from\s+['"](@playwright\/test|allure-playwright)['"]/.test(fullImport)) {
          codeLines.push(...currentImportBuffer);
        }
        inMultiLineImport = false;
        currentImportBuffer = [];
      }
    } else if (/^\s*import\s+/.test(line)) {
      if (/from\s+['"]/.test(line)) {
        // Import single-linea completo — solo conservar standard
        if (/from\s+['"](@playwright\/test|allure-playwright)['"]/.test(line)) {
          codeLines.push(line);
        }
      } else {
        // Inicio de import multi-linea (import { sin from en esta linea)
        inMultiLineImport = true;
        currentImportBuffer = [line];
      }
    } else {
      codeLines.push(line);
    }
  }

  // PASO 4: Reconstruir con imports standard + stubs al inicio
  const standardImports = [
    "import { test, expect } from '@playwright/test';",
    "import { allure } from 'allure-playwright';",
  ];

  const stubs = `
// ── QASL NEXUS: Stubs para imports custom ──
const Allure = {
  setup: async (opts: any) => {
    if (opts?.epic) await allure.epic(opts.epic);
    if (opts?.feature) await allure.feature(opts.feature);
    if (opts?.story) await allure.story(opts.story);
    if (opts?.severity) await allure.severity(opts.severity);
    if (opts?.owner) await allure.owner(opts.owner);
    if (opts?.tags) await allure.tags(...opts.tags);
  },
  step: async (name: string, fn: () => Promise<void>) => { await test.step(name, fn); },
  attachment: async (name: string, content: Buffer, type: string) => { await allure.attachment(name, content, type); },
};
const logger = { bannerInicio: (...a: any[]) => console.log('[QASL]', ...a), paso: (...a: any[]) => console.log('[PASO]', ...a), exito: (...a: any[]) => console.log('[OK]', ...a), info: (...a: any[]) => console.log(...a), error: (...a: any[]) => console.error(...a), warn: (...a: any[]) => console.warn(...a) };
async function mostrarMensaje(..._a: any[]) {}
async function destacarFila(..._a: any[]) {}
async function quitarDestacadoFila(..._a: any[]) {}
function generarDni() { return String(10000000 + Math.floor(Math.random() * 89999999)); }
function generarNombreAleatorio() { return { nombre: 'Test', apellido: 'QA' }; }
class APICapture { constructor(..._a: any[]) {} async start() {} async stop() {} async getCaptures() { return []; } }
function createPageStub(page: any) { return new Proxy({ page }, { get: (_t: any, p: string) => p === 'page' ? page : async (..._a: any[]) => {} }); }
`;

  let adapted = standardImports.join('\n') + '\n' + stubs + '\n' + codeLines.join('\n');

  // PASO 5: Reemplazar constructores de Page Objects con stubs
  adapted = adapted.replace(/new\s+\w+Page\s*\(page\)/g, 'createPageStub(page) as any');

  // PASO 6: Inyectar Allure metadata al inicio de cada test() block
  adapted = adapted.replace(
    /test\(\s*['"`](.*?)['"`]\s*,\s*async\s*\(\s*\{([^}]*)\}\s*\)\s*=>\s*\{/g,
    (match: string, testName: string, _params: string) => {
      const safeName = testName.replace(/'/g, "\\'");
      return match + `
    // ── QASL NEXUS Allure Layer ──
    await allure.epic('QASL NEXUS - Imported Tests');
    await allure.feature('${safeName}');
    await allure.story('${safeName}');
    await allure.severity('normal');
    await allure.owner('QASL NEXUS Import');
    await allure.tags('imported', 'adapted');
    await allure.description('Imported test: ${safeName}');`;
    }
  );

  // PASO 7: Reemplazar process.env URLs con targetUrl
  if (targetUrl) {
    adapted = adapted.replace(/process\.env\.(?:BASE_URL|URL|TARGET_URL|APP_URL|LOGIN_URL)/g, `'${targetUrl}'`);
  }

  return adapted;
}

function parseGeneratedTests(content: string, targetUrl: string): Array<{ name: string; type: string; code: string }> {
  // Limpiar backticks y markdown si Opus los agrego
  let cleanCode = content
    .replace(/^```(?:typescript|ts)?\n?/gm, '')
    .replace(/```$/gm, '')
    .trim();

  // Si el codigo tiene import, es un spec completo
  if (cleanCode.includes("import { test, expect }")) {
    // Extraer nombres de tests para metadata
    const testNames = [...cleanCode.matchAll(/test\(['"`](.*?)['"`]/g)].map(m => m[1]);

    return [{
      name: testNames[0] || `Exploratory tests for ${targetUrl}`,
      type: 'e2e',
      code: cleanCode,
    }];
  }

  // Fallback: wrappear en un test basico
  return [{
    name: `Exploratory tests for ${targetUrl}`,
    type: 'e2e',
    code: `import { test, expect } from '@playwright/test';\n\ntest.describe('Exploratory', () => {\n  test('Generated test', async ({ page }) => {\n    await page.goto('${targetUrl}');\n    await expect(page).not.toHaveTitle('');\n  });\n});`,
  }];
}

export default router;
