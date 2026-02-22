/**
 * QASL-INGRID - Report Service
 * Genera PDF profesional (estilo QASL-API-SENTINEL) y envía por email.
 */

import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import { queryPrometheus } from './query-engine.mjs';

// =============================================================================
// COLORES - Estilo QASL-API-SENTINEL
// =============================================================================

const C = {
  primary: '#1a73e8',      // Azul Google
  success: '#34a853',      // Verde
  warning: '#f9ab00',      // Amarillo/Naranja
  danger: '#ea4335',       // Rojo
  dark: '#202124',         // Gris oscuro texto
  white: '#ffffff',
  gray: '#5f6368',         // Gris medio
  lightGray: '#f8f9fa',    // Gris claro fondos
  border: '#dadce0',       // Bordes
  headerBg: '#1a1a2e',     // Fondo header oscuro
};

// =============================================================================
// RECOPILAR TODAS LAS METRICAS
// =============================================================================

async function gatherAllMetrics() {
  const m = {};

  const queries = [
    ['uptime', 'qasl_uptime_percentage'],
    ['latencyAvg', 'qasl_latency_avg_ms'],
    ['apisTotal', 'qasl_apis_total'],
    ['checksTotal', 'qasl_checks_total'],
    ['checksSuccess', 'qasl_checks_success_total'],
    ['checksFailed', 'qasl_checks_failed_total'],
    ['securityScore', 'qasl_security_score'],
    ['sslDays', 'qasl_connectivity_ssl_days'],
    ['zapTotal', 'qasl_zap_vulnerabilities_total'],
    ['zapScanStatus', 'qasl_zap_scan_status'],
    ['defconLevel', 'qasl_defcon_level'],
  ];

  for (const [key, expr] of queries) {
    const data = await queryPrometheus(expr);
    m[key] = data.length > 0 ? data[0].value : null;
  }

  // Multi-value queries
  const apiStatus = await queryPrometheus('qasl_api_status');
  const apiLatency = await queryPrometheus('qasl_api_latency_ms');
  const apiUptime = await queryPrometheus('qasl_api_uptime_percentage');
  const compliance = await queryPrometheus('qasl_compliance_score');
  const connectivity = await queryPrometheus('qasl_connectivity_issues_total');
  const zapBySeverity = await queryPrometheus('qasl_zap_vulnerabilities');
  const zapTop = await queryPrometheus('qasl_zap_top_vulnerability');

  m.apis = apiStatus.map(a => {
    const id = a.metric.api_id;
    const lat = apiLatency.find(l => l.metric.api_id === id);
    const up = apiUptime.find(u => u.metric.api_id === id);
    return {
      name: a.metric.api_name || id,
      method: a.metric.method || '',
      status: a.value,
      latency: lat ? lat.value : 0,
      uptime: up ? up.value : 0,
    };
  });

  m.compliance = {};
  compliance.forEach(c => {
    m.compliance[c.metric.framework] = c.value;
  });

  m.connectivity = {};
  connectivity.forEach(c => {
    m.connectivity[c.metric.type] = c.value;
  });

  m.zap = {};
  zapBySeverity.forEach(z => {
    m.zap[z.metric.severity] = z.value;
  });

  m.zapTopVulns = zapTop.map(z => ({
    name: z.metric.name,
    severity: z.metric.severity,
    count: z.value,
  }));

  // =========================================================================
  // GARAK - Metricas de seguridad IA/LLM
  // =========================================================================
  const garakQueries = [
    ['garakDefcon', 'garak_defcon_level'],
    ['garakProbesTotal', 'garak_probes_total'],
    ['garakPassed', 'garak_probes_passed'],
    ['garakFailed', 'garak_probes_failed'],
    ['garakPassRate', 'garak_pass_rate'],
    ['garakVulnRate', 'garak_vulnerability_rate'],
    ['garakElapsed', 'garak_elapsed_seconds'],
    ['garakInProgress', 'garak_in_progress'],
  ];

  for (const [key, expr] of garakQueries) {
    const data = await queryPrometheus(expr);
    m[key] = data.length > 0 ? data[0].value : null;
  }

  // Modelo info
  const modelInfo = await queryPrometheus('garak_model_info');
  m.garakModel = modelInfo.length > 0 ? (modelInfo[0].metric.model || 'N/A') : null;
  m.garakModelType = modelInfo.length > 0 ? (modelInfo[0].metric.type || 'N/A') : null;

  // Scan info
  const scanInfo = await queryPrometheus('garak_scan_info');
  m.garakProbeSpec = scanInfo.length > 0 ? (scanInfo[0].metric.probe_spec || 'N/A') : null;
  m.garakVersion = scanInfo.length > 0 ? (scanInfo[0].metric.garak_version || 'N/A') : null;

  // Por detector
  const detectorRates = await queryPrometheus('garak_detector_pass_rate');
  m.garakDetectors = detectorRates.map(d => ({
    name: d.metric.detector || 'unknown',
    passRate: d.value,
  }));

  // Por categoria
  const categoryRates = await queryPrometheus('garak_category_pass_rate');
  m.garakCategories = categoryRates.map(c => ({
    name: c.metric.category || 'unknown',
    passRate: c.value,
  }));

  // Por probe
  const probeRates = await queryPrometheus('garak_probe_pass_rate');
  m.garakProbes = probeRates.map(p => ({
    name: p.metric.probe || 'unknown',
    passRate: p.value,
  }));

  return m;
}

