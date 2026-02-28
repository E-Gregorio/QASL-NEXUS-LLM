// ============================================================
// MS-11: Rutas API del Reportador
// Puerto: 9000
// ============================================================

import { Router, Request, Response } from 'express';
import path from 'path';
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

    const filename = path.basename(pdfPath);
    res.json({
      success: true,
      reportId: reportResult.rows[0].id,
      filename,
      downloadUrl: `/api/report/download/${filename}`,
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
// GET /api/report/download/:filename
// Descarga un PDF generado
// ============================================================
router.get('/download/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename as string;
  const reportsDir = path.join(__dirname, '../../reports');
  const filepath = path.join(reportsDir, filename);

  // Seguridad: solo archivos PDF, sin path traversal
  if (!filename.endsWith('.pdf') || filename.includes('..')) {
    return res.status(400).json({ error: 'Archivo no valido' });
  }

  res.download(filepath, filename, (err: any) => {
    if (err && !res.headersSent) {
      console.error(`[MS-11] Error descargando ${filename}:`, err.message);
      res.status(404).json({ error: 'Archivo no encontrado' });
    }
  });
});

// ============================================================
// POST /api/report/pipeline
// Notifica resultado de pipeline por Slack/Teams
// Usado por: MS-08 (al terminar pipeline)
// ============================================================
router.post('/pipeline', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const channels: string[] = [];

    if (process.env.SLACK_WEBHOOK_URL) {
      await slack.sendPipelineResult(data);
      channels.push('slack');
    }
    if (process.env.TEAMS_WEBHOOK_URL) {
      await teams.sendPipelineResult(data);
      channels.push('teams');
    }

    // Email: envia resumen del pipeline al equipo QA
    if (process.env.SMTP_USER) {
      const alertEmail = process.env.ALERT_EMAIL || process.env.SMTP_USER;
      const statusColor = data.status === 'Success' ? '#36a64f' : '#dc3545';
      const statusEmoji = data.status === 'Success' ? '&#10004;' : '&#10060;';

      await email.send({
        to: alertEmail,
        subject: `[QASL NEXUS] Pipeline ${data.pipelineId} - ${data.status} (${data.passRate || 0}%)`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <div style="background: ${statusColor}; color: white; padding: 16px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">${statusEmoji} Pipeline ${data.status}</h2>
              <p style="margin: 4px 0 0 0; opacity: 0.9;">ID: ${data.pipelineId}</p>
            </div>
            <div style="background: #1a1a2e; color: #e0e0e0; padding: 20px; border-radius: 0 0 8px 8px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px; color: #888;">Total Tests</td><td style="padding: 8px; font-weight: bold;">${data.totalTests || 0}</td></tr>
                <tr><td style="padding: 8px; color: #888;">Passed</td><td style="padding: 8px; color: #36a64f; font-weight: bold;">${(data.totalTests || 0) - (data.failed || 0)}</td></tr>
                <tr><td style="padding: 8px; color: #888;">Failed</td><td style="padding: 8px; color: #dc3545; font-weight: bold;">${data.failed || 0}</td></tr>
                <tr><td style="padding: 8px; color: #888;">Pass Rate</td><td style="padding: 8px; font-weight: bold;">${data.passRate || 0}%</td></tr>
                <tr><td style="padding: 8px; color: #888;">Bugs Creados</td><td style="padding: 8px;">${data.bugs || 0}</td></tr>
              </table>
              <hr style="border-color: #333; margin: 16px 0;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                QASL NEXUS LLM Platform - Reporte automatico de pipeline
              </p>
            </div>
          </div>
        `,
      });
      channels.push('email');
      console.log(`[MS-11] Email pipeline enviado a ${alertEmail}`);
    }

    // Registrar notificacion en MS-12
    await pool.query(
      `INSERT INTO notification (tipo, canal, destinatario, asunto, contenido, estado, enviado_at)
       VALUES ('pipeline_complete', $1, $2, $3, $4, 'Enviado', NOW())`,
      [
        channels.join('+') || 'none',
        process.env.ALERT_EMAIL || 'qa-team',
        `Pipeline ${data.pipelineId} - ${data.status}`,
        JSON.stringify(data),
      ]
    );

    res.json({ success: true, channels });
  } catch (error: any) {
    console.error('[MS-11] Error en /pipeline:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/report/pipeline-pdf
// Genera PDF especifico del pipeline con datos reales
// Usado por: MS-00 (boton Descargar PDF en ResultsPage)
// ============================================================
router.post('/pipeline-pdf', async (req: Request, res: Response) => {
  try {
    const { pipelineId } = req.body;

    if (!pipelineId) {
      return res.status(400).json({ error: 'pipelineId requerido' });
    }

    // Recopilar datos del pipeline desde MS-12
    const pipelineData = await collector.getPipelineData(pipelineId);

    if (!pipelineData.pipeline) {
      return res.status(404).json({ error: `Pipeline ${pipelineId} no encontrado` });
    }

    // Generar PDF del pipeline
    const pdfPath = await pdfGen.generatePipelineReport(pipelineData);

    // Registrar en MS-12
    const reportResult = await pool.query(
      `INSERT INTO report (tipo, formato, nombre, ruta_archivo, source_ms, generado_por)
       VALUES ('pipeline', 'pdf', $1, $2, 'ms-11', 'manual') RETURNING id`,
      [`Pipeline_Report_${pipelineId}`, pdfPath]
    );

    const filename = path.basename(pdfPath);
    console.log(`[MS-11] Pipeline PDF generado: ${filename} (pipeline: ${pipelineId})`);

    res.json({
      success: true,
      reportId: reportResult.rows[0].id,
      filename,
      downloadUrl: `/api/report/download/${filename}`,
      pipelineId,
    });
  } catch (error: any) {
    console.error('[MS-11] Error en /pipeline-pdf:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/report/resend-notification
// Re-envia email de notificacion del pipeline
// Usado por: MS-00 (boton Notificaciones en ResultsPage)
// ============================================================
router.post('/resend-notification', async (req: Request, res: Response) => {
  try {
    const { pipelineId } = req.body;

    if (!pipelineId) {
      return res.status(400).json({ error: 'pipelineId requerido' });
    }

    // Leer datos del pipeline desde MS-12
    const plResult = await pool.query('SELECT * FROM pipeline_run WHERE pipeline_id = $1', [pipelineId]);
    if (plResult.rows.length === 0) {
      return res.status(404).json({ error: `Pipeline ${pipelineId} no encontrado` });
    }

    const pl = plResult.rows[0];
    const status = pl.estado || 'Unknown';
    const totalTests = pl.total_tc_ejecutados || 0;
    const totalFailed = pl.total_failed || 0;
    const passRate = pl.pass_rate || 0;

    if (!process.env.SMTP_USER) {
      return res.status(400).json({ error: 'SMTP no configurado' });
    }

    const alertEmail = process.env.ALERT_EMAIL || process.env.SMTP_USER;
    const statusColor = status === 'Success' ? '#36a64f' : '#dc3545';
    const statusEmoji = status === 'Success' ? '&#10004;' : '&#10060;';

    await email.send({
      to: alertEmail,
      subject: `[QASL NEXUS] Pipeline ${pipelineId} - ${status} (${passRate}%) [Re-enviado]`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <div style="background: ${statusColor}; color: white; padding: 16px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">${statusEmoji} Pipeline ${status}</h2>
            <p style="margin: 4px 0 0 0; opacity: 0.9;">ID: ${pipelineId}</p>
            ${pl.target_url ? `<p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 13px;">URL: ${pl.target_url}</p>` : ''}
          </div>
          <div style="background: #1a1a2e; color: #e0e0e0; padding: 20px; border-radius: 0 0 8px 8px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px; color: #888;">Total Tests</td><td style="padding: 8px; font-weight: bold;">${totalTests}</td></tr>
              <tr><td style="padding: 8px; color: #888;">Passed</td><td style="padding: 8px; color: #36a64f; font-weight: bold;">${totalTests - totalFailed}</td></tr>
              <tr><td style="padding: 8px; color: #888;">Failed</td><td style="padding: 8px; color: #dc3545; font-weight: bold;">${totalFailed}</td></tr>
              <tr><td style="padding: 8px; color: #888;">Pass Rate</td><td style="padding: 8px; font-weight: bold;">${passRate}%</td></tr>
            </table>
            <hr style="border-color: #333; margin: 16px 0;">
            <p style="color: #888; font-size: 12px; margin: 0;">
              Re-enviado manualmente desde QASL NEXUS LLM Command Center
            </p>
          </div>
        </div>
      `,
    });

    // Registrar re-envio
    await pool.query(
      `INSERT INTO notification (tipo, canal, destinatario, asunto, contenido, estado, enviado_at)
       VALUES ('resend', 'email', $1, $2, $3, 'Enviado', NOW())`,
      [alertEmail, `Re-envio Pipeline ${pipelineId}`, JSON.stringify({ pipelineId, status, passRate })]
    );

    console.log(`[MS-11] Email re-enviado: Pipeline ${pipelineId} -> ${alertEmail}`);
    res.json({ success: true, sentTo: alertEmail, pipelineId });
  } catch (error: any) {
    console.error('[MS-11] Error en /resend-notification:', error.message);
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
