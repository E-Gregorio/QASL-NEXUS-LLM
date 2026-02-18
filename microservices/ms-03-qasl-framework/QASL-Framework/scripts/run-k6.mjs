#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RUN K6 - Ejecuta tests de Performance con K6 + Genera Reporte HTML
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lee automáticamente las APIs capturadas durante E2E (.api-captures/)
 * y ejecuta K6 generando reporte HTML.
 *
 * Uso:
 *   node scripts/run-k6.mjs [capture-file] [--vus=10] [--duration=30s] [--type=load]
 *
 * Tipos de prueba (--type):
 *   load     - Carga normal: ramp-up, hold, ramp-down (default)
 *   stairs   - Escalera: sube usuarios gradualmente (visual en Grafana)
 *   stress   - Estres: sube hasta el limite
 *   spike    - Pico: carga repentina
 *   soak     - Resistencia: carga sostenida larga
 *
 * Ejemplos:
 *   npm run k6                                    # Default: 10 VUs, 30s
 *   npm run k6 -- --vus=20 --duration=60s         # 20 VUs por 1 minuto
 *   npm run k6 -- --type=stairs --vus=10          # Escalera de 1 a 10 usuarios
 *   npm run k6 -- --type=stress --vus=50          # Estres hasta 50 usuarios
 *   npm run k6 -- --type=spike --vus=30           # Pico de 30 usuarios
 *
 * Reportes:
 *   - K6 HTML: reports/k6/{timestamp}-report.html
 *   - Grafana: http://localhost:3001 (con Docker)
 *
 * Requisitos:
 *   - K6 instalado: https://k6.io/docs/getting-started/installation/
 *   - Docker (opcional): docker-compose up -d
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const CAPTURES_DIR = '.api-captures';
const REPORTS_DIR = 'reports/k6';
const TEMP_DIR = '.temp-k6';

// Parse arguments
const args = process.argv.slice(2);
const captureFile = args.find(arg => !arg.startsWith('--'));
const vus = parseInt(args.find(arg => arg.startsWith('--vus='))?.split('=')[1] || '10');
const duration = args.find(arg => arg.startsWith('--duration='))?.split('=')[1] || '30s';
const testType = args.find(arg => arg.startsWith('--type='))?.split('=')[1] || 'load';

// Generar stages segun el tipo de prueba
function generateStages(type, maxVus, dur) {
    const durationSec = parseInt(dur.replace('s', ''));

    switch(type) {
        case 'stairs':
            // Escalera: sube gradualmente usuario por usuario
            const stairsStages = [];
            const stepDuration = Math.floor(durationSec / maxVus);
            for (let i = 1; i <= maxVus; i++) {
                stairsStages.push(`{ duration: '${stepDuration}s', target: ${i} }`);
            }
            stairsStages.push(`{ duration: '10s', target: 0 }`);
            return stairsStages.join(',\n    ');

        case 'stress':
            // Estres: sube rapido, mantiene al maximo, baja
            return `{ duration: '30s', target: ${Math.floor(maxVus/2)} },
    { duration: '1m', target: ${maxVus} },
    { duration: '2m', target: ${maxVus} },
    { duration: '30s', target: 0 }`;

        case 'spike':
            // Pico: sube de golpe, baja rapido
            return `{ duration: '10s', target: ${Math.floor(maxVus/4)} },
    { duration: '5s', target: ${maxVus} },
    { duration: '30s', target: ${maxVus} },
    { duration: '5s', target: ${Math.floor(maxVus/4)} },
    { duration: '10s', target: 0 }`;

        case 'soak':
            // Resistencia: carga sostenida por largo tiempo
            return `{ duration: '1m', target: ${maxVus} },
    { duration: '${durationSec}s', target: ${maxVus} },
    { duration: '1m', target: 0 }`;

        case 'load':
        default:
            // Carga normal: ramp-up, hold, ramp-down
            return `{ duration: '10s', target: ${maxVus} },
    { duration: '${dur}', target: ${maxVus} },
    { duration: '10s', target: 0 }`;
    }
}

console.log(`
═══════════════════════════════════════════════════════════════════════════
  PERFORMANCE TEST RUNNER - K6
═══════════════════════════════════════════════════════════════════════════
`);

