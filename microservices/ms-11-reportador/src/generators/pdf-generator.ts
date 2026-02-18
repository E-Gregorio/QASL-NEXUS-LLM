// ============================================================
// MS-11: Generador de PDF Ejecutivo
// Genera reportes PDF de 5 paginas para stakeholders
// ============================================================

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { ExecutiveSummary, TestExecutionMetrics, DefectMetrics } from '../types';

const REPORTS_DIR = path.join(__dirname, '../../reports');

export class PDFGenerator {

  constructor() {
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
  }

  /**
   * Genera PDF ejecutivo de 5 paginas
   */
  async generateExecutiveReport(
    summary: ExecutiveSummary,
    execMetrics: TestExecutionMetrics,
    defectMetrics: DefectMetrics
  ): Promise<string> {
    const filename = `QASL_Executive_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    const filepath = path.join(REPORTS_DIR, filename);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // PAGINA 1: Executive Summary
      this.pageHeader(doc, 'QASL NEXUS LLM - Executive Summary');
      doc.fontSize(12).text(`Fecha: ${new Date().toLocaleDateString()}`, { align: 'right' });
      doc.moveDown(2);

      doc.fontSize(14).text('Resumen General', { underline: true });
      doc.moveDown();
      doc.fontSize(11);
      doc.text(`Total Epics: ${summary.total_epics}`);
      doc.text(`Total User Stories: ${summary.total_user_stories}`);
      doc.text(`Total Test Cases: ${summary.total_test_cases}`);
      doc.text(`Test Cases Automatizados: ${summary.tcs_automatizados}`);
      doc.text(`VCR Promedio: ${summary.vcr_promedio}`);
      doc.moveDown();
      doc.fontSize(14).text('Estado de Calidad', { underline: true });
      doc.moveDown();
      doc.fontSize(11);
      doc.text(`Defectos Abiertos: ${summary.defectos_abiertos}`);
      doc.text(`Bloqueantes Activos: ${summary.bloqueantes_activos}`);
      doc.text(`Gaps Pendientes: ${summary.gaps_pendientes}`);
      doc.text(`Pipelines Exitosos: ${summary.pipelines_exitosos}`);
      doc.text(`Pipelines Fallidos: ${summary.pipelines_fallidos}`);

      // PAGINA 2: Test Execution Metrics
      doc.addPage();
      this.pageHeader(doc, 'Test Execution Metrics');
      doc.moveDown(2);
      doc.fontSize(11);
      doc.text(`Total Ejecutados: ${execMetrics.total_executed}`);
      doc.text(`Passed: ${execMetrics.passed}`);
      doc.text(`Failed: ${execMetrics.failed}`);
      doc.text(`Skipped: ${execMetrics.skipped}`);
      doc.text(`Blocked: ${execMetrics.blocked}`);
      doc.text(`Pass Rate: ${execMetrics.pass_rate}%`);
      doc.moveDown();
      doc.fontSize(14).text('Por Microservicio', { underline: true });
      doc.moveDown();
      doc.fontSize(11);
      Object.entries(execMetrics.by_source).forEach(([ms, data]) => {
        const rate = data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0;
        doc.text(`${ms}: ${data.passed}/${data.total} (${rate}% pass rate)`);
      });

      // PAGINA 3: Defect Analysis
      doc.addPage();
      this.pageHeader(doc, 'Defect Analysis');
      doc.moveDown(2);
      doc.fontSize(11);
      doc.text(`Total Defectos: ${defectMetrics.total}`);
      doc.text(`MTTR: ${defectMetrics.mttr_hours} horas`);
      doc.moveDown();
      doc.fontSize(14).text('Por Severidad', { underline: true });
      doc.moveDown();
      doc.fontSize(11);
      Object.entries(defectMetrics.by_severity).forEach(([sev, count]) => {
        doc.text(`${sev}: ${count}`);
      });
      doc.moveDown();
      doc.fontSize(14).text('Por Estado', { underline: true });
      doc.moveDown();
      doc.fontSize(11);
      Object.entries(defectMetrics.by_status).forEach(([status, count]) => {
        doc.text(`${status}: ${count}`);
      });
      doc.moveDown();
      doc.fontSize(14).text('Por Clasificacion', { underline: true });
      doc.moveDown();
      doc.fontSize(11);
      Object.entries(defectMetrics.by_classification).forEach(([cls, count]) => {
        doc.text(`${cls}: ${count}`);
      });

      // PAGINA 4: Automation Progress
      doc.addPage();
      this.pageHeader(doc, 'Automation Progress');
      doc.moveDown(2);
      doc.fontSize(11);
      const autoRate = summary.total_test_cases > 0
        ? Math.round((summary.tcs_automatizados / summary.total_test_cases) * 100)
        : 0;
      doc.text(`Total Test Cases: ${summary.total_test_cases}`);
      doc.text(`Automatizados: ${summary.tcs_automatizados} (${autoRate}%)`);
      doc.text(`Manuales: ${summary.total_test_cases - summary.tcs_automatizados}`);
      doc.text(`VCR Promedio: ${summary.vcr_promedio}`);

      // PAGINA 5: Recommendations
      doc.addPage();
      this.pageHeader(doc, 'Recommendations');
      doc.moveDown(2);
      doc.fontSize(11);

      if (summary.bloqueantes_activos > 0) {
        doc.text(`CRITICO: ${summary.bloqueantes_activos} defecto(s) bloqueante(s) activo(s). Resolver inmediatamente.`);
        doc.moveDown();
      }
      if (summary.gaps_pendientes > 0) {
        doc.text(`ATENCION: ${summary.gaps_pendientes} gap(s) de analisis estatico pendiente(s). Revisar requisitos.`);
        doc.moveDown();
      }
      if (execMetrics.pass_rate < 95) {
        doc.text(`MEJORA: Pass rate actual ${execMetrics.pass_rate}%. Objetivo: >= 95%.`);
        doc.moveDown();
      }
      if (autoRate < 60) {
        doc.text(`AUTOMATIZACION: Cobertura ${autoRate}%. Priorizar TCs con VCR >= 9.`);
        doc.moveDown();
      }

      doc.moveDown(3);
      doc.fontSize(9).text('Generado automaticamente por QASL NEXUS LLM - MS-11 Reportador', { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        console.log(`[PDF] Reporte generado: ${filepath}`);
        resolve(filepath);
      });
      stream.on('error', reject);
    });
  }

  private pageHeader(doc: PDFKit.PDFDocument, title: string) {
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  }
}
