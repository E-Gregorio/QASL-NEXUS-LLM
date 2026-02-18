#!/usr/bin/env node

/**
 * QASL Framework - Infrastructure Check (Fase 7: Observability)
 *
 * Este script consulta Loki para detectar errores críticos en los logs
 * de la infraestructura durante la ejecución de tests.
 *
 * Uso:
 *   npm run infra:check              # Últimos 15 minutos
 *   npm run infra:check -- --time=1h # Última hora
 *   npm run infra:check -- --time=30m --container=postgres
 */

import http from 'http';

// Configuración
const LOKI_URL = process.env.LOKI_URL || 'http://localhost:3100';
const DEFAULT_TIME_RANGE = '15m';

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

// Parsear argumentos
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    time: DEFAULT_TIME_RANGE,
    container: null,
    verbose: false
  };

  args.forEach(arg => {
    if (arg.startsWith('--time=')) {
      options.time = arg.split('=')[1];
    }
    if (arg.startsWith('--container=')) {
      options.container = arg.split('=')[1];
    }
    if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    }
  });

  return options;
}

// Consultar Loki
async function queryLoki(query, timeRange) {
  const now = Date.now() * 1000000; // Nanosegundos
  const start = now - parseTimeRange(timeRange) * 1000000;

  const params = new URLSearchParams({
    query: query,
    start: start.toString(),
    end: now.toString(),
    limit: '1000'
  });

  const url = `${LOKI_URL}/loki/api/v1/query_range?${params}`;

  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Error parsing Loki response: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

// Parsear rango de tiempo a milisegundos
function parseTimeRange(range) {
  const match = range.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 15 * 60 * 1000; // Default 15 minutos

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
}

// Contar logs por nivel
async function countLogsByLevel(timeRange, container) {
  const containerFilter = container ? `, container="${container}"` : '';
  const baseQuery = `{project="qasl-framework"${containerFilter}}`;

  const queries = {
    errors: `${baseQuery} |~ "(?i)(error|fatal|critical|exception)"`,
    warnings: `${baseQuery} |~ "(?i)(warn|warning)"`,
    info: `${baseQuery} |~ "(?i)(info)"`,
    total: baseQuery
  };

  const results = {};

  for (const [level, query] of Object.entries(queries)) {
    try {
      const response = await queryLoki(query, timeRange);
      let count = 0;

      if (response.data && response.data.result) {
        response.data.result.forEach(stream => {
          count += stream.values ? stream.values.length : 0;
        });
      }

      results[level] = count;
    } catch (error) {
      results[level] = 0;
    }
  }

  return results;
}

// Obtener logs de error detallados
async function getErrorLogs(timeRange, container) {
  const containerFilter = container ? `, container="${container}"` : '';
  const query = `{project="qasl-framework"${containerFilter}} |~ "(?i)(error|fatal|critical|exception)"`;

  try {
    const response = await queryLoki(query, timeRange);
    const logs = [];

    if (response.data && response.data.result) {
      response.data.result.forEach(stream => {
        const container = stream.stream.container || 'unknown';
        if (stream.values) {
          stream.values.forEach(([timestamp, line]) => {
            logs.push({
              timestamp: new Date(parseInt(timestamp) / 1000000).toISOString(),
              container,
              message: line.substring(0, 200) // Truncar a 200 chars
            });
          });
        }
      });
    }

    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    return [];
  }
}

// Obtener contenedores activos
async function getActiveContainers(timeRange) {
  const query = '{project="qasl-framework"}';

  try {
    const response = await queryLoki(query, timeRange);
    const containers = new Set();

    if (response.data && response.data.result) {
      response.data.result.forEach(stream => {
        if (stream.stream.container) {
          containers.add(stream.stream.container);
        }
      });
    }

    return Array.from(containers);
  } catch (error) {
    return [];
  }
}

// Verificar si Loki está disponible
async function checkLokiHealth() {
  return new Promise((resolve) => {
    http.get(`${LOKI_URL}/ready`, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

// Imprimir resultados
function printResults(counts, errorLogs, containers, options) {
  console.log('\n');
  console.log(`${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║     QASL FRAMEWORK - INFRASTRUCTURE CHECK (Fase 7)             ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');

  // Resumen
  console.log(`${colors.bold}📊 RESUMEN (últimos ${options.time})${colors.reset}`);
  console.log(`${'─'.repeat(50)}`);

  const errorColor = counts.errors > 0 ? colors.red : colors.green;
  const warnColor = counts.warnings > 5 ? colors.yellow : colors.green;

  console.log(`  ${errorColor}❌ ERRORS:   ${counts.errors}${colors.reset}`);
  console.log(`  ${warnColor}⚠️  WARNINGS: ${counts.warnings}${colors.reset}`);
  console.log(`  ${colors.blue}ℹ️  INFO:     ${counts.info}${colors.reset}`);
  console.log(`  ${colors.cyan}📝 TOTAL:    ${counts.total}${colors.reset}`);
  console.log('');

  // Contenedores activos
  console.log(`${colors.bold}🐳 CONTENEDORES ACTIVOS (${containers.length})${colors.reset}`);
  console.log(`${'─'.repeat(50)}`);
  containers.forEach(c => {
    console.log(`  • ${c}`);
  });
  console.log('');

  // Logs de error
  if (errorLogs.length > 0) {
    console.log(`${colors.bold}${colors.red}🚨 ERRORES DETECTADOS (${errorLogs.length})${colors.reset}`);
    console.log(`${'─'.repeat(50)}`);

    errorLogs.slice(0, 10).forEach((log, index) => {
      console.log(`\n  ${colors.yellow}[${index + 1}] ${log.timestamp}${colors.reset}`);
      console.log(`      ${colors.magenta}Container: ${log.container}${colors.reset}`);
      console.log(`      ${colors.white}${log.message}${colors.reset}`);
    });

    if (errorLogs.length > 10) {
      console.log(`\n  ${colors.yellow}... y ${errorLogs.length - 10} errores más${colors.reset}`);
    }
    console.log('');
  }

  // Veredicto final
  console.log(`${'═'.repeat(50)}`);
  if (counts.errors === 0) {
    console.log(`${colors.bold}${colors.green}✅ INFRASTRUCTURE HEALTH: OK${colors.reset}`);
    console.log(`   No se detectaron errores críticos en los logs`);
  } else {
    console.log(`${colors.bold}${colors.red}❌ INFRASTRUCTURE HEALTH: ISSUES DETECTED${colors.reset}`);
    console.log(`   Se encontraron ${counts.errors} errores que requieren atención`);
    console.log(`   Ver dashboard: http://localhost:3001/d/infrastructure-logs`);
  }
  console.log(`${'═'.repeat(50)}\n`);

  // Exit code basado en errores
  return counts.errors === 0 ? 0 : 1;
}

// Main
async function main() {
  const options = parseArgs();

  console.log(`\n${colors.cyan}🔍 Verificando infraestructura...${colors.reset}`);
  console.log(`   Loki URL: ${LOKI_URL}`);
  console.log(`   Time range: ${options.time}`);
  if (options.container) {
    console.log(`   Container filter: ${options.container}`);
  }

  // Verificar Loki
  const lokiHealthy = await checkLokiHealth();
  if (!lokiHealthy) {
    console.log(`\n${colors.red}❌ ERROR: No se puede conectar a Loki${colors.reset}`);
    console.log(`   Asegúrate de que los servicios estén corriendo:`);
    console.log(`   ${colors.yellow}npm run docker:up${colors.reset}`);
    console.log(`\n   Verificar: http://localhost:3100/ready\n`);
    process.exit(1);
  }

  console.log(`${colors.green}✓ Loki conectado${colors.reset}\n`);

  // Obtener datos
  const [counts, errorLogs, containers] = await Promise.all([
    countLogsByLevel(options.time, options.container),
    getErrorLogs(options.time, options.container),
    getActiveContainers(options.time)
  ]);

  // Imprimir resultados
  const exitCode = printResults(counts, errorLogs, containers, options);
  process.exit(exitCode);
}

main().catch(error => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});