// =============================================================================
// GENERAR PDF - Estilo QASL-API-SENTINEL
// =============================================================================

// Tipos de reporte: 'full' | 'garak' | 'apis' | 'zap' | 'compliance'
function generatePDF(metrics, reportType = 'full') {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 60, left: 50, right: 50 },
      bufferPages: true,
      info: {
        Title: 'QASL-SENTINEL-UNIFIED - Informe de Monitoreo',
        Author: 'QASL-INGRID',
        Subject: 'Informe de Monitoreo QA',
        Creator: 'QASL-INGRID Report Generator',
      },
    });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const now = new Date();
    const dateStr = now.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const pageWidth = doc.page.width;
    const margin = 50;
    const contentW = pageWidth - margin * 2;

    // =========================================================================
    // HEADER - Estilo API-SENTINEL (fondo oscuro, lineas decorativas)
    // =========================================================================

    doc.rect(0, 0, pageWidth, 160).fill(C.headerBg);

    // Linea decorativa verde centrada arriba
    doc.rect(pageWidth / 2 - 60, 25, 120, 4).fill(C.success);

    // Titulo principal
    doc.fontSize(36).fill(C.white)
      .text('QASL-SENTINEL-UNIFIED', 0, 45, { width: pageWidth, align: 'center', lineBreak: false });

    // Subtitulo segun tipo de reporte
    const subtitles = {
      full: 'Informe Completo de Monitoreo - INGRID Report',
      garak: 'Informe de Seguridad IA/LLM - NVIDIA Garak',
      apis: 'Informe de Estado de APIs',
      zap: 'Informe de Seguridad OWASP ZAP',
      compliance: 'Informe de Compliance',
      mobile: 'Informe de Testing Mobile',
    };
    doc.fontSize(14).fill('#b0b0b0')
      .text(subtitles[reportType] || subtitles.full, 0, 90, { width: pageWidth, align: 'center', lineBreak: false });

    // Linea decorativa naranja centrada
    doc.rect(pageWidth / 2 - 40, 115, 80, 3).fill(C.warning);

    // Fecha
    doc.fontSize(9).fill('#888888')
      .text(`${dateStr} | ${timeStr} | Generado por INGRID AI`, 0, 135, { width: pageWidth, align: 'center', lineBreak: false });

    doc.y = 180;

    // Secciones incluidas segun reportType
    const include = {
      summary: reportType === 'full' || reportType === 'apis',
      performance: reportType === 'full' || reportType === 'apis',
      apis: reportType === 'full' || reportType === 'apis',
      zap: reportType === 'full' || reportType === 'zap',
      compliance: reportType === 'full' || reportType === 'compliance',
      garak: reportType === 'full' || reportType === 'garak',
      mobile: reportType === 'full' || reportType === 'mobile',
      recommendations: true,
    };

    // =========================================================================
    // RESUMEN EJECUTIVO - Cards
    // =========================================================================

    if (include.summary) {
      sectionTitle(doc, 'Resumen Ejecutivo', margin, contentW);

      const cardW = (contentW - 30) / 4;
      const cardH = 70;
      const cardY = doc.y;

      // Card 1 - Disponibilidad
      const uptimeVal = metrics.uptime !== null ? `${metrics.uptime}%` : 'N/A';
      const uptimeColor = metrics.uptime >= 99 ? C.success : metrics.uptime >= 95 ? C.warning : C.danger;
      metricCard(doc, margin, cardY, cardW, cardH, uptimeVal, 'Disponibilidad', uptimeColor);

      // Card 2 - APIs
      const apisVal = metrics.apisTotal !== null ? `${metrics.apisTotal}` : 'N/A';
      metricCard(doc, margin + cardW + 10, cardY, cardW, cardH, apisVal, 'APIs Monitoreadas', C.primary);

      // Card 3 - Latencia
      const latVal = metrics.latencyAvg !== null ? `${Math.round(metrics.latencyAvg)}ms` : 'N/A';
      const latColor = metrics.latencyAvg > 2000 ? C.danger : metrics.latencyAvg > 500 ? C.warning : C.success;
      metricCard(doc, margin + (cardW + 10) * 2, cardY, cardW, cardH, latVal, 'Latencia Prom.', latColor);

      // Card 4 - Security Score
      const secVal = metrics.securityScore !== null ? `${metrics.securityScore}%` : 'N/A';
      const secColor = metrics.securityScore === 0 ? C.danger : metrics.securityScore < 50 ? C.warning : C.success;
      metricCard(doc, margin + (cardW + 10) * 3, cardY, cardW, cardH, secVal, 'Security Score', secColor);

      doc.y = cardY + cardH + 10;

      doc.fontSize(9).fill(C.gray)
        .text('Metodologia: QA Monitoring | SLA Target: 99.9%', margin, doc.y, { width: contentW, align: 'center', lineBreak: false });
      doc.y += 10;
    }

    // =========================================================================
    // RESUMEN EJECUTIVO - Cards (GARAK)
    // =========================================================================

    if (reportType === 'garak') {
      sectionTitle(doc, 'Resumen - Seguridad IA/LLM', margin, contentW);

      const cardW = (contentW - 30) / 4;
      const cardH = 70;
      const cardY = doc.y;

      const defconVal = metrics.garakDefcon !== null ? `DC-${metrics.garakDefcon}` : 'N/A';
      const defconColor = metrics.garakDefcon <= 2 ? C.danger : metrics.garakDefcon <= 3 ? C.warning : C.success;
      metricCard(doc, margin, cardY, cardW, cardH, defconVal, 'Nivel DEFCON', defconColor);

      const probesVal = metrics.garakProbesTotal !== null ? `${metrics.garakProbesTotal}` : 'N/A';
      metricCard(doc, margin + cardW + 10, cardY, cardW, cardH, probesVal, 'Total Probes', C.primary);

      const passVal = metrics.garakPassRate !== null ? `${Number(metrics.garakPassRate).toFixed(1)}%` : 'N/A';
      const passColor = metrics.garakPassRate >= 70 ? C.success : metrics.garakPassRate >= 50 ? C.warning : C.danger;
      metricCard(doc, margin + (cardW + 10) * 2, cardY, cardW, cardH, passVal, 'Tasa de Exito', passColor);

      const modelVal = metrics.garakModel || 'N/A';
      metricCard(doc, margin + (cardW + 10) * 3, cardY, cardW, cardH, modelVal, 'Modelo Evaluado', C.primary);

      doc.y = cardY + cardH + 10;

      doc.fontSize(9).fill(C.gray)
        .text('Herramienta: NVIDIA Garak | Evaluacion de seguridad para modelos LLM', margin, doc.y, { width: contentW, align: 'center', lineBreak: false });
      doc.y += 10;
    }

    // =========================================================================
    // METRICAS DE PERFORMANCE
    // =========================================================================

    if (include.performance) {
      sectionTitle(doc, 'Metricas de Rendimiento', margin, contentW);

      const perfData = [
        ['Metrica', 'Valor', 'Estado'],
        ['Disponibilidad Global', metrics.uptime !== null ? `${metrics.uptime}%` : 'N/A', metrics.uptime >= 99 ? 'OK' : 'WARNING'],
        ['Latencia Promedio', metrics.latencyAvg !== null ? `${Math.round(metrics.latencyAvg)}ms` : 'N/A', metrics.latencyAvg > 2000 ? 'CRITICO' : metrics.latencyAvg > 500 ? 'WARNING' : 'OK'],
        ['Total Checks', metrics.checksTotal !== null ? `${metrics.checksTotal}` : 'N/A', 'OK'],
        ['Checks Exitosos', metrics.checksSuccess !== null ? `${metrics.checksSuccess}` : 'N/A', 'OK'],
        ['Checks Fallidos', metrics.checksFailed !== null ? `${metrics.checksFailed}` : 'N/A', metrics.checksFailed > 0 ? 'WARNING' : 'OK'],
        ['Certificado SSL', metrics.sslDays !== null ? `${metrics.sslDays} dias` : 'N/A', metrics.sslDays === 0 ? 'CRITICO' : metrics.sslDays < 30 ? 'WARNING' : 'OK'],
        ['Problemas CORS', metrics.connectivity.cors !== undefined ? `${metrics.connectivity.cors}` : '0', metrics.connectivity.cors > 0 ? 'WARNING' : 'OK'],
      ];

      professionalTable(doc, perfData, margin, contentW, 2);
    }

    // =========================================================================
    // ESTADO DE APIs
    // =========================================================================

    if (include.apis) {
      checkNewPage(doc, 70);
      sectionTitle(doc, 'Estado de APIs', margin, contentW);

      const apiData = [['API', 'Estado', 'Latencia', 'Uptime']];
      metrics.apis.forEach(a => {
        const statusText = a.status >= 200 && a.status < 300 ? 'OK' : 'ERROR';
        apiData.push([a.name, statusText, `${Math.round(a.latency)}ms`, `${a.uptime}%`]);
      });

      professionalTable(doc, apiData, margin, contentW, 1);
    }

    // =========================================================================
    // SEGURIDAD - OWASP ZAP
    // =========================================================================

    if (include.zap) {
      checkNewPage(doc, 70);
      sectionTitle(doc, 'Seguridad - OWASP ZAP', margin, contentW);

      const zapData = [
        ['Severidad', 'Cantidad', 'Estado'],
        ['Total Vulnerabilidades', metrics.zapTotal !== null ? `${metrics.zapTotal}` : '0', metrics.zapTotal > 0 ? 'WARNING' : 'OK'],
        ['Criticas', metrics.zap.critical !== undefined ? `${metrics.zap.critical}` : '0', metrics.zap.critical > 0 ? 'CRITICO' : 'OK'],
        ['Altas', metrics.zap.high !== undefined ? `${metrics.zap.high}` : '0', metrics.zap.high > 0 ? 'WARNING' : 'OK'],
        ['Medias', metrics.zap.medium !== undefined ? `${metrics.zap.medium}` : '0', metrics.zap.medium > 0 ? 'WARNING' : 'OK'],
        ['Bajas', metrics.zap.low !== undefined ? `${metrics.zap.low}` : '0', 'INFO'],
      ];

      professionalTable(doc, zapData, margin, contentW, 2);

      if (metrics.zapTopVulns && metrics.zapTopVulns.length > 0) {
        doc.y += 8;
        doc.fontSize(10).fill(C.dark)
          .text('Top Vulnerabilidades Detectadas:', margin, doc.y, { lineBreak: false });
        doc.y += 14;
        for (const v of metrics.zapTopVulns.slice(0, 5)) {
          doc.fontSize(9).fill(C.gray)
            .text(`  \u2022 ${v.name} (${v.severity}) - ${v.count} instancias`, margin + 10, doc.y, { lineBreak: false });
          doc.y += 12;
        }
        doc.y += 5;
      }
    }

    // =========================================================================
    // COMPLIANCE
    // =========================================================================

    if (include.compliance) {
      checkNewPage(doc, 70);
      sectionTitle(doc, 'Compliance', margin, contentW);

      const compEntries = Object.entries(metrics.compliance);
      if (compEntries.length > 0) {
        const compData = [['Framework', 'Score', 'Estado']];
        compEntries.forEach(([fw, score]) => {
          const status = score >= 80 ? 'OK' : score >= 50 ? 'WARNING' : 'CRITICO';
          compData.push([fw, `${score}%`, status]);
        });
        professionalTable(doc, compData, margin, contentW, 2);
      } else {
        doc.fontSize(10).fill(C.gray).text('No hay datos de compliance disponibles.', margin, doc.y, { lineBreak: false });
        doc.y += 10;
      }
    }

    // =========================================================================
    // SEGURIDAD IA/LLM - NVIDIA GARAK
    // =========================================================================

    if (include.garak) {
      checkNewPage(doc, 70);
      sectionTitle(doc, 'Seguridad IA/LLM - NVIDIA Garak', margin, contentW);

      const garakInfoData = [
        ['Parametro', 'Valor', 'Estado'],
        ['Modelo Evaluado', metrics.garakModel || 'N/A', 'INFO'],
        ['Tipo de Modelo', metrics.garakModelType || 'N/A', 'INFO'],
        ['Probes Ejecutados', metrics.garakProbesTotal !== null ? `${metrics.garakProbesTotal}` : 'N/A', 'OK'],
        ['Probes Resistidos', metrics.garakPassed !== null ? `${metrics.garakPassed}` : 'N/A', 'OK'],
        ['Probes Vulnerados', metrics.garakFailed !== null ? `${metrics.garakFailed}` : 'N/A', metrics.garakFailed > 0 ? 'WARNING' : 'OK'],
        ['Tasa de Exito', metrics.garakPassRate !== null ? `${Number(metrics.garakPassRate).toFixed(1)}%` : 'N/A', metrics.garakPassRate >= 70 ? 'OK' : metrics.garakPassRate >= 50 ? 'WARNING' : 'CRITICO'],
        ['Tasa de Vulnerabilidad', metrics.garakVulnRate !== null ? `${Number(metrics.garakVulnRate).toFixed(1)}%` : 'N/A', metrics.garakVulnRate > 50 ? 'CRITICO' : metrics.garakVulnRate > 30 ? 'WARNING' : 'OK'],
        ['Nivel DEFCON', metrics.garakDefcon !== null ? `DC-${metrics.garakDefcon}` : 'N/A', metrics.garakDefcon <= 2 ? 'CRITICO' : metrics.garakDefcon <= 3 ? 'WARNING' : 'OK'],
        ['Duracion del Scan', metrics.garakElapsed !== null ? `${Math.round(metrics.garakElapsed)}s` : 'N/A', 'INFO'],
      ];

      professionalTable(doc, garakInfoData, margin, contentW, 2);

      // Resultados por Detector
      if (metrics.garakDetectors && metrics.garakDetectors.length > 0) {
        checkNewPage(doc, 70);
        doc.y += 8;
        doc.fontSize(10).fill(C.dark)
          .text('Resultados por Detector:', margin, doc.y, { lineBreak: false });
        doc.y += 14;

        const detData = [['Detector', 'Tasa de Exito', 'Estado']];
        metrics.garakDetectors.forEach(d => {
          const rate = Number(d.passRate).toFixed(1);
          const status = rate >= 70 ? 'OK' : rate >= 50 ? 'WARNING' : 'CRITICO';
          detData.push([d.name, `${rate}%`, status]);
        });
        professionalTable(doc, detData, margin, contentW, 2);
      }

      // Resultados por Categoria
      if (metrics.garakCategories && metrics.garakCategories.length > 0) {
        checkNewPage(doc, 70);
        doc.y += 8;
        doc.fontSize(10).fill(C.dark)
          .text('Resultados por Categoria:', margin, doc.y, { lineBreak: false });
        doc.y += 14;

        const catData = [['Categoria', 'Tasa de Exito', 'Estado']];
        metrics.garakCategories.forEach(c => {
          const rate = Number(c.passRate).toFixed(1);
          const status = rate >= 70 ? 'OK' : rate >= 50 ? 'WARNING' : 'CRITICO';
          catData.push([c.name, `${rate}%`, status]);
        });
        professionalTable(doc, catData, margin, contentW, 2);
      }

      // Resultados por Probe (Top 10)
      if (metrics.garakProbes && metrics.garakProbes.length > 0) {
        checkNewPage(doc, 70);
        doc.y += 8;
        doc.fontSize(10).fill(C.dark)
          .text('Resultados por Probe (Top 10):', margin, doc.y, { lineBreak: false });
        doc.y += 14;

        const probeData = [['Probe', 'Tasa de Exito', 'Estado']];
        metrics.garakProbes.slice(0, 10).forEach(p => {
          const rate = Number(p.passRate).toFixed(1);
          const status = rate >= 70 ? 'OK' : rate >= 50 ? 'WARNING' : 'CRITICO';
          probeData.push([p.name, `${rate}%`, status]);
        });
        professionalTable(doc, probeData, margin, contentW, 2);
      }
    }

    // =========================================================================
    // TESTING MOBILE - QASL-MOBILE
    // =========================================================================

    if (include.mobile && metrics.mobile) {
      checkNewPage(doc, 120);
      sectionTitle(doc, 'Testing Mobile - QASL-MOBILE', margin, contentW);

      const m = metrics.mobile;
      const mobileCards = [
        { label: 'Total Tests', value: String(m.totalTests || 0), color: m.totalTests > 0 ? C.primary : C.warning },
        { label: 'Passed', value: String(m.passed || 0), color: m.passed > 0 ? C.success : C.danger },
        { label: 'Failed', value: String(m.failed || 0), color: m.failed > 0 ? C.danger : C.success },
        { label: 'Pass Rate', value: `${m.passRate || 0}%`, color: Number(m.passRate) >= 80 ? C.success : Number(m.passRate) >= 50 ? C.warning : C.danger },
      ];

      const mcW = (contentW - 30) / 4;
      const mcH = 55;
      const mcY = doc.y;
      mobileCards.forEach((card, i) => {
        const x = margin + i * (mcW + 10);
        doc.rect(x, mcY, mcW, mcH).fill(card.color);
        doc.fontSize(10).fill('#ffffff')
          .text(card.label, x, mcY + 8, { width: mcW, align: 'center' });
        doc.fontSize(18).fill('#ffffff')
          .text(card.value, x, mcY + 24, { width: mcW, align: 'center' });
      });
      doc.y = mcY + mcH + 12;

      const mobileTableData = [
        ['Metrica', 'Valor', 'Estado'],
        ['Framework', 'Maestro', 'INFO'],
        ['Plataforma', 'Android', 'INFO'],
        ['Tests Ejecutados', String(m.totalTests || 0), m.totalTests > 0 ? 'OK' : 'WARNING'],
        ['Tests Exitosos', String(m.passed || 0), m.passed > 0 ? 'OK' : 'CRITICO'],
        ['Tests Fallidos', String(m.failed || 0), m.failed === 0 ? 'OK' : 'CRITICO'],
        ['Pass Rate', `${m.passRate || 0}%`, Number(m.passRate) >= 80 ? 'OK' : 'CRITICO'],
        ['Duracion Promedio', `${m.avgDuration || 0}s`, 'INFO'],
        ['Analisis AI', 'INGRID (Claude Vision)', 'OK'],
      ];
      professionalTable(doc, mobileTableData, margin, contentW, 2);
    }

    // =========================================================================
    // RECOMENDACIONES - Contextuales segun reportType
    // =========================================================================

    checkNewPage(doc, 70);
    sectionTitle(doc, 'Recomendaciones', margin, contentW);

    const recs = [];

    if (include.summary || include.performance || include.apis) {
      if (metrics.sslDays === 0) {
        recs.push('Renovar o configurar certificado SSL inmediatamente. SSL con 0 dias restantes es un riesgo de seguridad critico.');
      }
      const caratulacion = metrics.apis.find(a => a.name.includes('Caratulacion'));
      if (caratulacion && caratulacion.latency > 5000) {
        recs.push(`API ${caratulacion.name} tiene latencia de ${Math.round(caratulacion.latency)}ms. Investigar cuellos de botella.`);
      }
      if (metrics.connectivity.cors > 0) {
        recs.push(`Resolver ${metrics.connectivity.cors} problemas de CORS. Configurar headers Access-Control-Allow-Origin correctamente.`);
      }
      if (metrics.securityScore === 0) {
        recs.push('Security Score en 0%. Implementar controles de seguridad y configurar evaluacion de score.');
      }
    }

    if (include.zap) {
      if (metrics.zap.high > 0) {
        recs.push(`Remediar ${metrics.zap.high} vulnerabilidades de severidad alta (headers CSP y Permissions Policy).`);
      }
      if (metrics.zap.critical > 0) {
        recs.push(`Remediar ${metrics.zap.critical} vulnerabilidades criticas de forma inmediata.`);
      }
    }

    if (include.compliance) {
      const lowCompliance = Object.entries(metrics.compliance).filter(([, s]) => s < 50);
      if (lowCompliance.length > 0) {
        recs.push(`Mejorar compliance en: ${lowCompliance.map(([f, s]) => `${f} (${s}%)`).join(', ')}. Todos por debajo del 50%.`);
      }
    }

    if (include.garak) {
      if (metrics.garakDefcon !== null && metrics.garakDefcon <= 2) {
        recs.push(`Nivel DEFCON ${metrics.garakDefcon} (CRITICO) en evaluacion Garak. El modelo presenta vulnerabilidades significativas ante ataques adversariales.`);
      }
      if (metrics.garakPassRate !== null && metrics.garakPassRate < 50) {
        recs.push(`Tasa de exito Garak en ${Number(metrics.garakPassRate).toFixed(1)}%. Mas de la mitad de los probes lograron vulnerar el modelo. Revisar configuracion de seguridad del LLM.`);
      }
      if (metrics.garakFailed !== null && metrics.garakFailed > 0) {
        recs.push(`${metrics.garakFailed} probes lograron vulnerar el modelo. Implementar guardrails adicionales y filtros de entrada/salida.`);
      }
      if (metrics.garakPassRate !== null && metrics.garakPassRate >= 70) {
        recs.push('El modelo muestra buena resistencia general ante ataques adversariales. Mantener monitoreo periodico.');
      }
    }

    if (include.mobile && metrics.mobile) {
      const m = metrics.mobile;
      if (m.failed > 0) {
        recs.push(`${m.failed} tests mobile fallaron. Verificar que el emulador Android este conectado y las apps instaladas correctamente.`);
      }
      if (Number(m.passRate) < 80) {
        recs.push(`Pass Rate mobile en ${m.passRate}%. Revisar flujos Maestro y estabilidad de selectores.`);
      }
      if (Number(m.passRate) >= 80) {
        recs.push('Tests mobile con buena tasa de exito. Mantener ejecucion periodica con INGRID.');
      }
    }

    if (recs.length === 0) {
      recs.push('Todas las metricas estan dentro de los parametros normales.');
      recs.push('Continuar con el monitoreo regular y proactivo.');
    }

    recs.forEach((rec, i) => {
      checkNewPage(doc, 45);
      const y = doc.y;

      doc.rect(margin, y, contentW, 35).fill(C.white);
      doc.rect(margin, y, 4, 35).fill(C.primary);
      doc.rect(margin, y, contentW, 35).strokeColor(C.border).stroke();

      doc.circle(margin + 22, y + 17, 10).fill(C.primary);
      doc.fontSize(10).fill(C.white)
        .text(`${i + 1}`, margin + 15, y + 12, { width: 14, align: 'center', lineBreak: false });

      doc.fontSize(9).fill(C.dark)
        .text(rec, margin + 45, y + 8, { width: contentW - 60, height: 24, lineBreak: true, ellipsis: true });

      doc.y = y + 42;
    });

    // =========================================================================
    // FIRMA FINAL
    // =========================================================================

    checkNewPage(doc, 100);
    doc.y += 15;

    doc.moveTo(margin, doc.y).lineTo(margin + contentW, doc.y)
      .strokeColor(C.primary).lineWidth(2).stroke();
    doc.lineWidth(1);
    doc.y += 15;

    doc.fontSize(10).fill(C.dark)
      .text('QASL NEXUS LLM', margin, doc.y, { width: contentW, align: 'center', lineBreak: false });
    doc.y += 14;
    doc.fontSize(10).fill(C.dark)
      .text('Plataforma QA Multi-LLM', margin, doc.y, { width: contentW, align: 'center', lineBreak: false });
    doc.y += 14;
    doc.fontSize(10).fill(C.dark)
      .text('Elyer Gregorio Maldonado - Lider Tecnico QA', margin, doc.y, { width: contentW, align: 'center', lineBreak: false });
    doc.y += 18;
    doc.fontSize(8).fill(C.gray)
      .text(`Reporte generado automaticamente por QASL-INGRID | ${dateStr} ${timeStr}`, margin, doc.y, { width: contentW, align: 'center', lineBreak: false });

    // =========================================================================
    // FOOTER EN TODAS LAS PAGINAS
    // =========================================================================

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      // Temporarily remove bottom margin to prevent PDFKit auto-pagination
      const savedBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.fontSize(7).fill(C.gray)
        .text(
          `QASL-SENTINEL-UNIFIED | QASL NEXUS LLM | Elyer Maldonado | ${i + 1}/${range.count}`,
          margin,
          doc.page.height - 30,
          { width: contentW, align: 'center', lineBreak: false }
        );
      doc.page.margins.bottom = savedBottom;
    }

    doc.end();
  });
}

