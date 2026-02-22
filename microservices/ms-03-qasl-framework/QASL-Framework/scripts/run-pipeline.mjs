#!/usr/bin/env node
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// Parse arguments
const args = process.argv.slice(2);
const spec = args.find(arg => !arg.startsWith('--'));
const skipE2E = args.includes('--skip-e2e');
const skipAPI = args.includes('--skip-api');
const skipK6 = args.includes('--skip-k6');
const skipZAP = args.includes('--skip-zap');
const vus = args.find(arg => arg.startsWith('--vus='))?.split('=')[1] || '10';
const duration = args.find(arg => arg.startsWith('--duration='))?.split('=')[1] || '30s';

const startTime = Date.now();

console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║    ██████╗  █████╗ ███████╗██╗         ███╗   ██╗███████╗██╗  ██╗         ║
║   ██╔═══██╗██╔══██╗██╔════╝██║         ████╗  ██║██╔════╝╚██╗██╔╝         ║
║   ██║   ██║███████║███████╗██║         ██╔██╗ ██║█████╗   ╚███╔╝          ║
║   ██║▄▄ ██║██╔══██║╚════██║██║         ██║╚██╗██║██╔══╝   ██╔██╗          ║
║   ╚██████╔╝██║  ██║███████║███████╗    ██║ ╚████║███████╗██╔╝ ██╗         ║
║    ╚══▀▀═╝ ╚═╝  ╚═╝╚══════╝╚══════╝    ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝         ║
║                                                                           ║
║            QASL NEXUS LLM - MS-03 FRAMEWORK | FULL PIPELINE              ║
║                      Elyer Maldonado | QA Tech Lead                       ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

const steps = [
    { name: 'E2E', enabled: !skipE2E, icon: '🎭' },
    { name: 'API', enabled: !skipAPI, icon: '📡' },
    { name: 'K6', enabled: !skipK6, icon: '⚡' },
    { name: 'ZAP', enabled: !skipZAP, icon: '🔒' },
];

console.log('  Pipeline Configuration:');
steps.forEach(s => console.log(`    ${s.icon} ${s.name}: ${s.enabled ? 'ENABLED' : 'SKIP'}`));
console.log('');

const results = [];

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: E2E TESTS
// ═══════════════════════════════════════════════════════════════════════════
if (!skipE2E) {
    console.log('');
    console.log('┌───────────────────────────────────────────────────────────────────────────┐');
    console.log('│  STEP 1/4: E2E TESTS (Playwright + Allure)                               │');
    console.log('└───────────────────────────────────────────────────────────────────────────┘');

    try {
        let cmd = 'node scripts/run-e2e.mjs --capture-api';
        if (spec) cmd += ` ${spec}`;
        execSync(cmd, { stdio: 'inherit' });
        results.push({ step: 'E2E', status: 'PASS' });
    } catch {
        results.push({ step: 'E2E', status: 'FAIL' });
        console.error('  E2E Tests fallaron, continuando...');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: API TESTS
// ═══════════════════════════════════════════════════════════════════════════
if (!skipAPI) {
    console.log('');
    console.log('┌───────────────────────────────────────────────────────────────────────────┐');
    console.log('│  STEP 2/4: API TESTS (Newman + HTMLExtra)                                │');
    console.log('└───────────────────────────────────────────────────────────────────────────┘');

    try {
        execSync('node scripts/run-api.mjs', { stdio: 'inherit' });
        results.push({ step: 'API', status: 'PASS' });
    } catch {
        results.push({ step: 'API', status: 'FAIL' });
        console.error('  API Tests fallaron, continuando...');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: PERFORMANCE TESTS
// ═══════════════════════════════════════════════════════════════════════════
if (!skipK6) {
    console.log('');
    console.log('┌───────────────────────────────────────────────────────────────────────────┐');
    console.log('│  STEP 3/4: PERFORMANCE TESTS (K6 + HTML Report)                          │');
    console.log('└───────────────────────────────────────────────────────────────────────────┘');

    try {
        execSync(`node scripts/run-k6.mjs --vus=${vus} --duration=${duration}`, { stdio: 'inherit' });
        results.push({ step: 'K6', status: 'PASS' });
    } catch {
        results.push({ step: 'K6', status: 'FAIL' });
        console.error('  K6 Tests fallaron, continuando...');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4: SECURITY TESTS
// ═══════════════════════════════════════════════════════════════════════════
if (!skipZAP) {
    console.log('');
    console.log('┌───────────────────────────────────────────────────────────────────────────┐');
    console.log('│  STEP 4/4: SECURITY TESTS (OWASP ZAP + HTML Report)                      │');
    console.log('└───────────────────────────────────────────────────────────────────────────┘');

    try {
        execSync('node scripts/run-zap.mjs', { stdio: 'inherit' });
        results.push({ step: 'ZAP', status: 'PASS' });
    } catch {
        results.push({ step: 'ZAP', status: 'WARN' }); // ZAP retorna error si encuentra vulns
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════
const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                         PIPELINE COMPLETADO                               ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════╣');

results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️' : '❌';
    console.log(`║  ${icon} ${r.step.padEnd(10)} ${r.status.padEnd(6)}                                            ║`);
});

console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
console.log(`║  ⏱️  Tiempo total: ${elapsed}s                                              ║`);
console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
console.log('║                                                                           ║');
console.log('║  📊 REPORTES:                                                             ║');
console.log('║     reports/e2e/allure-report/   - Allure HTML                           ║');
console.log('║     reports/api/                  - Newman HTMLExtra                      ║');
console.log('║     reports/k6/                   - K6 HTML + Grafana                     ║');
console.log('║     reports/zap/                  - ZAP HTML + JSON                       ║');
console.log('║                                                                           ║');
console.log('║  🌐 DASHBOARDS:                                                           ║');
console.log('║     Grafana:  http://localhost:3001                                       ║');
console.log('║     Allure:   http://localhost:5050                                       ║');
console.log('║     ZAP GUI:  http://localhost:8082                                       ║');
console.log('║                                                                           ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
