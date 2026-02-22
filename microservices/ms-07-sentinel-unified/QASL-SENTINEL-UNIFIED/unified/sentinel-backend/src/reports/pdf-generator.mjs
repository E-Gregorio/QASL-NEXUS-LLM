/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    QASL-API-SENTINEL - PDF Report Generator                   ║
 * ║                    Generador de Reportes Profesionales en PDF                 ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  QASL NEXUS LLM                                                               ║
 * ║  Elyer Gregorio Maldonado                                                     ║
 * ║  Plataforma QA Multi-LLM                                                      ║
 * ║  Líder Técnico QA: Elyer Gregorio Maldonado                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export class PDFReportGenerator {
  constructor(options = {}) {
    this.options = {
      outputDir: options.outputDir || './reports',
      logo: options.logo || null,
      company: options.company || 'QASL NEXUS LLM',
      project: options.project || 'QASL NEXUS LLM',
      client: options.client || 'Elyer Gregorio Maldonado',
      ...options
    };

    // Colores del tema profesional (estilo INGRID)
    this.colors = {
      primary: '#1a73e8',      // Azul Google
      success: '#34a853',      // Verde
      warning: '#f9ab00',      // Amarillo/Naranja
      danger: '#ea4335',       // Rojo
      dark: '#202124',         // Gris oscuro para texto
      light: '#ffffff',        // Blanco
      gray: '#5f6368',         // Gris medio
      lightGray: '#f8f9fa',    // Gris claro para fondos
      border: '#dadce0',       // Bordes
      accent: '#00bcd4',       // Cyan accent
      headerBg: '#1a1a2e'      // Fondo header oscuro
    };
  }

  /**
   * Genera un reporte PDF completo
   */
  async generateReport(data, options = {}) {
    const {
      type = 'daily',
      title = 'API Monitoring Report',
      filename = `report-${type}-${Date.now()}.pdf`
    } = options;

    // Crear directorio si no existe
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }

    const outputPath = path.join(this.options.outputDir, filename);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 60, left: 50, right: 50 },
        bufferPages: true,
        info: {
          Title: title,
          Author: 'QASL-API-SENTINEL',
          Subject: 'API Monitoring Report',
          Keywords: 'API, monitoring, sentinel, QASL',
          Creator: 'QASL-API-SENTINEL PDF Generator'
        }
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      try {
        // Generar contenido según tipo
        this.generateHeader(doc, title, type);
        this.generateExecutiveSummary(doc, data);
        this.generateMetricsSection(doc, data);
        this.generateAPIStatusTable(doc, data);
        this.generateAlertsSection(doc, data);
        this.generateRecommendations(doc, data);

        doc.end();

        stream.on('finish', () => {
          resolve({
            success: true,
            path: outputPath,
            filename,
            size: fs.statSync(outputPath).size
          });
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Genera el encabezado del reporte (Estilo INGRID)
   */
  generateHeader(doc, _title, type) {
    const pageWidth = doc.page.width;

    // Fondo del header oscuro elegante
    doc.rect(0, 0, pageWidth, 160)
       .fill(this.colors.headerBg);

    // Línea decorativa superior (accent color)
    doc.rect(pageWidth / 2 - 60, 25, 120, 4)
       .fill(this.colors.success);

    // Título principal centrado
    doc.fontSize(36)
       .fill('#ffffff')
       .text('QASL-API-SENTINEL', 0, 45, { width: pageWidth, align: 'center' });

    // Subtítulo
    doc.fontSize(14)
       .fill('#b0b0b0')
       .text('API Monitoring Report', 0, 90, { width: pageWidth, align: 'center' });

    // Línea decorativa inferior
    doc.rect(pageWidth / 2 - 40, 115, 80, 3)
       .fill(this.colors.warning);

    // Fecha en la esquina
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    doc.fontSize(9)
       .fill('#888888')
       .text(`${dateStr} | Reporte ${type.toUpperCase()}`, 0, 135, { width: pageWidth, align: 'center' });

    doc.y = 180;
  }

  /**
   * Genera el resumen ejecutivo (Estilo INGRID con cards)
   */
  generateExecutiveSummary(doc, data) {
    const summary = data.summary || {};
    const margin = 50;
    const pageWidth = doc.page.width - margin * 2;

    // Título de sección con línea
    this.sectionTitle(doc, 'Resumen Ejecutivo');

    // Container para las 4 métricas
    const cardWidth = (pageWidth - 30) / 4;  // 30 = gaps
    const cardHeight = 70;
    const startY = doc.y;
    const startX = margin;

    // Card 1: Disponibilidad
    this.metricCard(doc, startX, startY, cardWidth, cardHeight, {
      value: `${summary.uptimePercentage || 0}%`,
      label: 'Disponibilidad',
      color: this.getUptimeColor(summary.uptimePercentage || 0)
    });

    // Card 2: APIs Monitoreadas
    this.metricCard(doc, startX + cardWidth + 10, startY, cardWidth, cardHeight, {
      value: `${summary.totalApis || 0}`,
      label: 'APIs Monitoreadas',
      color: this.colors.primary
    });

    // Card 3: Latencia Promedio
    this.metricCard(doc, startX + (cardWidth + 10) * 2, startY, cardWidth, cardHeight, {
      value: `${summary.avgLatency || 0}ms`,
      label: 'Latencia Prom.',
      color: this.getLatencyColor(summary.avgLatency || 0)
    });

    // Card 4: Alertas
    this.metricCard(doc, startX + (cardWidth + 10) * 3, startY, cardWidth, cardHeight, {
      value: `${summary.alertCount || 0}`,
      label: 'Alertas Activas',
      color: summary.alertCount > 0 ? this.colors.danger : this.colors.success
    });

    doc.y = startY + cardHeight + 25;

    // Info adicional
    doc.fontSize(9)
       .fill(this.colors.gray)
       .text(`Metodologia: API Monitoring | SLA Target: 99.9%`, margin, doc.y, {
         width: pageWidth,
         align: 'center'
       });

    doc.y += 25;
  }

  /**
   * Card de métrica individual (estilo INGRID)
   */
  metricCard(doc, x, y, width, height, { value, label, color }) {
    // Fondo blanco con borde
    doc.rect(x, y, width, height)
       .fill('#ffffff');

    // Barra de color a la izquierda
    doc.rect(x, y, 4, height)
       .fill(color);

    // Borde gris sutil
    doc.rect(x, y, width, height)
       .strokeColor(this.colors.border)
       .stroke();

    // Valor grande
    doc.fontSize(24)
       .fill(color)
       .text(value, x + 12, y + 15, { width: width - 20, align: 'center' });

    // Label pequeño
    doc.fontSize(9)
       .fill(this.colors.gray)
       .text(label, x + 12, y + 48, { width: width - 20, align: 'center' });
  }

  /**
   * Genera la sección de métricas (Estilo INGRID - fondo blanco, tabla profesional)
   */
  generateMetricsSection(doc, data) {
    this.checkPageBreak(doc, 200);
    this.sectionTitle(doc, 'Metricas de Rendimiento');

    const metrics = data.metrics || {};
    const margin = 50;
    const pageWidth = doc.page.width - margin * 2;

    // Tabla de métricas con estilo profesional
    const tableData = [
      ['Metrica', 'Valor', 'Estado'],
      ['Tiempo de actividad', `${metrics.uptime || 0}s`, 'OK'],
      ['Total verificaciones', `${metrics.totalChecks || 0}`, 'OK'],
      ['Verificaciones exitosas', `${metrics.successChecks || 0}`, 'OK'],
      ['Verificaciones fallidas', `${metrics.failedChecks || 0}`, metrics.failedChecks > 0 ? 'ALERTA' : 'OK'],
      ['Disponibilidad global', `${metrics.uptimePercentage || 0}%`, this.getStatusText(metrics.uptimePercentage)],
      ['Latencia promedio', `${metrics.avgLatency || 0}ms`, this.getStatusText(metrics.avgLatency, 'latency')]
    ];

    this.professionalTable(doc, tableData, { margin, pageWidth });
    doc.moveDown(2);
  }

  /**
   * Genera la tabla de estado de APIs (Estilo INGRID - tabla limpia profesional)
   */
  generateAPIStatusTable(doc, data) {
    this.checkPageBreak(doc, 250);
    this.sectionTitle(doc, 'Estado de APIs');

    const apis = data.apis || [];
    const margin = 50;
    const pageWidth = doc.page.width - margin * 2;

    if (apis.length === 0) {
      doc.fontSize(11).fill(this.colors.gray).text('No hay datos de APIs disponibles.');
      doc.moveDown(2);
      return;
    }

    // Headers de la tabla
    const tableData = [
      ['API', 'Estado', 'Latencia', 'Uptime']
    ];

    for (const api of apis) {
      const statusText = api.healthy ? 'OK' : 'ERROR';
      tableData.push([
        api.name || api.id,
        statusText,
        `${api.latency || 0}ms`,
        `${api.uptime || 0}%`
      ]);
    }

    this.professionalTable(doc, tableData, { margin, pageWidth, statusColumn: 1 });
    doc.moveDown(2);
  }

  /**
   * Genera la sección de alertas (Estilo INGRID - cards con barra lateral)
   */
  generateAlertsSection(doc, data) {
    const alerts = data.alerts || [];

    if (alerts.length === 0) {
      return; // No mostrar sección si no hay alertas
    }

    this.checkPageBreak(doc, 150);
    this.sectionTitle(doc, 'Alertas');

    const margin = 50;
    const pageWidth = doc.page.width - margin * 2;

    for (const alert of alerts.slice(0, 10)) {
      const y = doc.y;
      const color = this.getSeverityColor(alert.severity);
      const label = alert.severity === 'critical' ? 'CRITICO' :
                    alert.severity === 'warning' ? 'AVISO' : 'INFO';

      // Card de alerta con barra lateral de color
      doc.rect(margin, y, pageWidth, 40)
         .fill('#ffffff');
      doc.rect(margin, y, 4, 40)
         .fill(color);
      doc.rect(margin, y, pageWidth, 40)
         .strokeColor(this.colors.border)
         .stroke();

      // Badge de severidad
      doc.rect(margin + 15, y + 8, 60, 18)
         .fill(color);
      doc.fontSize(8)
         .fill('#ffffff')
         .text(label, margin + 15, y + 12, { width: 60, align: 'center' });

      // Mensaje de alerta
      doc.fontSize(10)
         .fill(this.colors.dark)
         .text(alert.message, margin + 85, y + 12, { width: pageWidth - 100 });

      // Timestamp
      doc.fontSize(8)
         .fill(this.colors.gray)
         .text(`${alert.timestamp || ''} - ${alert.api || 'Sistema'}`, margin + 15, y + 28);

      doc.y = y + 48;
    }

    if (alerts.length > 10) {
      doc.fontSize(9)
         .fill(this.colors.gray)
         .text(`... y ${alerts.length - 10} alertas adicionales`, margin);
    }

    doc.moveDown(2);
  }

  /**
   * Genera recomendaciones basadas en los datos (Estilo INGRID - boxes numerados)
   */
  generateRecommendations(doc, data) {
    this.checkPageBreak(doc, 150);
    this.sectionTitle(doc, 'Recomendaciones');

    const recommendations = this.generateRecommendationsList(data);
    const margin = 50;
    const pageWidth = doc.page.width - margin * 2;

    recommendations.forEach((rec, index) => {
      const y = doc.y;

      // Box de recomendación con número
      doc.rect(margin, y, pageWidth, 35)
         .fill('#ffffff');
      doc.rect(margin, y, 4, 35)
         .fill(this.colors.primary);
      doc.rect(margin, y, pageWidth, 35)
         .strokeColor(this.colors.border)
         .stroke();

      // Número circular
      doc.circle(margin + 22, y + 17, 10)
         .fill(this.colors.primary);
      doc.fontSize(10)
         .fill('#ffffff')
         .text(`${index + 1}`, margin + 15, y + 12, { width: 14, align: 'center' });

      // Texto de recomendación
      doc.fontSize(10)
         .fill(this.colors.dark)
         .text(rec, margin + 45, y + 10, { width: pageWidth - 60 });

      doc.y = y + 42;
    });

    doc.moveDown(2);
  }

  /**
   * Genera lista de recomendaciones basadas en métricas
   */
  generateRecommendationsList(data) {
    const recommendations = [];
    const summary = data.summary || {};
    const apis = data.apis || [];

    // Recomendaciones basadas en uptime
    if (summary.uptimePercentage < 99) {
      recommendations.push('Considerar implementar redundancia para mejorar la disponibilidad por debajo del 99%.');
    }
    if (summary.uptimePercentage < 95) {
      recommendations.push('CRÍTICO: La disponibilidad está por debajo del 95%. Revisar infraestructura urgentemente.');
    }

    // Recomendaciones basadas en latencia
    if (summary.avgLatency > 500) {
      recommendations.push('La latencia promedio supera los 500ms. Considerar optimización de endpoints.');
    }
    if (summary.avgLatency > 1000) {
      recommendations.push('CRÍTICO: Latencia muy alta (>1s). Revisar rendimiento del servidor y base de datos.');
    }

    // APIs con problemas
    const failedApis = apis.filter(a => !a.healthy);
    if (failedApis.length > 0) {
      recommendations.push(`${failedApis.length} API(s) con fallas. Revisar logs y configuración.`);
    }

    // APIs lentas
    const slowApis = apis.filter(a => a.latency > 500);
    if (slowApis.length > 0) {
      recommendations.push(`${slowApis.length} API(s) con latencia alta (>500ms). Optimizar consultas.`);
    }

    // Si todo está bien
    if (recommendations.length === 0) {
      recommendations.push('Todas las métricas están dentro de los parámetros normales.');
      recommendations.push('Continuar con el monitoreo regular.');
      recommendations.push('Considerar establecer alertas predictivas para anticipar problemas.');
    }

    return recommendations;
  }

  /**
   * Genera el pie de página - UNA SOLA LINEA
   */
  generateFooter(doc, pageNumber = 1, totalPages = 1) {
    const margin = 50;
    const pageWidth = doc.page.width - margin * 2;
    const footerY = doc.page.height - 30;

    doc.fontSize(7)
       .fill(this.colors.gray)
       .text(
         `QASL-API-SENTINEL | QASL NEXUS LLM | Elyer Maldonado | ${pageNumber}/${totalPages}`,
         margin,
         footerY,
         { width: pageWidth, align: 'center', lineBreak: false }
       );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Helpers (Estilo INGRID)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Título de sección estilo INGRID (azul con línea)
   */
  sectionTitle(doc, title) {
    doc.fontSize(14)
       .fill(this.colors.primary)
       .text(title.toUpperCase(), 50);

    doc.moveTo(50, doc.y + 3)
       .lineTo(150, doc.y + 3)
       .strokeColor(this.colors.primary)
       .lineWidth(2)
       .stroke();

    doc.lineWidth(1);
    doc.moveDown(1.2);
  }

  /**
   * Tabla profesional estilo INGRID (fondo blanco, header azul)
   */
  professionalTable(doc, data, options = {}) {
    const { margin = 50, statusColumn = -1 } = options;
    const startX = margin;
    const tableWidth = doc.page.width - margin * 2;
    const colWidth = tableWidth / data[0].length;
    const rowHeight = 28;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const y = doc.y;

      // Header row
      if (i === 0) {
        doc.rect(startX, y, tableWidth, rowHeight).fill(this.colors.primary);
        doc.fontSize(9).fill('#ffffff');
      } else {
        // Alternating rows - blanco y gris claro
        const bgColor = i % 2 === 0 ? this.colors.lightGray : '#ffffff';
        doc.rect(startX, y, tableWidth, rowHeight).fill(bgColor);
        doc.fontSize(9).fill(this.colors.dark);
      }

      // Borde de la fila
      doc.rect(startX, y, tableWidth, rowHeight)
         .strokeColor(this.colors.border)
         .stroke();

      for (let j = 0; j < row.length; j++) {
        let textColor = i === 0 ? '#ffffff' : this.colors.dark;

        // Colorear columna de estado
        if (i > 0 && j === statusColumn) {
          if (row[j] === 'OK') textColor = this.colors.success;
          else if (row[j] === 'ERROR' || row[j] === 'ALERTA') textColor = this.colors.danger;
          else if (row[j] === 'WARNING') textColor = this.colors.warning;
        }

        doc.fill(textColor)
           .text(row[j], startX + j * colWidth + 8, y + 9, {
             width: colWidth - 16,
             align: j === 0 ? 'left' : 'center'
           });
      }

      doc.y = y + rowHeight;
    }
  }

  /**
   * Obtiene texto de estado (sin emojis)
   */
  getStatusText(value, type = 'uptime') {
    if (type === 'uptime') {
      if (value >= 99) return 'OK';
      if (value >= 95) return 'WARNING';
      return 'CRITICO';
    }
    if (type === 'latency') {
      if (value < 200) return 'OK';
      if (value < 500) return 'WARNING';
      return 'CRITICO';
    }
    return 'N/A';
  }

  checkPageBreak(doc, requiredSpace) {
    if (doc.y + requiredSpace > doc.page.height - 80) {
      doc.addPage();
      doc.y = 50;
    }
  }

  getUptimeColor(uptime) {
    if (uptime >= 99) return '#3fb950';
    if (uptime >= 95) return '#d29922';
    return '#f85149';
  }

  getLatencyColor(latency) {
    if (latency < 200) return '#3fb950';
    if (latency < 500) return '#d29922';
    return '#f85149';
  }

  getSeverityColor(severity) {
    switch (severity) {
      case 'critical': return '#f85149';
      case 'warning': return '#d29922';
      default: return '#3fb950';
    }
  }

  getStatusIcon(value, type = 'uptime') {
    if (type === 'uptime') {
      if (value >= 99) return '✓';
      if (value >= 95) return '⚠';
      return '✗';
    }
    if (type === 'latency') {
      if (value < 200) return '✓';
      if (value < 500) return '⚠';
      return '✗';
    }
    return '?';
  }

  /**
   * Genera un reporte desde métricas de Prometheus
   */
  async generateFromMetrics(metricsUrl = 'http://localhost:9092/metrics', options = {}) {
    const response = await fetch(metricsUrl);
    const metricsText = await response.text();

    // Parsear métricas
    const data = this.parsePrometheusMetrics(metricsText);

    const result = await this.generateReport(data, {
      type: options.type || 'realtime',
      title: options.title || 'Real-time API Monitoring Report'
    });

    return result.path;
  }

  /**
   * Parsea métricas de Prometheus a formato de datos
   */
  parsePrometheusMetrics(metricsText) {
    const data = {
      summary: {},
      metrics: {},
      apis: [],
      alerts: []
    };

    const apiMetrics = new Map();

    for (const line of metricsText.split('\n')) {
      if (line.startsWith('#') || !line.trim()) continue;

      // Métricas globales
      if (line.startsWith('qasl_uptime_seconds ')) {
        data.metrics.uptime = parseInt(line.split(' ')[1]);
      } else if (line.startsWith('qasl_apis_total ')) {
        data.summary.totalApis = parseInt(line.split(' ')[1]);
      } else if (line.startsWith('qasl_checks_total ')) {
        data.metrics.totalChecks = parseInt(line.split(' ')[1]);
      } else if (line.startsWith('qasl_checks_success_total ')) {
        data.metrics.successChecks = parseInt(line.split(' ')[1]);
      } else if (line.startsWith('qasl_checks_failed_total ')) {
        data.metrics.failedChecks = parseInt(line.split(' ')[1]);
      } else if (line.startsWith('qasl_uptime_percentage ')) {
        data.summary.uptimePercentage = parseFloat(line.split(' ')[1]);
        data.metrics.uptimePercentage = data.summary.uptimePercentage;
      } else if (line.startsWith('qasl_latency_avg_ms ') && !line.includes('{')) {
        data.summary.avgLatency = parseInt(line.split(' ')[1]);
        data.metrics.avgLatency = data.summary.avgLatency;
      }

      // Métricas por API
      const apiStatusMatch = line.match(/qasl_api_status\{api_id="([^"]+)",api_name="([^"]+)".*\}\s+(\d+)/);
      if (apiStatusMatch) {
        const [, id, name, status] = apiStatusMatch;
        if (!apiMetrics.has(id)) apiMetrics.set(id, { id, name });
        apiMetrics.get(id).status = parseInt(status);
      }

      const apiLatencyMatch = line.match(/qasl_api_latency_ms\{api_id="([^"]+)".*\}\s+(\d+)/);
      if (apiLatencyMatch) {
        const [, id, latency] = apiLatencyMatch;
        if (!apiMetrics.has(id)) apiMetrics.set(id, { id });
        apiMetrics.get(id).latency = parseInt(latency);
      }

      const apiHealthyMatch = line.match(/qasl_api_healthy\{api_id="([^"]+)".*\}\s+(\d+)/);
      if (apiHealthyMatch) {
        const [, id, healthy] = apiHealthyMatch;
        if (!apiMetrics.has(id)) apiMetrics.set(id, { id });
        apiMetrics.get(id).healthy = parseInt(healthy) === 1;
      }

      const apiUptimeMatch = line.match(/qasl_api_uptime_percentage\{api_id="([^"]+)".*\}\s+([\d.]+)/);
      if (apiUptimeMatch) {
        const [, id, uptime] = apiUptimeMatch;
        if (!apiMetrics.has(id)) apiMetrics.set(id, { id });
        apiMetrics.get(id).uptime = parseFloat(uptime);
      }
    }

    data.apis = [...apiMetrics.values()];
    data.summary.alertCount = data.apis.filter(a => !a.healthy).length;

    return data;
  }
}

export default PDFReportGenerator;