// =============================================================================
// PDF HELPERS - Estilo API-SENTINEL
// =============================================================================

/**
 * Titulo de seccion: texto azul uppercase con underline azul
 */
function sectionTitle(doc, title, margin, contentW) {
  doc.y += 10;
  const titleY = doc.y;
  doc.fontSize(14).fill(C.primary)
    .text(title.toUpperCase(), margin, titleY, { lineBreak: false });

  doc.moveTo(margin, titleY + 18)
    .lineTo(margin + 100, titleY + 18)
    .strokeColor(C.primary)
    .lineWidth(2)
    .stroke();

  doc.lineWidth(1);
  doc.y = titleY + 28;
}

/**
 * Metric card: valor en color, label gris, barra lateral de color
 */
function metricCard(doc, x, y, w, h, value, label, color) {
  // Fondo blanco
  doc.rect(x, y, w, h).fill(C.white);
  // Barra de color izquierda
  doc.rect(x, y, 4, h).fill(color);
  // Borde gris
  doc.rect(x, y, w, h).strokeColor(C.border).stroke();

  // Valor grande en color
  doc.fontSize(24).fill(color)
    .text(value, x + 12, y + 15, { width: w - 20, align: 'center', lineBreak: false });

  // Label pequeno gris
  doc.fontSize(9).fill(C.gray)
    .text(label, x + 12, y + 48, { width: w - 20, align: 'center', lineBreak: false });
}

