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
  const { targetUrl, objective, pipelineId } = req.body;

  if (!targetUrl || !pipelineId) {
    return res.status(400).json({ error: 'targetUrl y pipelineId son requeridos' });
  }

  console.log(`[MS-09] Generando tests para ${targetUrl} (pipeline: ${pipelineId})`);
  console.log(`[MS-09] Objetivo: ${objective || 'explorar y validar funcionalidad'}`);

  try {
    const prompt = buildExploratoryPrompt(targetUrl, objective || 'explorar y validar funcionalidad');
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

function buildExploratoryPrompt(targetUrl: string, objective: string): string {
  return `Eres un ingeniero QA senior con 10+ anos de experiencia en Playwright. Tu trabajo es generar tests E2E que funcionen PERFECTAMENTE en cualquier sitio web real.

URL TARGET: ${targetUrl}
OBJETIVO: ${objective}

REGLAS CRITICAS DE AUTOMATIZACION (si no las sigues, los tests fallaran):

1. NAVEGACION: Usa waitUntil: 'domcontentloaded' (NUNCA 'networkidle' porque ads/trackers lo bloquean)
   await page.goto('${targetUrl}', { waitUntil: 'domcontentloaded' });
   await page.waitForLoadState('domcontentloaded');

2. ESPERAS: Siempre esperar al elemento ANTES de interactuar
   await page.locator('selector').waitFor({ state: 'visible', timeout: 10000 });
   // Luego interactuar

3. SELECTORES (en orden de prioridad):
   - getByRole('button', { name: 'Submit' }) — preferido
   - getByText('texto visible') — para links y labels
   - getByPlaceholder('placeholder text') — para inputs
   - locator('[data-testid="id"]') — si existe
   - locator('main selector, #content selector') — dentro del area de contenido
   NUNCA usar selectores que dependan de estructura CSS de ads o iframes publicitarios

4. ADS Y POPUPS: Los sitios web reales tienen publicidad, banners de cookies, overlays
   - Si un click falla, usar { force: true } o cerrar el overlay primero
   - Ignorar elementos dentro de iframes de ads (googlesyndication, doubleclick, etc.)
   - Enfocar tests en el CONTENIDO PRINCIPAL de la pagina, no en widgets de terceros

5. ASSERTIONS DEFENSIVAS:
   - Usar toBeVisible() en vez de assertions que dependan de texto exacto que puede cambiar
   - Usar toHaveCount() con toBeGreaterThan(0) para verificar que existen elementos
   - Usar { timeout: 10000 } en expects que esperan contenido dinamico
   - Si un elemento puede no existir, verificar con count() > 0 antes de interactuar

6. TESTS INDEPENDIENTES: Cada test hace su propio goto(), no depende de estado anterior

7. UN TEST DEBE FALLAR SOLO SI HAY UN BUG REAL, nunca por:
   - Selector fragil que no encuentra el elemento
   - Timeout porque networkidle espera a que carguen ads
   - Click interceptado por un overlay/popup
   - Texto exacto que cambio

ESTRUCTURA DEL ARCHIVO:
- Genera un UNICO archivo TypeScript valido
- Entre 5 y 10 tests cubriendo: carga, navegacion, interaccion, funcionalidad core, caso negativo
- Cada test con Allure metadata

ALLURE OBLIGATORIO en cada test:
- import { allure } from 'allure-playwright';
- await allure.epic('QASL NEXUS - Exploratory Testing');
- await allure.feature('Feature name');
- await allure.story('Story name');
- await allure.severity('critical' | 'normal' | 'minor');
- await allure.owner('QASL NEXUS AI');
- await allure.tags('exploratory', 'automated');
- await allure.description('Descripcion clara del test');
- Usar test.step() para agrupar acciones
- Screenshot al final: await allure.attachment('Screenshot', await page.screenshot(), 'image/png');

FORMATO: Solo codigo TypeScript. Sin explicaciones, sin markdown, sin backticks.

EJEMPLO CORRECTO:
import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

test.describe('Exploratory: ${targetUrl}', () => {

  test('TC-001: Pagina carga correctamente', async ({ page }) => {
    await allure.epic('QASL NEXUS - Exploratory Testing');
    await allure.feature('Page Load');
    await allure.story('Carga inicial');
    await allure.severity('critical');
    await allure.owner('QASL NEXUS AI');
    await allure.tags('exploratory', 'automated', 'smoke');
    await allure.description('Verifica que la pagina carga y tiene contenido visible');

    await test.step('Navegar a la URL', async () => {
      await page.goto('${targetUrl}', { waitUntil: 'domcontentloaded' });
    });
    await test.step('Verificar que la pagina tiene titulo', async () => {
      await expect(page).not.toHaveTitle('');
    });
    await test.step('Verificar contenido principal visible', async () => {
      const body = page.locator('body');
      await expect(body).toBeVisible();
      const text = await body.innerText();
      expect(text.length).toBeGreaterThan(0);
    });
    await allure.attachment('Screenshot', await page.screenshot(), 'image/png');
  });
});`;
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
