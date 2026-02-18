#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SEND E2E METRICS - Envía métricas de Playwright a InfluxDB
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lee los resultados de Playwright (JSON) y envía métricas a InfluxDB
 * para visualización en Grafana.
 *
 * Uso:
 *   node scripts_metricas/send-e2e-metrics.mjs [results-file]
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { sendE2EMetrics, checkInfluxConnection } from './influx-client.mjs';

const RESULTS_DIR = 'reports/e2e';
const ALLURE_RESULTS = 'reports/e2e/allure-results';

async function main() {
    console.log('');
    console.log('  📊 Enviando métricas E2E a InfluxDB...');

    // Verificar conexión
    const connected = await checkInfluxConnection();
    if (!connected) {
        console.log('  ⚠️ InfluxDB no disponible. Métricas no enviadas.');
        return;
    }

    // Buscar resultados de Playwright
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let duration = 0;
    let suite = 'playwright';

    // Opción 1: Leer de allure-results
    if (fs.existsSync(ALLURE_RESULTS)) {
        const files = fs.readdirSync(ALLURE_RESULTS).filter(f => f.endsWith('-result.json'));

        for (const file of files) {
            try {
                const content = JSON.parse(fs.readFileSync(path.join(ALLURE_RESULTS, file), 'utf-8'));
                if (content.status === 'passed') passed++;
                else if (content.status === 'failed' || content.status === 'broken') failed++;
                else if (content.status === 'skipped') skipped++;

                if (content.stop && content.start) {
                    duration += (content.stop - content.start);
                }

                if (content.labels) {
                    const suiteLabel = content.labels.find(l => l.name === 'suite');
                    if (suiteLabel) suite = suiteLabel.value;
                }
            } catch (e) {
                // Ignorar archivos mal formados
            }
        }
    }

    // Opción 2: Leer de reports/e2e/results.json (Playwright JSON reporter)
    const jsonReportPath = path.join(RESULTS_DIR, 'results.json');
    const altJsonReportPath = 'reports/e2e/results.json';
    if (fs.existsSync(jsonReportPath)) {
        try {
            const report = JSON.parse(fs.readFileSync(jsonReportPath, 'utf-8'));
            if (report.suites) {
                for (const s of report.suites) {
                    if (s.specs) {
                        for (const spec of s.specs) {
                            if (spec.ok) passed++;
                            else failed++;
                        }
                    }
                }
            }
            if (report.stats) {
                passed = report.stats.expected || passed;
                failed = report.stats.unexpected || failed;
                skipped = report.stats.skipped || skipped;
                duration = report.stats.duration || duration;
            }
        } catch (e) {
            // Ignorar errores
        }
    }

    // Si no hay datos, usar valores por defecto para demo
    if (passed === 0 && failed === 0) {
        console.log('  ⚠️ No se encontraron resultados de E2E. Usando datos de última ejecución...');
        // Intentar leer de archivo de caché
        const cacheFile = '.e2e-last-results.json';
        if (fs.existsSync(cacheFile)) {
            const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
            passed = cache.passed || 0;
            failed = cache.failed || 0;
            skipped = cache.skipped || 0;
            duration = cache.duration || 0;
        }
    }

    // Guardar caché para próximas ejecuciones
    if (passed > 0 || failed > 0) {
        fs.writeFileSync('.e2e-last-results.json', JSON.stringify({ passed, failed, skipped, duration }));
    }

    const total = passed + failed + skipped;
    console.log(`  ├── Suite: ${suite}`);
    console.log(`  ├── Passed: ${passed}`);
    console.log(`  ├── Failed: ${failed}`);
    console.log(`  ├── Skipped: ${skipped}`);
    console.log(`  ├── Total: ${total}`);
    console.log(`  └── Duration: ${(duration / 1000).toFixed(2)}s`);

    // Enviar métricas
    const success = await sendE2EMetrics({
        suite,
        passed,
        failed,
        skipped,
        duration: duration / 1000
    });

    if (success) {
        console.log('  ✅ Métricas E2E enviadas a InfluxDB');
    } else {
        console.log('  ❌ Error enviando métricas E2E');
    }
}

main().catch(console.error);
