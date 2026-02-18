#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RUN ZAP - Ejecuta Security Scan con OWASP ZAP + Genera Reporte HTML
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lee automáticamente las APIs capturadas durante E2E (.api-captures/)
 * y ejecuta OWASP ZAP generando reporte HTML nativo.
 *
 * Uso:
 *   node scripts/run-zap.mjs [capture-file]
 *
 * Ejemplos:
 *   node scripts/run-zap.mjs                           # Usa última captura
 *   node scripts/run-zap.mjs ts-001-apis.json          # Captura específica
 *
 * Reportes:
 *   - ZAP HTML: reports/zap/{timestamp}-report.html
 *   - ZAP JSON: reports/zap/{timestamp}-report.json
 *
 * Requisitos:
 *   - Docker instalado y corriendo
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const CAPTURES_DIR = '.api-captures';
const REPORTS_DIR = 'reports/zap';

// Parse arguments
const args = process.argv.slice(2);
const captureFile = args.find(arg => !arg.startsWith('--'));

console.log(`
═══════════════════════════════════════════════════════════════════════════
  SECURITY TEST RUNNER - OWASP ZAP
═══════════════════════════════════════════════════════════════════════════
`);

// Verificar Docker
try {
    execSync('docker version', { stdio: 'pipe' });
} catch {
    console.error('  ERROR: Docker no está instalado o no está corriendo');
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

// Leer APIs y extraer target URL
const capturedAPIs = JSON.parse(fs.readFileSync(captureFilePath, 'utf-8'));
const testName = path.basename(captureFilePath, '-apis.json').toUpperCase();
const targetUrl = new URL(capturedAPIs[0].url).origin;
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

console.log(`  Captura: ${captureFilePath}`);
console.log(`  Target: ${targetUrl}`);
console.log(`  APIs: ${capturedAPIs.length}`);
console.log('');

// Crear directorio de reportes
if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Rutas de reportes
const reportName = `${testName}-${timestamp}`;
const htmlReport = `${REPORTS_DIR}/${reportName}-report.html`;
const jsonReport = `${REPORTS_DIR}/${reportName}-report.json`;

// Obtener ruta absoluta para Docker (Windows compatible)
const cwd = process.cwd().replace(/\\/g, '/');
const dockerPath = cwd.replace(/^([A-Za-z]):/, (_, letter) => `//${letter.toLowerCase()}`);

console.log('  Ejecutando OWASP ZAP (puede tomar varios minutos)...');
console.log('───────────────────────────────────────────────────────────────────────────');

try {
    // Ejecutar ZAP Baseline Scan
    const dockerCmd = `docker run --rm -v "${dockerPath}:/zap/wrk:rw" -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t "${targetUrl}" -r "${htmlReport}" -J "${jsonReport}" -a -j`;

    execSync(dockerCmd, { stdio: 'inherit' });

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('  REPORTE GENERADO');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`  HTML: ${htmlReport}`);
    console.log(`  JSON: ${jsonReport}`);
    console.log('');
    console.log('  ZAP GUI (opcional): http://localhost:8082');
    console.log('═══════════════════════════════════════════════════════════════════════════');

} catch (error) {
    // ZAP retorna exit code != 0 si encuentra vulnerabilidades (WARN/FAIL)
    // Esto es normal, no es un error
    if (fs.existsSync(htmlReport)) {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('  SCAN COMPLETADO (con alertas de seguridad)');
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log(`  HTML: ${htmlReport}`);
        console.log(`  JSON: ${jsonReport}`);
        console.log('');
        console.log('  Revisa el reporte para ver las vulnerabilidades encontradas.');
        console.log('═══════════════════════════════════════════════════════════════════════════');

        // Enviar métricas a InfluxDB
        try {
            console.log('');
            execSync('node scripts_metricas/send-zap-metrics.mjs', { stdio: 'inherit' });
        } catch (metricsError) {
            // No fallar si métricas no se envían
        }
    } else {
        console.error('  ERROR: ZAP falló');
        process.exit(1);
    }
}

// Enviar métricas después de éxito
try {
    console.log('');
    execSync('node scripts_metricas/send-zap-metrics.mjs', { stdio: 'inherit' });
} catch (metricsError) {
    // No fallar si métricas no se envían
}
