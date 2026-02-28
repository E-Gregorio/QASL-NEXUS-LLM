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

  return `Eres un ingeniero QA senior. Genera tests E2E Playwright para esta pagina web.

URL: ${targetUrl}
TITULO: ${dom.title || 'Sin titulo'}
OBJETIVO: ${objective}

═══════════════════════════════════════════════════════
ESTRUCTURA DOM REAL (escaneada por Playwright)
═══════════════════════════════════════════════════════

HEADINGS:
  H1: ${(dom.headings?.h1 || []).join(' | ') || 'ninguno'}
  H2: ${(dom.headings?.h2 || []).join(' | ') || 'ninguno'}
  H3: ${(dom.headings?.h3 || []).join(' | ') || 'ninguno'}

FORMULARIOS (${dom.forms?.length || 0}):
${formsSummary || '  ninguno'}

INPUTS (${dom.inputs?.length || 0}):
${inputsSummary || '  ninguno'}

SELECTS/DROPDOWNS (${dom.selects?.length || 0}):
${selectsSummary || '  ninguno'}

BOTONES (${dom.buttons?.length || 0}):
${buttonsSummary || '  ninguno'}

LINKS (${dom.links?.length || 0}):
${linksSummary || '  ninguno'}

TABLAS (${dom.tables?.length || 0}):
${tablesSummary || '  ninguna'}

NAVEGACION (${dom.navigation?.length || 0}):
${navSummary || '  ninguna'}

APIs DETECTADAS (${apiCalls?.length || 0}):
${apiSummary || '  ninguna'}

META: ${dom.meta?.totalElements || 0} elementos totales, ${dom.meta?.totalInteractive || 0} interactivos, idioma: ${dom.meta?.language || 'no definido'}

═══════════════════════════════════════════════════════
REGLAS OBLIGATORIAS
═══════════════════════════════════════════════════════

1. USA SOLO SELECTORES QUE EXISTEN ARRIBA. No inventes selectores.
   Prioridad: selector del DOM > getByRole > getByText > getByPlaceholder

2. NAVEGACION: waitUntil: 'domcontentloaded' (NUNCA 'networkidle')

3. ESPERAS: Siempre waitFor({ state: 'visible', timeout: 10000 }) antes de interactuar

4. CADA TEST: Hace su propio page.goto(), es independiente

5. ASSERTIONS DEFENSIVAS: toBeVisible(), toHaveCount(), expect con timeout

6. FALLA = BUG REAL: Un test solo debe fallar si hay un defecto real en la app

7. ALLURE en cada test:
   import { allure } from 'allure-playwright';
   await allure.epic('QASL NEXUS - Exploratory Testing');
   await allure.feature('...');
   await allure.story('...');
   await allure.severity('critical' | 'normal' | 'minor');
   await allure.owner('QASL NEXUS AI');
   await allure.tags('exploratory', 'automated');
   await allure.description('...');
   // Usar test.step() para agrupar acciones
   // Screenshot al final: await allure.attachment('Screenshot', await page.screenshot(), 'image/png');

8. FORMATO: Un UNICO archivo TypeScript. Sin markdown, sin backticks, sin explicaciones.
   import { test, expect } from '@playwright/test';
   import { allure } from 'allure-playwright';

9. GENERA 5-10 TESTS cubriendo: carga, elementos visibles, interaccion con inputs/buttons, navegacion, formularios, caso negativo.

IMPORTANTE: Los selectores del DOM scan son REALES y VERIFICADOS. Usalos directamente.`;
}

// Prompt legacy (sin DOM scan, para compatibilidad)
function buildLegacyPrompt(targetUrl: string, objective: string): string {
  return `Eres un ingeniero QA senior. Genera tests E2E Playwright para ${targetUrl}.
OBJETIVO: ${objective}

REGLAS: waitUntil 'domcontentloaded', selectores defensivos (getByRole > getByText > getByPlaceholder), cada test independiente con goto(), assertions con timeout.
ALLURE obligatorio en cada test (epic, feature, story, severity, owner, tags, description, screenshot).
FORMATO: Un archivo TypeScript. Sin markdown ni backticks. 5-10 tests.
import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';`;
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
