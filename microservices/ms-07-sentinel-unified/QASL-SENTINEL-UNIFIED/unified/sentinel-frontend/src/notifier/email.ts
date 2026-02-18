// ============================================
// SIGMA-SENTINEL - Email Notifier
// ============================================
// AGIP - Buenos Aires Ciudad

import nodemailer from 'nodemailer';
import { GuardianReport, GuardianReportWithSecurity, EmailNotification } from '../types.js';
import { getSmtpConfig, getNotificationConfig } from '../config.js';
import { GrafanaScreenshot } from './grafana-screenshot.js';
import chalk from 'chalk';

export class EmailNotifier {
  private transporter: nodemailer.Transporter;
  private config = getNotificationConfig();
  private verbose: boolean;
  private grafanaScreenshot: GrafanaScreenshot;

  constructor(verbose: boolean = true) {
    this.verbose = verbose;
    const smtpConfig = getSmtpConfig();

    this.transporter = nodemailer.createTransport(smtpConfig);
    this.grafanaScreenshot = new GrafanaScreenshot(verbose);
  }

  async sendReport(report: GuardianReport | GuardianReportWithSecurity): Promise<void> {
    if (!this.config.alertEmail) {
      this.log('No alert email configured, skipping notification');
      return;
    }

    this.log(`Sending email to: ${this.config.alertEmail}`);

    const screenshotPath = await this.grafanaScreenshot.captureSnapshot();

    const subject = this.buildSubject(report);
    const htmlBody = this.buildHtmlBody(report, screenshotPath !== null);
    const textBody = this.buildTextBody(report);

    const notification: EmailNotification = {
      to: [this.config.alertEmail],
      subject,
      htmlBody,
      textBody,
    };

    const attachments: any[] = [];
    if (screenshotPath) {
      attachments.push({
        filename: 'grafana-dashboard.png',
        path: screenshotPath,
        cid: 'grafana-dashboard',
      });
    }

    try {
      await this.transporter.sendMail({
        from: this.config.fromEmail,
        to: notification.to.join(', '),
        subject: notification.subject,
        html: notification.htmlBody,
        text: notification.textBody,
        attachments,
      });

      this.log('Email sent successfully' + (screenshotPath ? ' (with Grafana screenshot)' : ''));

    } catch (error: any) {
      console.error(chalk.red('Email send failed:'), error.message);
      throw error;
    }
  }

  private buildSubject(report: GuardianReport | GuardianReportWithSecurity): string {
    const statusText = {
      'stable': 'ESTABLE',
      'changes-detected': 'CAMBIOS DETECTADOS',
      'critical': 'CRITICO',
      'error': 'ERROR',
    };

    const extReport = report as GuardianReportWithSecurity;
    const securityTag = extReport.securityStatus === 'critical' ? ' - ALERTA SEGURIDAD' :
                        extReport.securityStatus === 'degraded' ? ' - Seguridad Degradada' : '';

    return `SIGMA-SENTINEL | Reporte ${statusText[report.status]}${securityTag} | ${new Date(report.timestamp).toLocaleDateString('es-AR')}`;
  }

