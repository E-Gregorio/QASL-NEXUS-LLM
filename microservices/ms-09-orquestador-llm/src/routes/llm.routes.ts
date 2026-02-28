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

  // Responder inmediatamente
  res.json({ status: 'generating', pipelineId });

  // Generar en background
  try {
    const prompt = buildExploratoryPrompt(targetUrl, objective || 'explorar y validar funcionalidad');
    const startTime = Date.now();

    // Opus genera los tests
    const result = await callClaude(prompt, 'claude-opus-4-6', 8192, 0.2);

    console.log(`[MS-09] Opus genero tests en ${Date.now() - startTime}ms (${result.tokensUsed} tokens)`);

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
  } catch (error: any) {
    console.error(`[MS-09] Error generando tests: ${error.message}`);
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
  return `Eres un ingeniero QA senior experto en Playwright. Tu tarea es generar un archivo de tests E2E completo para la siguiente URL.

URL TARGET: ${targetUrl}
OBJETIVO: ${objective}

INSTRUCCIONES CRITICAS:
1. Genera un UNICO archivo TypeScript valido con import { test, expect } from '@playwright/test'
2. Usa page.goto('${targetUrl}') con la URL completa (no relativa)
3. Genera entre 5 y 10 test cases que cubran:
   - Carga de pagina exitosa
   - Interaccion con elementos principales (inputs, botones)
   - Verificacion de funcionalidad core segun el objetivo
   - Casos negativos (que pasa si no se ingresa datos)
   - Verificacion de elementos visuales (titulos, listas)
4. Usa selectores robustos: data-testid, role, text, CSS selectores estables
5. NO uses selectores dinamicos (IDs generados, nth-child fragil)
6. Cada test debe ser independiente (no depender de otros tests)
7. Incluye waits apropiados (waitForLoadState, expect con timeout)
8. Agrega console.log informativos para ver progreso

FORMATO DE RESPUESTA:
Responde UNICAMENTE con el codigo TypeScript. Sin explicaciones, sin markdown, sin backticks.
El codigo debe empezar con: import { test, expect } from '@playwright/test';

EJEMPLO DE ESTRUCTURA:
import { test, expect } from '@playwright/test';

test.describe('Nombre descriptivo', () => {
  test('TC-001: descripcion', async ({ page }) => {
    await page.goto('${targetUrl}', { waitUntil: 'networkidle' });
    // assertions...
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
