// ============================================================
// MS-00: Proxy Routes
// Proxy transparente a MS-08, MS-09, MS-10, MS-11
// ============================================================

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { MS_URLS } from '../config/microservices';

const router = Router();

// Helper: proxy generico
async function proxyRequest(
  baseUrl: string,
  path: string,
  method: 'GET' | 'POST',
  body?: any
) {
  const url = `${baseUrl}${path}`;
  const response = method === 'GET'
    ? await axios.get(url, { timeout: 30000 })
    : await axios.post(url, body, { timeout: 60000 });
  return response.data;
}

// ═══════════════════════════════════════════════════════════
// MS-08: CI/CD Pipeline
// ═══════════════════════════════════════════════════════════

router.post('/pipeline/run', async (req: Request, res: Response) => {
  try {
    const data = await proxyRequest(MS_URLS.MS08_PIPELINE, '/api/pipeline/run', 'POST', req.body);
    res.json(data);
  } catch (error: any) {
    console.error('[MS-00] Proxy pipeline/run error:', error.message);
    res.status(502).json({ error: `MS-08 unreachable: ${error.message}` });
  }
});

router.get('/pipeline/status/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = await proxyRequest(MS_URLS.MS08_PIPELINE, `/api/pipeline/status/${id}`, 'GET');
    res.json(data);
  } catch (error: any) {
    console.error('[MS-00] Proxy pipeline/status error:', error.message);
    res.status(502).json({ error: `MS-08 unreachable: ${error.message}` });
  }
});

router.get('/pipeline/history', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit || '20';
    const data = await proxyRequest(MS_URLS.MS08_PIPELINE, `/api/pipeline/history?limit=${limit}`, 'GET');
    res.json(data);
  } catch (error: any) {
    console.error('[MS-00] Proxy pipeline/history error:', error.message);
    res.status(502).json({ error: `MS-08 unreachable: ${error.message}` });
  }
});

router.get('/pipeline/health', async (_req: Request, res: Response) => {
  try {
    const data = await proxyRequest(MS_URLS.MS08_PIPELINE, '/api/pipeline/health', 'GET');
    res.json(data);
  } catch (error: any) {
    console.error('[MS-00] Proxy pipeline/health error:', error.message);
    res.status(502).json({ error: `MS-08 unreachable: ${error.message}` });
  }
});

// ═══════════════════════════════════════════════════════════
// MS-09: Orquestador LLM
// ═══════════════════════════════════════════════════════════

router.post('/llm/process', async (req: Request, res: Response) => {
  try {
    const data = await proxyRequest(MS_URLS.MS09_LLM, '/api/llm/process', 'POST', req.body);
    res.json(data);
  } catch (error: any) {
    console.error('[MS-00] Proxy llm/process error:', error.message);
    res.status(502).json({ error: `MS-09 unreachable: ${error.message}` });
  }
});

router.get('/llm/health', async (_req: Request, res: Response) => {
  try {
    const data = await proxyRequest(MS_URLS.MS09_LLM, '/api/llm/health', 'GET');
    res.json(data);
  } catch (error: any) {
    console.error('[MS-00] Proxy llm/health error:', error.message);
    res.status(502).json({ error: `MS-09 unreachable: ${error.message}` });
  }
});

router.get('/llm/rules', async (_req: Request, res: Response) => {
  try {
    const data = await proxyRequest(MS_URLS.MS09_LLM, '/api/llm/rules', 'GET');
    res.json(data);
  } catch (error: any) {
    console.error('[MS-00] Proxy llm/rules error:', error.message);
    res.status(502).json({ error: `MS-09 unreachable: ${error.message}` });
  }
});

// ═══════════════════════════════════════════════════════════
// MS-10: MCP Interfaz
// ═══════════════════════════════════════════════════════════

router.post('/mcp/bug/create', async (req: Request, res: Response) => {
  try {
    const data = await proxyRequest(MS_URLS.MS10_MCP, '/api/mcp/bug/create', 'POST', req.body);
    res.json(data);
  } catch (error: any) {
    console.error('[MS-00] Proxy mcp/bug/create error:', error.message);
    res.status(502).json({ error: `MS-10 unreachable: ${error.message}` });
  }
});

router.get('/mcp/connectors/status', async (_req: Request, res: Response) => {
  try {
    const data = await proxyRequest(MS_URLS.MS10_MCP, '/api/mcp/connectors/status', 'GET');
    res.json(data);
  } catch (error: any) {
    console.error('[MS-00] Proxy mcp/connectors error:', error.message);
    res.status(502).json({ error: `MS-10 unreachable: ${error.message}` });
  }
});

// ═══════════════════════════════════════════════════════════
// MS-11: Reportador
// ═══════════════════════════════════════════════════════════

router.post('/report/executive', async (req: Request, res: Response) => {
  try {
    const data = await proxyRequest(MS_URLS.MS11_REPORT, '/api/report/executive', 'POST', req.body);
    res.json(data);
  } catch (error: any) {
    console.error('[MS-00] Proxy report/executive error:', error.message);
    res.status(502).json({ error: `MS-11 unreachable: ${error.message}` });
  }
});

router.get('/report/summary', async (_req: Request, res: Response) => {
  try {
    const data = await proxyRequest(MS_URLS.MS11_REPORT, '/api/report/summary', 'GET');
    res.json(data);
  } catch (error: any) {
    console.error('[MS-00] Proxy report/summary error:', error.message);
    res.status(502).json({ error: `MS-11 unreachable: ${error.message}` });
  }
});

export default router;
