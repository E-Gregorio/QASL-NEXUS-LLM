#!/usr/bin/env node
import { execSync, exec } from 'child_process';
import { setTimeout } from 'timers/promises';

// Parse arguments
const args = process.argv.slice(2);
const skipK6 = args.includes('--skip-k6');
const skipZAP = args.includes('--skip-zap');
const quickMode = args.includes('--quick');

const startTime = Date.now();

console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   ██████╗  █████╗ ███████╗██╗         ███████╗██████╗  █████╗ ███╗   ███╗ ║
║  ██╔═══██╗██╔══██╗██╔════╝██║         ██╔════╝██╔══██╗██╔══██╗████╗ ████║ ║
║  ██║   ██║███████║███████╗██║         █████╗  ██████╔╝███████║██╔████╔██║ ║
║  ██║▄▄ ██║██╔══██║╚════██║██║         ██╔══╝  ██╔══██╗██╔══██║██║╚██╔╝██║ ║
║  ╚██████╔╝██║  ██║███████║███████╗    ██║     ██║  ██║██║  ██║██║ ╚═╝ ██║ ║
║   ╚══▀▀═╝ ╚═╝  ╚═╝╚══════╝╚══════╝    ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝ ║
║                                                                           ║
║                DEMO AUTOMATIZADA - QASL NEXUS LLM v4.0                    ║
║                      Elyer Maldonado | QA Tech Lead                       ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

// Helper functions
function run(cmd, options = {}) {
    try {
        execSync(cmd, { stdio: 'inherit', ...options });
        return true;
    } catch (error) {
        if (!options.ignoreError) {
            console.error(`  ⚠️ Comando falló: ${cmd}`);
        }
        return false;
    }
}


async function waitForService(url, name, maxAttempts = 30) {
    console.log(`  ⏳ Esperando ${name}...`);
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                console.log(`  ✅ ${name} listo`);
                return true;
            }
        } catch {}
        await setTimeout(1000);
    }
    console.error(`  ❌ ${name} no responde después de ${maxAttempts}s`);
    return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: DOCKER SERVICES
// ═══════════════════════════════════════════════════════════════════════════
console.log('');
console.log('┌───────────────────────────────────────────────────────────────────────────┐');
console.log('│  STEP 1: Iniciando Servicios Docker                                       │');
console.log('└───────────────────────────────────────────────────────────────────────────┘');

run('docker-compose up -d');

// Wait for services
await waitForService('http://localhost:3001/api/health', 'Grafana');
await waitForService('http://localhost:8086/ping', 'InfluxDB');
await waitForService('http://localhost:3100/ready', 'Loki');

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1.5: OPEN DASHBOARDS FIRST (para ver métricas en vivo)
// ═══════════════════════════════════════════════════════════════════════════
console.log('');
console.log('┌───────────────────────────────────────────────────────────────────────────┐');
console.log('│  Abriendo Dashboards (para ver métricas en vivo)                          │');
console.log('└───────────────────────────────────────────────────────────────────────────┘');

exec('start http://localhost:3001/d/qasl-nexus-control/qasl-nexus-control-center');
await setTimeout(500);
exec('start http://localhost:3001/d/infrastructure-logs');
console.log('  ✅ Dashboards abiertos - Observa las métricas mientras corren los tests');

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: CREATE DATABASES
// ═══════════════════════════════════════════════════════════════════════════
console.log('');
console.log('┌───────────────────────────────────────────────────────────────────────────┐');
console.log('│  STEP 2: Creando Bases de Datos de Métricas                               │');
console.log('└───────────────────────────────────────────────────────────────────────────┘');

// Create k6 database
await fetch('http://localhost:8086/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'q=CREATE DATABASE k6'
});
console.log('  ✅ Base de datos k6 creada');

