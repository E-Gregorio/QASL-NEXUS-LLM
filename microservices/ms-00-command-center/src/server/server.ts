// ============================================================
// MS-00: COMMAND CENTER
// Frontend + BFF Gateway de QASL NEXUS LLM
// Puerto: 3030
// ============================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { testConnection } from './config/database';
import dashboardRoutes from './routes/dashboard.routes';
import proxyRoutes from './routes/proxy.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3030;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ═══════════════════════════════════════════════════════════
// API Routes (BFF Gateway)
// ═══════════════════════════════════════════════════════════
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/proxy', proxyRoutes);

// ═══════════════════════════════════════════════════════════
// Root info
// ═══════════════════════════════════════════════════════════
app.get('/api', (_req, res) => {
  res.json({
    service: 'MS-00: Command Center',
    version: '1.0.0',
    port: PORT,
    endpoints: {
      dashboard: '/api/dashboard/overview | /traceability | /gaps | /debt | /pass-rate',
      proxy_pipeline: '/api/proxy/pipeline/run | /status/:id | /history | /health',
      proxy_llm: '/api/proxy/llm/process | /health | /rules',
      proxy_mcp: '/api/proxy/mcp/bug/create | /connectors/status',
      proxy_report: '/api/proxy/report/executive | /summary',
    },
  });
});

// ═══════════════════════════════════════════════════════════
// Serve React SPA (produccion)
// ═══════════════════════════════════════════════════════════
const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// ═══════════════════════════════════════════════════════════
// Start Server
// ═══════════════════════════════════════════════════════════
app.listen(PORT, async () => {
  console.log('============================================================');
  console.log('  MS-00: COMMAND CENTER (Frontend + BFF)');
  console.log(`  Puerto: ${PORT}`);
  console.log('============================================================');

  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.warn('[MS-00] ADVERTENCIA: No se pudo conectar a MS-12 PostgreSQL');
  }

  console.log(`[MS-00] Servidor listo en http://localhost:${PORT}`);
  console.log('============================================================');
});
