#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SEND ZAP METRICS - Envía métricas de OWASP ZAP a InfluxDB
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lee los resultados de OWASP ZAP (JSON) y envía métricas a InfluxDB
 * para visualización en Grafana.
 *
 * Uso:
 *   node scripts_metricas/send-zap-metrics.mjs [results-file]
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { sendZAPMetrics, checkInfluxConnection } from './influx-client.mjs';

const REPORTS_DIR = 'reports/zap';

async function main() {
    console.log('');
    console.log('  📊 Enviando métricas ZAP a InfluxDB...');

    // Verificar conexión
    const connected = await checkInfluxConnection();
    if (!connected) {
        console.log('  ⚠️ InfluxDB no disponible. Métricas no enviadas.');
        return;
    }

    let high = 0;
    let medium = 0;
    let low = 0;
    let informational = 0;
    let target = 'unknown';

    // Buscar archivos JSON de ZAP en reports/zap
    if (fs.existsSync(REPORTS_DIR)) {
        const files = fs.readdirSync(REPORTS_DIR)
            .filter(f => f.endsWith('.json'))
            .map(f => ({ name: f, time: fs.statSync(path.join(REPORTS_DIR, f)).mtime }))
            .sort((a, b) => b.time - a.time);

        if (files.length > 0) {
            const latestFile = path.join(REPORTS_DIR, files[0].name);
            try {
                const report = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));

                // ZAP JSON report format
                if (report.site && report.site.length > 0) {
                    target = report.site[0]['@name'] || 'unknown';

                    for (const site of report.site) {
                        if (site.alerts) {
                            for (const alert of site.alerts) {
                                const risk = alert.riskcode || alert.risk;
                                switch (String(risk)) {
                                    case '3':
                                    case 'High':
                                        high++;
                                        break;
                                    case '2':
                                    case 'Medium':
                                        medium++;
                                        break;
                                    case '1':
                                    case 'Low':
                                        low++;
                                        break;
                                    case '0':
                                    case 'Informational':
                                        informational++;
                                        break;
                                }
                            }
                        }
                    }
                }

                // Alternative format (ZAP API output)
                if (report.alerts) {
                    for (const alert of report.alerts) {
                        switch (alert.risk) {
                            case 'High':
                                high++;
                                break;
                            case 'Medium':
                                medium++;
                                break;
                            case 'Low':
                                low++;
                                break;
                            case 'Informational':
                                informational++;
                                break;
                        }
                    }
                }
            } catch (e) {
                console.log(`  ⚠️ Error leyendo ${latestFile}: ${e.message}`);
            }
        }
    }

    // Si no hay datos, intentar leer de caché
    const cacheFile = '.zap-last-results.json';
    if (high === 0 && medium === 0 && low === 0 && informational === 0) {
        console.log('  ⚠️ No se encontraron resultados de ZAP. Usando datos de última ejecución...');
        if (fs.existsSync(cacheFile)) {
            const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
            high = cache.high || 0;
            medium = cache.medium || 0;
            low = cache.low || 0;
            informational = cache.informational || 0;
            target = cache.target || 'unknown';
        }
    }

    // Guardar caché
    fs.writeFileSync(cacheFile, JSON.stringify({ high, medium, low, informational, target }));

    const total = high + medium + low + informational;
    console.log(`  ├── Target: ${target}`);
    console.log(`  ├── 🔴 High: ${high}`);
    console.log(`  ├── 🟠 Medium: ${medium}`);
    console.log(`  ├── 🟡 Low: ${low}`);
    console.log(`  ├── 🔵 Informational: ${informational}`);
    console.log(`  └── Total Alerts: ${total}`);

    // Enviar métricas
    const success = await sendZAPMetrics({
        target,
        high,
        medium,
        low,
        informational
    });

    if (success) {
        console.log('  ✅ Métricas ZAP enviadas a InfluxDB');
    } else {
        console.log('  ❌ Error enviando métricas ZAP');
    }
}

main().catch(console.error);
