// ============================================================
// MS-09: Rutas API del Orquestador LLM
// Puerto: 8000
// ============================================================

import { Router, Request, Response } from 'express';
import { DecisionEngine } from '../services/decision-engine';
import { VCRCalculator } from '../services/vcr-calculator';
import { TemplateFiller } from '../services/template-filler';
import { LLMRequest } from '../types';

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

export default router;