/**
 * Tabla profesional: header azul, filas alternadas, bordes
 * statusColumn: indice de la columna con estados (OK/WARNING/CRITICO) para colorear
 */
function professionalTable(doc, data, margin, tableWidth, statusColumn) {
  const colWidth = tableWidth / data[0].length;
  const rowH = 28;

  for (let i = 0; i < data.length; i++) {
    checkNewPage(doc, rowH + 5);
    const row = data[i];
    const y = doc.y;

    if (i === 0) {
      // Header azul
      doc.rect(margin, y, tableWidth, rowH).fill(C.primary);
      doc.fontSize(9).fill(C.white);
    } else {
      // Fila alternada
      const bgColor = i % 2 === 0 ? C.lightGray : C.white;
      doc.rect(margin, y, tableWidth, rowH).fill(bgColor);
      doc.fontSize(9).fill(C.dark);
    }

    // Borde de la fila
    doc.rect(margin, y, tableWidth, rowH).strokeColor(C.border).stroke();

    // Celdas
    for (let j = 0; j < row.length; j++) {
      let textColor = i === 0 ? C.white : C.dark;

      // Colorear columna de estado
      if (i > 0 && j === statusColumn) {
        if (row[j] === 'OK') textColor = C.success;
        else if (row[j] === 'ERROR' || row[j] === 'CRITICO') textColor = C.danger;
        else if (row[j] === 'WARNING') textColor = C.warning;
        else if (row[j] === 'INFO') textColor = C.primary;
      }

      doc.fill(textColor)
        .text(row[j], margin + j * colWidth + 8, y + 9, {
          width: colWidth - 16,
          height: rowH - 12,
          align: j === 0 ? 'left' : 'center',
          lineBreak: false,
        });
    }

    doc.y = y + rowH;
  }

  doc.y += 5;
}

