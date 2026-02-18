/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                          REPORT MANAGER v2.0                                 ║
 * ║              Generación y envío de reportes                                  ║
 * ║                                                                              ║
 * ║  Incluye reportes de:                                                        ║
 * ║  • Core: Watcher, Security, AI, Predictor                                    ║
 * ║  • Advanced v2.0: Connectivity, Dependency, MultiLocation, Contract, RUM    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import nodemailer from 'nodemailer';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { log } from '../core/banner.mjs';

export class ReportManager {
  constructor(options = {}) {
    this.ai = options.ai;
    this.data = options.data;
    this.config = options.config;

    // Referencias a los monitores avanzados (se configuran desde Sentinel)
    this.monitors = {
      connectivity: null,
      dependency: null,
      multiLocation: null,
      contract: null,
      rum: null
    };

    // Configurar transporter de email
    this.emailTransporter = null;
    this.initEmail();
  }

  /**
   * Configura los monitores avanzados v2.0
   */
  setMonitors(monitors) {
    this.monitors = { ...this.monitors, ...monitors };
  }

  /**
   * Inicializa el transporter de email
   */
  initEmail() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.emailTransporter = nodemailer.createTransport({
        host,
        port: parseInt(port) || 587,
        secure: port === '465',
        auth: { user, pass }
      });
      log('Email configurado', 'info');
    }
  }

  /**
   * Genera un reporte
   */
  async generateReport(type = 'general') {
    log(`Generando reporte: ${type}`, 'info');

    // Recolectar datos
    const data = await this.collectReportData(type);

    // Generar contenido con AI si está disponible
    let content;
    if (this.ai?.isAvailable()) {
      content = await this.ai.generateReport(type, data);
    } else {
      content = this.generateBasicReport(type, data);
    }

    // Guardar reporte en historial
    if (this.data) {
      await this.data.saveHistory({
        type: 'report',
        reportType: type,
        data,
        content,
        timestamp: new Date().toISOString()
      });
    }

    // Guardar reporte como archivo
    const reportPath = this.saveReportToFile(type, content);

    // Enviar si está configurado
    const alertsConfig = this.config?.get('alerts') || {};
    if (alertsConfig.email?.enabled) {
      await this.sendEmail(type, content);
    }
    if (alertsConfig.slack?.enabled) {
      await this.sendSlack(type, content);
    }

    log(`Reporte ${type} generado y guardado en: ${reportPath}`, 'success');
    return content;
  }

  /**
   * Guarda el reporte como archivo
   */
  saveReportToFile(type, content) {
    const reportsDir = join(process.cwd(), 'data', 'reports');

    // Crear directorio si no existe
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }

    // Generar nombre de archivo
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `report-${type}-${dateStr}_${timeStr}.md`;
    const filepath = join(reportsDir, filename);

    // Guardar archivo
    writeFileSync(filepath, content, 'utf-8');

    return filepath;
  }

  /**
   * Recolecta datos para el reporte
   */
  async collectReportData(type) {
    const data = {
      timestamp: new Date().toISOString(),
      type
    };

    if (this.data) {
      // Determinar período
      let days = 1;
      if (type === 'weekly') days = 7;
      if (type === '5h') days = 1;

      // Cargar historial
      const history = await this.data.loadHistoryRange(days);

      // Calcular resumen
      const healthChecks = history.filter(h => h.type === 'health_check');

      data.summary = {
        total: new Set(healthChecks.map(h => h.api?.id)).size,
        healthy: healthChecks.filter(h => h.healthy).length,
        checks: healthChecks.length,
        period: `${days} días`
      };

      // Calcular uptime
      if (healthChecks.length > 0) {
        data.summary.uptime = ((data.summary.healthy / healthChecks.length) * 100).toFixed(2);
      }

      // Calcular latencia promedio
      const latencies = healthChecks.filter(h => h.latency).map(h => h.latency);
      if (latencies.length > 0) {
        data.summary.avgLatency = Math.round(
          latencies.reduce((a, b) => a + b, 0) / latencies.length
        );
      }

      // Cargar alertas
      data.alerts = await this.data.loadAlerts();

      // Problemas
      data.problems = healthChecks
        .filter(h => !h.healthy)
        .slice(-10);
    }

    // ═══════════════════════════════════════════════════════════════
    // DATOS DE MONITORES AVANZADOS v2.0
    // ═══════════════════════════════════════════════════════════════

    // Connectivity Monitor (Front-End ↔ API)
    if (this.monitors.connectivity) {
      const connReport = this.monitors.connectivity.generateReport();
      const total = connReport.summary?.total || 0;
      const healthy = connReport.summary?.healthy || 0;
      data.connectivity = {
        totalEndpoints: total,
        connectedEndpoints: healthy,
        connectionRate: total > 0 ? `${((healthy / total) * 100).toFixed(1)}%` : '0%',
        fromFrontend: connReport.summary?.fromFrontend || 0,
        fromSwagger: connReport.summary?.fromSwagger || 0,
        issuesByType: connReport.issuesByType || {},
        details: connReport.details?.slice(0, 10) || []
      };
    }

    // Dependency Monitor (API → API Cascada)
    if (this.monitors.dependency) {
      const depReport = this.monitors.dependency.generateReport();
      data.dependency = {
        totalApis: depReport.summary?.totalApis || 0,
        totalDependencies: depReport.summary?.totalDependencies || 0,
        averagePerApi: depReport.summary?.averagePerApi || '0',
        cyclesDetected: depReport.summary?.cyclesDetected || 0,
        criticalApis: depReport.criticalApis?.slice(0, 5) || [],
        healthStatus: depReport.healthStatus || { healthy: 0, degraded: 0, down: 0 },
        recentImpacts: depReport.recentImpacts?.slice(0, 3) || []
      };
    }

    // Multi-Location Monitor (Regiones Geográficas)
    if (this.monitors.multiLocation) {
      const locReport = this.monitors.multiLocation.generateReport();
      data.multiLocation = {
        totalLocations: locReport.summary?.totalLocations || 0,
        activeLocations: locReport.summary?.locationsEnabled || 0,
        apisMonitored: locReport.summary?.apisMonitored || 0,
        locations: locReport.locations || [],
        latencyByRegion: locReport.latencyByRegion || {},
        recentIssues: locReport.recentIssues?.slice(0, 5) || []
      };
    }

    // Contract Monitor (Schema Drift)
    if (this.monitors.contract) {
      const contractReport = this.monitors.contract.generateReport();
      const total = contractReport.summary?.total || 0;
      const healthy = contractReport.summary?.healthy || 0;
      data.contract = {
        totalContracts: total,
        healthy: healthy,
        changed: contractReport.summary?.changed || 0,
        breaking: contractReport.summary?.breaking || 0,
        complianceRate: total > 0 ? `${((healthy / total) * 100).toFixed(1)}%` : '100%',
        contracts: contractReport.contracts?.slice(0, 10) || [],
        recentChanges: contractReport.recentChanges?.slice(0, 5) || [],
        activeAlerts: contractReport.activeAlerts || []
      };
    }

    // RUM Monitor (Real User Monitoring)
    if (this.monitors.rum) {
      const rumReport = this.monitors.rum.generateReport();
      data.rum = {
        activeSessions: rumReport.summary?.activeSessions || 0,
        totalEvents: rumReport.summary?.totalEvents || 0,
        eventsPerMinute: rumReport.summary?.eventsPerMinute || 0,
        apisMonitored: rumReport.summary?.apisMonitored || 0,
        errorCount: rumReport.summary?.errorCount || 0,
        latencyPercentiles: rumReport.latencyPercentiles || {},
        byDevice: rumReport.byDevice || {},
        byBrowser: rumReport.byBrowser || {},
        topApis: rumReport.topApis?.slice(0, 5) || [],
        recentErrors: rumReport.recentErrors?.slice(0, 5) || []
      };
    }

    return data;
  }

  /**
   * Genera reporte básico sin AI
   */
  generateBasicReport(type, data) {
    const timestamp = new Date().toLocaleString('es-AR');
    const divider = '━'.repeat(50);
    const subDivider = '─'.repeat(40);

    let report = `
╔══════════════════════════════════════════════════════════════╗
║            🐝 QASL-API-SENTINEL v2.0 - REPORTE               ║
╚══════════════════════════════════════════════════════════════╝

📅 Fecha: ${timestamp}
📋 Tipo: ${type.toUpperCase()}

${divider}
📊 RESUMEN GENERAL
${divider}

`;

    if (data.summary) {
      const s = data.summary;
      report += `• APIs monitoreadas: ${s.total || 0}
• Health checks: ${s.checks || 0}
• Checks exitosos: ${s.healthy || 0}
• Uptime: ${s.uptime || 100}%
• Latencia promedio: ${s.avgLatency || 0}ms
• Período: ${s.period || 'N/A'}

`;
    }

    // ═══════════════════════════════════════════════════════════════
    // SECCIÓN: CONNECTIVITY MONITOR (Front-End ↔ API)
    // ═══════════════════════════════════════════════════════════════
    if (data.connectivity) {
      const c = data.connectivity;
      report += `${divider}
🔗 CONECTIVIDAD FRONT-END ↔ API
${divider}

• Endpoints totales: ${c.totalEndpoints}
• Conectados (healthy): ${c.connectedEndpoints}
• Tasa de conexión: ${c.connectionRate}
• Desde Frontend (Playwright): ${c.fromFrontend}
• Desde Swagger/OpenAPI: ${c.fromSwagger}

`;
      // Mostrar issues por tipo
      if (c.issuesByType && Object.values(c.issuesByType).some(v => v > 0)) {
        report += `${subDivider}
⚠️ Problemas por Tipo:
`;
        if (c.issuesByType.cors > 0) report += `  🌐 CORS: ${c.issuesByType.cors}\n`;
        if (c.issuesByType.ssl > 0) report += `  🔒 SSL: ${c.issuesByType.ssl}\n`;
        if (c.issuesByType.dns > 0) report += `  📡 DNS: ${c.issuesByType.dns}\n`;
        if (c.issuesByType.network > 0) report += `  🔌 Network: ${c.issuesByType.network}\n`;
        if (c.issuesByType.auth > 0) report += `  🔑 Auth: ${c.issuesByType.auth}\n`;
        report += '\n';
      }

      // Mostrar detalle de conexiones
      if (c.details?.length > 0) {
        report += `${subDivider}
📋 Detalle de Endpoints:
`;
        for (const conn of c.details.slice(0, 5)) {
          const statusIcon = conn.status === 'healthy' ? '✅' :
                            conn.status === 'warning' ? '🟡' : '🔴';
          const sourceIcon = conn.source === 'playwright' || conn.source === 'har' ? '🖥️' : '📄';
          report += `  ${statusIcon} ${conn.apiName || conn.apiId} ${sourceIcon} (${conn.source || 'unknown'})
`;
        }
        report += '\n';
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // SECCIÓN: DEPENDENCY MONITOR (API → API Cascada)
    // ═══════════════════════════════════════════════════════════════
    if (data.dependency) {
      const d = data.dependency;
      report += `${divider}
🌐 DEPENDENCIAS API → API (CASCADA)
${divider}

• APIs en grafo: ${d.totalApis}
• Total dependencias: ${d.totalDependencies}
• Promedio por API: ${d.averagePerApi}
• Ciclos detectados: ${d.cyclesDetected > 0 ? `⚠️ ${d.cyclesDetected}` : '✅ 0'}

${subDivider}
Estado de Salud:
  🟢 Healthy: ${d.healthStatus?.healthy || 0}
  🟡 Degraded: ${d.healthStatus?.degraded || 0}
  🔴 Down: ${d.healthStatus?.down || 0}

`;
      if (d.criticalApis?.length > 0) {
        report += `${subDivider}
⚡ APIs Críticas (más dependientes):
`;
        for (const api of d.criticalApis) {
          report += `  • ${api.apiId}: ${api.dependentCount} APIs dependen de esta
`;
        }
        report += '\n';
      }

      if (d.recentImpacts?.length > 0) {
        report += `${subDivider}
🔴 Impactos en Cascada Recientes:
`;
        for (const impact of d.recentImpacts) {
          report += `  • ${impact.failedApi}: ${impact.totalAffected} APIs afectadas (Severidad: ${impact.severity})
`;
        }
        report += '\n';
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // SECCIÓN: MULTI-LOCATION MONITOR (Regiones)
    // ═══════════════════════════════════════════════════════════════
    if (data.multiLocation) {
      const m = data.multiLocation;
      report += `${divider}
🌍 MONITOREO MULTI-REGIÓN
${divider}

• Regiones configuradas: ${m.totalLocations}
• Regiones activas: ${m.activeLocations}
• APIs monitoreadas: ${m.apisMonitored}

`;
      if (m.locations?.length > 0) {
        report += `${subDivider}
📍 Regiones Habilitadas:
`;
        for (const loc of m.locations.slice(0, 6)) {
          const latency = m.latencyByRegion?.[loc.id];
          const avgLatency = latency?.avg ? `${Math.round(latency.avg)}ms` : 'N/A';
          report += `  🌐 ${loc.name} (${loc.id}): ${avgLatency}
`;
        }
        report += '\n';
      }

      if (m.recentIssues?.length > 0) {
        report += `${subDivider}
⚠️ Problemas Regionales Recientes:
`;
        for (const issue of m.recentIssues) {
          report += `  • ${issue.location || issue.apiId}: ${issue.type} - ${issue.message || 'Problema detectado'}
`;
        }
        report += '\n';
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // SECCIÓN: CONTRACT MONITOR (Schema Drift)
    // ═══════════════════════════════════════════════════════════════
    if (data.contract) {
      const ct = data.contract;
      report += `${divider}
📋 CONTRATOS API (SCHEMA DRIFT)
${divider}

• Total contratos: ${ct.totalContracts}
• Healthy: ${ct.healthy}
• Con cambios: ${ct.changed}
• Breaking changes: ${ct.breaking > 0 ? `🔴 ${ct.breaking}` : '✅ 0'}
• Tasa de cumplimiento: ${ct.complianceRate}

`;
      if (ct.contracts?.length > 0) {
        report += `${subDivider}
📝 Estado de Contratos:
`;
        for (const contract of ct.contracts.slice(0, 5)) {
          const icon = contract.status === 'healthy' ? '✅' :
                      contract.status === 'breaking' ? '🔴' : '🟡';
          report += `  ${icon} ${contract.apiId}: v${contract.version || 'N/A'}
`;
        }
        report += '\n';
      }

      if (ct.recentChanges?.length > 0) {
        report += `${subDivider}
📝 Cambios Recientes de Schema:
`;
        for (const change of ct.recentChanges) {
          const icon = change.breaking ? '🔴' : '🟡';
          report += `  ${icon} ${change.apiId}: ${change.type || 'change'} - ${change.path || change.message || 'Cambio detectado'}
`;
        }
        report += '\n';
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // SECCIÓN: RUM MONITOR (Real User Monitoring)
    // ═══════════════════════════════════════════════════════════════
    if (data.rum) {
      const r = data.rum;
      report += `${divider}
👥 REAL USER MONITORING (RUM)
${divider}

• Sesiones activas: ${r.activeSessions}
• Total eventos: ${r.totalEvents}
• Eventos/min: ${r.eventsPerMinute?.toFixed(1) || '0'}
• APIs monitoreadas: ${r.apisMonitored}
• Errores: ${r.errorCount}

`;
      if (r.latencyPercentiles && Object.keys(r.latencyPercentiles).length > 0) {
        report += `${subDivider}
⏱️ Latencia (Percentiles):
  P50: ${r.latencyPercentiles.p50 || 0}ms
  P75: ${r.latencyPercentiles.p75 || 0}ms
  P95: ${r.latencyPercentiles.p95 || 0}ms
  P99: ${r.latencyPercentiles.p99 || 0}ms

`;
      }

      if (r.byDevice && Object.keys(r.byDevice).length > 0) {
        report += `${subDivider}
📱 Por Dispositivo:
`;
        for (const [device, count] of Object.entries(r.byDevice)) {
          report += `  • ${device}: ${count}
`;
        }
        report += '\n';
      }

      if (r.topApis?.length > 0) {
        report += `${subDivider}
🔥 APIs más Utilizadas:
`;
        for (const api of r.topApis) {
          report += `  • ${api.url}: ${api.requestCount || 0} requests
`;
        }
        report += '\n';
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // SECCIÓN: ALERTAS Y PROBLEMAS
    // ═══════════════════════════════════════════════════════════════
    if (data.alerts?.length > 0) {
      report += `${divider}
⚠️ ALERTAS ACTIVAS
${divider}

`;
      for (const alert of data.alerts.slice(0, 5)) {
        const icon = alert.severity === 'critical' ? '🔴' :
          alert.severity === 'warning' ? '🟡' : '🟢';
        report += `${icon} ${alert.type}: ${alert.message || JSON.stringify(alert)}
`;
      }
      report += '\n';
    }

    if (data.problems?.length > 0) {
      report += `${divider}
🔴 PROBLEMAS DETECTADOS
${divider}

`;
      for (const problem of data.problems.slice(0, 5)) {
        report += `• ${problem.api?.name || problem.api?.url}: ${problem.error || `Status ${problem.status}`}
`;
      }
      report += '\n';
    }

    report += `${divider}

🐝 QASL-API-SENTINEL v2.0
El Centinela que Vigila tus APIs 24/7
Módulos: Connectivity | Dependency | Multi-Location | Contract | RUM
`;

    return report;
  }

  /**
   * Envía una alerta
   */
  async sendAlert(alert) {
    log(`Enviando alerta: ${alert.type}`, 'warning');

    const alertsConfig = this.config?.get('alerts') || {};

    // Formatear mensaje
    const message = this.formatAlertMessage(alert);

    // Email
    if (alertsConfig.email?.enabled) {
      await this.sendEmail(`ALERTA: ${alert.type}`, message);
    }

    // Slack
    if (alertsConfig.slack?.enabled) {
      await this.sendSlack(`ALERTA: ${alert.type}`, message);
    }

    // SMS solo para críticos
    if (alert.severity === 'critical' && alertsConfig.sms?.enabled) {
      await this.sendSms(message);
    }

    // Guardar alerta
    if (this.data) {
      await this.data.saveAlert(alert);
    }
  }

  /**
   * Formatea mensaje de alerta
   */
  formatAlertMessage(alert) {
    const timestamp = new Date().toLocaleString('es-AR');
    const icon = alert.severity === 'critical' ? '🚨' :
      alert.severity === 'warning' ? '⚠️' : 'ℹ️';

    let message = `${icon} QASL-API-SENTINEL - ALERTA

Tipo: ${alert.type}
Severidad: ${alert.severity?.toUpperCase() || 'UNKNOWN'}
Fecha: ${timestamp}

`;

    if (alert.api) {
      message += `API Afectada: ${alert.api.name || alert.api.url}
Método: ${alert.api.method || 'N/A'}
`;
    }

    if (alert.diagnosis) {
      message += `
Diagnóstico: ${alert.diagnosis.diagnosis || alert.diagnosis}
`;

      if (alert.diagnosis.recommendations?.length > 0) {
        message += `
Recomendaciones:
`;
        for (const rec of alert.diagnosis.recommendations) {
          message += `• ${rec}\n`;
        }
      }
    }

    return message;
  }

  /**
   * Envía email
   */
  async sendEmail(subject, content) {
    if (!this.emailTransporter) {
      log('Email no configurado', 'warning');
      return;
    }

    const to = process.env.EMAIL_TO;
    if (!to) {
      log('EMAIL_TO no configurado', 'warning');
      return;
    }

    try {
      await this.emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'QASL-API-SENTINEL <sentinel@qasl.io>',
        to,
        subject: `[QASL-API-SENTINEL] ${subject}`,
        text: content
      });
      log(`Email enviado: ${subject}`, 'success');
    } catch (error) {
      log(`Error enviando email: ${error.message}`, 'error');
    }
  }

  /**
   * Envía a Slack
   */
  async sendSlack(title, content) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `*${title}*\n\`\`\`${content}\`\`\``
        })
      });
      log('Mensaje enviado a Slack', 'success');
    } catch (error) {
      log(`Error enviando a Slack: ${error.message}`, 'error');
    }
  }

  /**
   * Envía SMS (Twilio)
   */
  async sendSms(message) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_FROM;
    const to = process.env.SMS_PHONE_TO;

    if (!accountSid || !authToken || !from || !to) {
      log('SMS no configurado', 'warning');
      return;
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

      await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: to,
          From: from,
          Body: message.substring(0, 160) // SMS limit
        })
      });

      log('SMS enviado', 'success');
    } catch (error) {
      log(`Error enviando SMS: ${error.message}`, 'error');
    }
  }
}
