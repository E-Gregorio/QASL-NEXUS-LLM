/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                         GARAK REPORT IMPORTER                               ║
 * ║              Puente: NVIDIA Garak → Prometheus Pushgateway                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Proyecto: SIGMA                                                            ║
 * ║  Cliente: AGIP (Administracion Gubernamental de Ingresos Publicos)          ║
 * ║  Empresa: Epidata Consulting                                                ║
 * ║  Lider Tecnico QA: Elyer Gregorio Maldonado                                 ║
 * ║  Version: 1.0.0                                                             ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Parsea reportes JSONL de NVIDIA Garak y envia las metricas                 ║
 * ║  al Pushgateway de Prometheus para visualizacion en Grafana.                ║
 * ║                                                                              ║
 * ║  Flujo: Garak JSONL → Parser → Pushgateway → Prometheus → Grafana          ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import http from 'http';
import { log } from '../core/banner.mjs';

export class GarakImporter {
  constructor(options = {}) {
    this.pushgatewayUrl = options.pushgatewayUrl || process.env.PUSHGATEWAY_URL || 'http://localhost:9096';
    this.jobName = 'garak_llm_security';
  }

  /**
   * Importa un reporte JSONL de Garak y envia metricas al Pushgateway
   */
  async import(filePath) {
    log(`Importando reporte Garak: ${filePath}`, 'info');

    if (!existsSync(filePath)) {
      throw new Error(`Archivo no encontrado: ${filePath}`);
    }

    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.trim());

    // Parsear todas las entradas del JSONL
    const entries = lines.map((line, i) => {
      try {
        return JSON.parse(line);
      } catch {
        log(`Linea ${i + 1}: JSON invalido, saltando`, 'warn');
        return null;
      }
    }).filter(Boolean);

    // Extraer datos por tipo de entrada
    const parsed = this.parseEntries(entries);

    // Generar metricas en formato Prometheus
    const metrics = this.generateMetrics(parsed);

    // Enviar al Pushgateway
    await this.pushMetrics(metrics);

    // Log resumen
    this.logSummary(parsed);