function checkNewPage(doc, needed) {
  if (doc.y + needed > doc.page.height - 60) {
    doc.addPage();
    doc.y = 50;
  }
}

// =============================================================================
// ENVIAR EMAIL
// =============================================================================

async function sendReportEmail(pdfBuffer, targetEmail, reportType = 'full') {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });

  const subjectMap = {
    full: `[QASL-SENTINEL] Informe Completo de Monitoreo - ${dateStr}`,
    garak: `[QASL-SENTINEL] Informe Seguridad IA/LLM (Garak) - ${dateStr}`,
    apis: `[QASL-SENTINEL] Informe Estado de APIs - ${dateStr}`,
    zap: `[QASL-SENTINEL] Informe Seguridad OWASP ZAP - ${dateStr}`,
    compliance: `[QASL-SENTINEL] Informe de Compliance - ${dateStr}`,
    mobile: `[QASL-MOBILE] Informe de Testing Mobile - ${dateStr}`,
  };

  const contentMap = {
    full: {
      desc: 'Se adjunta el informe completo de monitoreo del sistema QASL NEXUS LLM.',
      items: [
        'Resumen ejecutivo con metricas clave',
        'Estado detallado de cada API',
        'Analisis de seguridad OWASP ZAP',
        'Seguridad IA/LLM (NVIDIA Garak)',
        'Scores de compliance (SOC2, ISO27001, PCI-DSS, HIPAA)',
        'Recomendaciones priorizadas',
      ],
    },
    garak: {
      desc: 'Se adjunta el informe de seguridad IA/LLM generado con NVIDIA Garak.',
      items: [
        'Resumen de evaluacion del modelo LLM',
        'Nivel DEFCON y tasa de exito',
        'Resultados por detector y categoria',
        'Detalle de probes ejecutados',
        'Recomendaciones de seguridad IA',
      ],
    },
    apis: {
      desc: 'Se adjunta el informe de estado de las APIs del sistema QASL NEXUS LLM.',
      items: [
        'Resumen ejecutivo de disponibilidad',
        'Metricas de rendimiento',
        'Estado detallado de cada API',
        'Recomendaciones',
      ],
    },
    zap: {
      desc: 'Se adjunta el informe de seguridad OWASP ZAP del sistema QASL NEXUS LLM.',
      items: [
        'Vulnerabilidades por severidad',
        'Top vulnerabilidades detectadas',
        'Recomendaciones de remediacion',
      ],
    },
    compliance: {
      desc: 'Se adjunta el informe de compliance del sistema QASL NEXUS LLM.',
      items: [
        'Scores por framework (SOC2, ISO27001, PCI-DSS, HIPAA)',
        'Estado de cumplimiento',
        'Recomendaciones de mejora',
      ],
    },
    mobile: {
      desc: 'Se adjunta el informe de testing mobile generado por QASL-MOBILE con Maestro + INGRID AI.',
      items: [
        'Resultados de ejecucion de tests mobile',
        'Pass Rate y duracion promedio',
        'Analisis INGRID AI Vision (UX/UI)',
        'Recomendaciones de testing mobile',
      ],
    },
  };

  const content = contentMap[reportType] || contentMap.full;
  const itemsHtml = content.items.map(item => `<li>${item}</li>`).join('\n            ');
  const filenameMap = {
    full: 'QASL-SENTINEL-Report-Completo',
    garak: 'QASL-SENTINEL-Report-Garak',
    apis: 'QASL-SENTINEL-Report-APIs',
    zap: 'QASL-SENTINEL-Report-ZAP',
    compliance: 'QASL-SENTINEL-Report-Compliance',
    mobile: 'QASL-MOBILE-Report-Testing',
  };
  const filename = `${filenameMap[reportType] || filenameMap.full}-${now.toISOString().slice(0, 10)}.pdf`;

  const info = await transporter.sendMail({
    from: `"QASL-INGRID" <${process.env.FROM_EMAIL}>`,
    to: targetEmail,
    subject: subjectMap[reportType] || subjectMap.full,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff; border: 1px solid #dadce0; border-radius: 8px;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #1a73e8;">
          <h2 style="color: #1a1a2e; margin: 0 0 5px 0; font-size: 24px;">QASL-SENTINEL-UNIFIED</h2>
          <p style="color: #5f6368; margin: 0; font-size: 14px;">Informe generado por INGRID</p>
        </div>
        <div style="padding: 20px 0;">
          <p style="color: #202124;">${content.desc}</p>
          <p style="color: #202124;">Este reporte incluye:</p>
          <ul style="color: #5f6368;">
            ${itemsHtml}
          </ul>
        </div>
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #dadce0;">
          <p style="color: #5f6368; font-size: 12px; margin: 0;">
            QASL NEXUS LLM | Plataforma QA Multi-LLM<br>
            Elyer Gregorio Maldonado - Lider Tecnico QA
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  console.log(`[INGRID] Email enviado a ${targetEmail}: ${info.messageId}`);
  return info;
}

// =============================================================================
// FUNCION PRINCIPAL
// =============================================================================

async function generateAndSendReport(targetEmail, reportType = 'full', extraData = {}) {
  console.log(`[INGRID] Generando informe PDF (${reportType}) para ${targetEmail}...`);
  const metrics = await gatherAllMetrics();
  // Agregar datos extra (ej: mobile data)
  if (extraData.mobileData) metrics.mobile = extraData.mobileData;
  const pdfBuffer = await generatePDF(metrics, reportType);
  console.log(`[INGRID] PDF generado (${reportType}): ${(pdfBuffer.length / 1024).toFixed(1)}KB`);

  await sendReportEmail(pdfBuffer, targetEmail, reportType);
  return { success: true, size: pdfBuffer.length };
}

export { generateAndSendReport, gatherAllMetrics, generatePDF, sendReportEmail };
