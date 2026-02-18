// ============================================================
// MS-10: MCP Interfaz - Servidor Principal
// Puerto: 5000
// Integration Hub de QASL NEXUS LLM
// ============================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import mcpRoutes from './routes/mcp.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rutas
app.use('/api/mcp', mcpRoutes);

// Root
app.get('/', (_req, res) => {
  res.json({
    service: 'MS-10: MCP Interfaz',
    description: 'Integration Hub - Conecta QASL NEXUS con herramientas externas',
    version: '1.0.0',
    port: PORT,
    endpoints: {
      createBug: 'POST /api/mcp/bug/create (flujo 7 pasos)',
      jiraIssue: 'POST /api/mcp/jira/issue',
      jiraGet: 'GET /api/mcp/jira/issue/:key',
      xrayExec: 'POST /api/mcp/xray/execution',
      testrailResult: 'POST /api/mcp/testrail/result',
      azureBug: 'POST /api/mcp/azure/bug',
      connectors: 'GET /api/mcp/connectors/status',
      health: 'GET /api/mcp/health',
    },
  });
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log('============================================================');
  console.log('  MS-10: MCP INTERFAZ (Integration Hub)');
  console.log(`  Puerto: ${PORT}`);
  console.log('============================================================');

  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.warn('[MS-10] ADVERTENCIA: No se pudo conectar a MS-12.');
  }

  const connectors = {
    Jira: !!process.env.JIRA_API_TOKEN,
    'X-Ray': !!process.env.XRAY_CLIENT_ID,
    TestRail: !!process.env.TESTRAIL_API_KEY,
    'Azure DevOps': !!process.env.AZURE_PAT,
  };

  console.log('[MS-10] Conectores:');
  Object.entries(connectors).forEach(([name, active]) => {
    console.log(`  ${active ? 'OK' : 'NO'} ${name}`);
  });

  console.log(`[MS-10] Herramienta activa: ${process.env.ACTIVE_TOOL || 'jira'}`);
  console.log('============================================================');
  console.log(`[MS-10] Servidor listo en http://localhost:${PORT}`);
  console.log('============================================================');
});
