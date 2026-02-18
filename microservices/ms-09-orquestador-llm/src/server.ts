// ============================================================
// MS-09: Orquestador LLM - Servidor Principal
// Puerto: 8000
// Cerebro de QASL NEXUS LLM
// ============================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import llmRoutes from './routes/llm.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rutas
app.use('/api/llm', llmRoutes);

// Root
app.get('/', (_req, res) => {
  res.json({
    service: 'MS-09: Orquestador LLM',
    description: 'Cerebro Multi-LLM de QASL NEXUS LLM',
    version: '1.0.0',
    port: PORT,
    endpoints: {
      process: 'POST /api/llm/process',
      vcr: 'POST /api/llm/vcr/calculate',
      fillBug: 'POST /api/llm/template/fill-bug',
      fillTemplate: 'POST /api/llm/template/fill',
      health: 'GET /api/llm/health',
    },
  });
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log('============================================================');
  console.log('  MS-09: ORQUESTADOR LLM');
  console.log(`  Puerto: ${PORT}`);
  console.log('============================================================');

  // Verificar conexion a MS-12
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.warn('[MS-09] ADVERTENCIA: No se pudo conectar a MS-12. VCR no se guardara en BD.');
  }

  // Verificar API keys
  const providers = {
    Claude: !!process.env.ANTHROPIC_API_KEY,
    OpenAI: !!process.env.OPENAI_API_KEY,
    Gemini: !!process.env.GOOGLE_AI_API_KEY,
  };

  console.log('[MS-09] Proveedores LLM:');
  Object.entries(providers).forEach(([name, active]) => {
    console.log(`  ${active ? 'OK' : 'NO'} ${name}`);
  });

  console.log('============================================================');
  console.log(`[MS-09] Servidor listo en http://localhost:${PORT}`);
  console.log('============================================================');
});
