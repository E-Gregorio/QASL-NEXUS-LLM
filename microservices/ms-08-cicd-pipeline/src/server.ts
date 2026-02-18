// ============================================================
// MS-08: CI/CD Pipeline - Servidor Principal
// Puerto: 8888
// Director de orquesta de QASL NEXUS LLM
// ============================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import pipelineRoutes from './routes/pipeline.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8888;

app.use(cors());
app.use(express.json());

app.use('/api/pipeline', pipelineRoutes);

app.get('/', (_req, res) => {
  res.json({
    service: 'MS-08: CI/CD Pipeline',
    description: 'Director de orquesta - Ejecuta pipelines completos',
    version: '1.0.0',
    port: PORT,
    endpoints: {
      run: 'POST /api/pipeline/run',
      status: 'GET /api/pipeline/status/:id',
      history: 'GET /api/pipeline/history',
      health: 'GET /api/pipeline/health',
    },
    pipeline_types: ['full', 'regression', 'smoke', 'security', 'mobile'],
  });
});

app.listen(PORT, async () => {
  console.log('============================================================');
  console.log('  MS-08: CI/CD PIPELINE (Director de Orquesta)');
  console.log(`  Puerto: ${PORT}`);
  console.log('============================================================');

  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.warn('[MS-08] ADVERTENCIA: No se pudo conectar a MS-12.');
  }

  console.log('[MS-08] Pipeline types: full | regression | smoke | security | mobile');
  console.log('============================================================');
  console.log(`[MS-08] Servidor listo en http://localhost:${PORT}`);
  console.log('============================================================');
});
