#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                       QASL-API-SENTINEL CLI                                  ║
 * ║                    Interfaz de línea de comandos                             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
const { readFileSync, existsSync, writeFileSync, mkdirSync } = fs;
const { resolve, join } = path;

// Función boxen inline (evita dependencia externa)
function boxen(text, options = {}) {
  const lines = text.split('\n');
  const maxLen = Math.max(...lines.map(l => l.replace(/\x1b\[[0-9;]*m/g, '').length));
  const padding = options.padding || 0;
  const borderColor = options.borderColor === 'cyan' ? chalk.cyan :
                      options.borderColor === 'green' ? chalk.green :
                      options.borderColor === 'yellow' ? chalk.yellow :
                      options.borderColor === 'red' ? chalk.red : chalk.white;

  const horizontal = borderColor('─'.repeat(maxLen + padding * 2 + 2));
  const top = borderColor('╭') + horizontal + borderColor('╮');
  const bottom = borderColor('╰') + horizontal + borderColor('╯');
  const emptyLine = borderColor('│') + ' '.repeat(maxLen + padding * 2 + 2) + borderColor('│');

  let result = [top];
  for (let i = 0; i < padding; i++) result.push(emptyLine);

  for (const line of lines) {
    const visibleLen = line.replace(/\x1b\[[0-9;]*m/g, '').length;
    const paddedLine = ' '.repeat(padding + 1) + line + ' '.repeat(maxLen - visibleLen + padding + 1);
    result.push(borderColor('│') + paddedLine + borderColor('│'));
  }

  for (let i = 0; i < padding; i++) result.push(emptyLine);
  result.push(bottom);

  return result.join('\n');
}

// Cargar env
dotenv.config();

// Importar módulos
import { Sentinel } from '../src/core/sentinel.mjs';
import { HarImporter } from '../src/importers/har-importer.mjs';
import { SwaggerImporter } from '../src/importers/swagger-importer.mjs';
import { PostmanImporter } from '../src/importers/postman-importer.mjs';
import { displayBanner } from '../src/core/banner.mjs';

const program = new Command();

// Configuración del programa
program
  .name('sentinel')
  .description('🐝 QASL-API-SENTINEL - El Centinela de APIs 24/7')
  .version('1.0.0');

// ═══════════════════════════════════════════════════════════════════════════════
// Comando: start
// ═══════════════════════════════════════════════════════════════════════════════
program
  .command('start')
  .description('Inicia el Sentinel en modo vigilancia')
  .option('-w, --watch', 'Modo watch continuo')
  .action(async (options) => {
    displayBanner();

    const sentinel = new Sentinel();

    process.on('SIGINT', async () => {
      console.log('\n');
      await sentinel.stop();
      process.exit(0);
    });

    await sentinel.start();

    // Siempre queda corriendo en modo 24/7
    console.log(chalk.green(`\n✓ Sentinel corriendo en modo 24/7. Presiona Ctrl+C para detener.\n`));

    // Mantener el proceso vivo
    setInterval(() => {
      // Heartbeat - mantiene Node.js corriendo
    }, 60000);
  });

// ═══════════════════════════════════════════════════════════════════════════════
// Comando: import
// ═══════════════════════════════════════════════════════════════════════════════
program
  .command('import')
  .description('Importa APIs desde un archivo')
  .requiredOption('-t, --type <type>', 'Tipo de archivo (har, swagger, postman)')
  .option('-f, --file <file>', 'Ruta al archivo')
  .option('-u, --url <url>', 'URL del archivo (solo para swagger)')
  .action(async (options) => {
    const spinner = ora('Importando APIs...').start();

    try {
      const source = options.file || options.url;

      if (!source) {
        spinner.fail('Debes especificar --file o --url');
        process.exit(1);
      }

      // Inicializar Sentinel para usar su sistema de import
      const sentinel = new Sentinel();

      // Inicializar solo los módulos necesarios
      const { ConfigLoader } = await import('../src/core/config-loader.mjs');
      const { DataLayer } = await import('../src/core/data-layer.mjs');
      const { AuthManager } = await import('../src/auth/auth-manager.mjs');

      sentinel.modules.config = new ConfigLoader('./config');
      await sentinel.modules.config.load();

      sentinel.modules.data = new DataLayer('./data');
      await sentinel.modules.data.init();

      // Inicializar importers
      sentinel.modules.importers.har = new HarImporter();
      sentinel.modules.importers.swagger = new SwaggerImporter();
      sentinel.modules.importers.postman = new PostmanImporter();

      // Inicializar auth manager para detectar autenticación
      sentinel.modules.auth = new AuthManager(sentinel.modules.config.get('auth'));

      // Importar usando el Sentinel (que guarda automáticamente)
      const apis = await sentinel.importApis(source, options.type);

      spinner.succeed(`Importadas ${apis.length} APIs`);

      // Mostrar resumen
      console.log(chalk.cyan('\n📋 APIs importadas:\n'));

      const byPriority = { critical: [], normal: [], low: [] };
      for (const api of apis) {
        const p = api.priority || 'normal';
        byPriority[p]?.push(api);
      }

      for (const [priority, list] of Object.entries(byPriority)) {
        if (list.length === 0) continue;
        const icon = priority === 'critical' ? '🔴' : priority === 'normal' ? '🟡' : '🟢';
        console.log(chalk.white(`${icon} ${priority.toUpperCase()} (${list.length}):`));
        for (const api of list.slice(0, 5)) {
          console.log(chalk.gray(`   ${api.method} ${api.url}`));
        }
        if (list.length > 5) {
          console.log(chalk.gray(`   ... y ${list.length - 5} más`));
        }
        console.log('');
      }

      // Mostrar auth detectada
      const authTypes = [...new Set(apis.map(a => a.auth?.type).filter(Boolean))];
      if (authTypes.length > 0) {
        console.log(chalk.cyan('🔐 Autenticación detectada:'));
        for (const type of authTypes) {
          console.log(chalk.gray(`   • ${type}`));
        }
      }

      console.log(chalk.green(`\n✓ APIs guardadas en ./data/apis.json`));

    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════════════════════════
// Comando: check
// ═══════════════════════════════════════════════════════════════════════════════
program
  .command('check')
  .description('Verifica el estado de las APIs')
  .option('-a, --all', 'Verificar todas las APIs')
  .option('-c, --critical', 'Solo APIs críticas')
  .action(async (options) => {
    displayBanner();

    const sentinel = new Sentinel();
    await sentinel.start();

    const spinner = ora('Verificando APIs...').start();

    try {
      let results;
      if (options.critical) {
        results = await sentinel.modules.watcher?.checkCriticalApis();
      } else {
        results = await sentinel.modules.watcher?.checkAllApis();
      }

      spinner.stop();

      // Mostrar resultados
      console.log(chalk.cyan('\n📊 Resultados del check:\n'));

      let healthy = 0;
      let unhealthy = 0;

      for (const result of results || []) {
        const icon = result.healthy ? chalk.green('✓') : chalk.red('✗');
        const status = result.status || 'ERROR';
        const latency = result.latency ? `${result.latency}ms` : '-';

        console.log(`${icon} ${result.api.method} ${result.api.url}`);
        console.log(chalk.gray(`  Status: ${status} | Latencia: ${latency}`));

        if (result.alerts?.length > 0) {
          for (const alert of result.alerts) {
            console.log(chalk.yellow(`  ⚠ ${alert.message}`));
          }
        }
        console.log('');

        if (result.healthy) healthy++;
        else unhealthy++;
      }

      // Resumen
      console.log(chalk.cyan('━'.repeat(50)));
      console.log(chalk.white(`Total: ${results?.length || 0} | `) +
        chalk.green(`Healthy: ${healthy} | `) +
        chalk.red(`Unhealthy: ${unhealthy}`));

    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
    }

    await sentinel.stop();
  });

// ═══════════════════════════════════════════════════════════════════════════════
// Comando: report
// ═══════════════════════════════════════════════════════════════════════════════
program
  .command('report')
  .description('Genera un reporte')
  .option('-t, --type <type>', 'Tipo de reporte (5h, daily, weekly)', 'daily')
  .option('-p, --pdf', 'Generar reporte en formato PDF')
  .option('-o, --output <dir>', 'Directorio de salida para el PDF', './reports')
  .action(async (options) => {
    const spinner = ora('Generando reporte...').start();

    try {
      if (options.pdf) {
        // Generar reporte PDF sin iniciar todo el servidor
        const { PDFReportGenerator } = await import('../src/reports/pdf-generator.mjs');
        const pdfGenerator = new PDFReportGenerator({ outputDir: options.output });

        // Cargar configuracion y APIs directamente
        spinner.text = 'Cargando configuracion de APIs...';
        const { DataLayer } = await import('../src/core/data-layer.mjs');
        const { Watcher } = await import('../src/modules/watcher/watcher.mjs');
        const { AuthManager } = await import('../src/auth/auth-manager.mjs');

        const data = new DataLayer();
        await data.init();

        const auth = new AuthManager({ config: data.config });
        const watcher = new Watcher({ auth, data, config: data.config });

        // Cargar APIs
        const apis = await data.loadApis();
        watcher.setApis(apis);

        // Hacer check de todas las APIs
        spinner.text = 'Verificando estado de APIs...';
        const checkResults = await watcher.checkAllApis();

        // Generar datos para el reporte
        const reportData = generateReportDataFromResults(checkResults, apis);

        const result = await pdfGenerator.generateReport(reportData, {
          type: options.type,
          title: `API Monitoring Report - ${options.type.toUpperCase()}`,
          filename: `sentinel-report-${options.type}-${Date.now()}.pdf`
        });

        spinner.succeed(chalk.green(`Reporte PDF generado: ${result.path}`));

        // Abrir el PDF automaticamente
        const { exec } = await import('child_process');
        exec(`start "" "${result.path}"`);
      } else {
        // Para reportes Markdown, necesitamos el servidor completo
        const sentinel = new Sentinel();
        await sentinel.start();
        const report = await sentinel.modules.reporter?.generateReport(options.type);
        spinner.stop();
        console.log('\n' + report);
        await sentinel.stop();
      }
    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      console.error(error);
    }
  });

/**
 * Genera datos para el reporte PDF directamente desde resultados de checkAllApis
 * Sin necesidad de iniciar todo el servidor
 */
function generateReportDataFromResults(checkResults, apis) {
  // Calcular metricas desde los resultados del check
  const totalApis = checkResults.length;
  const healthyApis = checkResults.filter(r => r.healthy).length;
  const totalLatency = checkResults.reduce((sum, r) => sum + (r.latency || 0), 0);
  const avgLatency = totalApis > 0 ? Math.round(totalLatency / totalApis) : 0;
  const uptimePercentage = totalApis > 0 ? ((healthyApis / totalApis) * 100).toFixed(2) : 0;

  // Generar alertas desde los resultados del check
  const alerts = [];
  checkResults.forEach(result => {
    const apiName = result.api?.name || result.api?.id || 'Unknown';

    // Agregar alertas de cada resultado
    if (result.alerts && result.alerts.length > 0) {
      result.alerts.forEach(alert => {
        alerts.push({
          severity: alert.type.includes('critical') || !result.healthy ? 'critical' : 'warning',
          message: alert.message,
          api: apiName,
          timestamp: new Date().toLocaleTimeString('es-AR')
        });
      });
    }

    // Agregar alerta si la API no esta healthy
    if (!result.healthy && (!result.alerts || result.alerts.length === 0)) {
      alerts.push({
        severity: 'critical',
        message: `API ${apiName} no responde correctamente (Status: ${result.status || 'N/A'})`,
        api: apiName,
        timestamp: new Date().toLocaleTimeString('es-AR')
      });
    }

    // Agregar alerta de latencia alta
    if (result.latency > 500 && result.healthy) {
      alerts.push({
        severity: 'warning',
        message: `Alta latencia: ${result.latency}ms (umbral: 500ms)`,
        api: apiName,
        timestamp: new Date().toLocaleTimeString('es-AR')
      });
    }
  });

  return {
    summary: {
      totalApis,
      uptimePercentage: parseFloat(uptimePercentage),
      avgLatency,
      alertCount: alerts.length
    },
    metrics: {
      uptime: 0, // No hay servidor corriendo
      totalChecks: totalApis,
      successChecks: healthyApis,
      failedChecks: totalApis - healthyApis,
      uptimePercentage: parseFloat(uptimePercentage),
      avgLatency
    },
    apis: checkResults.map(result => ({
      id: result.api?.id || 'unknown',
      name: result.api?.name || result.api?.id || 'Unknown API',
      healthy: result.healthy,
      latency: result.latency || 0,
      uptime: result.healthy ? 100 : 0,
      status: result.status
    })),
    alerts
  };
}

/**
 * Genera datos para el reporte PDF
 * Obtiene datos dinámicos del watcher después de ejecutar checkAllApis()
 * (Usado cuando el servidor esta corriendo)
 */
async function generateReportData(sentinel) {
  const watcher = sentinel.modules.watcher;

  // Ejecutar check de todas las APIs y obtener resultados
  const checkResults = await watcher?.checkAllApis() || [];

  // Obtener resumen del watcher
  const summary = watcher?.getSummary() || {};

  // Calcular métricas desde los resultados del check
  const totalApis = checkResults.length;
  const healthyApis = checkResults.filter(r => r.healthy).length;
  const totalLatency = checkResults.reduce((sum, r) => sum + (r.latency || 0), 0);
  const avgLatency = totalApis > 0 ? Math.round(totalLatency / totalApis) : 0;
  const uptimePercentage = totalApis > 0 ? ((healthyApis / totalApis) * 100).toFixed(2) : 0;

  // Generar alertas desde los resultados del check
  const alerts = [];
  checkResults.forEach(result => {
    const apiName = result.api?.name || result.api?.id || 'Unknown';

    // Agregar alertas de cada resultado
    if (result.alerts && result.alerts.length > 0) {
      result.alerts.forEach(alert => {
        alerts.push({
          severity: alert.type.includes('critical') || !result.healthy ? 'critical' : 'warning',
          message: alert.message,
          api: apiName,
          timestamp: new Date().toLocaleTimeString('es-AR')
        });
      });
    }

    // Agregar alerta si la API no está healthy
    if (!result.healthy && result.alerts.length === 0) {
      alerts.push({
        severity: 'critical',
        message: `API ${apiName} no responde correctamente (Status: ${result.status || 'N/A'})`,
        api: apiName,
        timestamp: new Date().toLocaleTimeString('es-AR')
      });
    }

    // Agregar alerta de latencia alta
    if (result.latency > 500 && result.healthy) {
      alerts.push({
        severity: 'warning',
        message: `Alta latencia: ${result.latency}ms (umbral: 500ms)`,
        api: apiName,
        timestamp: new Date().toLocaleTimeString('es-AR')
      });
    }
  });

  return {
    summary: {
      totalApis,
      uptimePercentage: parseFloat(uptimePercentage),
      avgLatency,
      alertCount: alerts.length
    },
    metrics: {
      uptime: Math.floor(process.uptime()),
      totalChecks: totalApis,
      successChecks: healthyApis,
      failedChecks: totalApis - healthyApis,
      uptimePercentage: parseFloat(uptimePercentage),
      avgLatency
    },
    apis: checkResults.map(result => ({
      id: result.api?.id || 'unknown',
      name: result.api?.name || result.api?.id || 'Unknown API',
      healthy: result.healthy,
      latency: result.latency || 0,
      uptime: result.healthy ? 100 : 0,
      status: result.status
    })),
    alerts
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Comando: chat
// ═══════════════════════════════════════════════════════════════════════════════
program
  .command('chat')
  .description('Chat con el AI del Sentinel')
  .action(async () => {
    displayBanner();
    console.log(chalk.cyan('\n💬 Chat con QASL-API-SENTINEL AI'));
    console.log(chalk.gray('Escribe "exit" para salir\n'));

    const sentinel = new Sentinel();
    await sentinel.start();

    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const askQuestion = () => {
      rl.question(chalk.green('Tú: '), async (input) => {
        if (input.toLowerCase() === 'exit') {
          await sentinel.stop();
          rl.close();
          return;
        }

        try {
          const response = await sentinel.chat(input);
          console.log(chalk.cyan('\n🧠 Sentinel: ') + response + '\n');
        } catch (error) {
          console.log(chalk.red(`Error: ${error.message}\n`));
        }

        askQuestion();
      });
    };

    askQuestion();
  });

// ═══════════════════════════════════════════════════════════════════════════════
// Comando: status
// ═══════════════════════════════════════════════════════════════════════════════
program
  .command('status')
  .description('Muestra el estado del sistema')
  .action(async () => {
    displayBanner();

    const sentinel = new Sentinel();
    await sentinel.start();

    const status = sentinel.getStatus();
    const summary = sentinel.modules.watcher?.getSummary();

    console.log(chalk.cyan('\n📊 Estado del Sistema\n'));
    console.log(chalk.white(`Running: ${status.running ? chalk.green('Sí') : chalk.red('No')}`));
    console.log(chalk.white(`Uptime: ${Math.floor(status.uptime / 1000)}s`));

    if (summary) {
      console.log(chalk.cyan('\n📡 APIs:'));
      console.log(chalk.white(`  Total: ${summary.total}`));
      console.log(chalk.green(`  Healthy: ${summary.healthy}`));
      console.log(chalk.yellow(`  Warning: ${summary.warning}`));
      console.log(chalk.red(`  Critical: ${summary.critical}`));
      console.log(chalk.white(`  Avg Latency: ${summary.avgLatency}ms`));
      console.log(chalk.white(`  Uptime: ${summary.uptime}%`));
    }

    await sentinel.stop();
  });

// ═══════════════════════════════════════════════════════════════════════════════
// Comando: metrics
// ═══════════════════════════════════════════════════════════════════════════════
program
  .command('metrics')
  .description('Muestra métricas del Sentinel en ejecución')
  .option('-u, --url <url>', 'URL del endpoint de métricas', 'http://localhost:9091/metrics')
  .option('-j, --json', 'Salida en formato JSON')
  .action(async (options) => {
    displayBanner();

    console.log(chalk.cyan('\n📊 MÉTRICAS DE QASL-API-SENTINEL\n'));
    console.log(chalk.gray(`Conectando a ${options.url}...\n`));

    try {
      const response = await fetch(options.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const metricsText = await response.text();

      // Parsear métricas Prometheus
      const metrics = {};
      const apiMetrics = new Map();

      for (const line of metricsText.split('\n')) {
        if (line.startsWith('#') || !line.trim()) continue;

        // Métricas globales
        if (line.startsWith('qasl_uptime_seconds ')) {
          metrics.uptime = parseInt(line.split(' ')[1]);
        } else if (line.startsWith('qasl_apis_total ')) {
          metrics.totalApis = parseInt(line.split(' ')[1]);
        } else if (line.startsWith('qasl_checks_total ')) {
          metrics.totalChecks = parseInt(line.split(' ')[1]);
        } else if (line.startsWith('qasl_checks_success_total ')) {
          metrics.successChecks = parseInt(line.split(' ')[1]);
        } else if (line.startsWith('qasl_checks_failed_total ')) {
          metrics.failedChecks = parseInt(line.split(' ')[1]);
        } else if (line.startsWith('qasl_uptime_percentage ')) {
          metrics.uptimePercentage = parseFloat(line.split(' ')[1]);
        } else if (line.startsWith('qasl_latency_avg_ms ') && !line.includes('{')) {
          metrics.avgLatency = parseInt(line.split(' ')[1]);
        }

        // Métricas por API
        const apiStatusMatch = line.match(/qasl_api_status\{api_id="([^"]+)",api_name="([^"]+)".*\}\s+(\d+)/);
        if (apiStatusMatch) {
          const [, id, name, status] = apiStatusMatch;
          if (!apiMetrics.has(id)) apiMetrics.set(id, { id, name });
          apiMetrics.get(id).status = parseInt(status);
        }

        const apiLatencyMatch = line.match(/qasl_api_latency_ms\{api_id="([^"]+)".*\}\s+(\d+)/);
        if (apiLatencyMatch) {
          const [, id, latency] = apiLatencyMatch;
          if (!apiMetrics.has(id)) apiMetrics.set(id, { id });
          apiMetrics.get(id).latency = parseInt(latency);
        }

        const apiHealthyMatch = line.match(/qasl_api_healthy\{api_id="([^"]+)".*\}\s+(\d+)/);
        if (apiHealthyMatch) {
          const [, id, healthy] = apiHealthyMatch;
          if (!apiMetrics.has(id)) apiMetrics.set(id, { id });
          apiMetrics.get(id).healthy = parseInt(healthy) === 1;
        }

        const apiUptimeMatch = line.match(/qasl_api_uptime_percentage\{api_id="([^"]+)".*\}\s+([\d.]+)/);
        if (apiUptimeMatch) {
          const [, id, uptime] = apiUptimeMatch;
          if (!apiMetrics.has(id)) apiMetrics.set(id, { id });
          apiMetrics.get(id).uptime = parseFloat(uptime);
        }
      }

      if (options.json) {
        console.log(JSON.stringify({ global: metrics, apis: [...apiMetrics.values()] }, null, 2));
        return;
      }

      // Mostrar métricas globales
      console.log(chalk.cyan('═'.repeat(60)));
      console.log(chalk.cyan('                    RESUMEN GLOBAL'));
      console.log(chalk.cyan('═'.repeat(60)));
      console.log('');
      console.log(`  ${chalk.white('Tiempo activo:')}     ${chalk.green(formatUptime(metrics.uptime))}`);
      console.log(`  ${chalk.white('APIs monitoreadas:')} ${chalk.yellow(metrics.totalApis)}`);
      console.log(`  ${chalk.white('Verificaciones:')}    ${chalk.blue(metrics.totalChecks)}`);
      console.log(`  ${chalk.white('Exitosas:')}          ${chalk.green(metrics.successChecks)}`);
      console.log(`  ${chalk.white('Fallidas:')}          ${chalk.red(metrics.failedChecks)}`);
      console.log(`  ${chalk.white('Disponibilidad:')}    ${getUptimeColor(metrics.uptimePercentage)}`);
      console.log(`  ${chalk.white('Latencia promedio:')} ${getLatencyColor(metrics.avgLatency)}`);
      console.log('');

      // Mostrar estado por API
      console.log(chalk.cyan('═'.repeat(60)));
      console.log(chalk.cyan('                    ESTADO POR API'));
      console.log(chalk.cyan('═'.repeat(60)));
      console.log('');

      const apis = [...apiMetrics.values()];
      const healthyApis = apis.filter(a => a.healthy);
      const unhealthyApis = apis.filter(a => !a.healthy);

      if (healthyApis.length > 0) {
        console.log(chalk.green('  ✓ OPERATIVAS:'));
        for (const api of healthyApis) {
          console.log(chalk.gray(`    • ${api.name}`));
          console.log(chalk.gray(`      Status: ${api.status} | Latencia: ${api.latency}ms | Uptime: ${api.uptime}%`));
        }
        console.log('');
      }

      if (unhealthyApis.length > 0) {
        console.log(chalk.red('  ✗ CON FALLAS:'));
        for (const api of unhealthyApis) {
          console.log(chalk.red(`    • ${api.name}`));
          console.log(chalk.red(`      Status: ${api.status} | Latencia: ${api.latency}ms | Uptime: ${api.uptime}%`));
        }
        console.log('');
      }

      console.log(chalk.cyan('═'.repeat(60)));
      console.log(chalk.gray(`  Proyecto: SIGMA | Cliente: AGIP | Empresa: Epidata`));
      console.log(chalk.gray(`  Líder Técnico QA: Elyer Gregorio Maldonado`));
      console.log(chalk.cyan('═'.repeat(60)));

    } catch (error) {
      if (error.cause?.code === 'ECONNREFUSED') {
        console.log(chalk.red('✗ No se pudo conectar al Sentinel.'));
        console.log(chalk.yellow('\n  El Sentinel no está corriendo o está en un puerto diferente.'));
        console.log(chalk.gray('  Inicia el Sentinel con: node cli/sentinel-cli.mjs start --watch'));
        console.log(chalk.gray('  O especifica el puerto: --url http://localhost:9092/metrics'));
      } else {
        console.log(chalk.red(`✗ Error: ${error.message}`));
      }
    }
  });

function formatUptime(seconds) {
  if (!seconds) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function getUptimeColor(uptime) {
  if (uptime >= 99) return chalk.green(`${uptime}%`);
  if (uptime >= 95) return chalk.yellow(`${uptime}%`);
  return chalk.red(`${uptime}%`);
}

function getLatencyColor(latency) {
  if (latency < 200) return chalk.green(`${latency}ms`);
  if (latency < 500) return chalk.yellow(`${latency}ms`);
  return chalk.red(`${latency}ms`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Comando: ai-report
// ═══════════════════════════════════════════════════════════════════════════════
program
  .command('ai-report')
  .description('Genera un informe inteligente con Claude AI sobre las métricas')
  .option('-u, --url <url>', 'URL del endpoint de métricas', 'http://localhost:9091/metrics')
  .option('-q, --question <question>', 'Pregunta específica sobre las métricas')
  .action(async (options) => {
    displayBanner();

    console.log(chalk.cyan('\n🧠 INFORME INTELIGENTE CON CLAUDE AI\n'));

    const spinner = ora('Obteniendo métricas...').start();

    try {
      // 1. Obtener métricas de Prometheus
      const response = await fetch(options.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const metricsText = await response.text();

      // Parsear métricas
      const metrics = { global: {}, apis: [] };
      const apiMetrics = new Map();

      for (const line of metricsText.split('\n')) {
        if (line.startsWith('#') || !line.trim()) continue;

        // Métricas globales
        if (line.startsWith('qasl_uptime_seconds ')) {
          metrics.global.uptime = parseInt(line.split(' ')[1]);
        } else if (line.startsWith('qasl_apis_total ')) {
          metrics.global.totalApis = parseInt(line.split(' ')[1]);
        } else if (line.startsWith('qasl_checks_total ')) {
          metrics.global.totalChecks = parseInt(line.split(' ')[1]);
        } else if (line.startsWith('qasl_checks_success_total ')) {
          metrics.global.successChecks = parseInt(line.split(' ')[1]);
        } else if (line.startsWith('qasl_checks_failed_total ')) {
          metrics.global.failedChecks = parseInt(line.split(' ')[1]);
        } else if (line.startsWith('qasl_uptime_percentage ')) {
          metrics.global.uptimePercentage = parseFloat(line.split(' ')[1]);
        } else if (line.startsWith('qasl_latency_avg_ms ') && !line.includes('{')) {
          metrics.global.avgLatency = parseInt(line.split(' ')[1]);
        }

        // Métricas por API
        const apiStatusMatch = line.match(/qasl_api_status\{api_id="([^"]+)",api_name="([^"]+)".*\}\s+(\d+)/);
        if (apiStatusMatch) {
          const [, id, name, status] = apiStatusMatch;
          if (!apiMetrics.has(id)) apiMetrics.set(id, { id, name });
          apiMetrics.get(id).status = parseInt(status);
        }

        const apiLatencyMatch = line.match(/qasl_api_latency_ms\{api_id="([^"]+)".*\}\s+(\d+)/);
        if (apiLatencyMatch) {
          const [, id, latency] = apiLatencyMatch;
          if (!apiMetrics.has(id)) apiMetrics.set(id, { id });
          apiMetrics.get(id).latency = parseInt(latency);
        }

        const apiHealthyMatch = line.match(/qasl_api_healthy\{api_id="([^"]+)".*\}\s+(\d+)/);
        if (apiHealthyMatch) {
          const [, id, healthy] = apiHealthyMatch;
          if (!apiMetrics.has(id)) apiMetrics.set(id, { id });
          apiMetrics.get(id).healthy = parseInt(healthy) === 1;
        }

        const apiUptimeMatch = line.match(/qasl_api_uptime_percentage\{api_id="([^"]+)".*\}\s+([\d.]+)/);
        if (apiUptimeMatch) {
          const [, id, uptime] = apiUptimeMatch;
          if (!apiMetrics.has(id)) apiMetrics.set(id, { id });
          apiMetrics.get(id).uptime = parseFloat(uptime);
        }
      }

      metrics.apis = [...apiMetrics.values()];

      spinner.text = 'Consultando a Claude AI...';

      // 2. Inicializar AI Brain
      const { AIBrain } = await import('../src/ai/brain.mjs');
      const ai = new AIBrain();

      if (!ai.isAvailable()) {
        spinner.warn('Claude AI no disponible - generando informe básico');
        console.log(chalk.yellow('\n⚠️  Para informes inteligentes, configura ANTHROPIC_API_KEY en .env\n'));
        const basicReport = ai.generateFallbackGrafanaReport(metrics);
        console.log(basicReport);
        return;
      }

      // 3. Generar informe o responder pregunta
      let report;
      if (options.question) {
        spinner.text = `Respondiendo: "${options.question}"...`;
        report = await ai.askAboutMetrics(options.question, metrics);
      } else {
        spinner.text = 'Generando informe ejecutivo...';
        report = await ai.analyzeGrafanaMetrics(metrics);
      }

      spinner.succeed('Informe generado con Claude AI');

      console.log(chalk.cyan('\n' + '═'.repeat(80)));
      console.log(report);
      console.log(chalk.cyan('═'.repeat(80)));

      console.log(chalk.gray('\n📊 Datos obtenidos de: ' + options.url));
      console.log(chalk.gray('🧠 Análisis generado por: Claude AI (Anthropic)'));
      console.log(chalk.gray('🐝 QASL-API-SENTINEL v1.0\n'));

    } catch (error) {
      if (error.cause?.code === 'ECONNREFUSED') {
        spinner.fail('No se pudo conectar al Sentinel');
        console.log(chalk.yellow('\n  El Sentinel no está corriendo o está en un puerto diferente.'));
        console.log(chalk.gray('  Inicia el Sentinel: docker-compose up -d'));
        console.log(chalk.gray('  O especifica el puerto: --url http://localhost:9092/metrics'));
      } else {
        spinner.fail(`Error: ${error.message}`);
      }
    }
  });

// ═══════════════════════════════════════════════════════════════════════════════
// Comando: ai-ask
// ═══════════════════════════════════════════════════════════════════════════════
program
  .command('ai-ask <question>')
  .description('Pregunta a Claude AI sobre las métricas actuales')
  .option('-u, --url <url>', 'URL del endpoint de métricas', 'http://localhost:9091/metrics')
  .action(async (question, options) => {
    // Redirigir a ai-report con la pregunta
    const args = ['ai-report', '--url', options.url, '--question', question];
    await program.parseAsync(['node', 'sentinel-cli.mjs', ...args]);
  });

// ═══════════════════════════════════════════════════════════════════════════════
// Comando: analyze
// ═══════════════════════════════════════════════════════════════════════════════
program
  .command('analyze <file>')
  .description('Analiza un archivo sin importar')
  .option('-t, --type <type>', 'Tipo de archivo', 'auto')
  .action(async (file, options) => {
    const spinner = ora('Analizando archivo...').start();

    try {
      // Detectar tipo
      let type = options.type;
      if (type === 'auto') {
        if (file.endsWith('.har')) type = 'har';
        else if (file.endsWith('.json')) {
          const content = readFileSync(file, 'utf-8');
          const json = JSON.parse(content);
          if (json.info?.schema?.includes('postman')) type = 'postman';
          else if (json.openapi || json.swagger) type = 'swagger';
        }
      }

      let stats;
      switch (type) {
        case 'har':
          const har = new HarImporter();
          stats = await har.analyze(file);
          break;
        case 'swagger':
          const swagger = new SwaggerImporter();
          stats = await swagger.analyze(file);
          break;
        case 'postman':
          const postman = new PostmanImporter();
          stats = await postman.analyze(file);
          break;
        default:
          spinner.fail('No se pudo detectar el tipo de archivo');
          process.exit(1);
      }

      spinner.stop();

      console.log(chalk.cyan('\n📋 Análisis del archivo:\n'));
      console.log(JSON.stringify(stats, null, 2));

    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
    }
  });

// ═══════════════════════════════════════════════════════════════════════════════
// Comando: live-dashboard
// ═══════════════════════════════════════════════════════════════════════════════
program
  .command('live-dashboard')
  .description('🎯 Dashboard en vivo estilo NASA Mission Control')
  .option('-u, --url <url>', 'URL de las métricas Prometheus', 'http://localhost:9092/metrics')
  .option('-r, --refresh <seconds>', 'Intervalo de actualización en segundos', '2')
  .action(async (options) => {
    const { startLiveDashboard } = await import('../src/ui/live-dashboard.mjs');

    console.log(chalk.cyan('🚀 Iniciando Live Dashboard...\n'));
    console.log(chalk.gray(`Métricas URL: ${options.url}`));
    console.log(chalk.gray(`Refresh rate: ${options.refresh}s\n`));
    console.log(chalk.yellow('Controles:'));
    console.log(chalk.gray('  r - Actualizar ahora'));
    console.log(chalk.gray('  q - Salir\n'));

    await startLiveDashboard({
      url: options.url,
      refresh: parseInt(options.refresh)
    });
  });

// ═══════════════════════════════════════════════════════════════════════════════
// Comando: templates
// ═══════════════════════════════════════════════════════════════════════════════
const templatesCmd = program
  .command('templates')
  .description('📋 Gestión de templates de industria (ecommerce, fintech, saas)');

templatesCmd
  .command('list')
  .description('Lista todos los templates disponibles')
  .action(async () => {
    const { listTemplates } = await import('../src/templates/template-manager.mjs');

    console.log(chalk.cyan('\n📋 TEMPLATES DISPONIBLES\n'));
    console.log(chalk.cyan('═'.repeat(70)));

    const templates = await listTemplates();

    for (const t of templates) {
      console.log('');
      console.log(chalk.white.bold(`  ${t.name}`));
      console.log(chalk.gray(`  ID: ${t.id} | Industry: ${t.industry} | APIs: ${t.apiCount}`));
      console.log(chalk.gray(`  ${t.description}`));
      if (t.sla) {
        console.log(chalk.gray(`  SLA: ${t.sla.availability}% uptime, ${t.sla.latency_p95}ms p95`));
      }
    }

    console.log('');
    console.log(chalk.cyan('═'.repeat(70)));
    console.log(chalk.gray('\nUso: sentinel templates init <template-id> --base-url <url>'));
  });

templatesCmd
  .command('show <templateId>')
  .description('Muestra los detalles de un template')
  .action(async (templateId) => {
    const { loadTemplate } = await import('../src/templates/template-manager.mjs');

    try {
      const template = await loadTemplate(templateId);

      console.log(chalk.cyan(`\n📋 TEMPLATE: ${template.name}\n`));
      console.log(chalk.cyan('═'.repeat(70)));
      console.log(chalk.gray(`Descripción: ${template.description}`));
      console.log(chalk.gray(`Industria: ${template.industry}`));
      console.log('');

      console.log(chalk.white.bold('APIs:'));
      const byCategory = {};
      for (const api of template.apis || []) {
        const cat = api.category || 'default';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(api);
      }

      for (const [cat, apis] of Object.entries(byCategory)) {
        console.log(chalk.yellow(`\n  ${cat.toUpperCase()}:`));
        for (const api of apis) {
          const priorityIcon = api.priority === 'critical' ? '🔴' : api.priority === 'high' ? '🟡' : '🟢';
          console.log(chalk.gray(`    ${priorityIcon} ${api.method} ${api.name.split(' ')[1] || api.url}`));
          console.log(chalk.gray(`       Threshold: ${api.threshold_ms}ms ${api.requiresAuth ? '| 🔐 Auth' : ''}`));
        }
      }

      if (template.sla) {
        console.log(chalk.white.bold('\nSLA:'));
        console.log(chalk.gray(`  Availability: ${template.sla.availability}%`));
        console.log(chalk.gray(`  Latency P95: ${template.sla.latency_p95}ms`));
        console.log(chalk.gray(`  Latency P99: ${template.sla.latency_p99}ms`));
      }

      if (template.alerts) {
        console.log(chalk.white.bold('\nAlertas:'));
        console.log(chalk.gray(`  Canales: ${template.alerts.channels?.join(', ')}`));
        console.log(chalk.gray(`  Escalación: ${template.alerts.escalation_minutes} minutos`));
      }

      console.log('');
      console.log(chalk.cyan('═'.repeat(70)));

    } catch (error) {
      console.log(chalk.red(`Error: ${error.message}`));
    }
  });

templatesCmd
  .command('init <templateId>')
  .description('Genera configuración de APIs desde un template')
  .option('-b, --base-url <url>', 'URL base de las APIs', 'http://localhost:3000')
  .option('-n, --name <name>', 'Nombre del proyecto')
  .option('-o, --output <file>', 'Archivo de salida', './data/apis-from-template.json')
  .action(async (templateId, options) => {
    const { generateConfig } = await import('../src/templates/template-manager.mjs');
    const spinner = ora('Generando configuración...').start();

    try {
      const config = await generateConfig(templateId, {
        baseUrl: options.baseUrl,
        projectName: options.name,
        outputPath: options.output
      });

      spinner.succeed(`Configuración generada: ${options.output}`);
      console.log(chalk.green(`\n✓ ${config.apis.length} APIs configuradas desde template "${templateId}"`));
      console.log(chalk.gray(`  Base URL: ${options.baseUrl}`));
      console.log(chalk.gray(`  Archivo: ${options.output}`));
      console.log(chalk.yellow('\nPróximos pasos:'));
      console.log(chalk.gray('  1. Edita el archivo generado para ajustar URLs y credenciales'));
      console.log(chalk.gray('  2. Copia a ./data/apis.json'));
      console.log(chalk.gray('  3. Inicia el Sentinel: sentinel start --watch'));

    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
    }
  });

templatesCmd
  .command('validate <templateId>')
  .description('Valida un template')
  .action(async (templateId) => {
    const { validateTemplate } = await import('../src/templates/template-manager.mjs');

    try {
      const result = await validateTemplate(templateId);

      console.log(chalk.cyan(`\n📋 VALIDACIÓN: ${templateId}\n`));

      if (result.valid) {
        console.log(chalk.green('✓ Template válido'));
      } else {
        console.log(chalk.red('✗ Template inválido'));
      }

      if (result.errors.length > 0) {
        console.log(chalk.red('\nErrores:'));
        result.errors.forEach(e => console.log(chalk.red(`  • ${e}`)));
      }

      if (result.warnings.length > 0) {
        console.log(chalk.yellow('\nAdvertencias:'));
        result.warnings.forEach(w => console.log(chalk.yellow(`  • ${w}`)));
      }

      console.log(chalk.white('\nResumen:'));
      console.log(chalk.gray(`  Total APIs: ${result.summary.totalApis}`));
      console.log(chalk.gray(`  Críticas: ${result.summary.criticalApis}`));
      console.log(chalk.gray(`  Alta prioridad: ${result.summary.highApis}`));
      console.log(chalk.gray(`  Requieren auth: ${result.summary.authRequired}`));

    } catch (error) {
      console.log(chalk.red(`Error: ${error.message}`));
    }
  });

templatesCmd
  .command('export <templateId>')
  .description('Exporta un template a diferentes formatos')
  .option('-f, --format <format>', 'Formato (json, yaml, markdown, postman)', 'json')
  .option('-o, --output <file>', 'Archivo de salida')
  .action(async (templateId, options) => {
    const { exportTemplate } = await import('../src/templates/template-manager.mjs');
    const fs = await import('fs/promises');

    try {
      const output = await exportTemplate(templateId, options.format);

      if (options.output) {
        await fs.writeFile(options.output, output);
        console.log(chalk.green(`✓ Template exportado a ${options.output}`));
      } else {
        console.log(output);
      }

    } catch (error) {
      console.log(chalk.red(`Error: ${error.message}`));
    }
  });

// ═══════════════════════════════════════════════════════════════════════════════
// Comando: pdf-report
// ═══════════════════════════════════════════════════════════════════════════════
program
  .command('pdf-report')
  .description('📄 Genera un reporte PDF profesional con métricas y estado de APIs')
  .option('-u, --url <url>', 'URL del endpoint de métricas', 'http://localhost:9091/metrics')
  .option('-o, --output <dir>', 'Directorio de salida', './reports')
  .option('-t, --title <title>', 'Título del reporte', 'API Monitoring Report')
  .option('--type <type>', 'Tipo de reporte (daily, weekly, executive, technical)', 'daily')
  .action(async (options) => {
    displayBanner();

    console.log(chalk.cyan('\n📄 GENERADOR DE REPORTES PDF\n'));

    const spinner = ora('Generando reporte PDF...').start();

    try {
      const { PDFReportGenerator } = await import('../src/reports/pdf-generator.mjs');

      const generator = new PDFReportGenerator({
        outputDir: options.output,
        company: 'Epidata',
        project: 'SIGMA',
        client: 'AGIP'
      });

      spinner.text = 'Obteniendo métricas...';

      const filePath = await generator.generateFromMetrics(options.url, {
        title: options.title,
        type: options.type
      });

      spinner.succeed('Reporte PDF generado exitosamente');

      console.log(chalk.cyan('\n' + '═'.repeat(60)));
      console.log(chalk.green(`\n✓ Reporte guardado en: ${filePath}`));
      console.log(chalk.gray(`  Tipo: ${options.type}`));
      console.log(chalk.gray(`  Métricas desde: ${options.url}`));
      console.log(chalk.cyan('\n' + '═'.repeat(60)));

      console.log(chalk.yellow('\nContenido del reporte:'));
      console.log(chalk.gray('  • Resumen ejecutivo'));
      console.log(chalk.gray('  • Métricas de disponibilidad'));
      console.log(chalk.gray('  • Estado de APIs'));
      console.log(chalk.gray('  • Alertas activas'));
      console.log(chalk.gray('  • Recomendaciones'));

    } catch (error) {
      if (error.cause?.code === 'ECONNREFUSED') {
        spinner.fail('No se pudo conectar al Sentinel');
        console.log(chalk.yellow('\n  El Sentinel no está corriendo.'));
        console.log(chalk.gray('  Inicia el Sentinel: docker-compose up -d'));
        console.log(chalk.gray('  O especifica el puerto: --url http://localhost:9092/metrics'));
      } else {
        spinner.fail(`Error: ${error.message}`);
        console.log(chalk.gray(error.stack));
      }
    }
  });

// ═══════════════════════════════════════════════════════════════════════════════
// Comando: pdf-demo
// ═══════════════════════════════════════════════════════════════════════════════
program
  .command('pdf-demo')
  .description('📄 Genera un reporte PDF de demostración (sin conexión a Sentinel)')
  .option('-o, --output <dir>', 'Directorio de salida', './reports')
  .action(async (options) => {
    displayBanner();

    console.log(chalk.cyan('\n📄 DEMO - GENERADOR DE REPORTES PDF\n'));

    const spinner = ora('Generando reporte de demostración...').start();

    try {
      const { PDFReportGenerator } = await import('../src/reports/pdf-generator.mjs');

      const generator = new PDFReportGenerator({
        outputDir: options.output,
        company: 'Epidata',
        project: 'SIGMA',
        client: 'AGIP'
      });

      // Datos de demostración - estructura correcta para el generador
      const demoData = {
        summary: {
          totalApis: 6,
          uptimePercentage: 94.67,
          avgLatency: 245,
          alertCount: 3
        },
        metrics: {
          uptime: 3600,
          totalChecks: 150,
          successChecks: 142,
          failedChecks: 8,
          uptimePercentage: 94.67,
          avgLatency: 245
        },
        apis: [
          { id: 'auth-login', name: 'Auth Login', status: 200, latency: 150, healthy: true, uptime: 99.9 },
          { id: 'users-list', name: 'Users List', status: 200, latency: 320, healthy: true, uptime: 98.5 },
          { id: 'products-get', name: 'Products Get', status: 200, latency: 180, healthy: true, uptime: 99.2 },
          { id: 'orders-create', name: 'Orders Create', status: 500, latency: 0, healthy: false, uptime: 85.0 },
          { id: 'payments-process', name: 'Payments Process', status: 200, latency: 450, healthy: true, uptime: 97.8 },
          { id: 'inventory-check', name: 'Inventory Check', status: 503, latency: 0, healthy: false, uptime: 78.5 }
        ],
        alerts: [
          { severity: 'critical', message: 'Orders Create API esta caida', timestamp: new Date().toISOString(), api: 'Orders Create' },
          { severity: 'critical', message: 'Inventory Check no responde', timestamp: new Date().toISOString(), api: 'Inventory Check' },
          { severity: 'warning', message: 'Payments Process latencia alta (450ms)', timestamp: new Date().toISOString(), api: 'Payments Process' }
        ]
      };

      const result = await generator.generateReport(demoData, {
        title: 'Demo Report - QASL-API-SENTINEL',
        type: 'executive'
      });

      spinner.succeed('Reporte de demostración generado');

      console.log(chalk.cyan('\n' + '═'.repeat(60)));
      console.log(chalk.green(`\n✓ Reporte guardado en: ${result.path}`));
      console.log(chalk.gray(`  APIs simuladas: 6 (4 healthy, 2 unhealthy)`));
      console.log(chalk.gray(`  Alertas simuladas: 3`));
      console.log(chalk.cyan('\n' + '═'.repeat(60)));

      console.log(chalk.yellow('\nEste es un reporte de demostración con datos simulados.'));
      console.log(chalk.gray('Para reportes reales, usa: sentinel pdf-report'));

    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      console.log(chalk.gray(error.stack));
    }
  });

// ═══════════════════════════════════════════════════════════════════════════════
// Comando: compliance
// ═══════════════════════════════════════════════════════════════════════════════
program
  .command('compliance')
  .description('Genera reportes de cumplimiento (SOC2, ISO27001, PCI-DSS, HIPAA)')
  .option('-s, --standard <standard>', 'Estándar de cumplimiento (soc2, iso27001, pci-dss, hipaa)', 'soc2')
  .option('-a, --all', 'Ejecutar todos los estándares de cumplimiento')
  .option('-p, --period <period>', 'Período del reporte (ej: Q4-2025)')
  .option('-o, --output <dir>', 'Directorio de salida', 'reports')
  .option('--check', 'Solo verificar cumplimiento sin generar reporte completo')
  .option('--list', 'Listar estándares soportados')
  .action(async (options) => {
    const spinner = ora('Analizando cumplimiento...').start();

    try {
      // Importar módulos necesarios
      const { DataLayer } = await import('../src/core/data-layer.mjs');
      const { ConfigLoader } = await import('../src/core/config-loader.mjs');
      const { ComplianceReporter } = await import('../src/reports/compliance-reporter.mjs');

      // Si solo quiere listar estándares
      if (options.list) {
        spinner.stop();
        const reporter = new ComplianceReporter({}, {});
        const standards = reporter.listStandards();

        console.log(chalk.cyan('\n' + '═'.repeat(60)));
        console.log(chalk.bold.white('  📋 ESTÁNDARES DE CUMPLIMIENTO SOPORTADOS'));
        console.log(chalk.cyan('═'.repeat(60) + '\n'));

        for (const std of standards) {
          console.log(chalk.green(`  ✓ ${std.id.toUpperCase()}`));
          console.log(chalk.white(`    ${std.name}`));
          console.log(chalk.gray(`    ${std.description}`));
          console.log(chalk.gray(`    Controles: ${std.controlCount}`));
          console.log('');
        }
        return;
      }

      // Inicializar DataLayer
      const dataLayer = new DataLayer('./data');
      await dataLayer.init();

      // Cargar configuración
      const configLoader = new ConfigLoader('./config');
      await configLoader.load();

      // Crear reporter
      const reporter = new ComplianceReporter(dataLayer, configLoader.config);

      // Si se usa --all, ejecutar todos los estándares
      if (options.all) {
        const allStandards = ['soc2', 'iso27001', 'pci-dss', 'hipaa'];
        const results = {};
        let metricsData = {};
        try { metricsData = JSON.parse(readFileSync('./data/compliance-metrics.json', 'utf-8')); } catch {}

        for (const std of allStandards) {
          spinner.text = `Analizando ${std.toUpperCase()}...`;
          try {
            const result = await reporter.quickCheck(std);
            results[std] = result;
            if (std === 'soc2') metricsData.soc2 = result.score;
            else if (std === 'iso27001') metricsData.iso27001 = result.score;
            else if (std === 'pci-dss') metricsData.pciDss = result.score;
            else if (std === 'hipaa') metricsData.hipaa = result.score;
          } catch (e) {
            results[std] = { score: 0, status: 'ERROR' };
          }
        }

        // Guardar métricas
        writeFileSync('./data/compliance-metrics.json', JSON.stringify(metricsData, null, 2));
        spinner.succeed('Cumplimiento normativo analizado');

        console.log(chalk.cyan('\n' + '═'.repeat(60)));
        console.log(chalk.bold.white('  📋 CUMPLIMIENTO NORMATIVO - TODOS LOS ESTÁNDARES'));
        console.log(chalk.cyan('═'.repeat(60) + '\n'));

        for (const [std, result] of Object.entries(results)) {
          const statusColor = result.status === 'FULLY_COMPLIANT' ? 'green'
            : result.status === 'SUBSTANTIALLY_COMPLIANT' ? 'yellow'
            : result.status === 'ERROR' ? 'red'
            : result.score >= 50 ? 'yellow' : 'red';
          const icon = result.score >= 70 ? '✓' : result.score >= 50 ? '◐' : '✗';
          console.log(chalk[statusColor](`  ${icon} ${std.toUpperCase().padEnd(12)} ${result.score}% - ${result.status}`));
        }
        console.log(chalk.cyan('\n' + '═'.repeat(60)));
        return;
      }

      // Verificar estándar válido
      const validStandards = ['soc2', 'iso27001', 'pci-dss', 'hipaa'];
      const standard = options.standard.toLowerCase();

      if (!validStandards.includes(standard)) {
        spinner.fail(`Estándar no soportado: ${options.standard}`);
        console.log(chalk.yellow(`Estándares válidos: ${validStandards.join(', ')}`));
        return;
      }

      // Check rápido o reporte completo
      if (options.check) {
        spinner.text = `Verificando cumplimiento ${standard.toUpperCase()}...`;
        const result = await reporter.quickCheck(standard);
        spinner.stop();

        console.log(chalk.cyan('\n' + '═'.repeat(60)));
        console.log(chalk.bold.white(`  📊 VERIFICACIÓN ${result.standard}`));
        console.log(chalk.cyan('═'.repeat(60) + '\n'));

        // Status con color
        const statusColor = result.status === 'FULLY_COMPLIANT' ? 'green'
          : result.status === 'SUBSTANTIALLY_COMPLIANT' ? 'yellow'
          : result.status === 'PARTIALLY_COMPLIANT' ? 'hex("#FFA500")'
          : 'red';

        console.log(chalk[statusColor](`  Estado: ${result.status}`));
        console.log(chalk.white(`  Score: ${result.score}/100`));
        console.log('');
        console.log(chalk.green(`  ✓ Cumple: ${result.compliant} controles`));
        console.log(chalk.yellow(`  ◐ Parcial: ${result.partial} controles`));
        console.log(chalk.red(`  ✗ No cumple: ${result.nonCompliant} controles`));
        console.log(chalk.cyan('\n' + '═'.repeat(60)));

        return;
      }

      // Generar reporte completo
      spinner.text = `Generando reporte ${standard.toUpperCase()}...`;

      const reportPath = await reporter.exportJSON(standard, options.output, {
        period: options.period ? { label: options.period, days: 90 } : undefined
      });

      spinner.succeed(`Reporte de cumplimiento generado`);

      // Leer el reporte para mostrar resumen
      const report = JSON.parse(readFileSync(reportPath, 'utf-8'));

      console.log(chalk.cyan('\n' + '═'.repeat(60)));
      console.log(chalk.bold.white(`  📋 REPORTE DE CUMPLIMIENTO - ${report.metadata.standard}`));
      console.log(chalk.cyan('═'.repeat(60) + '\n'));

      // Resumen
      const summary = report.summary;
      const getStatusChalk = (status) => {
        if (status === 'FULLY_COMPLIANT') return chalk.green;
        if (status === 'SUBSTANTIALLY_COMPLIANT') return chalk.yellow;
        if (status === 'PARTIALLY_COMPLIANT') return chalk.hex('#FFA500');
        return chalk.red;
      };

      console.log(chalk.white('  RESUMEN:'));
      console.log(getStatusChalk(summary.overallStatus)(`    Estado General: ${summary.overallStatus}`));
      console.log(chalk.white(`    Score: ${summary.overallScore}/100`));
      console.log(chalk.white(`    Cumplimiento: ${summary.compliancePercentage}%`));
      console.log('');

      // Detalle de controles
      console.log(chalk.white('  CONTROLES:'));
      for (const control of report.controls) {
        const icon = control.status === 'COMPLIANT' ? chalk.green('✓')
          : control.status === 'PARTIAL' ? chalk.yellow('◐')
          : chalk.red('✗');
        console.log(`    ${icon} ${control.id}: ${control.name} (${control.score}%)`);
      }
      console.log('');

      // Recomendaciones
      if (report.recommendations.length > 0) {
        console.log(chalk.white('  RECOMENDACIONES:'));
        for (const rec of report.recommendations.slice(0, 5)) {
          const priority = rec.priority === 'HIGH' ? chalk.red('ALTA') : chalk.yellow('MEDIA');
          console.log(`    [${priority}] ${rec.controlId}: ${rec.actions[0]}`);
        }
        console.log('');
      }

      console.log(chalk.green(`  ✓ Reporte guardado en: ${reportPath}`));
      console.log(chalk.gray(`  Período: ${report.metadata.period.label}`));
      console.log(chalk.gray(`  Generado: ${new Date(report.metadata.generatedAt).toLocaleString()}`));
      console.log(chalk.cyan('\n' + '═'.repeat(60)));

      // Actualizar métricas de Prometheus vía HTTP
      try {
        const complianceData = {};
        if (standard === 'soc2') complianceData.soc2 = summary.overallScore;
        else if (standard === 'iso27001') complianceData.iso27001 = summary.overallScore;
        else if (standard === 'pci-dss') complianceData.pciDss = summary.overallScore;
        else if (standard === 'hipaa') complianceData.hipaa = summary.overallScore;

        // Guardar métricas en archivo para que el Sentinel las lea
        const metricsPath = './data/compliance-metrics.json';
        let existingMetrics = {};
        try {
          existingMetrics = JSON.parse(readFileSync(metricsPath, 'utf-8'));
        } catch {}
        Object.assign(existingMetrics, complianceData);
        writeFileSync(metricsPath, JSON.stringify(existingMetrics, null, 2));
      } catch (e) {
        // Silently ignore metrics update errors
      }

    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      console.log(chalk.gray(error.stack));
    }
  });

// ============================================
// COMANDO: security - Escaneo de seguridad
// ============================================
program
  .command('security')
  .description('Escanea APIs en busca de vulnerabilidades de seguridad')
  .option('-u, --url <url>', 'URL específica a escanear')
  .option('-a, --all', 'Escanear todas las APIs configuradas')
  .option('-o, --output <dir>', 'Directorio de salida', 'reports')
  .option('--json', 'Exportar resultados en JSON')
  .action(async (options) => {
    const spinner = ora('Escaneando seguridad...').start();

    try {
      const { SecurityScanner } = await import('../src/modules/security/security-scanner.mjs');
      const scanner = new SecurityScanner();

      let results = [];

      if (options.url) {
        // Escanear URL específica
        const result = await scanner.scan({ url: options.url });
        results.push(result);
      } else if (options.all) {
        // Cargar configuración y escanear todas
        const configPath = path.join(process.cwd(), 'data', 'apis.json');
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          const apis = Array.isArray(config) ? config : (config.apis || []);

          spinner.text = `Escaneando ${apis.length} APIs...`;
          results = await scanner.scanMultiple(apis.map(a => ({ url: a.url, method: a.method })));
        } else {
          throw new Error('No se encontró archivo de configuración');
        }
      } else {
        throw new Error('Especifica --url o --all');
      }

      spinner.succeed('Escaneo completado');

      // Generar reporte
      const report = await scanner.generateReport(results);

      console.log('\n' + boxen(
        chalk.bold('RESUMEN DE SEGURIDAD\n\n') +
        `APIs escaneadas: ${report.totalApis}\n` +
        `Score promedio: ${report.summary.avgScore.toFixed(0)}/100\n\n` +
        chalk.red(`Crítico: ${report.summary.findings.critical}`) + '\n' +
        chalk.yellow(`Alto: ${report.summary.findings.high}`) + '\n' +
        chalk.blue(`Medio: ${report.summary.findings.medium}`) + '\n' +
        chalk.gray(`Bajo: ${report.summary.findings.low}`),
        { padding: 1, borderColor: 'cyan', title: '🛡️ Security Scan', titleAlignment: 'center' }
      ));

      // Top vulnerabilidades
      if (report.topVulnerabilities.length > 0) {
        console.log('\n' + chalk.bold('Top Vulnerabilidades:'));
        report.topVulnerabilities.slice(0, 5).forEach((v, i) => {
          const icon = v.severity === 'critical' ? '🔴' : v.severity === 'high' ? '🟠' : '🟡';
          console.log(`  ${i + 1}. ${icon} ${v.title} (${v.count} APIs afectadas)`);
        });
      }

      // Exportar JSON
      if (options.json) {
        const outputDir = path.resolve(options.output);
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const jsonPath = path.join(outputDir, `security-scan-${Date.now()}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
        console.log(chalk.green(`\n✓ Reporte exportado: ${jsonPath}`));
      }

      // Guardar métricas para Prometheus
      try {
        const securityMetrics = {
          score: Math.round(report.summary.avgScore),
          critical: report.summary.findings.critical,
          high: report.summary.findings.high,
          medium: report.summary.findings.medium,
          low: report.summary.findings.low,
          apisScanned: report.totalApis
        };
        const metricsPath = './data/security-metrics.json';
        fs.writeFileSync(metricsPath, JSON.stringify(securityMetrics, null, 2));
        console.log(chalk.green('✓ Métricas de seguridad actualizadas para Prometheus'));
      } catch (e) {
        // Silencioso si falla
      }

    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
    }
  });

// ============================================
// COMANDO: discover - Auto-descubrimiento de APIs
// ============================================
program
  .command('discover')
  .description('Descubre APIs automáticamente desde una URL base')
  .argument('<baseUrl>', 'URL base para descubrir APIs')
  .option('-o, --output <file>', 'Archivo de salida para configuración')
  .option('--fuzz', 'Habilitar fuzzing ligero de endpoints')
  .option('--har <file>', 'Descubrir desde archivo HAR')
  .action(async (baseUrl, options) => {
    const spinner = ora('Descubriendo APIs...').start();

    try {
      const { ApiDiscovery } = await import('../src/modules/discovery/api-discovery.mjs');
      const discovery = new ApiDiscovery();

      let result;

      if (options.har) {
        // Descubrir desde HAR
        const harContent = fs.readFileSync(options.har, 'utf-8');
        const endpoints = await discovery.discoverFromHar(harContent);
        result = { endpoints, source: 'har' };
      } else {
        // Descubrir desde URL
        result = await discovery.discover(baseUrl, { fuzz: options.fuzz });
      }

      spinner.succeed(`Descubiertos ${result.endpoints.length} endpoints`);

      // Mostrar resumen
      console.log('\n' + boxen(
        chalk.bold('DESCUBRIMIENTO COMPLETADO\n\n') +
        `Base URL: ${baseUrl}\n` +
        `Endpoints encontrados: ${result.endpoints.length}\n` +
        (result.swagger?.found ? `Swagger: ${result.swagger.title}\n` : '') +
        '\nPor método:\n' +
        Object.entries(result.summary?.byMethod || {}).map(([m, c]) => `  ${m}: ${c}`).join('\n'),
        { padding: 1, borderColor: 'green', title: '🔍 API Discovery', titleAlignment: 'center' }
      ));

      // Listar endpoints
      if (result.endpoints.length > 0) {
        console.log('\n' + chalk.bold('Endpoints descubiertos:'));
        result.endpoints.slice(0, 20).forEach(ep => {
          const icon = ep.source === 'swagger' ? '📄' : '🔍';
          console.log(`  ${icon} ${chalk.cyan(ep.method)} ${ep.path || ep.url}`);
        });
        if (result.endpoints.length > 20) {
          console.log(chalk.gray(`  ... y ${result.endpoints.length - 20} más`));
        }
      }

      // Exportar configuración
      if (options.output) {
        const config = discovery.exportToConfig(result.endpoints);
        const outputPath = path.resolve(options.output);
        fs.writeFileSync(outputPath, JSON.stringify({ apis: config }, null, 2));
        console.log(chalk.green(`\n✓ Configuración exportada: ${outputPath}`));
      }

    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
    }
  });

// ============================================
// COMANDO: anomaly - Detección de anomalías ML
// ============================================
program
  .command('anomaly')
  .description('Analiza métricas con ML para detectar anomalías')
  .option('-a, --api <apiId>', 'ID de API específica')
  .option('--train', 'Entrenar modelos con datos históricos')
  .option('--report', 'Generar reporte de anomalías')
  .option('--hours <hours>', 'Período de análisis en horas', '24')
  .action(async (options) => {
    const spinner = ora('Analizando anomalías...').start();

    try {
      const { AnomalyDetector } = await import('../src/modules/ml/anomaly-detector.mjs');
      const { DataLayer } = await import('../src/core/data-layer.mjs');

      const dataLayer = new DataLayer();
      await dataLayer.init();

      const detector = new AnomalyDetector(dataLayer);

      if (options.train) {
        spinner.text = 'Entrenando modelos ML...';

        // Obtener datos históricos
        const history = await dataLayer.getHealthHistory(parseInt(options.hours));

        // Agrupar por API y métrica
        const byApi = {};
        for (const entry of history) {
          const key = entry.apiId;
          if (!byApi[key]) byApi[key] = { latency: [], errorRate: [] };
          if (entry.latency) byApi[key].latency.push({ value: entry.latency });
          if (entry.errorRate) byApi[key].errorRate.push({ value: entry.errorRate });
        }

        // Entrenar modelos
        let trained = 0;
        for (const [apiId, data] of Object.entries(byApi)) {
          if (data.latency.length >= 10) {
            await detector.train(apiId, 'latency', data.latency);
            trained++;
          }
        }

        spinner.succeed(`${trained} modelos entrenados`);

      } else if (options.report) {
        spinner.text = 'Generando reporte de anomalías...';

        const report = await detector.generateReport({ period: parseInt(options.hours) });

        spinner.succeed('Reporte generado');

        console.log('\n' + boxen(
          chalk.bold('REPORTE DE ANOMALÍAS\n\n') +
          `Período: ${report.period}\n` +
          `Total anomalías: ${report.summary.totalAnomalies}\n` +
          chalk.red(`Críticas: ${report.summary.critical}`) + '\n' +
          chalk.yellow(`Warnings: ${report.summary.warning}`) + '\n' +
          `APIs afectadas: ${report.summary.affectedApis}\n` +
          `Modelos entrenados: ${report.models.trained}`,
          { padding: 1, borderColor: 'magenta', title: '🔍 Anomaly Detection', titleAlignment: 'center' }
        ));

        // Guardar métricas para Prometheus
        try {
          const mlMetrics = {
            anomaliesTotal: report.summary.totalAnomalies,
            anomaliesCritical: report.summary.critical,
            anomaliesWarning: report.summary.warning,
            affectedApis: report.summary.affectedApis,
            modelsTrained: report.models.trained
          };
          const metricsPath = './data/ml-metrics.json';
          let existing = {};
          try { existing = JSON.parse(fs.readFileSync(metricsPath, 'utf-8')); } catch {}
          Object.assign(existing, mlMetrics);
          fs.writeFileSync(metricsPath, JSON.stringify(existing, null, 2));
          console.log(chalk.green('✓ Métricas ML actualizadas para Prometheus'));
        } catch (e) {}

      } else {
        // Análisis rápido
        const status = detector.getStatus();
        spinner.succeed('Detector ML listo');

        console.log('\n' + chalk.bold('Estado del Detector:'));
        console.log(`  Modelos: ${status.modelsCount}`);
        console.log(`  Historial: ${status.anomalyHistorySize} anomalías`);
        console.log(`  Sensibilidad: ${status.config.sensitivity}`);
      }

    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      console.log(chalk.gray(error.stack));
    }
  });

// ============================================
// COMANDO: predict - Predicción de fallos
// ============================================
program
  .command('predict')
  .description('Predice posibles fallos usando ML')
  .option('-a, --api <apiId>', 'ID de API específica')
  .option('--all', 'Predecir para todas las APIs')
  .option('--report', 'Generar reporte de predicciones')
  .action(async (options) => {
    const spinner = ora('Analizando predicciones...').start();

    try {
      const { FailurePredictor } = await import('../src/modules/ml/failure-predictor.mjs');
      const { DataLayer } = await import('../src/core/data-layer.mjs');

      const dataLayer = new DataLayer();
      await dataLayer.init();

      const predictor = new FailurePredictor(dataLayer);

      if (options.report) {
        const report = await predictor.generateReport({ period: 24 });
        spinner.succeed('Reporte generado');

        console.log('\n' + boxen(
          chalk.bold('REPORTE DE PREDICCIONES\n\n') +
          `Total predicciones: ${report.summary.totalPredictions}\n` +
          chalk.red(`Alto riesgo: ${report.summary.byRiskLevel.high}`) + '\n' +
          chalk.yellow(`Riesgo medio: ${report.summary.byRiskLevel.medium}`) + '\n' +
          chalk.green(`Bajo riesgo: ${report.summary.byRiskLevel.low}`) + '\n' +
          `Precisión: ${report.summary.accuracy}\n` +
          `Patrones aprendidos: ${report.failurePatternsLearned}`,
          { padding: 1, borderColor: 'yellow', title: '🔮 Failure Prediction', titleAlignment: 'center' }
        ));

        if (report.highRiskApis.length > 0) {
          console.log('\n' + chalk.bold('APIs de alto riesgo:'));
          report.highRiskApis.forEach(api => {
            console.log(`  ⚠️  ${api.apiId} - Riesgo promedio: ${(api.avgRisk * 100).toFixed(0)}%`);
          });
        }

        // Guardar métricas para Prometheus
        try {
          const predMetrics = {
            predictionsTotal: report.summary.totalPredictions,
            highRisk: report.summary.byRiskLevel.high,
            mediumRisk: report.summary.byRiskLevel.medium,
            lowRisk: report.summary.byRiskLevel.low,
            patternsLearned: report.failurePatternsLearned,
            apisAtRisk: report.highRiskApis.length
          };
          const metricsPath = './data/ml-metrics.json';
          let existing = {};
          try { existing = JSON.parse(fs.readFileSync(metricsPath, 'utf-8')); } catch {}
          Object.assign(existing, predMetrics);
          fs.writeFileSync(metricsPath, JSON.stringify(existing, null, 2));
          console.log(chalk.green('✓ Métricas de predicción actualizadas para Prometheus'));
        } catch (e) {}

      } else {
        const status = predictor.getStatus();
        spinner.succeed('Predictor listo');

        console.log('\n' + chalk.bold('Estado del Predictor:'));
        console.log(`  Historial: ${status.predictionHistorySize} predicciones`);
        console.log(`  Patrones de fallo: ${status.failurePatternsLearned}`);
        console.log(`  Horizonte: ${status.config.predictionHorizon}`);
      }

    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
    }
  });

// ============================================
// COMANDO: email - Notificaciones por email
// ============================================
program
  .command('email')
  .description('📧 Gestiona notificaciones por email')
  .option('--test', 'Envía un email de prueba')
  .option('--status', 'Muestra el estado de la configuración de email')
  .option('--send-report', 'Envía el reporte actual por email')
  .option('--test-alert <type>', 'Prueba una alerta: down, recovered, critical')
  .action(async (options) => {
    const spinner = ora('Procesando email...').start();

    try {
      const { EmailNotifier } = await import('../src/modules/notifications/email-notifier.mjs');
      const emailNotifier = new EmailNotifier();

      if (options.status) {
        spinner.stop();
        const testResult = await emailNotifier.testConnection();

        console.log(chalk.cyan('\n' + '═'.repeat(60)));
        console.log(chalk.bold.white('  📧 CONFIGURACIÓN DE EMAIL'));
        console.log(chalk.cyan('═'.repeat(60) + '\n'));

        console.log(chalk.white(`  SMTP Host: ${emailNotifier.config.host}`));
        console.log(chalk.white(`  SMTP Port: ${emailNotifier.config.port}`));
        console.log(chalk.white(`  Usuario: ${emailNotifier.config.user || chalk.red('No configurado')}`));
        console.log(chalk.white(`  Destino: ${emailNotifier.config.to || chalk.red('No configurado')}`));
        console.log('');

        if (testResult.success) {
          console.log(chalk.green(`  ✓ Conexión: ${testResult.message}`));
        } else {
          console.log(chalk.red(`  ✗ Conexión: ${testResult.message}`));
        }

        console.log(chalk.cyan('\n' + '═'.repeat(60)));

      } else if (options.test) {
        spinner.text = 'Enviando email de prueba...';
        const result = await emailNotifier.sendTestEmail();

        if (result.success) {
          spinner.succeed(result.message);
          console.log(chalk.green('\n✓ Revisa tu bandeja de entrada'));
        } else {
          spinner.fail(result.message);
          console.log(chalk.yellow('\nVerifica la configuración en .env:'));
          console.log(chalk.gray('  SMTP_USER=tu-email@gmail.com'));
          console.log(chalk.gray('  SMTP_PASS=tu-app-password'));
          console.log(chalk.gray('  EMAIL_TO=destino@email.com'));
        }

      } else if (options.sendReport) {
        spinner.text = 'Generando y enviando reporte...';

        // Cargar datos y generar reporte
        const { DataLayer } = await import('../src/core/data-layer.mjs');
        const { Watcher } = await import('../src/modules/watcher/watcher.mjs');
        const { AuthManager } = await import('../src/auth/auth-manager.mjs');

        const data = new DataLayer();
        await data.init();

        const auth = new AuthManager({ config: data.config });
        const watcher = new Watcher({ auth, data, config: data.config });

        const apis = await data.loadApis();
        watcher.setApis(apis);

        spinner.text = 'Verificando APIs...';
        const checkResults = await watcher.checkAllApis();

        // Generar datos del reporte
        const totalApis = checkResults.length;
        const healthyApis = checkResults.filter(r => r.healthy).length;
        const totalLatency = checkResults.reduce((sum, r) => sum + (r.latency || 0), 0);
        const avgLatency = totalApis > 0 ? Math.round(totalLatency / totalApis) : 0;
        const availability = totalApis > 0 ? ((healthyApis / totalApis) * 100) : 0;

        const reportData = {
          status: healthyApis === totalApis ? 'healthy' : healthyApis > totalApis * 0.5 ? 'degraded' : 'critical',
          totalApis,
          availability,
          avgLatency,
          successChecks: healthyApis,
          failedChecks: totalApis - healthyApis,
          apis: checkResults.map(r => ({
            name: r.api?.name || r.api?.id || 'Unknown',
            status: r.healthy ? 'up' : 'down',
            latency: r.latency || 0,
            uptime: r.healthy ? 100 : 0
          }))
        };

        spinner.text = 'Enviando email...';
        const emailSent = await emailNotifier.sendMonitoringReport(reportData);

        if (emailSent) {
          spinner.succeed('Reporte enviado por email');
          console.log(chalk.green(`\n✓ Enviado a: ${emailNotifier.config.to}`));
        } else {
          spinner.fail('No se pudo enviar el email');
        }

      } else if (options.testAlert) {
        // Prueba de alertas automáticas
        spinner.text = 'Enviando alerta de prueba...';

        const alertTypes = {
          down: {
            type: 'API_DOWN',
            severity: 'critical',
            apiName: 'API de Prueba',
            apiUrl: 'https://api.ejemplo.com/test',
            message: 'La API "API de Prueba" ha dejado de responder',
            details: 'Timeout después de 30000ms',
            previousStatus: 'UP',
            currentStatus: 'DOWN',
            latency: 30000,
            timestamp: new Date().toISOString()
          },
          recovered: {
            type: 'API_RECOVERED',
            severity: 'info',
            apiName: 'API de Prueba',
            apiUrl: 'https://api.ejemplo.com/test',
            message: 'La API "API de Prueba" se ha recuperado',
            details: 'Responde correctamente con status 200',
            previousStatus: 'DOWN',
            currentStatus: 'UP',
            latency: 245,
            downtime: '5m 32s',
            timestamp: new Date().toISOString()
          },
          critical: {
            type: 'API_CRITICAL',
            severity: 'critical',
            apiName: 'API de Prueba',
            apiUrl: 'https://api.ejemplo.com/test',
            message: 'CRÍTICO: "API de Prueba" lleva 5 fallas consecutivas',
            details: 'Última error: Connection refused',
            consecutiveFailures: 5,
            timestamp: new Date().toISOString()
          },
          latency: {
            type: 'LATENCY_ANOMALY',
            severity: 'warning',
            apiName: 'API de Prueba',
            apiUrl: 'https://api.ejemplo.com/test',
            message: 'Latencia anormal detectada en "API de Prueba"',
            details: 'Latencia actual: 2500ms (normal: 250ms) - 900% sobre el promedio',
            latency: 2500,
            deviation: '900.0',
            timestamp: new Date().toISOString()
          },
          auth: {
            type: 'AUTH_ERROR',
            severity: 'high',
            apiName: 'API de Prueba',
            apiUrl: 'https://api.ejemplo.com/test',
            message: 'Error de autenticación en "API de Prueba"',
            details: 'HTTP 401 - Verificar credenciales o tokens',
            httpStatus: 401,
            timestamp: new Date().toISOString()
          }
        };

        const alertType = options.testAlert.toLowerCase();
        const alertData = alertTypes[alertType];

        if (!alertData) {
          spinner.fail(`Tipo de alerta no válido: ${alertType}`);
          console.log(chalk.yellow('\nTipos disponibles: down, recovered, critical, latency, auth'));
          return;
        }

        const result = await emailNotifier.sendAlert(alertData);

        if (result) {
          spinner.succeed(`Alerta de prueba "${alertType.toUpperCase()}" enviada`);
          console.log(chalk.green(`\n✓ Enviado a: ${emailNotifier.config.to}`));
          console.log(chalk.gray('  Revisa tu bandeja de entrada para ver el formato de alerta'));
        } else {
          spinner.fail('No se pudo enviar la alerta de prueba');
        }

      } else {
        spinner.stop();
        console.log(chalk.cyan('\n📧 Comandos de email disponibles:\n'));
        console.log(chalk.white('  sentinel email --status             Muestra configuración'));
        console.log(chalk.white('  sentinel email --test               Envía email de prueba'));
        console.log(chalk.white('  sentinel email --send-report        Envía reporte actual'));
        console.log(chalk.white('  sentinel email --test-alert <tipo>  Prueba alerta (down/recovered/critical/latency/auth)'));
      }

    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      console.log(chalk.gray(error.stack));
    }
  });

// ============================================
// COMANDO: webhook - Gestión de webhooks
// ============================================
program
  .command('webhook')
  .description('Gestiona webhooks para notificaciones')
  .option('--list', 'Lista webhooks configurados')
  .option('--add <url>', 'Agrega un nuevo webhook')
  .option('--test <id>', 'Prueba un webhook')
  .option('--delete <id>', 'Elimina un webhook')
  .option('-n, --name <name>', 'Nombre del webhook')
  .option('-e, --events <events>', 'Eventos separados por coma', '*')
  .option('-f, --format <format>', 'Formato: json, slack, discord, teams', 'json')
  .action(async (options) => {
    const spinner = ora('Procesando webhooks...').start();

    try {
      const { WebhookEngine } = await import('../src/modules/webhooks/webhook-engine.mjs');
      const engine = new WebhookEngine();

      // Cargar webhooks existentes
      const webhooksPath = path.join(process.cwd(), 'config', 'webhooks.json');
      if (fs.existsSync(webhooksPath)) {
        const saved = JSON.parse(fs.readFileSync(webhooksPath, 'utf-8'));
        for (const wh of saved.webhooks || []) {
          engine.register(wh);
        }
      }

      if (options.list) {
        const webhooks = engine.list();
        spinner.succeed(`${webhooks.length} webhooks configurados`);

        if (webhooks.length > 0) {
          console.log('\n' + chalk.bold('Webhooks:'));
          webhooks.forEach(wh => {
            const status = wh.enabled ? chalk.green('●') : chalk.gray('○');
            console.log(`  ${status} ${wh.name} (${wh.id})`);
            console.log(chalk.gray(`    URL: ${wh.url}`));
            console.log(chalk.gray(`    Eventos: ${wh.events.join(', ')}`));
            console.log(chalk.gray(`    Entregas: ${wh.stats.successfulDeliveries}/${wh.stats.totalDeliveries}`));
          });
        }

      } else if (options.add) {
        const webhook = engine.register({
          url: options.add,
          name: options.name || 'Nuevo Webhook',
          events: options.events.split(','),
          format: options.format
        });

        // Guardar
        const webhooks = engine.list();
        fs.writeFileSync(webhooksPath, JSON.stringify({ webhooks }, null, 2));

        spinner.succeed(`Webhook agregado: ${webhook.id}`);

      } else if (options.test) {
        spinner.text = 'Enviando prueba...';
        const result = await engine.test(options.test);

        if (result.success) {
          spinner.succeed(`Prueba exitosa (${result.statusCode})`);
        } else {
          spinner.fail(`Prueba fallida: ${result.error || result.statusCode}`);
        }

      } else if (options.delete) {
        engine.delete(options.delete);

        const webhooks = engine.list();
        fs.writeFileSync(webhooksPath, JSON.stringify({ webhooks }, null, 2));

        spinner.succeed(`Webhook eliminado: ${options.delete}`);

      } else {
        const stats = engine.getStats();
        spinner.succeed('Webhook Engine listo');

        console.log('\n' + chalk.bold('Estado:'));
        console.log(`  Total webhooks: ${stats.totalWebhooks}`);
        console.log(`  Habilitados: ${stats.enabledWebhooks}`);
        console.log(`  Cola: ${stats.queueSize}`);
        console.log(`  Entregas recientes: ${stats.recentDeliveries.successful}/${stats.recentDeliveries.total}`);
      }

    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
    }
  });

// ============================================
// COMANDO: auth - Gestión de autenticación
// ============================================
program
  .command('auth')
  .description('🔐 Gestión de autenticación para APIs')
  .option('--status', 'Muestra estado de autenticación')
  .option('--validate', 'Valida la configuración de auth')
  .option('--test <apiId>', 'Prueba auth para una API específica')
  .option('--list', 'Lista todas las estrategias disponibles')
  .option('--generate-jwt', 'Genera un JWT de prueba')
  .option('--decode-jwt <token>', 'Decodifica y valida un JWT')
  .option('--refresh <apiId>', 'Fuerza refresh del token para una API')
  .option('--clear-cache', 'Limpia el cache de tokens')
  .option('--secret <secret>', 'Secret para generación de JWT')
  .option('--payload <json>', 'Payload JSON para JWT', '{"sub":"test","role":"admin"}')
  .option('--expires <seconds>', 'Tiempo de expiración en segundos', '3600')
  .action(async (options) => {
    const spinner = ora('Procesando autenticación...').start();

    try {
      const { AuthManager } = await import('../src/auth/auth-manager.mjs');
      const { JwtAdvancedStrategy } = await import('../src/auth/strategies/jwt-advanced.mjs');
      const { DataLayer } = await import('../src/core/data-layer.mjs');

      const dataLayer = new DataLayer('./data');
      await dataLayer.init();

      const authManager = new AuthManager();

      if (options.list) {
        spinner.stop();

        console.log(chalk.cyan('\n' + '═'.repeat(60)));
        console.log(chalk.bold.white('  🔐 ESTRATEGIAS DE AUTENTICACIÓN SOPORTADAS'));
        console.log(chalk.cyan('═'.repeat(60) + '\n'));

        const strategies = [
          { id: 'bearer', name: 'Bearer Token', desc: 'Token simple en header Authorization' },
          { id: 'jwt', name: 'JWT Advanced', desc: 'JWT con verificación de firma (RS256/HS256/ES256)' },
          { id: 'oauth2', name: 'OAuth2 + PKCE', desc: 'OAuth2 con PKCE para flujos seguros' },
          { id: 'keycloak', name: 'Keycloak/OIDC', desc: 'Integración con Keycloak y OpenID Connect' },
          { id: 'api-key', name: 'API Key', desc: 'Clave en header X-API-Key o query string' },
          { id: 'basic', name: 'HTTP Basic', desc: 'Autenticación básica HTTP' },
          { id: 'cookie', name: 'Cookie/Session', desc: 'Autenticación basada en cookies' }
        ];

        for (const s of strategies) {
          console.log(chalk.green(`  ✓ ${s.id.padEnd(12)} `));
          console.log(chalk.white(`    ${s.name}`));
          console.log(chalk.gray(`    ${s.desc}`));
          console.log('');
        }

        console.log(chalk.cyan('═'.repeat(60)));
        console.log(chalk.gray('\nFeatures adicionales:'));
        console.log(chalk.gray('  • Auto-refresh inteligente de tokens'));
        console.log(chalk.gray('  • Cache de tokens con TTL'));
        console.log(chalk.gray('  • Soporte JWKS para claves públicas'));
        console.log(chalk.gray('  • Validación de issuer/audience'));
        console.log(chalk.cyan('═'.repeat(60)));

      } else if (options.status) {
        spinner.stop();
        const stats = authManager.getStats();

        console.log(chalk.cyan('\n' + '═'.repeat(60)));
        console.log(chalk.bold.white('  🔐 ESTADO DE AUTENTICACIÓN'));
        console.log(chalk.cyan('═'.repeat(60) + '\n'));

        console.log(chalk.white('  Estrategias registradas:'));
        for (const strategy of stats.strategies) {
          console.log(chalk.gray(`    • ${strategy}`));
        }
        console.log('');

        console.log(chalk.white('  Auto-refresh:'));
        console.log(chalk.gray(`    Habilitado: ${stats.autoRefresh.enabled ? chalk.green('Sí') : chalk.red('No')}`));
        console.log(chalk.gray(`    Intervalo: ${stats.autoRefresh.checkIntervalMs / 1000}s`));
        console.log(chalk.gray(`    Refresh antes de: ${stats.autoRefresh.refreshBeforeExpiryMs / 60000} min`));
        console.log('');

        console.log(chalk.white('  Cache de tokens:'));
        console.log(chalk.gray(`    Tokens cacheados: ${stats.cachedTokens}`));

        if (stats.tokenDetails.length > 0) {
          console.log('');
          for (const token of stats.tokenDetails) {
            const statusIcon = token.isExpired ? chalk.red('✗') : chalk.green('✓');
            console.log(chalk.gray(`    ${statusIcon} ${token.api}: expira en ${token.expiresIn}`));
          }
        }

        console.log(chalk.cyan('\n' + '═'.repeat(60)));

      } else if (options.validate) {
        spinner.text = 'Validando configuración de autenticación...';

        const apis = await dataLayer.loadApis();
        const results = [];

        for (const api of apis) {
          if (api.auth && api.auth.type !== 'none') {
            const validation = await authManager.validateAuth(api);
            results.push({
              api: api.name || api.id,
              type: api.auth.type,
              valid: validation.valid,
              message: validation.message
            });
          }
        }

        spinner.stop();

        console.log(chalk.cyan('\n' + '═'.repeat(60)));
        console.log(chalk.bold.white('  🔐 VALIDACIÓN DE AUTENTICACIÓN'));
        console.log(chalk.cyan('═'.repeat(60) + '\n'));

        if (results.length === 0) {
          console.log(chalk.yellow('  No hay APIs con autenticación configurada'));
        } else {
          for (const r of results) {
            const icon = r.valid ? chalk.green('✓') : chalk.red('✗');
            console.log(`  ${icon} ${r.api} (${r.type})`);
            console.log(chalk.gray(`    ${r.message}`));
            console.log('');
          }

          const valid = results.filter(r => r.valid).length;
          console.log(chalk.white(`  Total: ${results.length} | `));
          console.log(chalk.green(`  Válidas: ${valid} | `));
          console.log(chalk.red(`  Inválidas: ${results.length - valid}`));
        }

        console.log(chalk.cyan('\n' + '═'.repeat(60)));

      } else if (options.test) {
        spinner.text = `Probando autenticación para ${options.test}...`;

        const apis = await dataLayer.loadApis();
        const api = apis.find(a => a.id === options.test || a.name === options.test);

        if (!api) {
          spinner.fail(`API no encontrada: ${options.test}`);
          return;
        }

        const headers = await authManager.getAuthHeaders(api);
        const validation = await authManager.validateAuth(api);

        spinner.stop();

        console.log(chalk.cyan('\n' + '═'.repeat(60)));
        console.log(chalk.bold.white(`  🔐 TEST AUTH: ${api.name || api.id}`));
        console.log(chalk.cyan('═'.repeat(60) + '\n'));

        console.log(chalk.white('  Tipo de auth: ') + chalk.yellow(api.auth?.type || 'none'));
        console.log(chalk.white('  Válido: ') + (validation.valid ? chalk.green('Sí') : chalk.red('No')));
        console.log(chalk.white('  Mensaje: ') + chalk.gray(validation.message));
        console.log('');

        if (Object.keys(headers).length > 0) {
          console.log(chalk.white('  Headers generados:'));
          for (const [key, value] of Object.entries(headers)) {
            // Truncar tokens largos
            const displayValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
            console.log(chalk.gray(`    ${key}: ${displayValue}`));
          }
        }

        console.log(chalk.cyan('\n' + '═'.repeat(60)));

      } else if (options.generateJwt) {
        spinner.text = 'Generando JWT...';

        const jwtStrategy = new JwtAdvancedStrategy({
          secret: options.secret || process.env.JWT_SECRET || 'sentinel-test-secret-key'
        });

        let payload;
        try {
          payload = JSON.parse(options.payload);
        } catch {
          payload = { sub: 'test', role: 'admin' };
        }

        const token = jwtStrategy.generateToken(payload, {
          expiresIn: parseInt(options.expires) || 3600
        });

        spinner.stop();

        console.log(chalk.cyan('\n' + '═'.repeat(60)));
        console.log(chalk.bold.white('  🔐 JWT GENERADO'));
        console.log(chalk.cyan('═'.repeat(60) + '\n'));

        console.log(chalk.white('  Token:'));
        console.log(chalk.green(`  ${token}\n`));

        // Decodificar para mostrar
        const decoded = jwtStrategy.decode(token);
        console.log(chalk.white('  Header:'));
        console.log(chalk.gray(`  ${JSON.stringify(decoded.header)}\n`));

        console.log(chalk.white('  Payload:'));
        console.log(chalk.gray(`  ${JSON.stringify(decoded.payload, null, 2)}\n`));

        console.log(chalk.white('  Expira: ') + chalk.yellow(new Date(decoded.payload.exp * 1000).toISOString()));

        console.log(chalk.cyan('\n' + '═'.repeat(60)));
        console.log(chalk.gray('\nUso: Agregar header "Authorization: Bearer <token>"'));

      } else if (options.decodeJwt) {
        spinner.text = 'Decodificando JWT...';

        const jwtStrategy = new JwtAdvancedStrategy({
          secret: options.secret || process.env.JWT_SECRET,
          verifySignature: !!options.secret || !!process.env.JWT_SECRET
        });

        const decoded = jwtStrategy.decode(options.decodeJwt);

        if (!decoded) {
          spinner.fail('Token JWT inválido o mal formado');
          return;
        }

        const validation = await jwtStrategy.validateToken(options.decodeJwt);

        spinner.stop();

        console.log(chalk.cyan('\n' + '═'.repeat(60)));
        console.log(chalk.bold.white('  🔐 JWT DECODIFICADO'));
        console.log(chalk.cyan('═'.repeat(60) + '\n'));

        console.log(chalk.white('  Válido: ') + (validation.valid ? chalk.green('Sí') : chalk.red('No')));
        console.log(chalk.white('  Mensaje: ') + chalk.gray(validation.message));
        console.log('');

        console.log(chalk.white('  Header:'));
        console.log(chalk.gray(`  ${JSON.stringify(decoded.header, null, 2)}\n`));

        console.log(chalk.white('  Payload:'));
        console.log(chalk.gray(`  ${JSON.stringify(decoded.payload, null, 2)}\n`));

        if (validation.payload) {
          console.log(chalk.white('  Información extraída:'));
          console.log(chalk.gray(`    Subject: ${validation.payload.sub}`));
          console.log(chalk.gray(`    Issuer: ${validation.payload.iss || 'N/A'}`));
          console.log(chalk.gray(`    Audience: ${validation.payload.aud || 'N/A'}`));
          console.log(chalk.gray(`    Expira: ${validation.payload.exp || 'N/A'}`));
          if (validation.payload.roles?.length > 0) {
            console.log(chalk.gray(`    Roles: ${validation.payload.roles.join(', ')}`));
          }
          if (validation.expiresIn) {
            const mins = Math.floor(validation.expiresIn / 60);
            const secs = validation.expiresIn % 60;
            console.log(chalk.gray(`    Expira en: ${mins}m ${secs}s`));
          }
        }

        console.log(chalk.cyan('\n' + '═'.repeat(60)));

      } else if (options.refresh) {
        spinner.text = `Refrescando token para ${options.refresh}...`;

        const apis = await dataLayer.loadApis();
        const api = apis.find(a => a.id === options.refresh || a.name === options.refresh);

        if (!api) {
          spinner.fail(`API no encontrada: ${options.refresh}`);
          return;
        }

        const success = await authManager.refreshToken(api);

        if (success) {
          spinner.succeed(`Token refrescado para ${api.name || api.id}`);
        } else {
          spinner.fail('No se pudo refrescar el token');
        }

      } else if (options.clearCache) {
        authManager.clearCache();
        spinner.succeed('Cache de tokens limpiado');

      } else {
        spinner.stop();
        console.log(chalk.cyan('\n🔐 Comandos de autenticación disponibles:\n'));
        console.log(chalk.white('  sentinel auth --list              Lista estrategias disponibles'));
        console.log(chalk.white('  sentinel auth --status            Muestra estado de auth'));
        console.log(chalk.white('  sentinel auth --validate          Valida configuración'));
        console.log(chalk.white('  sentinel auth --test <apiId>      Prueba auth para una API'));
        console.log(chalk.white('  sentinel auth --generate-jwt      Genera un JWT de prueba'));
        console.log(chalk.white('  sentinel auth --decode-jwt <jwt>  Decodifica un JWT'));
        console.log(chalk.white('  sentinel auth --refresh <apiId>   Fuerza refresh del token'));
        console.log(chalk.white('  sentinel auth --clear-cache       Limpia cache de tokens'));
        console.log('');
        console.log(chalk.gray('Opciones adicionales:'));
        console.log(chalk.gray('  --secret <secret>      Secret para JWT'));
        console.log(chalk.gray('  --payload <json>       Payload para JWT'));
        console.log(chalk.gray('  --expires <segundos>   Tiempo de expiración'));
      }

    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      console.log(chalk.gray(error.stack));
    }
  });

// Parsear argumentos
program.parse();
