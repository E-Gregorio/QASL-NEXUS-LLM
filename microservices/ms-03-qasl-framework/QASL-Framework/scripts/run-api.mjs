#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RUN API - Ejecuta tests API con Newman + Genera Reporte HTMLExtra
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lee automáticamente las APIs capturadas durante E2E (.api-captures/)
 * y ejecuta Newman generando reporte HTML profesional.
 *
 * Uso:
 *   node scripts/run-api.mjs [capture-file]
 *
 * Ejemplos:
 *   node scripts/run-api.mjs                           # Usa última captura
 *   node scripts/run-api.mjs ts-001-apis.json          # Captura específica
 *
 * Reportes:
 *   - Newman HTMLExtra: reports/api/{timestamp}-report.html
 *
 * Requisitos:
 *   npm install -g newman newman-reporter-htmlextra
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const CAPTURES_DIR = '.api-captures';
const REPORTS_DIR = 'reports/api';
const TEMP_DIR = '.temp-newman';

// Parse arguments
const args = process.argv.slice(2);
const captureFile = args[0];

console.log(`
═══════════════════════════════════════════════════════════════════════════
  API TEST RUNNER - Newman + HTMLExtra
═══════════════════════════════════════════════════════════════════════════
`);

// Verificar directorio de capturas
if (!fs.existsSync(CAPTURES_DIR)) {
    console.error('  ERROR: No existe directorio .api-captures/');
    console.error('  Primero ejecuta E2E con --capture-api:');
    console.error('    node scripts/run-e2e.mjs --capture-api');
    process.exit(1);
}

// Encontrar archivo de captura
let captureFilePath;
if (captureFile) {
    captureFilePath = path.join(CAPTURES_DIR, captureFile);
} else {
    // Usar el más reciente
    const files = fs.readdirSync(CAPTURES_DIR)
        .filter(f => f.endsWith('-apis.json'))
        .map(f => ({ name: f, time: fs.statSync(path.join(CAPTURES_DIR, f)).mtime }))
        .sort((a, b) => b.time - a.time);

    if (files.length === 0) {
        console.error('  ERROR: No hay capturas de API en .api-captures/');
        process.exit(1);
    }
    captureFilePath = path.join(CAPTURES_DIR, files[0].name);
}

if (!fs.existsSync(captureFilePath)) {
    console.error(`  ERROR: No existe el archivo ${captureFilePath}`);
    process.exit(1);
}

console.log(`  Captura: ${captureFilePath}`);

// Leer APIs capturadas
const capturedAPIs = JSON.parse(fs.readFileSync(captureFilePath, 'utf-8'));
console.log(`  APIs encontradas: ${capturedAPIs.length}`);

if (capturedAPIs.length === 0) {
    console.error('  ERROR: El archivo de captura está vacío');
    process.exit(1);
}

// Extraer información
const testName = path.basename(captureFilePath, '-apis.json').toUpperCase();
const baseUrl = new URL(capturedAPIs[0].url).origin;
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

console.log(`  Test: ${testName}`);
console.log(`  Base URL: ${baseUrl}`);
console.log('');

// Crear directorios
[REPORTS_DIR, TEMP_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Generar colección Newman
const collection = {
    info: {
        name: `${testName} - API Tests`,
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: capturedAPIs.map((api, idx) => {
        const urlObj = new URL(api.url);
        return {
            name: `${String(idx + 1).padStart(2, '0')}. ${api.method} ${urlObj.pathname}`,
            request: {
                method: api.method,
                url: {
                    raw: api.url,
                    protocol: urlObj.protocol.replace(':', ''),
                    host: urlObj.hostname.split('.'),
                    path: urlObj.pathname.split('/').filter(p => p),
                    query: Array.from(urlObj.searchParams).map(([key, value]) => ({ key, value }))
                },
                header: Object.entries(api.headers || {})
                    .filter(([key]) => !['host', 'connection', 'content-length'].includes(key.toLowerCase()))
                    .map(([key, value]) => ({ key, value })),
                body: api.requestBody ? {
                    mode: 'raw',
                    raw: typeof api.requestBody === 'string' ? api.requestBody : JSON.stringify(api.requestBody),
                    options: { raw: { language: 'json' } }
                } : undefined
            },
            event: [{
                listen: 'test',
                script: {
                    exec: [
                        `pm.test("Status OK", function () {`,
                        `    pm.expect(pm.response.code).to.be.oneOf([200, 201, 204, 304]);`,
                        `});`,
                        `pm.test("Response time < 3s", function () {`,
                        `    pm.expect(pm.response.responseTime).to.be.below(3000);`,
                        `});`
                    ]
                }
            }]
        };
    })
};

// Generar environment
const environment = {
    name: `${testName} Environment`,
    values: [
        { key: "baseUrl", value: baseUrl, enabled: true },
        { key: "token", value: "", enabled: true }
    ]
};

// Guardar archivos temporales
const collectionPath = path.join(TEMP_DIR, 'collection.json');
const environmentPath = path.join(TEMP_DIR, 'environment.json');
fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
fs.writeFileSync(environmentPath, JSON.stringify(environment, null, 2));

// Ruta del reporte
const reportPath = path.join(REPORTS_DIR, `${testName}-${timestamp}-report.html`);
const jsonReportPath = path.join(REPORTS_DIR, `${testName}-${timestamp}-report.json`);

console.log('  Ejecutando Newman...');
console.log('───────────────────────────────────────────────────────────────────────────');

try {
    // Ejecutar Newman con reporters HTML y JSON
    execSync(`npx newman run "${collectionPath}" -e "${environmentPath}" --insecure -r cli,htmlextra,json --reporter-htmlextra-export "${reportPath}" --reporter-json-export "${jsonReportPath}"`, {
        stdio: 'inherit'
    });

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('  REPORTE GENERADO');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`  HTML: ${reportPath}`);
    console.log('');
    console.log('  Para abrir:');
    console.log(`    start ${reportPath}`);
    console.log('═══════════════════════════════════════════════════════════════════════════');

    // Limpiar temporales
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });

    // Enviar métricas a InfluxDB
    try {
        console.log('');
        execSync('node scripts_metricas/send-api-metrics.mjs', { stdio: 'inherit' });
    } catch (metricsError) {
        // No fallar si métricas no se envían
    }

} catch (error) {
    console.error('');
    console.error('  ERROR: Newman falló');

    // Enviar métricas aunque fallen tests (visible)
    try {
        console.log('');
        execSync('node scripts_metricas/send-api-metrics.mjs', { stdio: 'inherit' });
    } catch (metricsError) {
        // No fallar si métricas no se envían
    }

    process.exit(1);
}
