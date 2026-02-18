// ============================================================
// MS-11: Reportador Multi-Canal - Servidor Principal
// Puerto: 9000
// ============================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { testConnection } from './config/database';
import reportRoutes from './routes/report.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 9000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/report', reportRoutes);

app.get('/', (_req, res) => {
  res.json({
    service: 'MS-11: Reportador Multi-Canal',
    description: 'Consolida reportes y notifica por Email, Slack, Teams',
    version: '1.0.0',
    port: PORT,
    endpoints: {
      executive: 'POST /api/report/executive',
      pipeline: 'POST /api/report/pipeline',
      alert: 'POST /api/report/alert',
      summary: 'GET /api/report/summary',
      health: 'GET /api/report/health',
    },
  });
});

app.listen(PORT, async () => {
  console.log('============================================================');
  console.log('  MS-11: REPORTADOR MULTI-CANAL');
  console.log(`  Puerto: ${PORT}`);
  console.log('============================================================');

  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.warn('[MS-11] ADVERTENCIA: No se pudo conectar a MS-12.');
  }

  const channels = {
    Email: !!process.env.SMTP_USER,
    Slack: !!process.env.SLACK_WEBHOOK_URL,
    Teams: !!process.env.TEAMS_WEBHOOK_URL,
  };

  console.log('[MS-11] Canales:');
  Object.entries(channels).forEach(([name, active]) => {
    console.log(`  ${active ? 'OK' : 'NO'} ${name}`);
  });

  // Cron: Reporte semanal automatico (viernes 5pm)
  if (process.env.ENABLE_WEEKLY_CRON === 'true') {
    cron.schedule('0 17 * * 5', async () => {
      console.log('[MS-11] Ejecutando reporte semanal automatico...');
      // Trigger interno al endpoint /api/report/executive
    });
    console.log('[MS-11] Cron semanal activo: Viernes 17:00');
  }

  console.log('============================================================');
  console.log(`[MS-11] Servidor listo en http://localhost:${PORT}`);
  console.log('============================================================');
});
