#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { sendAPIMetrics, checkInfluxConnection } from './influx-client.mjs';

const REPORTS_DIR = 'reports/api';

async function main() {
    console.log('');
    console.log('  📊 Enviando métricas API a InfluxDB...');

    // Verificar conexión
    const connected = await checkInfluxConnection();
    if (!connected) {
        console.log('  ⚠️ InfluxDB no disponible. Métricas no enviadas.');
        return;
    }

    let passed = 0;
    let failed = 0;
    let totalRequests = 0;
    let duration = 0;
    let collection = 'newman';

    // Buscar archivos JSON de Newman en reports/api
    if (fs.existsSync(REPORTS_DIR)) {
        const files = fs.readdirSync(REPORTS_DIR)
            .filter(f => f.endsWith('.json'))
            .map(f => ({ name: f, time: fs.statSync(path.join(REPORTS_DIR, f)).mtime }))
            .sort((a, b) => b.time - a.time);

        if (files.length > 0) {
            const latestFile = path.join(REPORTS_DIR, files[0].name);
            try {
                const report = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));

                if (report.run) {
                    // Newman JSON reporter format
                    const stats = report.run.stats;
                    if (stats) {
                        passed = stats.assertions?.total - stats.assertions?.failed || 0;
                        failed = stats.assertions?.failed || 0;
                        totalRequests = stats.requests?.total || 0;
                    }

                    const timings = report.run.timings;
                    if (timings) {
                        duration = timings.completed - timings.started || 0;
                    }

                    if (report.collection?.info?.name) {
                        collection = report.collection.info.name;
                    }
                }
            } catch (e) {
                console.log(`  ⚠️ Error leyendo ${latestFile}: ${e.message}`);
            }
        }
    }

    // Si no hay datos, intentar leer de caché
    if (totalRequests === 0) {
        console.log('  ⚠️ No se encontraron resultados de API. Usando datos de última ejecución...');
        const cacheFile = '.api-last-results.json';
        if (fs.existsSync(cacheFile)) {
            const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
            passed = cache.passed || 0;
            failed = cache.failed || 0;
            totalRequests = cache.totalRequests || 0;
            duration = cache.duration || 0;
        }
    }

    // Guardar caché
    if (totalRequests > 0) {
        fs.writeFileSync('.api-last-results.json', JSON.stringify({ passed, failed, totalRequests, duration }));
    }

    console.log(`  ├── Collection: ${collection}`);
    console.log(`  ├── Passed: ${passed}`);
    console.log(`  ├── Failed: ${failed}`);
    console.log(`  ├── Total Requests: ${totalRequests}`);
    console.log(`  └── Duration: ${(duration / 1000).toFixed(2)}s`);

    // Enviar métricas
    const success = await sendAPIMetrics({
        collection,
        passed,
        failed,
        total_requests: totalRequests,
        duration: duration / 1000
    });

    if (success) {
        console.log('  ✅ Métricas API enviadas a InfluxDB');
    } else {
        console.log('  ❌ Error enviando métricas API');
    }
}

main().catch(console.error);
