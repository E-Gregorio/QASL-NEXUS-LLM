// ============================================================
// MS-11: Generador de PDF
// Genera reportes PDF ejecutivos y de pipeline
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

  // Genera PDF ejecutivo general (5 paginas)
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
        console.log(`[PDF] Reporte ejecutivo generado: ${filepath}`);
        resolve(filepath);
      });
      stream.on('error', reject);
    });
  }

  // ============================================================
  // Genera PDF especifico del pipeline (5 paginas)
  // Datos reales del pipeline: tests generados, ejecucion, defectos
  // ============================================================
  async generatePipelineReport(pipelineData: any): Promise<string> {
    const { pipeline, tests, executions, defects } = pipelineData;
    const plId = pipeline?.pipeline_id || 'unknown';
    const filename = `QASL_Pipeline_${plId}_${new Date().toISOString().split('T')[0]}.pdf`;
    const filepath = path.join(REPORTS_DIR, filename);

    const totalPassed = pipeline?.total_passed || 0;
    const totalFailed = pipeline?.total_failed || 0;
    const totalExecuted = pipeline?.total_tc_ejecutados || (totalPassed + totalFailed);
    const passRate = pipeline?.pass_rate || (totalExecuted > 0 ? ((totalPassed / totalExecuted) * 100).toFixed(1) : '0');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // ── PAGINA 1: Pipeline Summary ──
      this.pageHeader(doc, 'QASL NEXUS LLM - Pipeline Report');
      doc.moveDown();

      // Status badge
      const status = pipeline?.estado || 'Unknown';
      const statusColor = status === 'Success' ? '#36a64f' : status === 'Failed' ? '#dc3545' : '#ffc107';
      doc.fontSize(16).fillColor(statusColor).text(`Status: ${status}`, { align: 'center' });
      doc.fillColor('#000000');
      doc.moveDown();

      doc.fontSize(11);
      doc.text(`Pipeline ID: ${plId}`);
      doc.text(`Fecha: ${pipeline?.fecha_inicio ? new Date(pipeline.fecha_inicio).toLocaleString() : new Date().toLocaleString()}`);
      if (pipeline?.fecha_fin) {
        doc.text(`Duracion: ${pipeline.duracion_seg || 0} segundos`);
      }
      doc.text(`Tipo: ${pipeline?.tipo || 'full'}`);
      doc.text(`Trigger: ${pipeline?.trigger_type || 'manual'} (${pipeline?.trigger_by || 'command-center'})`);
      doc.moveDown();

      if (pipeline?.target_url) {
        doc.fontSize(14).text('Target URL', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#1a73e8').text(pipeline.target_url);
        doc.fillColor('#000000');
        doc.moveDown();
      }

      if (pipeline?.objective) {
        doc.fontSize(14).text('Objetivo', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).text(pipeline.objective);
        doc.moveDown();
      }

      // Metricas principales
      doc.fontSize(14).text('Resultados', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(13);
      doc.text(`Total Tests Ejecutados: ${totalExecuted}`);
      doc.fillColor('#36a64f').text(`Passed: ${totalPassed}`);
      doc.fillColor('#dc3545').text(`Failed: ${totalFailed}`);
      doc.fillColor('#000000');
      doc.fontSize(16).text(`Pass Rate: ${passRate}%`, { align: 'center' });
      doc.moveDown();

      // Fases ejecutadas
      if (pipeline?.fases_ejecutadas) {
        doc.fontSize(14).fillColor('#000000').text('Fases del Pipeline', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        try {
          const fases = typeof pipeline.fases_ejecutadas === 'string'
            ? JSON.parse(pipeline.fases_ejecutadas)
            : pipeline.fases_ejecutadas;
          Object.entries(fases).forEach(([fase, estado]) => {
            const faseColor = estado === 'done' || estado === 'completed' ? '#36a64f' : estado === 'error' ? '#dc3545' : '#ffc107';
            doc.fillColor(faseColor).text(`  ${fase}: ${estado}`);
          });
          doc.fillColor('#000000');
        } catch { /* ignore parse */ }
      }

      // ── PAGINA 2: Test Cases Generados ──
      doc.addPage();
      this.pageHeader(doc, 'Test Cases Generados por AI');
      doc.moveDown();

      doc.fontSize(11);
      doc.text(`Total tests generados por MS-09 (Opus 4.6): ${tests.length}`);
      doc.moveDown();

      if (tests.length > 0) {
        tests.forEach((t: any, i: number) => {
          const testStatus = t.status || 'generated';
          const testColor = testStatus === 'passed' ? '#36a64f' : testStatus === 'failed' ? '#dc3545' : '#666666';

          doc.fontSize(10);
          doc.fillColor('#000000').text(`${i + 1}. ${t.test_name || `Test ${i + 1}`}`, { continued: true });
          doc.fillColor(testColor).text(`  [${testStatus.toUpperCase()}]`);
          doc.fillColor('#000000');

          if (t.test_type) {
            doc.fontSize(9).fillColor('#888888').text(`   Tipo: ${t.test_type}`);
          }
          doc.fillColor('#000000');
          doc.moveDown(0.3);

          // No pasar de pagina si queda espacio
          if (doc.y > 720) {
            doc.addPage();
            this.pageHeader(doc, 'Test Cases Generados (cont.)');
            doc.moveDown();
          }
        });
      } else {
        doc.text('No se generaron tests por AI (MS-03 uso spec exploratorio basico)');
      }

      // ── PAGINA 3: Detalles de Ejecucion ──
      doc.addPage();
      this.pageHeader(doc, 'Detalles de Ejecucion');
      doc.moveDown();

      doc.fontSize(11);
      doc.text(`Ejecuciones registradas: ${executions.length}`);
      doc.moveDown();

      if (executions.length > 0) {
        executions.forEach((ex: any, i: number) => {
          const exColor = ex.resultado === 'pass' ? '#36a64f' : ex.resultado === 'fail' ? '#dc3545' : '#ffc107';
          doc.fontSize(10);
          doc.fillColor('#000000').text(`${i + 1}. Source: ${ex.source_ms || 'ms-03'}`, { continued: true });
          doc.fillColor(exColor).text(`  [${(ex.resultado || 'unknown').toUpperCase()}]`);
          doc.fillColor('#000000');

          if (ex.duracion_ms) {
            doc.fontSize(9).text(`   Duracion: ${Math.round(ex.duracion_ms / 1000)}s`);
          }
          if (ex.ambiente) {
            doc.fontSize(9).text(`   Ambiente: ${ex.ambiente}`);
          }
          if (ex.notas) {
            doc.fontSize(9).fillColor('#555555').text(`   ${ex.notas}`);
            doc.fillColor('#000000');
          }
          doc.moveDown(0.3);
        });
      } else {
        doc.text('Sin registros de ejecucion');
      }

      // Herramientas utilizadas
      doc.moveDown();
      doc.fontSize(14).text('Herramientas de Testing', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);
      doc.text('Playwright (E2E Browser Automation)');
      doc.text('Newman (API Testing)');
      doc.text('K6 (Performance/Load Testing)');
      doc.text('ZAP (OWASP Security Scanning)');
      doc.text('Allure (Test Reporting)');

      // ── PAGINA 4: Defectos del Pipeline ──
      doc.addPage();
      this.pageHeader(doc, 'Defectos Detectados');
      doc.moveDown();

      doc.fontSize(11);
      if (defects.length > 0) {
        doc.text(`Total defectos en este pipeline: ${defects.length}`);
        doc.moveDown();

        defects.forEach((d: any, i: number) => {
          const sevColor = d.severidad === 'Bloqueante' ? '#dc3545' : d.severidad === 'Alta' ? '#ff6b35' : '#ffc107';
          doc.fontSize(10);
          doc.fillColor('#000000').text(`${i + 1}. ${d.titulo || d.bug_id}`, { continued: true });
          doc.fillColor(sevColor).text(`  [${d.severidad || 'Media'}]`);
          doc.fillColor('#000000');

          if (d.resumen) {
            doc.fontSize(9).text(`   ${d.resumen}`);
          }
          doc.fontSize(9).text(`   Estado: ${d.estado || 'Abierto'} | Clasificacion: ${d.clasificacion || 'N/A'}`);
          doc.moveDown(0.3);

          if (doc.y > 720) {
            doc.addPage();
            this.pageHeader(doc, 'Defectos (cont.)');
            doc.moveDown();
          }
        });
      } else {
        doc.fontSize(13).fillColor('#36a64f').text('Sin defectos detectados', { align: 'center' });
        doc.fillColor('#000000');
        doc.moveDown();
        doc.fontSize(11).text('No se registraron defectos durante la ejecucion de este pipeline.');
      }

      // ── PAGINA 5: Recomendaciones y Metadata ──
      doc.addPage();
      this.pageHeader(doc, 'Recomendaciones y Metadata');
      doc.moveDown();

      doc.fontSize(14).text('Recomendaciones', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);

      const pr = parseFloat(String(passRate));
      if (pr >= 95) {
        doc.fillColor('#36a64f').text('EXCELENTE: Pass rate >= 95%. La aplicacion cumple criterios de calidad.');
        doc.fillColor('#000000');
      } else if (pr >= 80) {
        doc.text('ACEPTABLE: Pass rate >= 80%. Revisar tests fallidos antes de release.');
      } else {
        doc.fillColor('#dc3545').text(`CRITICO: Pass rate ${passRate}%. No apto para release. Revisar y corregir tests fallidos.`);
        doc.fillColor('#000000');
      }
      doc.moveDown();

      if (totalFailed > 0) {
        doc.text(`ATENCION: ${totalFailed} test(s) fallido(s). Revisar logs de ejecucion y Allure Report.`);
        doc.moveDown();
      }

      if (defects.length > 0) {
        const bloqueantes = defects.filter((d: any) => d.severidad === 'Bloqueante').length;
        if (bloqueantes > 0) {
          doc.fillColor('#dc3545').text(`BLOQUEANTE: ${bloqueantes} defecto(s) critico(s). Resolver antes de continuar.`);
          doc.fillColor('#000000');
          doc.moveDown();
        }
      }

      // Metadata
      doc.moveDown(2);
      doc.fontSize(14).text('Metadata del Pipeline', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Plataforma: QASL NEXUS LLM`);
      doc.text(`Generador de Tests: MS-09 Orquestador LLM (Opus 4.6)`);
      doc.text(`Ejecutor de Tests: MS-03 QASL Framework (Playwright + Newman + K6 + ZAP)`);
      doc.text(`Reportador: MS-11 Reportador Multi-Canal`);
      doc.text(`Normas: ISTQB v4.0 | IEEE 829 | IEEE 830 | ISO 29119`);
      doc.moveDown();
      doc.text(`Fecha de generacion: ${new Date().toLocaleString()}`);

      doc.moveDown(3);
      doc.fontSize(9).text('Generado automaticamente por QASL NEXUS LLM - MS-11 Reportador', { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        console.log(`[PDF] Pipeline report generado: ${filepath}`);
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