// Verificar K6
try {
    execSync('k6 version', { stdio: 'pipe' });
} catch {
    console.error('  ERROR: K6 no está instalado');
    console.error('  Instalar desde: https://k6.io/docs/getting-started/installation/');
    process.exit(1);
}

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
    const files = fs.readdirSync(CAPTURES_DIR)
        .filter(f => f.endsWith('-apis.json'))
        .map(f => ({ name: f, time: fs.statSync(path.join(CAPTURES_DIR, f)).mtime }))
        .sort((a, b) => b.time - a.time);

    if (files.length === 0) {
        console.error('  ERROR: No hay capturas de API');
        process.exit(1);
    }
    captureFilePath = path.join(CAPTURES_DIR, files[0].name);
}

if (!fs.existsSync(captureFilePath)) {
    console.error(`  ERROR: No existe ${captureFilePath}`);
    process.exit(1);
}

// Leer APIs
const capturedAPIs = JSON.parse(fs.readFileSync(captureFilePath, 'utf-8'));
const testName = path.basename(captureFilePath, '-apis.json').toUpperCase();
const baseUrl = new URL(capturedAPIs[0].url).origin;
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

console.log(`  Captura: ${captureFilePath}`);
console.log(`  APIs: ${capturedAPIs.length}`);
console.log(`  Tipo: ${testType.toUpperCase()}`);
console.log(`  VUs: ${vus}`);
console.log(`  Duration: ${duration}`);
console.log(`  Base URL: ${baseUrl}`);
console.log('');

// Crear directorios
[REPORTS_DIR, TEMP_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Generar requests K6
const requests = capturedAPIs.map((api, idx) => {
    const urlObj = new URL(api.url);
    return `
    // Request ${idx + 1}: ${api.method} ${urlObj.pathname}
    {
      const res = http.${api.method.toLowerCase()}(\`\${BASE_URL}${urlObj.pathname}${urlObj.search}\`${api.requestBody ? `, ${JSON.stringify(api.requestBody)}, { headers: { 'Content-Type': 'application/json' } }` : ''});
      check(res, {
        'status OK': (r) => [200, 201, 204, 304].includes(r.status),
        'response < 3s': (r) => r.timings.duration < 3000,
      });
      errorRate.add(res.status >= 400);
      sleep(0.5);
    }`;
}).join('\n');

// Generar script K6
const k6Script = `
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    ${generateStages(testType, vus, duration)}
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.1'],
    errors: ['rate<0.1'],
  },
};

const BASE_URL = '${baseUrl}';

export default function () {
  group('${testName} - Performance Test', function () {
${requests}
  });
}

export function handleSummary(data) {
  return {
    "${REPORTS_DIR}/${testName}-${timestamp}-report.html": htmlReport(data, { title: "EPIDATA - Proyecto SIGMA | TeamQA" }),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}

function textSummary(data, opts) {
  return JSON.stringify(data, null, 2);
}
`;

// Guardar script
const scriptPath = path.join(TEMP_DIR, 'performance.js');
fs.writeFileSync(scriptPath, k6Script);

const reportPath = path.join(REPORTS_DIR, `${testName}-${timestamp}-report.html`);
const jsonPath = path.join(REPORTS_DIR, `${testName}-${timestamp}-results.json`);

console.log('  Ejecutando K6...');
console.log('───────────────────────────────────────────────────────────────────────────');

try {
    // Ejecutar K6 con output a InfluxDB si está disponible
    let k6Cmd = `k6 run "${scriptPath}" --out json="${jsonPath}"`;

    // Intentar conectar con InfluxDB
    try {
        execSync('curl -s http://localhost:8086/ping', { stdio: 'pipe' });
        k6Cmd += ' --out influxdb=http://localhost:8086/k6';
        console.log('  InfluxDB: CONECTADO (métricas disponibles en Grafana)');
    } catch {
        console.log('  InfluxDB: NO DISPONIBLE (ejecutar docker-compose up -d)');
    }
    console.log('');

    execSync(k6Cmd, { stdio: 'inherit' });

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('  REPORTE GENERADO');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`  HTML: ${reportPath}`);
    console.log(`  JSON: ${jsonPath}`);
    console.log('');
    console.log('  Grafana Dashboard: http://localhost:3001');
    console.log('═══════════════════════════════════════════════════════════════════════════');

    // Limpiar
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });

} catch (error) {
    console.error('  ERROR: K6 falló');
    process.exit(1);
}