  private buildHtmlBody(report: GuardianReport | GuardianReportWithSecurity, hasScreenshot: boolean = false): string {
    const extReport = report as GuardianReportWithSecurity;
    const grafanaUrl = process.env.GRAFANA_URL || 'http://localhost:3002';

    const statusText = {
      'stable': 'ESTABLE',
      'changes-detected': 'CAMBIOS DETECTADOS',
      'critical': 'CRITICO',
      'error': 'ERROR',
    };

    const confidence = report.aiAnalysis?.confidence ? (report.aiAnalysis.confidence * 100).toFixed(0) : 'N/A';
    const impactedTests = report.aiAnalysis?.impactedTests?.length || 0;
    const execTime = (report.executionTime / 1000).toFixed(1);

    const dateFormatted = new Date(report.timestamp).toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeFormatted = new Date(report.timestamp).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SIGMA-SENTINEL - Reporte Tecnico</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, Helvetica, sans-serif; background-color: #ffffff; color: #333333; font-size: 14px; line-height: 1.5;">

  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 800px; margin: 0 auto; border: 1px solid #cccccc;">

    <!-- HEADER -->
    <tr>
      <td style="background-color: #2c3e50; padding: 20px; border-bottom: 3px solid #1a252f;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">SIGMA-SENTINEL</h1>
        <p style="color: #bdc3c7; margin: 5px 0 0; font-size: 12px;">Sistema Autonomo de Monitoreo de Ambientes de Testing</p>
      </td>
    </tr>

    <!-- INFO GENERAL -->
    <tr>
      <td style="padding: 20px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%">
              <p style="margin: 0; color: #6c757d; font-size: 12px;">Fecha del Reporte</p>
              <p style="margin: 2px 0 0; font-weight: bold;">${dateFormatted}</p>
              <p style="margin: 0; color: #6c757d; font-size: 12px;">${timeFormatted} hs</p>
            </td>
            <td width="50%" style="text-align: right;">
              <p style="margin: 0; color: #6c757d; font-size: 12px;">Ambiente</p>
              <p style="margin: 2px 0 0; font-weight: bold;">SIGMA-DEV (Testing)</p>
              <p style="margin: 0; color: #6c757d; font-size: 11px;">${report.environment}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ================================================================== -->
    <!-- SECCION 1: MONITOREO DE AMBIENTE -->
    <!-- ================================================================== -->
    <tr>
      <td style="padding: 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color: #34495e; padding: 12px 20px;">
              <h2 style="color: #ffffff; margin: 0; font-size: 16px; font-weight: bold;">1. MONITOREO DE AMBIENTE</h2>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding: 20px;">
        <!-- Estado -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
          <tr>
            <td style="background-color: ${report.status === 'stable' ? '#d4edda' : report.status === 'changes-detected' ? '#fff3cd' : '#f8d7da'}; padding: 15px; border: 1px solid ${report.status === 'stable' ? '#c3e6cb' : report.status === 'changes-detected' ? '#ffeeba' : '#f5c6cb'};">
              <table width="100%">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 12px; color: #6c757d;">ESTADO DEL AMBIENTE</p>
                    <p style="margin: 5px 0 0; font-size: 20px; font-weight: bold; color: ${report.status === 'stable' ? '#155724' : report.status === 'changes-detected' ? '#856404' : '#721c24'};">${statusText[report.status]}</p>
                  </td>
                  <td style="text-align: right;">
                    <p style="margin: 0; font-size: 12px; color: #6c757d;">Tiempo de Ejecucion</p>
                    <p style="margin: 5px 0 0; font-size: 16px; font-weight: bold;">${execTime}s</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Metricas -->
        <table width="100%" cellpadding="0" cellspacing="10" style="margin-bottom: 20px;">
          <tr>
            <td width="33%" style="background-color: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #6c757d; text-transform: uppercase;">Cambios Detectados</p>
              <p style="margin: 8px 0 0; font-size: 32px; font-weight: bold; color: ${report.changesCount > 0 ? '#dc3545' : '#28a745'};">${report.changesCount}</p>
            </td>
            <td width="33%" style="background-color: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #6c757d; text-transform: uppercase;">Confianza IA</p>
              <p style="margin: 8px 0 0; font-size: 32px; font-weight: bold; color: #333333;">${confidence}${confidence !== 'N/A' ? '%' : ''}</p>
            </td>
            <td width="33%" style="background-color: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #6c757d; text-transform: uppercase;">Tests en Riesgo</p>
              <p style="margin: 8px 0 0; font-size: 32px; font-weight: bold; color: ${impactedTests > 0 ? '#dc3545' : '#28a745'};">${impactedTests}</p>
            </td>
          </tr>
        </table>

        ${report.aiAnalysis?.impactedTests && report.aiAnalysis.impactedTests.length > 0 ? `
        <!-- Tests Afectados -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; border: 1px solid #dee2e6;">
          <tr>
            <td style="background-color: #f8f9fa; padding: 10px 15px; border-bottom: 1px solid #dee2e6;">
              <p style="margin: 0; font-weight: bold; font-size: 13px;">Tests en Riesgo (${report.aiAnalysis.impactedTests.length})</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr style="background-color: #e9ecef;">
                  <th style="padding: 8px 10px; text-align: left; font-size: 11px; border-bottom: 1px solid #dee2e6;">Test</th>
                  <th style="padding: 8px 10px; text-align: left; font-size: 11px; border-bottom: 1px solid #dee2e6;">Archivo</th>
                  <th style="padding: 8px 10px; text-align: center; font-size: 11px; border-bottom: 1px solid #dee2e6; width: 80px;">Riesgo</th>
                </tr>
                ${report.aiAnalysis.impactedTests.slice(0, 5).map((test, idx) => `
                <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                  <td style="padding: 8px 10px; font-size: 12px; border-bottom: 1px solid #dee2e6;">${test.testName}</td>
                  <td style="padding: 8px 10px; font-size: 11px; color: #6c757d; border-bottom: 1px solid #dee2e6;">${test.testFile}:${test.lineNumber}</td>
                  <td style="padding: 8px 10px; text-align: center; font-size: 12px; font-weight: bold; border-bottom: 1px solid #dee2e6; color: ${test.failureProbability > 0.7 ? '#dc3545' : '#ffc107'};">${(test.failureProbability * 100).toFixed(0)}%</td>
                </tr>
                `).join('')}
              </table>
            </td>
          </tr>
        </table>
        ` : ''}

        ${report.aiAnalysis?.recommendations && report.aiAnalysis.recommendations.length > 0 ? `
        <!-- Recomendaciones -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #dee2e6;">
          <tr>
            <td style="background-color: #f8f9fa; padding: 10px 15px; border-bottom: 1px solid #dee2e6;">
              <p style="margin: 0; font-weight: bold; font-size: 13px;">Recomendaciones</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 15px;">
              <ul style="margin: 0; padding-left: 20px;">
                ${report.aiAnalysis.recommendations.slice(0, 5).map(rec => `
                <li style="margin-bottom: 8px; font-size: 13px; color: #333333;">${rec}</li>
                `).join('')}
              </ul>
            </td>
          </tr>
        </table>
        ` : ''}
      </td>
    </tr>

    <!-- ================================================================== -->
    <!-- SECCION 2: SEGURIDAD OWASP ZAP -->
    <!-- ================================================================== -->
    ${extReport.securityReport?.enabled ? `
    <tr>
      <td style="padding: 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color: #34495e; padding: 12px 20px;">
              <h2 style="color: #ffffff; margin: 0; font-size: 16px; font-weight: bold;">2. ANALISIS DE SEGURIDAD (OWASP ZAP)</h2>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding: 20px;">
        <!-- Resumen Vulnerabilidades -->
        <table width="100%" cellpadding="0" cellspacing="8" style="margin-bottom: 20px;">
          <tr>
            <td width="20%" style="background-color: ${extReport.securityReport.summary.high > 0 ? '#f8d7da' : '#f8f9fa'}; padding: 12px; border: 1px solid ${extReport.securityReport.summary.high > 0 ? '#f5c6cb' : '#dee2e6'}; text-align: center;">
              <p style="margin: 0; font-size: 10px; color: #6c757d; text-transform: uppercase;">Criticas</p>
              <p style="margin: 5px 0 0; font-size: 28px; font-weight: bold; color: ${extReport.securityReport.summary.high > 0 ? '#721c24' : '#333333'};">${extReport.securityReport.summary.high}</p>
            </td>
            <td width="20%" style="background-color: ${extReport.securityReport.summary.medium > 0 ? '#fff3cd' : '#f8f9fa'}; padding: 12px; border: 1px solid ${extReport.securityReport.summary.medium > 0 ? '#ffeeba' : '#dee2e6'}; text-align: center;">
              <p style="margin: 0; font-size: 10px; color: #6c757d; text-transform: uppercase;">Altas</p>
              <p style="margin: 5px 0 0; font-size: 28px; font-weight: bold; color: ${extReport.securityReport.summary.medium > 0 ? '#856404' : '#333333'};">${extReport.securityReport.summary.medium}</p>
            </td>
            <td width="20%" style="background-color: #f8f9fa; padding: 12px; border: 1px solid #dee2e6; text-align: center;">
              <p style="margin: 0; font-size: 10px; color: #6c757d; text-transform: uppercase;">Medias</p>
              <p style="margin: 5px 0 0; font-size: 28px; font-weight: bold; color: #333333;">${extReport.securityReport.summary.low}</p>
            </td>
            <td width="20%" style="background-color: #f8f9fa; padding: 12px; border: 1px solid #dee2e6; text-align: center;">
              <p style="margin: 0; font-size: 10px; color: #6c757d; text-transform: uppercase;">Bajas</p>
              <p style="margin: 5px 0 0; font-size: 28px; font-weight: bold; color: #6c757d;">${extReport.securityReport.summary.informational}</p>
            </td>
            <td width="20%" style="background-color: #e9ecef; padding: 12px; border: 1px solid #dee2e6; text-align: center;">
              <p style="margin: 0; font-size: 10px; color: #6c757d; text-transform: uppercase;">Total</p>
              <p style="margin: 5px 0 0; font-size: 28px; font-weight: bold; color: #333333;">${extReport.securityReport.summary.total}</p>
            </td>
          </tr>
        </table>

        ${extReport.securityReport.topAlerts.length > 0 ? `
        <!-- Tabla de Vulnerabilidades -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #dee2e6;">
          <tr>
            <td style="background-color: #f8f9fa; padding: 10px 15px; border-bottom: 1px solid #dee2e6;">
              <p style="margin: 0; font-weight: bold; font-size: 13px;">Vulnerabilidades Detectadas</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr style="background-color: #e9ecef;">
                  <th style="padding: 8px 10px; text-align: left; font-size: 11px; border-bottom: 1px solid #dee2e6;">Vulnerabilidad</th>
                  <th style="padding: 8px 10px; text-align: center; font-size: 11px; border-bottom: 1px solid #dee2e6; width: 80px;">Severidad</th>
                  <th style="padding: 8px 10px; text-align: center; font-size: 11px; border-bottom: 1px solid #dee2e6; width: 60px;">Casos</th>
                </tr>
                ${extReport.securityReport.topAlerts.slice(0, 8).map((alert, idx) => `
                <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                  <td style="padding: 8px 10px; font-size: 12px; border-bottom: 1px solid #dee2e6;">${alert.name}</td>
                  <td style="padding: 8px 10px; text-align: center; font-size: 11px; border-bottom: 1px solid #dee2e6;">
                    <span style="display: inline-block; padding: 2px 8px; font-size: 10px; font-weight: bold; background-color: ${alert.risk === 'High' ? '#dc3545' : alert.risk === 'Medium' ? '#ffc107' : alert.risk === 'Low' ? '#28a745' : '#6c757d'}; color: ${alert.risk === 'Medium' ? '#333' : '#fff'};">
                      ${alert.risk === 'High' ? 'CRITICA' : alert.risk === 'Medium' ? 'ALTA' : alert.risk === 'Low' ? 'MEDIA' : 'BAJA'}
                    </span>
                  </td>
                  <td style="padding: 8px 10px; text-align: center; font-size: 12px; font-weight: bold; border-bottom: 1px solid #dee2e6;">${alert.instances}</td>
                </tr>
                `).join('')}
              </table>
            </td>
          </tr>
        </table>
        ` : `
        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #c3e6cb; background-color: #d4edda;">
          <tr>
            <td style="padding: 15px; text-align: center;">
              <p style="margin: 0; color: #155724; font-weight: bold;">Sin vulnerabilidades detectadas</p>
            </td>
          </tr>
        </table>
        `}
      </td>
    </tr>
    ` : `
    <tr>
      <td style="padding: 20px; background-color: #f8f9fa; text-align: center;">
        <p style="margin: 0; color: #6c757d; font-size: 13px;">Escaneo de seguridad OWASP ZAP deshabilitado</p>
      </td>
    </tr>
    `}

    <!-- GRAFANA SCREENSHOT -->
    ${hasScreenshot ? `
    <tr>
      <td style="padding: 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color: #34495e; padding: 12px 20px;">
              <h2 style="color: #ffffff; margin: 0; font-size: 16px; font-weight: bold;">3. DASHBOARD GRAFANA</h2>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px;">
        <img src="cid:grafana-dashboard" alt="Dashboard Grafana" style="max-width: 100%; border: 1px solid #dee2e6;" />
      </td>
    </tr>
    ` : ''}

    <!-- FOOTER -->
    <tr>
      <td style="background-color: #2c3e50; padding: 15px 20px;">
        <table width="100%">
          <tr>
            <td>
              <p style="margin: 0; color: #bdc3c7; font-size: 11px;">SIGMA-SENTINEL v1.1.0</p>
              <p style="margin: 3px 0 0; color: #7f8c8d; font-size: 10px;">AGIP - Administracion Gubernamental de Ingresos Publicos | Buenos Aires Ciudad</p>
              <p style="margin: 5px 0 0; color: #95a5a6; font-size: 10px;">ELYER GREGORIO MALDONADO - Lider Tecnico QA - Epidata Consulting</p>
            </td>
            <td style="text-align: right;">
              <a href="${grafanaUrl}/d/sigma-sentinel-main" style="color: #3498db; font-size: 11px; text-decoration: none;">Ver Dashboard Completo</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

  </table>

</body>
</html>
    `;
  }

  private buildTextBody(report: GuardianReport | GuardianReportWithSecurity): string {
    const grafanaUrl = process.env.GRAFANA_URL || 'http://localhost:3002';
    const extReport = report as GuardianReportWithSecurity;

    const statusText = report.status === 'stable' ? 'ESTABLE' : report.status === 'changes-detected' ? 'CAMBIOS DETECTADOS' : report.status === 'critical' ? 'CRITICO' : 'ERROR';

    return `
SIGMA-SENTINEL - REPORTE TECNICO
================================

Fecha: ${new Date(report.timestamp).toLocaleString('es-AR')}
Ambiente: SIGMA-DEV (Testing)
URL: ${report.environment}
Tiempo de Ejecucion: ${(report.executionTime / 1000).toFixed(2)}s

1. MONITOREO DE AMBIENTE
------------------------
Estado: ${statusText}
Cambios Detectados: ${report.changesCount}
Confianza IA: ${report.aiAnalysis?.confidence ? (report.aiAnalysis.confidence * 100).toFixed(0) + '%' : 'N/A'}
Tests en Riesgo: ${report.aiAnalysis?.impactedTests?.length || 0}

${report.aiAnalysis?.impactedTests && report.aiAnalysis.impactedTests.length > 0 ? `
Tests Afectados:
${report.aiAnalysis.impactedTests.map(test =>
  `- ${test.testName} (${test.testFile}:${test.lineNumber}) - Riesgo: ${(test.failureProbability * 100).toFixed(0)}%`
).join('\n')}
` : ''}

${report.aiAnalysis?.recommendations && report.aiAnalysis.recommendations.length > 0 ? `
Recomendaciones:
${report.aiAnalysis.recommendations.map((rec, idx) => `${idx + 1}. ${rec}`).join('\n')}
` : ''}

2. ANALISIS DE SEGURIDAD (OWASP ZAP)
------------------------------------
${extReport.securityReport?.enabled ? `
Criticas: ${extReport.securityReport.summary.high}
Altas: ${extReport.securityReport.summary.medium}
Medias: ${extReport.securityReport.summary.low}
Bajas: ${extReport.securityReport.summary.informational}
Total: ${extReport.securityReport.summary.total}

${extReport.securityReport.topAlerts.length > 0 ? `
Vulnerabilidades:
${extReport.securityReport.topAlerts.slice(0, 8).map(alert =>
  `- [${alert.risk}] ${alert.name} (${alert.instances} casos)`
).join('\n')}
` : 'Sin vulnerabilidades detectadas.'}
` : 'Escaneo deshabilitado.'}

---
Dashboard: ${grafanaUrl}/d/sigma-sentinel-main
SIGMA-SENTINEL v1.1.0 | AGIP Buenos Aires Ciudad
    `.trim();
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(chalk.green(`[EmailNotifier] ${message}`));
    }
  }
}
