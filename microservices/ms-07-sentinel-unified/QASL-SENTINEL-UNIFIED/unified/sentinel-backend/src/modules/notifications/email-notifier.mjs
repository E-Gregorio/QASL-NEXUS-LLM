// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    QASL-API-SENTINEL - Email Notifier                        ║
// ║                    Notificaciones por correo electrónico                     ║
// ╠══════════════════════════════════════════════════════════════════════════════╣
// ║  Proyecto: SIGMA | Cliente: AGIP | Empresa: Epidata                          ║
// ║  Líder Técnico QA: Elyer Gregorio Maldonado                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import nodemailer from 'nodemailer';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

export class EmailNotifier {
  constructor(verbose = true) {
    this.verbose = verbose;
    this.config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: process.env.EMAIL_TO || process.env.ALERT_EMAIL,
    };

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.port === 465,
      auth: {
        user: this.config.user,
        pass: this.config.pass,
      },
    });
  }

  /**
   * Envía un reporte de monitoreo por email
   */
  async sendMonitoringReport(report) {
    if (!this.config.user || !this.config.to) {
      this.log('Email no configurado, saltando notificación', 'warn');
      return false;
    }

    this.log(`Enviando reporte a: ${this.config.to}`);

    const subject = this.buildSubject(report);
    const htmlBody = this.buildHtmlBody(report);
    const textBody = this.buildTextBody(report);

    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to: this.config.to,
        subject,
        html: htmlBody,
        text: textBody,
      });

      this.log('Email enviado exitosamente');
      return true;
    } catch (error) {
      console.error(chalk.red('[EmailNotifier] Error enviando email:'), error.message);
      return false;
    }
  }

  /**
   * Envía una alerta (API caída, recuperada, crítica, anomalía, etc.)
   */
  async sendAlert(alertData) {
    if (!this.config.user || !this.config.to) {
      return false;
    }

    const { subject, htmlBody } = this.buildAlertEmail(alertData);

    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to: this.config.to,
        subject,
        html: htmlBody,
      });
      return true;
    } catch (error) {
      console.error(chalk.red('[EmailNotifier] Error enviando alerta:'), error.message);
      return false;
    }
  }

  /**
   * Construye el email de alerta según el tipo
   */
  buildAlertEmail(alertData) {
    const severityConfig = {
      critical: { emoji: '🚨', color: '#dc3545', bgLight: '#f8d7da', text: 'CRÍTICA' },
      high: { emoji: '⚠️', color: '#fd7e14', bgLight: '#fff3cd', text: 'ALTA' },
      warning: { emoji: '⚡', color: '#ffc107', bgLight: '#fff9e6', text: 'ADVERTENCIA' },
      info: { emoji: '✅', color: '#28a745', bgLight: '#d4edda', text: 'INFO' },
    };

    const typeConfig = {
      API_DOWN: { icon: '🔴', title: 'API CAÍDA', action: 'dejó de responder' },
      API_RECOVERED: { icon: '🟢', title: 'API RECUPERADA', action: 'se ha recuperado' },
      API_CRITICAL: { icon: '🚨', title: 'API CRÍTICA', action: 'tiene múltiples fallas' },
      LATENCY_ANOMALY: { icon: '⚡', title: 'ANOMALÍA DE LATENCIA', action: 'tiene latencia anormal' },
      AUTH_ERROR: { icon: '🔐', title: 'ERROR DE AUTENTICACIÓN', action: 'tiene problemas de auth' },
    };

    const severity = severityConfig[alertData.severity] || severityConfig.warning;
    const typeInfo = typeConfig[alertData.type] || { icon: '⚠️', title: alertData.type, action: '' };
    const date = new Date().toLocaleString('es-AR', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const subject = `${severity.emoji} QASL-SENTINEL | ${typeInfo.title} | ${alertData.apiName || 'Sistema'}`;

    const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">

    <!-- HEADER -->
    <tr>
      <td style="background: ${severity.color}; padding: 25px; text-align: center;">
        <p style="margin: 0; font-size: 48px;">${typeInfo.icon}</p>
        <h1 style="color: white; margin: 10px 0 0; font-size: 24px;">${typeInfo.title}</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0; font-size: 14px;">
          Severidad: ${severity.text}
        </p>
      </td>
    </tr>

    <!-- API INFO -->
    <tr>
      <td style="padding: 25px;">
        <table width="100%" style="background: ${severity.bgLight}; border-radius: 8px; padding: 20px;">
          <tr>
            <td>
              <h2 style="margin: 0 0 10px; color: ${severity.color}; font-size: 18px;">
                ${alertData.apiName || 'API'}
              </h2>
              <p style="margin: 0; color: #666; font-size: 13px; word-break: break-all;">
                ${alertData.apiUrl || ''}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- MESSAGE -->
    <tr>
      <td style="padding: 0 25px 20px;">
        <p style="margin: 0; font-size: 16px; color: #333; line-height: 1.5;">
          ${alertData.message}
        </p>
      </td>
    </tr>

    <!-- DETAILS -->
    ${alertData.details ? `
    <tr>
      <td style="padding: 0 25px 20px;">
        <table width="100%" style="background: #f8f9fa; border-left: 4px solid ${severity.color}; padding: 15px;">
          <tr>
            <td>
              <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase;">Detalles</p>
              <p style="margin: 5px 0 0; font-size: 14px; color: #333;">${alertData.details}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ` : ''}

    <!-- METRICS -->
    <tr>
      <td style="padding: 0 25px 20px;">
        <table width="100%" cellspacing="10">
          <tr>
            ${alertData.latency !== undefined ? `
            <td style="background: #f8f9fa; padding: 12px; text-align: center; border-radius: 4px;">
              <p style="margin: 0; font-size: 10px; color: #999; text-transform: uppercase;">Latencia</p>
              <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold; color: #333;">${alertData.latency}ms</p>
            </td>
            ` : ''}
            ${alertData.httpStatus ? `
            <td style="background: #f8f9fa; padding: 12px; text-align: center; border-radius: 4px;">
              <p style="margin: 0; font-size: 10px; color: #999; text-transform: uppercase;">HTTP Status</p>
              <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold; color: ${alertData.httpStatus >= 500 ? '#dc3545' : '#ffc107'};">${alertData.httpStatus}</p>
            </td>
            ` : ''}
            ${alertData.consecutiveFailures ? `
            <td style="background: #f8f9fa; padding: 12px; text-align: center; border-radius: 4px;">
              <p style="margin: 0; font-size: 10px; color: #999; text-transform: uppercase;">Fallas Consecutivas</p>
              <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold; color: #dc3545;">${alertData.consecutiveFailures}</p>
            </td>
            ` : ''}
            ${alertData.downtime ? `
            <td style="background: #f8f9fa; padding: 12px; text-align: center; border-radius: 4px;">
              <p style="margin: 0; font-size: 10px; color: #999; text-transform: uppercase;">Tiempo Caído</p>
              <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold; color: #333;">${alertData.downtime}</p>
            </td>
            ` : ''}
            ${alertData.deviation ? `
            <td style="background: #f8f9fa; padding: 12px; text-align: center; border-radius: 4px;">
              <p style="margin: 0; font-size: 10px; color: #999; text-transform: uppercase;">Desviación</p>
              <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold; color: #ffc107;">+${alertData.deviation}%</p>
            </td>
            ` : ''}
          </tr>
        </table>
      </td>
    </tr>

    <!-- STATUS CHANGE -->
    ${alertData.previousStatus && alertData.currentStatus ? `
    <tr>
      <td style="padding: 0 25px 20px;">
        <table width="100%" style="text-align: center;">
          <tr>
            <td style="padding: 10px;">
              <span style="display: inline-block; padding: 8px 20px; background: ${alertData.previousStatus === 'UP' ? '#28a745' : '#dc3545'}; color: white; border-radius: 4px; font-weight: bold;">
                ${alertData.previousStatus}
              </span>
            </td>
            <td style="font-size: 24px; color: #999;">→</td>
            <td style="padding: 10px;">
              <span style="display: inline-block; padding: 8px 20px; background: ${alertData.currentStatus === 'UP' ? '#28a745' : '#dc3545'}; color: white; border-radius: 4px; font-weight: bold;">
                ${alertData.currentStatus}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ` : ''}

    <!-- TIMESTAMP -->
    <tr>
      <td style="padding: 0 25px 25px;">
        <p style="margin: 0; text-align: center; color: #999; font-size: 12px;">
          ${date}
        </p>
      </td>
    </tr>

    <!-- GRAFANA LINK -->
    <tr>
      <td style="padding: 0 25px 25px;">
        <table width="100%" style="background: #e3f2fd; border-radius: 4px; padding: 12px;">
          <tr>
            <td style="text-align: center;">
              <p style="margin: 0;">
                <a href="http://localhost:3001" style="color: #1976d2; font-weight: bold; text-decoration: none;">
                  📊 Ver Dashboard Grafana
                </a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="background: #1a1a2e; padding: 20px; text-align: center;">
        <p style="margin: 0; color: #00d4ff; font-size: 14px; font-weight: bold;">
          🛡️ QASL-API-SENTINEL v2.0.0
        </p>
        <p style="margin: 8px 0 0; color: #7f8c8d; font-size: 11px;">
          Proyecto SIGMA | AGIP Buenos Aires | Epidata
        </p>
        <p style="margin: 5px 0 0; color: #bdc3c7; font-size: 10px;">
          Alerta automática - No responder a este email
        </p>
      </td>
    </tr>

  </table>
</body>
</html>
    `;

    return { subject, htmlBody };
  }

  /**
   * Envía un email personalizado (usado por ScheduledReporter)
   */
  async sendCustomEmail({ subject, html, text }) {
    if (!this.config.user || !this.config.to) {
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to: this.config.to,
        subject,
        html,
        text: text || '',
      });
      return true;
    } catch (error) {
      console.error(chalk.red('[EmailNotifier] Error enviando email:'), error.message);
      return false;
    }
  }

  /**
   * Prueba la conexión de email
   */
  async testConnection() {
    if (!this.config.user || !this.config.pass) {
      return { success: false, message: 'Credenciales SMTP no configuradas' };
    }

    try {
      await this.transporter.verify();
      return { success: true, message: 'Conexión SMTP exitosa' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Envía un email de prueba
   */
  async sendTestEmail() {
    if (!this.config.user || !this.config.to) {
      return { success: false, message: 'Email no configurado' };
    }

    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to: this.config.to,
        subject: '✅ QASL-API-SENTINEL - Email de Prueba',
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <table width="100%" style="max-width: 600px; margin: 0 auto; border: 1px solid #28a745;">
    <tr>
      <td style="background: #28a745; padding: 15px; text-align: center;">
        <h1 style="color: white; margin: 0;">✅ Email Configurado Correctamente</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px; text-align: center;">
        <p>Este es un email de prueba de <strong>QASL-API-SENTINEL</strong></p>
        <p>Si recibes este mensaje, las notificaciones por email están funcionando.</p>
        <p style="color: #666; font-size: 12px;">${new Date().toLocaleString('es-AR')}</p>
      </td>
    </tr>
    <tr>
      <td style="background: #f8f9fa; padding: 10px; text-align: center; font-size: 12px; color: #666;">
        QASL-API-SENTINEL v2.0.0 | Proyecto SIGMA | AGIP | Epidata
      </td>
    </tr>
  </table>
</body>
</html>
        `,
      });

      return { success: true, message: `Email de prueba enviado a ${this.config.to}` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  buildSubject(report) {
    const statusEmoji = {
      healthy: '✅',
      degraded: '⚠️',
      critical: '🚨',
      unknown: '❓',
    };

    const statusText = {
      healthy: 'ESTABLE',
      degraded: 'DEGRADADO',
      critical: 'CRÍTICO',
      unknown: 'DESCONOCIDO',
    };

    const emoji = statusEmoji[report.status] || '📊';
    const status = statusText[report.status] || report.status?.toUpperCase() || 'REPORTE';
    const date = new Date().toLocaleDateString('es-AR');

    return `${emoji} QASL-API-SENTINEL | ${status} | ${date}`;
  }

  buildHtmlBody(report) {
    const statusColors = {
      healthy: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
      degraded: { bg: '#fff3cd', border: '#ffeeba', text: '#856404' },
      critical: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
      unknown: { bg: '#e2e3e5', border: '#d6d8db', text: '#383d41' },
    };

    const colors = statusColors[report.status] || statusColors.unknown;
    const date = new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const time = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, Helvetica, sans-serif; background: #fff; color: #333; font-size: 14px;">

  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 800px; margin: 0 auto; border: 1px solid #ccc;">

    <!-- HEADER -->
    <tr>
      <td style="background: #1a1a2e; padding: 20px; border-bottom: 3px solid #0f3460;">
        <h1 style="color: #00d4ff; margin: 0; font-size: 24px;">🛡️ QASL-API-SENTINEL</h1>
        <p style="color: #bdc3c7; margin: 5px 0 0; font-size: 12px;">Monitoreo Inteligente de APIs Enterprise</p>
      </td>
    </tr>

    <!-- INFO -->
    <tr>
      <td style="padding: 20px; background: #f8f9fa; border-bottom: 1px solid #dee2e6;">
        <table width="100%">
          <tr>
            <td width="50%">
              <p style="margin: 0; color: #6c757d; font-size: 12px;">Fecha del Reporte</p>
              <p style="margin: 2px 0 0; font-weight: bold;">${date}</p>
              <p style="margin: 0; color: #6c757d; font-size: 12px;">${time} hs</p>
            </td>
            <td width="50%" style="text-align: right;">
              <p style="margin: 0; color: #6c757d; font-size: 12px;">Proyecto</p>
              <p style="margin: 2px 0 0; font-weight: bold;">SIGMA (AGIP)</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- STATUS -->
    <tr>
      <td style="padding: 20px;">
        <table width="100%" style="background: ${colors.bg}; border: 1px solid ${colors.border}; padding: 15px;">
          <tr>
            <td>
              <p style="margin: 0; font-size: 12px; color: #6c757d;">ESTADO GENERAL</p>
              <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold; color: ${colors.text};">
                ${report.status?.toUpperCase() || 'N/A'}
              </p>
            </td>
            <td style="text-align: right;">
              <p style="margin: 0; font-size: 12px; color: #6c757d;">APIs Monitoreadas</p>
              <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold;">${report.totalApis || 0}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- METRICS -->
    <tr>
      <td style="padding: 0 20px 20px;">
        <table width="100%" cellspacing="10">
          <tr>
            <td width="25%" style="background: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #6c757d;">DISPONIBILIDAD</p>
              <p style="margin: 8px 0 0; font-size: 28px; font-weight: bold; color: ${(report.availability || 0) >= 95 ? '#28a745' : '#dc3545'};">
                ${(report.availability || 0).toFixed(1)}%
              </p>
            </td>
            <td width="25%" style="background: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #6c757d;">LATENCIA PROM</p>
              <p style="margin: 8px 0 0; font-size: 28px; font-weight: bold;">${report.avgLatency || 0}ms</p>
            </td>
            <td width="25%" style="background: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #6c757d;">CHECKS OK</p>
              <p style="margin: 8px 0 0; font-size: 28px; font-weight: bold; color: #28a745;">${report.successChecks || 0}</p>
            </td>
            <td width="25%" style="background: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #6c757d;">CHECKS FAIL</p>
              <p style="margin: 8px 0 0; font-size: 28px; font-weight: bold; color: ${(report.failedChecks || 0) > 0 ? '#dc3545' : '#28a745'};">
                ${report.failedChecks || 0}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${report.security ? `
    <!-- SECURITY -->
    <tr>
      <td style="padding: 0 20px 20px;">
        <table width="100%" style="border: 1px solid #dee2e6;">
          <tr>
            <td style="background: #343a40; padding: 10px 15px;">
              <p style="margin: 0; color: white; font-weight: bold;">🔐 Seguridad (OWASP)</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 15px;">
              <table width="100%" cellspacing="8">
                <tr>
                  <td style="background: ${report.security.critical > 0 ? '#f8d7da' : '#f8f9fa'}; padding: 10px; text-align: center; border: 1px solid #dee2e6;">
                    <p style="margin: 0; font-size: 10px; color: #6c757d;">CRÍTICAS</p>
                    <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold; color: ${report.security.critical > 0 ? '#721c24' : '#333'};">${report.security.critical || 0}</p>
                  </td>
                  <td style="background: ${report.security.high > 0 ? '#fff3cd' : '#f8f9fa'}; padding: 10px; text-align: center; border: 1px solid #dee2e6;">
                    <p style="margin: 0; font-size: 10px; color: #6c757d;">ALTAS</p>
                    <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold; color: ${report.security.high > 0 ? '#856404' : '#333'};">${report.security.high || 0}</p>
                  </td>
                  <td style="background: #f8f9fa; padding: 10px; text-align: center; border: 1px solid #dee2e6;">
                    <p style="margin: 0; font-size: 10px; color: #6c757d;">MEDIAS</p>
                    <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold;">${report.security.medium || 0}</p>
                  </td>
                  <td style="background: #f8f9fa; padding: 10px; text-align: center; border: 1px solid #dee2e6;">
                    <p style="margin: 0; font-size: 10px; color: #6c757d;">BAJAS</p>
                    <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold; color: #6c757d;">${report.security.low || 0}</p>
                  </td>
                  <td style="background: #e9ecef; padding: 10px; text-align: center; border: 1px solid #dee2e6;">
                    <p style="margin: 0; font-size: 10px; color: #6c757d;">SCORE</p>
                    <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold;">${report.security.score || 0}%</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ` : ''}

    ${report.ml ? `
    <!-- ML ANALYTICS -->
    <tr>
      <td style="padding: 0 20px 20px;">
        <table width="100%" style="border: 1px solid #dee2e6;">
          <tr>
            <td style="background: #343a40; padding: 10px 15px;">
              <p style="margin: 0; color: white; font-weight: bold;">🤖 Machine Learning</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 15px;">
              <table width="100%">
                <tr>
                  <td width="50%">
                    <p style="margin: 0; font-size: 12px; color: #6c757d;">Anomalías Detectadas</p>
                    <p style="margin: 5px 0 0; font-size: 20px; font-weight: bold; color: ${(report.ml.anomalies || 0) > 0 ? '#dc3545' : '#28a745'};">
                      ${report.ml.anomalies || 0}
                    </p>
                  </td>
                  <td width="50%">
                    <p style="margin: 0; font-size: 12px; color: #6c757d;">Predicción Fallos 24h</p>
                    <p style="margin: 5px 0 0; font-size: 20px; font-weight: bold; color: ${(report.ml.predictedFailures || 0) > 0 ? '#ffc107' : '#28a745'};">
                      ${report.ml.predictedFailures || 0}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ` : ''}

    ${report.apis && report.apis.length > 0 ? `
    <!-- API STATUS TABLE -->
    <tr>
      <td style="padding: 0 20px 20px;">
        <table width="100%" style="border: 1px solid #dee2e6;">
          <tr>
            <td style="background: #343a40; padding: 10px 15px;">
              <p style="margin: 0; color: white; font-weight: bold;">📊 Estado de APIs</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr style="background: #e9ecef;">
                  <th style="padding: 8px 10px; text-align: left; font-size: 11px; border-bottom: 1px solid #dee2e6;">API</th>
                  <th style="padding: 8px 10px; text-align: center; font-size: 11px; border-bottom: 1px solid #dee2e6;">Estado</th>
                  <th style="padding: 8px 10px; text-align: center; font-size: 11px; border-bottom: 1px solid #dee2e6;">Latencia</th>
                  <th style="padding: 8px 10px; text-align: center; font-size: 11px; border-bottom: 1px solid #dee2e6;">Uptime</th>
                </tr>
                ${report.apis.slice(0, 10).map((api, idx) => `
                <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f8f9fa'};">
                  <td style="padding: 8px 10px; font-size: 12px; border-bottom: 1px solid #dee2e6;">${api.name}</td>
                  <td style="padding: 8px 10px; text-align: center; font-size: 11px; border-bottom: 1px solid #dee2e6;">
                    <span style="display: inline-block; padding: 2px 8px; font-size: 10px; font-weight: bold; background: ${api.status === 'up' ? '#28a745' : '#dc3545'}; color: white;">
                      ${api.status === 'up' ? 'UP' : 'DOWN'}
                    </span>
                  </td>
                  <td style="padding: 8px 10px; text-align: center; font-size: 12px; border-bottom: 1px solid #dee2e6;">${api.latency || 0}ms</td>
                  <td style="padding: 8px 10px; text-align: center; font-size: 12px; border-bottom: 1px solid #dee2e6;">${(api.uptime || 0).toFixed(1)}%</td>
                </tr>
                `).join('')}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ` : ''}

    <!-- GRAFANA LINK -->
    <tr>
      <td style="padding: 0 20px 20px;">
        <table width="100%" style="background: #e3f2fd; border: 1px solid #90caf9; padding: 15px;">
          <tr>
            <td style="text-align: center;">
              <p style="margin: 0;">📊 <a href="http://localhost:3001" style="color: #1976d2; font-weight: bold;">Ver Dashboard Grafana Completo</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="background: #1a1a2e; padding: 15px 20px;">
        <table width="100%">
          <tr>
            <td>
              <p style="margin: 0; color: #bdc3c7; font-size: 11px;">QASL-API-SENTINEL v2.0.0 Enterprise</p>
              <p style="margin: 3px 0 0; color: #7f8c8d; font-size: 10px;">AGIP - Administración Gubernamental de Ingresos Públicos | Buenos Aires</p>
              <p style="margin: 5px 0 0; color: #00d4ff; font-size: 10px;">Elyer Gregorio Maldonado - Líder Técnico QA - Epidata</p>
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

  buildTextBody(report) {
    const date = new Date().toLocaleString('es-AR');

    return `
QASL-API-SENTINEL - REPORTE DE MONITOREO
========================================

Fecha: ${date}
Proyecto: SIGMA (AGIP)

ESTADO GENERAL: ${report.status?.toUpperCase() || 'N/A'}

MÉTRICAS PRINCIPALES
--------------------
APIs Monitoreadas: ${report.totalApis || 0}
Disponibilidad: ${(report.availability || 0).toFixed(1)}%
Latencia Promedio: ${report.avgLatency || 0}ms
Checks Exitosos: ${report.successChecks || 0}
Checks Fallidos: ${report.failedChecks || 0}

${report.security ? `
SEGURIDAD (OWASP)
-----------------
Score: ${report.security.score || 0}%
Críticas: ${report.security.critical || 0}
Altas: ${report.security.high || 0}
Medias: ${report.security.medium || 0}
Bajas: ${report.security.low || 0}
` : ''}

${report.ml ? `
MACHINE LEARNING
----------------
Anomalías Detectadas: ${report.ml.anomalies || 0}
Predicción Fallos 24h: ${report.ml.predictedFailures || 0}
` : ''}

---
Dashboard: http://localhost:3001
QASL-API-SENTINEL v2.0.0 | AGIP Buenos Aires | Epidata
    `.trim();
  }

  log(message, type = 'info') {
    if (!this.verbose) return;

    const colors = {
      info: chalk.green,
      warn: chalk.yellow,
      error: chalk.red,
    };

    console.log(colors[type](`[EmailNotifier] ${message}`));
  }
}

export default EmailNotifier;