// Create qa_metrics database
await fetch('http://localhost:8086/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'q=CREATE DATABASE qa_metrics'
});
console.log('  ✅ Base de datos qa_metrics creada');

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: UNIT TESTS
// ═══════════════════════════════════════════════════════════════════════════
console.log('');
console.log('┌───────────────────────────────────────────────────────────────────────────┐');
console.log('│  STEP 3: Unit Tests (Vitest)                                              │');
console.log('└───────────────────────────────────────────────────────────────────────────┘');

run('npm run unit');

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4: E2E TESTS
// ═══════════════════════════════════════════════════════════════════════════
console.log('');
console.log('┌───────────────────────────────────────────────────────────────────────────┐');
console.log('│  STEP 4: E2E Tests (Playwright + Allure)                                  │');
console.log('└───────────────────────────────────────────────────────────────────────────┘');

run('npm run e2e:capture', { ignoreError: true });
run('node scripts_metricas/send-e2e-metrics.mjs');

// ═══════════════════════════════════════════════════════════════════════════
// STEP 5: API TESTS
// ═══════════════════════════════════════════════════════════════════════════
console.log('');
console.log('┌───────────────────────────────────────────────────────────────────────────┐');
console.log('│  STEP 5: API Tests (Newman + HTMLExtra)                                   │');
console.log('└───────────────────────────────────────────────────────────────────────────┘');

run('npm run api', { ignoreError: true });
run('node scripts_metricas/send-api-metrics.mjs');

if (quickMode) {
    console.log('');
    console.log('  ⚡ Modo rápido: Saltando K6 y ZAP');
} else {
    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 6: PERFORMANCE TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    if (!skipK6) {
        console.log('');
        console.log('┌───────────────────────────────────────────────────────────────────────────┐');
        console.log('│  STEP 6: Performance Tests (K6)                                           │');
        console.log('└───────────────────────────────────────────────────────────────────────────┘');

        run('npm run k6 -- --type=stairs --vus=5 --duration=60s', { ignoreError: true });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 7: SECURITY TESTS
    // ═══════════════════════════════════════════════════════════════════════════
    if (!skipZAP) {
        console.log('');
        console.log('┌───────────────────────────────────────────────────────────────────────────┐');
        console.log('│  STEP 7: Security Tests (OWASP ZAP)                                       │');
        console.log('└───────────────────────────────────────────────────────────────────────────┘');

        run('npm run zap', { ignoreError: true });
        run('node scripts_metricas/send-zap-metrics.mjs');
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════
const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                         DEMO COMPLETADA                                   ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
console.log('║                                                                           ║');
console.log('║  ✅ Docker Services: Running                                              ║');
console.log('║  ✅ Unit Tests: Executed                                                  ║');
console.log('║  ✅ E2E Tests: Executed + Metrics sent                                    ║');
console.log('║  ✅ API Tests: Executed + Metrics sent                                    ║');
console.log(`║  ${skipK6 || quickMode ? '⏭️' : '✅'} K6 Performance: ${skipK6 || quickMode ? 'Skipped' : 'Executed'}                                        ║`);
console.log(`║  ${skipZAP || quickMode ? '⏭️' : '✅'} ZAP Security: ${skipZAP || quickMode ? 'Skipped' : 'Executed + Metrics sent'}                          ║`);
console.log('║                                                                           ║');
console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
console.log(`║  ⏱️  Tiempo total: ${elapsed} minutos                                          ║`);
console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
console.log('║                                                                           ║');
console.log('║  🌐 DASHBOARDS ABIERTOS:                                                  ║');
console.log('║     Centro de Control: http://localhost:3001/d/qasl-nexus-control           ║');
console.log('║     Infrastructure:    http://localhost:3001/d/infrastructure-logs        ║');
console.log('║                                                                           ║');
console.log('║  📊 COMANDOS ADICIONALES:                                                 ║');
console.log('║     npm run allure:open     - Ver reporte Allure                          ║');
console.log('║     npm run infra:check     - Health check de infraestructura             ║');
console.log('║     npm run docker:down     - Apagar servicios                            ║');
console.log('║                                                                           ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
