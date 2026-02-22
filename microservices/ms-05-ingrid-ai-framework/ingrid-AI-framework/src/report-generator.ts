// ═══════════════════════════════════════════════════════════════
// INGRID - PDF REPORT GENERATOR
// Genera reportes profesionales en PDF
// ═══════════════════════════════════════════════════════════════

import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { StoredEvaluation } from './metrics-store';

// Colores del tema INGRID
const COLORS = {
  primary: '#1a2332',      // Azul oscuro (header)
  secondary: '#2ecc71',    // Verde (acentos)
  accent: '#3498db',       // Azul claro
  danger: '#e74c3c',       // Rojo
  warning: '#f39c12',      // Amarillo
  text: '#333333',         // Texto principal
  textLight: '#666666',    // Texto secundario
  white: '#ffffff',
  lightGray: '#f5f5f5',
};

interface ReportData {
  projectName: string;
  targetModel: string;
  date: string;
  author: string;
  evaluations: StoredEvaluation[];
}

export class PDFReportGenerator {
  private doc: typeof PDFDocument;
  private pageWidth: number = 595.28;  // A4
  private pageHeight: number = 841.89; // A4
  private margin: number = 50;
  private currentY: number = 50;

  constructor() {
    this.doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: 'INGRID - AI Security Test Report',
        Author: 'Elyer Maldonado',
        Subject: 'OWASP LLM Top 10 Security Assessment',
        Creator: 'INGRID AI Testing Framework',
      },
    });
  }

  private calculateMetrics(evaluations: StoredEvaluation[]) {
    const total = evaluations.length;
    const passed = evaluations.filter(e => e.evaluation.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    // OWASP metrics
    const securityTests = evaluations.filter(e => e.category === 'security');
    const owaspPassed = securityTests.filter(e => e.evaluation.passed).length;
    const owaspTotal = securityTests.length;
    const owaspScore = owaspTotal > 0 ? Math.round((owaspPassed / owaspTotal) * 10) : 0;

    // LLM-as-Judge averages
    const avgRelevance = this.average(evaluations.map(e => e.evaluation.relevance));
    const avgAccuracy = this.average(evaluations.map(e => e.evaluation.accuracy));
    const avgCoherence = this.average(evaluations.map(e => e.evaluation.coherence));
    const avgCompleteness = this.average(evaluations.map(e => e.evaluation.completeness));
    const avgHallucination = this.average(evaluations.map(e => e.evaluation.hallucination));

    // Performance
    const avgResponseTime = this.average(evaluations.map(e => e.responseTime));

    // Vulnerabilities by severity
    const vulnerabilities = {
      critical: evaluations.filter(e => e.securityResult?.severity === 'critical' && !e.securityResult?.wasBlocked).length,
      high: evaluations.filter(e => e.securityResult?.severity === 'high' && !e.securityResult?.wasBlocked).length,
      medium: evaluations.filter(e => e.securityResult?.severity === 'medium' && !e.securityResult?.wasBlocked).length,
      low: evaluations.filter(e => e.securityResult?.severity === 'low' && !e.securityResult?.wasBlocked).length,
    };

    return {
      total,
      passed,
      failed,
      passRate,
      owaspScore,
      owaspPassed,
      owaspTotal,
      avgRelevance,
      avgAccuracy,
      avgCoherence,
      avgCompleteness,
      avgHallucination,
      avgResponseTime,
      vulnerabilities,
    };
  }

  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private drawHeader(title: string, subtitle?: string): void {
    // Header background
    this.doc
      .rect(0, 0, this.pageWidth, 120)
      .fill(COLORS.primary);

    // Green accent line
    this.doc
      .rect(this.pageWidth / 2 - 50, 25, 100, 4)
      .fill(COLORS.secondary);

    // Title
    this.doc
      .font('Helvetica-Bold')
      .fontSize(32)
      .fillColor(COLORS.white)
      .text(title, 0, 40, { align: 'center' });

    // Subtitle
    if (subtitle) {
      this.doc
        .font('Helvetica')
        .fontSize(16)
        .fillColor(COLORS.white)
        .text(subtitle, 0, 80, { align: 'center' });
    }

    // Green accent line bottom
    this.doc
      .rect(this.pageWidth / 2 - 50, 105, 100, 4)
      .fill(COLORS.secondary);

    this.currentY = 140;
  }

  private drawSectionTitle(title: string): void {
    this.checkPageBreak(60);

    this.doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor(COLORS.primary)
      .text(title, this.margin, this.currentY);

    // Underline
    this.doc
      .rect(this.margin, this.currentY + 25, 100, 3)
      .fill(COLORS.secondary);

    this.currentY += 40;
  }

  private drawKPIBox(x: number, y: number, width: number, height: number, value: string, label: string, color: string = COLORS.primary): void {
    // Box background
    this.doc
      .rect(x, y, width, height)
      .fill(COLORS.lightGray);

    // Left accent
    this.doc
      .rect(x, y, 5, height)
      .fill(color);

    // Value
    this.doc
      .font('Helvetica-Bold')
      .fontSize(28)
      .fillColor(color)
      .text(value, x + 15, y + 20, { width: width - 30, align: 'center' });

    // Label
    this.doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(COLORS.textLight)
      .text(label, x + 15, y + 55, { width: width - 30, align: 'center' });
  }

  private drawProgressBar(x: number, y: number, width: number, value: number, max: number = 10, label: string): void {
    const percentage = (value / max) * 100;
    const barWidth = width - 120;
    const filledWidth = (percentage / 100) * barWidth;

    // Label
    this.doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(COLORS.text)
      .text(label, x, y + 3, { width: 100 });

    // Background bar
    this.doc
      .rect(x + 105, y, barWidth, 18)
      .fill('#e0e0e0');

    // Filled bar
    const barColor = percentage >= 70 ? COLORS.secondary : percentage >= 50 ? COLORS.warning : COLORS.danger;
    this.doc
      .rect(x + 105, y, filledWidth, 18)
      .fill(barColor);

    // Value text
    this.doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(COLORS.text)
      .text(`${value.toFixed(1)}/${max}`, x + 110 + barWidth, y + 3);
  }

  private drawTable(headers: string[], rows: string[][], columnWidths: number[]): void {
    const tableWidth = columnWidths.reduce((a, b) => a + b, 0);
    const rowHeight = 25;
    let x = this.margin;

    // Header row
    this.doc
      .rect(x, this.currentY, tableWidth, rowHeight)
      .fill(COLORS.primary);

    let headerX = x;
    headers.forEach((header, i) => {
      this.doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(COLORS.white)
        .text(header, headerX + 5, this.currentY + 8, { width: columnWidths[i] - 10 });
      headerX += columnWidths[i];
    });

    this.currentY += rowHeight;

    // Data rows
    rows.forEach((row, rowIndex) => {
      this.checkPageBreak(rowHeight + 10);

      const bgColor = rowIndex % 2 === 0 ? COLORS.white : COLORS.lightGray;
      this.doc
        .rect(x, this.currentY, tableWidth, rowHeight)
        .fill(bgColor);

      let cellX = x;
      row.forEach((cell, i) => {
        this.doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(COLORS.text)
          .text(cell, cellX + 5, this.currentY + 8, { width: columnWidths[i] - 10 });
        cellX += columnWidths[i];
      });

      this.currentY += rowHeight;
    });

    this.currentY += 10;
  }

  private checkPageBreak(neededSpace: number): void {
    if (this.currentY + neededSpace > this.pageHeight - this.margin) {
      this.doc.addPage();
      this.currentY = this.margin;
    }
  }

  private drawFooter(pageNum: number): void {
    this.doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.textLight)
      .text(
        `INGRID AI Testing Framework | Elyer Maldonado | Pagina ${pageNum}`,
        this.margin,
        this.pageHeight - 30,
        { align: 'center', width: this.pageWidth - 2 * this.margin }
      );
  }

  public generate(data: ReportData, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const metrics = this.calculateMetrics(data.evaluations);
        const stream = fs.createWriteStream(outputPath);
        this.doc.pipe(stream);

        // ═══════════════════════════════════════════════════════════════
        // PAGE 1: Cover
        // ═══════════════════════════════════════════════════════════════
        this.drawHeader('INGRID', 'AI Security Test Report');

        // Project info
        this.currentY = 180;
        this.doc
          .font('Helvetica-Bold')
          .fontSize(24)
          .fillColor(COLORS.primary)
          .text(data.projectName || 'AI Security Assessment', this.margin, this.currentY, { align: 'center', width: this.pageWidth - 2 * this.margin });

        this.currentY += 40;
        this.doc
          .font('Helvetica')
          .fontSize(14)
          .fillColor(COLORS.textLight)
          .text(`Target Model: ${data.targetModel}`, this.margin, this.currentY, { align: 'center', width: this.pageWidth - 2 * this.margin });

        // KPIs
        this.currentY = 300;
        const kpiWidth = 115;
        const kpiHeight = 80;
        const kpiGap = 15;
        const kpiStartX = (this.pageWidth - (4 * kpiWidth + 3 * kpiGap)) / 2;

        this.drawKPIBox(kpiStartX, this.currentY, kpiWidth, kpiHeight,
          metrics.total.toString(), 'Tests Ejecutados', COLORS.primary);
        this.drawKPIBox(kpiStartX + kpiWidth + kpiGap, this.currentY, kpiWidth, kpiHeight,
          `${metrics.passRate.toFixed(1)}%`, 'Pass Rate', metrics.passRate >= 70 ? COLORS.secondary : COLORS.danger);
        this.drawKPIBox(kpiStartX + 2 * (kpiWidth + kpiGap), this.currentY, kpiWidth, kpiHeight,
          `${metrics.owaspScore}/10`, 'OWASP Score', metrics.owaspScore >= 7 ? COLORS.secondary : COLORS.danger);
        this.drawKPIBox(kpiStartX + 3 * (kpiWidth + kpiGap), this.currentY, kpiWidth, kpiHeight,
          `${Math.round(metrics.avgResponseTime)}ms`, 'Avg Response', COLORS.accent);

        // Methodology
        this.currentY = 450;
        this.doc
          .font('Helvetica')
          .fontSize(11)
          .fillColor(COLORS.textLight)
          .text('Metodologia: OWASP LLM Top 10 2025 | LLM-as-Judge', this.margin, this.currentY, { align: 'center', width: this.pageWidth - 2 * this.margin });

        // Footer info
        this.currentY = 700;
        this.doc
          .font('Helvetica')
          .fontSize(12)
          .fillColor(COLORS.text)
          .text(`Autor: ${data.author}`, this.margin, this.currentY, { align: 'center', width: this.pageWidth - 2 * this.margin });

        this.currentY += 20;
        this.doc
          .text(`Fecha: ${data.date}`, this.margin, this.currentY, { align: 'center', width: this.pageWidth - 2 * this.margin });

        this.drawFooter(1);

        // ═══════════════════════════════════════════════════════════════
        // PAGE 2: OWASP LLM Top 10 Results
        // ═══════════════════════════════════════════════════════════════
        this.doc.addPage();
        this.currentY = this.margin;

        // Header bar
        this.doc
          .rect(0, 0, this.pageWidth, 60)
          .fill(COLORS.primary);
        this.doc
          .font('Helvetica-Bold')
          .fontSize(20)
          .fillColor(COLORS.white)
          .text('OWASP LLM Top 10 2025 - Resultados', this.margin, 20);

        this.currentY = 80;

        // OWASP Tests Table
        const securityTests = data.evaluations.filter(e => e.category === 'security');
        const owaspRows: string[][] = [];

        const owaspMapping: Record<string, string> = {
          'prompt_injection': 'LLM01',
          'xss_injection': 'LLM02',
          'bias_detection': 'LLM03',
          'dos_attack': 'LLM04',
          'supply_chain': 'LLM05',
          'system_prompt_leak': 'LLM06',
          'command_injection': 'LLM07',
          'excessive_agency': 'LLM08',
          'hallucination': 'LLM09',
          'model_extraction': 'LLM10',
        };

        securityTests.forEach(test => {
          const attackType = test.securityResult?.attackType || 'unknown';
          const owaspId = owaspMapping[attackType] || attackType.toUpperCase();
          const status = test.evaluation.passed ? 'PASS' : 'FAIL';
          const severity = test.securityResult?.severity || 'low';

          owaspRows.push([
            owaspId,
            test.testName.replace('LLM0', '').replace(' - ', ': ').substring(0, 35),
            status,
            severity.toUpperCase(),
          ]);
        });

        if (owaspRows.length > 0) {
          this.drawTable(
            ['ID', 'Vulnerabilidad', 'Estado', 'Severidad'],
            owaspRows,
            [60, 280, 70, 85]
          );
        }

        // Vulnerability Summary
        this.currentY += 20;
        this.drawSectionTitle('Resumen de Vulnerabilidades');

        const vulnData = [
          { label: 'Critical', value: metrics.vulnerabilities.critical, color: '#8b0000' },
          { label: 'High', value: metrics.vulnerabilities.high, color: COLORS.danger },
          { label: 'Medium', value: metrics.vulnerabilities.medium, color: COLORS.warning },
          { label: 'Low', value: metrics.vulnerabilities.low, color: COLORS.secondary },
        ];

        vulnData.forEach((v, i) => {
          const boxX = this.margin + i * 125;
          this.doc
            .rect(boxX, this.currentY, 115, 50)
            .fill(COLORS.lightGray);
          this.doc
            .rect(boxX, this.currentY, 5, 50)
            .fill(v.color);
          this.doc
            .font('Helvetica-Bold')
            .fontSize(24)
            .fillColor(v.color)
            .text(v.value.toString(), boxX + 10, this.currentY + 10, { width: 95, align: 'center' });
          this.doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor(COLORS.textLight)
            .text(v.label, boxX + 10, this.currentY + 35, { width: 95, align: 'center' });
        });

        this.drawFooter(2);

        // ═══════════════════════════════════════════════════════════════
        // PAGE 3: LLM-as-Judge Metrics
        // ═══════════════════════════════════════════════════════════════
        this.doc.addPage();
        this.currentY = this.margin;

        // Header bar
        this.doc
          .rect(0, 0, this.pageWidth, 60)
          .fill(COLORS.primary);
        this.doc
          .font('Helvetica-Bold')
          .fontSize(20)
          .fillColor(COLORS.white)
          .text('LLM-as-Judge - Metricas de Calidad', this.margin, 20);

        this.currentY = 100;

        // Quality metrics bars
        const qualityMetrics = [
          { label: 'Relevancia', value: metrics.avgRelevance },
          { label: 'Precision', value: metrics.avgAccuracy },
          { label: 'Coherencia', value: metrics.avgCoherence },
          { label: 'Completitud', value: metrics.avgCompleteness },
          { label: 'Sin Alucinacion', value: metrics.avgHallucination },
        ];

        qualityMetrics.forEach((m, i) => {
          this.drawProgressBar(this.margin, this.currentY + i * 35, this.pageWidth - 2 * this.margin, m.value, 10, m.label);
        });

        this.currentY += 200;

        // Functional Tests Table
        this.drawSectionTitle('Tests Funcionales');

        const functionalTests = data.evaluations.filter(e => e.category === 'functional');
        if (functionalTests.length > 0) {
          const funcRows = functionalTests.map(t => [
            t.testName.substring(0, 30),
            t.evaluation.relevance.toFixed(1),
            t.evaluation.accuracy.toFixed(1),
            t.evaluation.passed ? 'PASS' : 'FAIL',
          ]);

          this.drawTable(
            ['Test', 'Relevancia', 'Precision', 'Estado'],
            funcRows,
            [200, 90, 90, 115]
          );
        }

        // Performance Tests
        this.currentY += 20;
        this.drawSectionTitle('Tests de Performance');

        const perfTests = data.evaluations.filter(e => e.category === 'performance');
        if (perfTests.length > 0) {
          const perfRows = perfTests.map(t => [
            t.testName.substring(0, 35),
            `${t.responseTime}ms`,
            t.evaluation.passed ? 'PASS' : 'FAIL',
          ]);

          this.drawTable(
            ['Test', 'Response Time', 'Estado'],
            perfRows,
            [250, 120, 125]
          );
        }

        this.drawFooter(3);

        // ═══════════════════════════════════════════════════════════════
        // PAGE 4: Conclusions
        // ═══════════════════════════════════════════════════════════════
        this.doc.addPage();
        this.currentY = this.margin;

        // Header bar
        this.doc
          .rect(0, 0, this.pageWidth, 60)
          .fill(COLORS.primary);
        this.doc
          .font('Helvetica-Bold')
          .fontSize(20)
          .fillColor(COLORS.white)
          .text('Conclusiones', this.margin, 20);

        this.currentY = 100;

        // Conclusions boxes
        const conclusions = [
          {
            num: '1',
            title: 'Cobertura OWASP',
            desc: `${metrics.owaspPassed}/${metrics.owaspTotal} tests de seguridad pasaron. Score: ${metrics.owaspScore}/10`,
            color: metrics.owaspScore >= 7 ? COLORS.secondary : COLORS.danger,
          },
          {
            num: '2',
            title: 'Calidad de Respuestas',
            desc: `Promedio LLM-as-Judge: ${((metrics.avgRelevance + metrics.avgAccuracy + metrics.avgCoherence) / 3).toFixed(1)}/10`,
            color: COLORS.accent,
          },
          {
            num: '3',
            title: 'Performance',
            desc: `Tiempo promedio de respuesta: ${Math.round(metrics.avgResponseTime)}ms`,
            color: metrics.avgResponseTime < 30000 ? COLORS.secondary : COLORS.warning,
          },
          {
            num: '4',
            title: 'Vulnerabilidades',
            desc: `Critical: ${metrics.vulnerabilities.critical} | High: ${metrics.vulnerabilities.high} | Medium: ${metrics.vulnerabilities.medium}`,
            color: metrics.vulnerabilities.critical > 0 ? COLORS.danger : COLORS.secondary,
          },
        ];

        conclusions.forEach((c, i) => {
          const boxY = this.currentY + i * 85;

          // Background
          this.doc
            .rect(this.margin, boxY, this.pageWidth - 2 * this.margin, 75)
            .fill(COLORS.lightGray);

          // Number box
          this.doc
            .rect(this.margin, boxY, 50, 75)
            .fill(c.color);
          this.doc
            .font('Helvetica-Bold')
            .fontSize(24)
            .fillColor(COLORS.white)
            .text(c.num, this.margin, boxY + 25, { width: 50, align: 'center' });

          // Title and description
          this.doc
            .font('Helvetica-Bold')
            .fontSize(14)
            .fillColor(COLORS.primary)
            .text(c.title, this.margin + 65, boxY + 15);
          this.doc
            .font('Helvetica')
            .fontSize(11)
            .fillColor(COLORS.textLight)
            .text(c.desc, this.margin + 65, boxY + 40, { width: this.pageWidth - 2 * this.margin - 80 });
        });

        // Standards
        this.currentY += 380;
        this.drawSectionTitle('Estandares Aplicados');

        this.doc
          .font('Helvetica')
          .fontSize(11)
          .fillColor(COLORS.text);

        const standards = [
          'OWASP LLM Top 10 2025 - Seguridad en Large Language Models',
          'LLM-as-Judge Methodology - Evaluacion automatizada con IA',
          'ISO/IEC 27001 - Seguridad de la informacion',
          'NIST AI RMF - Framework de gestion de riesgos de IA',
        ];

        standards.forEach((s, i) => {
          this.doc
            .fillColor(COLORS.secondary)
            .text('>', this.margin, this.currentY + i * 20);
          this.doc
            .fillColor(COLORS.text)
            .text(s, this.margin + 20, this.currentY + i * 20);
        });

        // Footer with author
        this.currentY = this.pageHeight - 120;
        this.doc
          .font('Helvetica-Bold')
          .fontSize(12)
          .fillColor(COLORS.primary)
          .text('Generado por INGRID AI Testing Framework', this.margin, this.currentY, { align: 'center', width: this.pageWidth - 2 * this.margin });

        this.currentY += 20;
        this.doc
          .font('Helvetica')
          .fontSize(11)
          .fillColor(COLORS.textLight)
          .text('Desarrollado por Elyer Maldonado - QA Lead', this.margin, this.currentY, { align: 'center', width: this.pageWidth - 2 * this.margin });

        this.currentY += 15;
        this.doc
          .text('github.com/E-Gregorio/ingrid-AI-framework', this.margin, this.currentY, { align: 'center', width: this.pageWidth - 2 * this.margin });

        this.drawFooter(4);

        // Finalize
        this.doc.end();

        stream.on('finish', () => {
          console.log(`[INGRID] PDF Report generated: ${outputPath}`);
          resolve(outputPath);
        });

        stream.on('error', reject);

      } catch (error) {
        reject(error);
      }
    });
  }
}

export default PDFReportGenerator;
