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
  method: 'GET' | 'POST' | 'DELETE',
  body?: any
) {
  const url = `${baseUrl}${path}`;
  if (method === 'GET') return (await axios.get(url, { timeout: 30000 })).data;
  if (method === 'DELETE') return (await axios.delete(url, { timeout: 30000 })).data;
  return (await axios.post(url, body, { timeout: 60000 })).data;
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

router.delete('/pipeline/clean-results', async (_req: Request, res: Response) => {
  try {
    const data = await proxyRequest(MS_URLS.MS08_PIPELINE, '/api/pipeline/clean-results', 'DELETE');
    res.json(data);
  } catch (error: any) {
    console.error('[MS-00] Proxy pipeline/clean-results error:', error.message);
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
// MS-03: Framework Reports (Allure, ZAP, Newman, K6)
// ═══════════════════════════════════════════════════════════

// Proxy reportes HTML (pipe del stream para mantener content-type)
const reportTypes = ['allure', 'zap', 'newman', 'k6'] as const;

for (const rtype of reportTypes) {
  // Servir archivos estaticos de reportes
  router.get(`/framework/report/${rtype}/*`, async (req: Request, res: Response) => {
    try {
      const filePath = req.params[0]; // everything after /report/{type}/
      const response = await axios.get(
        `${MS_URLS.MS03_FRAMEWORK}/api/report/${rtype}/${filePath}`,
        { responseType: 'stream', timeout: 30000 }
      );
      // Pasar content-type del original
      const ct = response.headers['content-type'];
      if (ct) res.setHeader('Content-Type', ct);
      response.data.pipe(res);
    } catch (error: any) {
      res.status(502).json({ error: `MS-03 unreachable: ${error.message}` });
    }
  });

  // Listar reportes disponibles
  router.get(`/framework/report/${rtype}-list`, async (_req: Request, res: Response) => {
    try {
      const data = await proxyRequest(MS_URLS.MS03_FRAMEWORK, `/api/report/${rtype}-list`, 'GET');
      res.json(data);
    } catch (error: any) {
      res.status(502).json({ error: `MS-03 unreachable: ${error.message}` });
    }
  });
}

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

// PDF del pipeline especifico
router.post('/report/pipeline-pdf', async (req: Request, res: Response) => {
  try {
    const data = await proxyRequest(MS_URLS.MS11_REPORT, '/api/report/pipeline-pdf', 'POST', req.body);
    res.json(data);
  } catch (error: any) {
    console.error('[MS-00] Proxy report/pipeline-pdf error:', error.message);
    res.status(502).json({ error: `MS-11 unreachable: ${error.message}` });
  }
});

// Re-enviar notificacion email
router.post('/report/resend-notification', async (req: Request, res: Response) => {
  try {
    const data = await proxyRequest(MS_URLS.MS11_REPORT, '/api/report/resend-notification', 'POST', req.body);
    res.json(data);
  } catch (error: any) {
    console.error('[MS-00] Proxy report/resend-notification error:', error.message);
    res.status(502).json({ error: `MS-11 unreachable: ${error.message}` });
  }
});

router.post('/report/executive', async (req: Request, res: Response) => {
  try {
    const data = await proxyRequest(MS_URLS.MS11_REPORT, '/api/report/executive', 'POST', req.body);
    res.json(data);
  } catch (error: any) {
    console.error('[MS-00] Proxy report/executive error:', error.message);
    res.status(502).json({ error: `MS-11 unreachable: ${error.message}` });
  }
});

// Proxy descarga PDF (pipe del stream)
router.get('/report/download/:filename', async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    const response = await axios.get(
      `${MS_URLS.MS11_REPORT}/api/report/download/${filename}`,
      { responseType: 'stream', timeout: 30000 }
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    response.data.pipe(res);
  } catch (error: any) {
    console.error('[MS-00] Proxy report/download error:', error.message);
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