    return parsed;
  }

  /**
   * Auto-detecta el reporte mas reciente en el directorio de Garak
   */
  async importLatest(garakDir) {
    const dir = garakDir || this.getDefaultGarakDir();
    log(`Buscando reportes Garak en: ${dir}`, 'info');

    if (!existsSync(dir)) {
      throw new Error(`Directorio de Garak no encontrado: ${dir}`);
    }

    const files = readdirSync(dir)
      .filter(f => f.endsWith('.report.jsonl'))
      .map(f => ({
        name: f,
        path: `${dir}/${f}`,
        mtime: require('fs').statSync(`${dir}/${f}`).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      throw new Error(`No se encontraron reportes .report.jsonl en: ${dir}`);
    }

    log(`Reporte mas reciente: ${files[0].name}`, 'info');
    return this.import(files[0].path);
  }

  /**
   * Directorio por defecto de Garak en Windows
   */
  getDefaultGarakDir() {
    const home = process.env.USERPROFILE || process.env.HOME;
    return `${home}/.local/share/garak/garak_runs`;
  }

  // ===========================================================================
  // PARSER - Extrae datos del JSONL
  // ===========================================================================

  parseEntries(entries) {
    const result = {
      // Metadata
      garakVersion: null,
      runId: null,
      startTime: null,
      endTime: null,
      elapsedSeconds: 0,
      model: null,
      modelType: null,
      probeSpec: null,

      // Attempts (probes individuales)
      attempts: [],
      totalAttempts: 0,

      // Evaluaciones por detector
      evaluations: [],

      // Digest (resumen final)
      digest: null,

      // Metricas calculadas
      metrics: {
        totalProbes: 0,
        passed: 0,
        failed: 0,
        passRate: 0,
        vulnerabilityRate: 0,
        defconLevel: 5,  // 5 = seguro por defecto
        probeResults: {},  // por probe
        categoryResults: {},  // por categoria
        detectorResults: {}  // por detector
      }
    };

    for (const entry of entries) {
      switch (entry.entry_type) {
        case 'start_run setup':
          result.model = entry['plugins.target_name'] || null;
          result.modelType = entry['plugins.target_type'] || null;
          result.probeSpec = entry['plugins.probe_spec'] || null;
          result.startTime = entry['transient.starttime_iso'] || null;
          result.runId = entry['transient.run_id'] || null;
          break;

        case 'init':
          result.garakVersion = entry.garak_version || null;
          if (!result.startTime) result.startTime = entry.start_time;
          if (!result.runId) result.runId = entry.run;
          break;

        case 'attempt':
          result.attempts.push({
            seq: entry.seq,
            probe: entry.probe_classname,
            status: entry.status,
            detectorResults: entry.detector_results || {},
            goal: entry.goal
          });
          result.totalAttempts++;
          break;

        case 'eval':
          result.evaluations.push({
            probe: entry.probe,
            detector: entry.detector,
            passed: entry.passed || 0,
            fails: entry.fails || 0,
            total: entry.total_evaluated || 0
          });
          break;

        case 'completion':
          result.endTime = entry.end_time || null;
          break;

        case 'digest':
          result.digest = entry;
          break;
      }
    }

    // Calcular duracion
    if (result.startTime && result.endTime) {
      const start = new Date(result.startTime).getTime();
      const end = new Date(result.endTime).getTime();
      result.elapsedSeconds = Math.round((end - start) / 1000);
    }

    // Calcular metricas desde evaluaciones
    this.calculateMetrics(result);

    return result;
  }

  /**
   * Calcula metricas agregadas desde las evaluaciones y el digest
   */
  calculateMetrics(result) {
    const m = result.metrics;

    // === Desde las entradas eval ===
    if (result.evaluations.length > 0) {
      // Usar el peor caso entre detectores (menor pass rate)
      let worstPassRate = 100;

      for (const ev of result.evaluations) {
        const detectorKey = ev.detector;
        m.detectorResults[detectorKey] = {
          passed: ev.passed,
          failed: ev.fails,
          total: ev.total,
          passRate: ev.total > 0 ? (ev.passed / ev.total * 100) : 100
        };

        const passRate = ev.total > 0 ? (ev.passed / ev.total * 100) : 100;
        if (passRate < worstPassRate) {
          worstPassRate = passRate;
          m.totalProbes = ev.total;
          m.passed = ev.passed;
          m.failed = ev.fails;
        }
      }

      m.passRate = parseFloat(worstPassRate.toFixed(2));
      m.vulnerabilityRate = parseFloat((100 - worstPassRate).toFixed(2));
    }

    // === Desde el digest (mas detallado) ===
    if (result.digest?.eval) {
      const evalData = result.digest.eval;

      for (const [categoryName, categoryData] of Object.entries(evalData)) {
        if (categoryName.startsWith('_')) continue;

        // Resumen de categoria
        const summary = categoryData._summary;
        if (summary) {
          m.categoryResults[categoryName] = {
            score: summary.score || 0,
            passRate: parseFloat(((summary.score || 0) * 100).toFixed(2)),
            defcon: summary.group_defcon || 5
          };

          // DEFCON: usar el peor nivel (menor numero = mas critico)
          if (summary.group_defcon && summary.group_defcon < m.defconLevel) {
            m.defconLevel = summary.group_defcon;
          }
        }

        // Resultados por probe dentro de la categoria
        for (const [probeName, probeData] of Object.entries(categoryData)) {
          if (probeName.startsWith('_')) continue;

          const probeSummary = probeData._summary;
          if (probeSummary) {
            m.probeResults[probeName] = {
              score: probeSummary.probe_score || 0,
              passRate: parseFloat(((probeSummary.probe_score || 0) * 100).toFixed(2)),
              severity: probeSummary.probe_severity || 5,
              tier: probeSummary.probe_tier || 1,
              tags: probeSummary.probe_tags || []
            };
          }

          // Resultados por detector dentro del probe
          for (const [detName, detData] of Object.entries(probeData)) {
            if (detName.startsWith('_')) continue;
            if (detData.detector_defcon && detData.detector_defcon < m.defconLevel) {
              m.defconLevel = detData.detector_defcon;
            }
          }
        }
      }
    }

    // Si no hay digest, calcular DEFCON desde pass rate
    if (!result.digest) {
      if (m.passRate >= 90) m.defconLevel = 5;
      else if (m.passRate >= 70) m.defconLevel = 4;
      else if (m.passRate >= 50) m.defconLevel = 3;
      else if (m.passRate >= 30) m.defconLevel = 2;
      else m.defconLevel = 1;
    }
  }

  // ===========================================================================
  // PROMETHEUS METRICS GENERATOR
  // ===========================================================================

  generateMetrics(parsed) {
    const lines = [];
    const m = parsed.metrics;

    // Header
    lines.push('# QASL-SENTINEL-UNIFIED - NVIDIA Garak LLM Security Metrics');
    lines.push('# Proyecto: SIGMA | Cliente: AGIP | Empresa: Epidata');
    lines.push('# Lider Tecnico QA: Elyer Gregorio Maldonado');
    lines.push('');

    // --- Estado del scan ---
    lines.push('# HELP garak_in_progress Scan de Garak en progreso (0=completado, 1=ejecutando)');
    lines.push('# TYPE garak_in_progress gauge');
    lines.push(`garak_in_progress 0`);
    lines.push('');

    // --- Info del modelo ---
    lines.push('# HELP garak_model_info Informacion del modelo evaluado');
    lines.push('# TYPE garak_model_info gauge');
    const modelLabel = this.escapeLabel(parsed.model || 'unknown');
    const typeLabel = this.escapeLabel(parsed.modelType || 'unknown');
    lines.push(`garak_model_info{model="${modelLabel}",type="${typeLabel}"} 1`);
    lines.push('');

    // --- DEFCON Level ---
    lines.push('# HELP garak_defcon_level Nivel DEFCON de seguridad IA (1=Critico, 5=Seguro)');
    lines.push('# TYPE garak_defcon_level gauge');
    lines.push(`garak_defcon_level ${m.defconLevel}`);
    lines.push('');

    // --- Probes totales ---
    lines.push('# HELP garak_probes_total Total de probes evaluados');
    lines.push('# TYPE garak_probes_total gauge');
    lines.push(`garak_probes_total ${m.totalProbes}`);
    lines.push('');

    // --- Probes passed ---
    lines.push('# HELP garak_probes_passed Probes que el modelo resistio');
    lines.push('# TYPE garak_probes_passed gauge');
    lines.push(`garak_probes_passed ${m.passed}`);
    lines.push('');

    // --- Probes failed ---
    lines.push('# HELP garak_probes_failed Probes que vulneraron el modelo');
    lines.push('# TYPE garak_probes_failed gauge');
    lines.push(`garak_probes_failed ${m.failed}`);
    lines.push('');

    // --- Duracion ---
    lines.push('# HELP garak_elapsed_seconds Duracion del scan en segundos');
    lines.push('# TYPE garak_elapsed_seconds gauge');
    lines.push(`garak_elapsed_seconds ${parsed.elapsedSeconds}`);
    lines.push('');

    // --- Pass Rate global ---
    lines.push('# HELP garak_pass_rate Tasa de resistencia global (0-100%)');
    lines.push('# TYPE garak_pass_rate gauge');
    lines.push(`garak_pass_rate ${m.passRate}`);
    lines.push('');

    // --- Vulnerability Rate ---
    lines.push('# HELP garak_vulnerability_rate Tasa de vulnerabilidad global (0-100%)');
    lines.push('# TYPE garak_vulnerability_rate gauge');
    lines.push(`garak_vulnerability_rate ${m.vulnerabilityRate}`);
    lines.push('');

    // --- Por probe ---
    if (Object.keys(m.probeResults).length > 0) {
      lines.push('# HELP garak_probe_pass_rate Tasa de resistencia por probe (0-100%)');
      lines.push('# TYPE garak_probe_pass_rate gauge');
      for (const [probe, data] of Object.entries(m.probeResults)) {
        const probeLabel = this.escapeLabel(probe);
        lines.push(`garak_probe_pass_rate{probe="${probeLabel}"} ${data.passRate}`);
      }
      lines.push('');

      lines.push('# HELP garak_probe_passed Probes resistidos por tipo');
      lines.push('# TYPE garak_probe_passed gauge');
      lines.push('# HELP garak_probe_failed Probes vulnerados por tipo');
      lines.push('# TYPE garak_probe_failed gauge');
      for (const [probe, data] of Object.entries(m.probeResults)) {
        const probeLabel = this.escapeLabel(probe);
        const total = m.totalProbes;
        const passed = Math.round(total * (data.score || 0));
        const failed = total - passed;
        lines.push(`garak_probe_passed{probe="${probeLabel}"} ${passed}`);
        lines.push(`garak_probe_failed{probe="${probeLabel}"} ${failed}`);
      }
      lines.push('');
    }

    // --- Por detector ---
    if (Object.keys(m.detectorResults).length > 0) {
      lines.push('# HELP garak_detector_pass_rate Tasa de resistencia por detector (0-100%)');
      lines.push('# TYPE garak_detector_pass_rate gauge');
      for (const [detector, data] of Object.entries(m.detectorResults)) {
        const detLabel = this.escapeLabel(detector);
        lines.push(`garak_detector_pass_rate{detector="${detLabel}"} ${data.passRate.toFixed(2)}`);
      }
      lines.push('');
    }

    // --- Por categoria ---
    if (Object.keys(m.categoryResults).length > 0) {
      lines.push('# HELP garak_category_pass_rate Tasa de resistencia por categoria (0-100%)');
      lines.push('# TYPE garak_category_pass_rate gauge');
      for (const [category, data] of Object.entries(m.categoryResults)) {
        const catLabel = this.escapeLabel(category);
        lines.push(`garak_category_pass_rate{category="${catLabel}"} ${data.passRate}`);
      }
      lines.push('');
    }

    // --- Info del scan ---
    lines.push('# HELP garak_scan_info Informacion del ultimo scan');
    lines.push('# TYPE garak_scan_info gauge');
    const probeLabel = this.escapeLabel(parsed.probeSpec || 'all');
    const versionLabel = this.escapeLabel(parsed.garakVersion || 'unknown');
    const runLabel = this.escapeLabel(parsed.runId || 'unknown');
    lines.push(`garak_scan_info{probe_spec="${probeLabel}",garak_version="${versionLabel}",run_id="${runLabel}"} 1`);
    lines.push('');

    return lines.join('\n');
  }

  // ===========================================================================
  // PUSHGATEWAY - Envia metricas
  // ===========================================================================

  async pushMetrics(metricsText) {
    const url = new URL(`/metrics/job/${this.jobName}`, this.pushgatewayUrl);

    log(`Enviando metricas a Pushgateway: ${url.href}`, 'info');

    return new Promise((resolve, reject) => {
      const req = http.request(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Length': Buffer.byteLength(metricsText)
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            log(`Metricas enviadas exitosamente al Pushgateway (HTTP ${res.statusCode})`, 'success');
            resolve(true);
          } else {
            log(`Error del Pushgateway: HTTP ${res.statusCode} - ${body}`, 'error');
            reject(new Error(`Pushgateway respondio con HTTP ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on('error', (err) => {
        log(`Error de conexion con Pushgateway: ${err.message}`, 'error');
        reject(err);
      });

      req.write(metricsText);
      req.end();
    });
  }

  // ===========================================================================
  // UTILIDADES
  // ===========================================================================

  escapeLabel(value) {
    if (typeof value !== 'string') return String(value);
    return value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');
  }

  logSummary(parsed) {
    const m = parsed.metrics;
    log('', 'info');
    log('═══════════════════════════════════════════════════════', 'info');
    log('  GARAK → PROMETHEUS  |  Importacion Completada', 'success');
    log('═══════════════════════════════════════════════════════', 'info');
    log(`  Modelo:        ${parsed.model || 'N/A'} (${parsed.modelType || 'N/A'})`, 'info');
    log(`  Probe:         ${parsed.probeSpec || 'N/A'}`, 'info');
    log(`  Garak:         v${parsed.garakVersion || 'N/A'}`, 'info');
    log(`  Run ID:        ${parsed.runId || 'N/A'}`, 'info');
    log(`  Duracion:      ${parsed.elapsedSeconds}s`, 'info');
    log('───────────────────────────────────────────────────────', 'info');
    log(`  Total Probes:  ${m.totalProbes}`, 'info');
    log(`  Resistidos:    ${m.passed} (${m.passRate}%)`, 'info');
    log(`  Vulnerados:    ${m.failed} (${m.vulnerabilityRate}%)`, 'info');
    log(`  DEFCON:        DC-${m.defconLevel}`, 'info');
    log('───────────────────────────────────────────────────────', 'info');

    // Detectores
    for (const [det, data] of Object.entries(m.detectorResults)) {
      log(`  ${det}: ${data.passed}/${data.total} (${data.passRate.toFixed(1)}%)`, 'info');
    }

    log('═══════════════════════════════════════════════════════', 'info');
    log(`  Pushgateway:   ${this.pushgatewayUrl}`, 'info');
    log(`  Job:           ${this.jobName}`, 'info');
    log('═══════════════════════════════════════════════════════', 'info');
  }
}

// ===========================================================================
// EJECUCION DIRECTA: node garak-importer.mjs <archivo.jsonl>
// ===========================================================================
const isDirectRun = process.argv[1]?.includes('garak-importer');
if (isDirectRun) {
  const filePath = process.argv[2];

  if (!filePath) {
    console.log('');
    console.log('  QASL-SENTINEL-UNIFIED - Garak Importer');
    console.log('  =======================================');
    console.log('');
    console.log('  Uso:');
    console.log('    node garak-importer.mjs <reporte.jsonl>');
    console.log('    node garak-importer.mjs --latest');
    console.log('');
    console.log('  Ejemplo:');
    console.log('    node garak-importer.mjs garak.xxxxx.report.jsonl');
    console.log('');
    console.log('  Opciones:');
    console.log('    --latest    Importar el reporte mas reciente automaticamente');
    console.log('    --pushgw    URL del Pushgateway (default: http://localhost:9093)');
    console.log('');
    process.exit(0);
  }

  const pushgwIdx = process.argv.indexOf('--pushgw');
  const pushgwUrl = pushgwIdx > -1 ? process.argv[pushgwIdx + 1] : undefined;

  const importer = new GarakImporter(pushgwUrl ? { pushgatewayUrl: pushgwUrl } : {});

  try {
    if (filePath === '--latest') {
      const garakDir = process.argv[3] || importer.getDefaultGarakDir();
      await importer.importLatest(garakDir);
    } else {
      await importer.import(filePath);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
