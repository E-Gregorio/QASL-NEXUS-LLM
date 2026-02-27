// ============================================================
// MS-10: Rutas API del MCP Integration Hub
// Puerto: 5000
// ============================================================

import { Router, Request, Response } from 'express';
import { BugCreationFlow } from '../services/bug-creation-flow';
import { JiraConnector } from '../connectors/jira.connector';
import { XRayConnector } from '../connectors/xray.connector';
import { TestRailConnector } from '../connectors/testrail.connector';
import { AzureDevOpsConnector } from '../connectors/azure-devops.connector';

const router = Router();
const bugFlow = new BugCreationFlow();

// ============================================================
// POST /api/mcp/bug/create
// Flujo completo de 7 pasos: fallo → bug en Jira/Azure
// Usado por: MS-03, MS-04, MS-06 (cuando un test falla)
// ============================================================
router.post('/bug/create', async (req: Request, res: Response) => {
  try {
    const event = req.body;

    if (!event.tc_id || !event.resultado_real) {
      return res.status(400).json({ error: 'tc_id y resultado_real son requeridos' });
    }

    const issue = await bugFlow.execute(event);
    res.json({ success: true, issue });
  } catch (error: any) {
    console.error('[MS-10] Error en /bug/create:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/mcp/jira/issue
// Crea issue directo en Jira (sin flujo completo)
// ============================================================
router.post('/jira/issue', async (req: Request, res: Response) => {
  try {
    const jira = new JiraConnector();
    const issue = await jira.createBug(req.body);
    res.json({ success: true, issue });
  } catch (error: any) {
    console.error('[MS-10] Error en /jira/issue:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /api/mcp/jira/issue/:key
// Obtiene estado de un issue en Jira
// ============================================================
router.get('/jira/issue/:key', async (req: Request, res: Response) => {
  try {
    const jira = new JiraConnector();
    const issue = await jira.getIssue(req.params.key as string);
    res.json(issue);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/mcp/xray/execution
// Importa resultados de ejecucion a X-Ray
// ============================================================
router.post('/xray/execution', async (req: Request, res: Response) => {
  try {
    const xray = new XRayConnector();
    await xray.authenticate();
    const execKey = await xray.importExecution(req.body);
    res.json({ success: true, executionKey: execKey });
  } catch (error: any) {
    console.error('[MS-10] Error en /xray/execution:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/mcp/testrail/result
// Reporta resultado a TestRail
// ============================================================
router.post('/testrail/result', async (req: Request, res: Response) => {
  try {
    const testrail = new TestRailConnector();
    const { runId, caseId, ...result } = req.body;
    await testrail.addResult(runId, caseId, result);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[MS-10] Error en /testrail/result:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/mcp/azure/bug
// Crea bug en Azure DevOps
// ============================================================
router.post('/azure/bug', async (req: Request, res: Response) => {
  try {
    const azure = new AzureDevOpsConnector();
    const issue = await azure.createBug(req.body);
    res.json({ success: true, issue });
  } catch (error: any) {
    console.error('[MS-10] Error en /azure/bug:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /api/mcp/connectors/status
// Estado de todos los conectores configurados
// ============================================================
router.get('/connectors/status', (_req: Request, res: Response) => {
  res.json({
    jira: {
      enabled: !!process.env.JIRA_BASE_URL && !!process.env.JIRA_API_TOKEN,
      baseUrl: process.env.JIRA_BASE_URL || 'no configurado',
    },
    xray: {
      enabled: !!process.env.XRAY_CLIENT_ID,
      baseUrl: process.env.XRAY_BASE_URL || 'no configurado',
    },
    testrail: {
      enabled: !!process.env.TESTRAIL_API_KEY,
      baseUrl: process.env.TESTRAIL_BASE_URL || 'no configurado',
    },
    azure_devops: {
      enabled: !!process.env.AZURE_PAT,
      organization: process.env.AZURE_ORG || 'no configurado',
    },
    active_tool: process.env.ACTIVE_TOOL || 'jira',
  });
});

// ============================================================
// GET /api/mcp/health
// ============================================================
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    service: 'ms-10-mcp-interfaz',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
