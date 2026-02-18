// ============================================================
// MS-11: Rutas API del Reportador
// Puerto: 9000
// ============================================================

import { Router, Request, Response } from 'express';
import { DataCollector } from '../services/data-collector';
import { PDFGenerator } from '../generators/pdf-generator';
import { SlackChannel } from '../channels/slack.channel';
import { TeamsChannel } from '../channels/teams.channel';
import { EmailChannel } from '../channels/email.channel';
import { pool } from '../config/database';

const router = Router();
const collector = new DataCollector();
const pdfGen = new PDFGenerator();
const slack = new SlackChannel();
const teams = new TeamsChannel();
const email = new EmailChannel();

// ============================================================
// POST /api/report/executive
// Genera PDF ejecutivo de 5 paginas y lo envia
// Usado por: MS-08 (trigger semanal)
// ============================================================
router.post('/executive', async (req: Request, res: Response) => {
  try {
    const { recipients, channels } = req.body;

    // Recopilar datos de MS-12
    const summary = await collector.getExecutiveSummary();
    const execMetrics = await collector.getTestExecutionMetrics();
    const defectMetrics = await collector.getDefectMetrics();

    // Generar PDF
    const pdfPath = await pdfGen.generateExecutiveReport(summary, execMetrics, defectMetrics);

    // Guardar registro en MS-12
    const reportResult = await pool.query(
      `INSERT INTO report (tipo, formato, nombre, ruta_archivo, source_ms, generado_por)
       VALUES ('executive', 'pdf', $1, $2, 'ms-11', 'auto') RETURNING id`,
      [`Executive_Report_${new Date().toISOString().split('T')[0]}`, pdfPath]
    );

    // Enviar por canales solicitados
    if (channels?.includes('email') && recipients?.length > 0) {
      await email.sendWeeklyReport(recipients, pdfPath);
    }
    if (channels?.includes('slack')) {
      await slack.send({
        title: 'Reporte Ejecutivo Generado',
        text: `Pass Rate: ${execMetrics.pass_rate}% | Defectos: ${defectMetrics.total} | Bloqueantes: ${summary.bloqueantes_activos}`,
        color: execMetrics.pass_rate >= 95 ? '#36a64f' : '#dc3545',
      });
    }
    if (channels?.includes('teams')) {
      await teams.send({
        title: 'Reporte Ejecutivo QA',
        text: `Pass Rate: ${execMetrics.pass_rate}%`,
        facts: [
          { name: 'Total TCs', value: `${summary.total_test_cases}` },
          { name: 'Defectos Abiertos', value: `${summary.defectos_abiertos}` },
          { name: 'Bloqueantes', value: `${summary.bloqueantes_activos}` },
        ],
      });
    }

    res.json({
      success: true,
      reportId: reportResult.rows[0].id,
      pdfPath,
      summary,
      execMetrics,
      defectMetrics,
    });
  } catch (error: any) {
    console.error('[MS-11] Error en /executive:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/report/pipeline
// Notifica resultado de pipeline por Slack/Teams
// Usado por: MS-08 (al terminar pipeline)
// ============================================================
router.post('/pipeline', async (req: Request, res: Response) => {
  try {
    const data = req.body;

    if (process.env.SLACK_WEBHOOK_URL) {
      await slack.sendPipelineResult(data);
    }
    if (process.env.TEAMS_WEBHOOK_URL) {
      await teams.sendPipelineResult(data);
    }

    // Registrar notificacion en MS-12
    await pool.query(
      `INSERT INTO notification (tipo, canal, destinatario, asunto, contenido, estado, enviado_at)
       VALUES ('pipeline_complete', 'slack+teams', 'qa-team', $1, $2, 'Enviado', NOW())`,
      [`Pipeline ${data.pipelineId} - ${data.status}`, JSON.stringify(data)]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('[MS-11] Error en /pipeline:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/report/alert
// Envia alerta critica por todos los canales
// Usado por: MS-07 (Sentinel alertas)
// ============================================================
router.post('/alert', async (req: Request, res: Response) => {
  try {
    const { severity, message, source } = req.body;

    if (process.env.SLACK_WEBHOOK_URL) {
      await slack.sendAlert(severity, message);
    }
    if (process.env.TEAMS_WEBHOOK_URL) {
      await teams.send({ title: `ALERTA ${severity}`, text: message, color: 'dc3545' });
    }

    await pool.query(
      `INSERT INTO notification (tipo, canal, destinatario, asunto, contenido, estado, enviado_at)
       VALUES ('alerta', 'all', 'qa-team', $1, $2, 'Enviado', NOW())`,
      [`Alerta ${severity} - ${source}`, message]
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /api/report/summary
// Retorna resumen ejecutivo (JSON, sin PDF)
// Usado por: MS-07 (Grafana datasource)
// ============================================================
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const summary = await collector.getExecutiveSummary();
    const execMetrics = await collector.getTestExecutionMetrics();
    const defectMetrics = await collector.getDefectMetrics();
    res.json({ summary, execMetrics, defectMetrics });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /api/report/health
// ============================================================
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    service: 'ms-11-reportador',
    status: 'ok',
    channels: {
      email: !!process.env.SMTP_USER,
      slack: !!process.env.SLACK_WEBHOOK_URL,
      teams: !!process.env.TEAMS_WEBHOOK_URL,
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
