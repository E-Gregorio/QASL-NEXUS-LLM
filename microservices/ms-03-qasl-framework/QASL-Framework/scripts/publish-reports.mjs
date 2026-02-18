#!/usr/bin/env node
/**
 * Script para publicar reportes a GitLab Pages
 * Copia los reportes generados a public/ y hace push
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const PUBLIC_DIR = './public';
const ALLURE_REPORT = './allure-report';
const NEWMAN_REPORT = './reports/api';
const K6_REPORT = './reports/k6';
const ZAP_REPORT = './reports/zap';

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  PUBLICAR REPORTES A GITLAB PAGES');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// Crear directorios
const dirs = ['allure', 'newman', 'k6', 'zap'];
dirs.forEach(dir => {
    const fullPath = path.join(PUBLIC_DIR, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`  ✅ Creado: ${fullPath}`);
    }
});

// Copiar Allure
if (fs.existsSync(ALLURE_REPORT)) {
    execSync(`xcopy /E /Y /I "${ALLURE_REPORT}" "${PUBLIC_DIR}\\allure"`, { stdio: 'inherit' });
    console.log('  ✅ Allure copiado');
} else {
    console.log('  ⚠️ No hay reporte Allure');
}

// Copiar Newman
if (fs.existsSync(NEWMAN_REPORT)) {
    execSync(`xcopy /E /Y /I "${NEWMAN_REPORT}" "${PUBLIC_DIR}\\newman"`, { stdio: 'inherit' });
    console.log('  ✅ Newman copiado');
} else {
    console.log('  ⚠️ No hay reporte Newman');
}

// Copiar K6
if (fs.existsSync(K6_REPORT)) {
    execSync(`xcopy /E /Y /I "${K6_REPORT}" "${PUBLIC_DIR}\\k6"`, { stdio: 'inherit' });
    console.log('  ✅ K6 copiado');
} else {
    console.log('  ⚠️ No hay reporte K6');
}

// Copiar ZAP
if (fs.existsSync(ZAP_REPORT)) {
    execSync(`xcopy /E /Y /I "${ZAP_REPORT}" "${PUBLIC_DIR}\\zap"`, { stdio: 'inherit' });
    console.log('  ✅ ZAP copiado');
} else {
    console.log('  ⚠️ No hay reporte ZAP');
}

console.log('');
console.log('───────────────────────────────────────────────────────────────');
console.log('  Subiendo a GitLab...');
console.log('───────────────────────────────────────────────────────────────');

try {
    execSync('git add public/', { stdio: 'inherit' });
    execSync('git commit -m "chore: update reports"', { stdio: 'inherit' });
    execSync('git push origin main', { stdio: 'inherit' });

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  ✅ REPORTES PUBLICADOS');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('  📎 URL: https://elyerm.gitlab.io/sigma-qa-framework/');
    console.log('');
    console.log('  Envía este link por correo a tu equipo.');
    console.log('');
} catch (error) {
    console.log('  ⚠️ Error al subir. Verifica git status.');
}
