#!/usr/bin/env node
/**
 * =============================================================================
 * QASL-INGRID - Servidor Principal
 * =============================================================================
 * Chatbot inteligente integrado en Grafana con Claude AI.
 *
 * Proyecto: QASL NEXUS LLM - QASL-SENTINEL-UNIFIED
 * Líder Técnico QA: Elyer Gregorio Maldonado
 *
 * Puerto: 3100
 * API: POST /api/chat
 * Widget: GET /widget/ingrid-widget.js | /widget/ingrid-widget.css
 * =============================================================================
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

const execAsync = promisify(exec);

// Cargar .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// Importar módulos INGRID
import { getMetricsContext } from './src/query-engine.mjs';
import { generateResponse } from './src/claude-client.mjs';
import { generateAndSendReport } from './src/report-service.mjs';

const PORT = parseInt(process.env.INGRID_PORT || '3100');
const app = express();

// =============================================================================
// QASL-MOBILE - Configuracion del modulo mobile
// =============================================================================
const QASL_MOBILE_PATH = join(dirname(dirname(__dirname)), '..', 'QASL-MOBILE');
const QASL_MOBILE_GRAFANA = 'http://localhost:3004';
const QASL_MOBILE_PORTS = { grafana: 3004, influxdb: 8089 };

// =============================================================================
// MIDDLEWARE
// =============================================================================

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// Servir archivos estáticos del widget (sin caché para desarrollo)
app.use('/widget', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}, express.static(join(__dirname, 'public')));

// =============================================================================
// ESTADO PARA FLUJO DE EMAIL
// =============================================================================

let pendingEmailState = null; // { awaitingEmail: true, timestamp: number }

// Limpiar estado viejo (más de 2 minutos)
function cleanPendingEmail() {
  if (pendingEmailState && Date.now() - pendingEmailState.timestamp > 120000) {
    pendingEmailState = null;
  }
}

// =============================================================================
// RUTAS
// =============================================================================

/**
 * POST /api/chat - Endpoint principal del chatbot
 * Body: { "message": "¿cómo está la disponibilidad?" }
 * Response: { "response": "...", "category": "...", "timestamp": "..." }
 */
app.post('/api/chat', async (req, res) => {
  const startTime = Date.now();
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({
      error: 'El campo "message" es requerido y debe ser un texto.',
    });
  }

  const question = message.trim();
  console.log(`[INGRID] Pregunta: "${question}"`);

  // Limpiar estado viejo
  cleanPendingEmail();

  // Regex para detectar email en el mensaje
  const emailRegex = /[\w.+-]+@[\w-]+\.[\w.-]+/;
  const emailMatch = question.match(emailRegex);

  // =========================================================================
  // DETECCION DE TIPO DE REPORTE
  // =========================================================================
  function detectReportType(text) {
    const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (t.includes('garak') || t.includes('llm') || t.includes('seguridad ia') || t.includes('ia/llm')) return 'garak';
    if (t.includes('zap') || t.includes('owasp') || t.includes('vulnerabilidad')) return 'zap';
    if (t.includes('compliance') || t.includes('cumplimiento') || t.includes('soc2') || t.includes('iso27001') || t.includes('pci') || t.includes('hipaa')) return 'compliance';
    if (t.includes('api') && !t.includes('garak') && !t.includes('zap')) return 'apis';
    if (t.includes('completo') || t.includes('todo') || t.includes('general') || t.includes('qasl')) return 'full';
    return 'full';
  }

  const reportTypeLabels = {
    full: 'completo del sistema',
    garak: 'de seguridad IA/LLM (Garak)',
    apis: 'de estado de APIs',
    zap: 'de seguridad OWASP ZAP',
    compliance: 'de compliance',
    mobile: 'de testing mobile',
  };

  // =========================================================================
  // PASO 1: Si estamos esperando un email del usuario
  // =========================================================================
  if (pendingEmailState && pendingEmailState.awaitingEmail) {
    if (emailMatch) {
      const targetEmail = emailMatch[0];
      const reportType = pendingEmailState.reportType || 'full';
      pendingEmailState = null;

      try {
        console.log(`[INGRID] Enviando informe (${reportType}) a ${targetEmail}...`);
        // Si es mobile, consultar datos de QASL-MOBILE InfluxDB
        let extraData = {};
        if (reportType === 'mobile') {
          try {
            const { default: fetch } = await import('node-fetch');
            const q = encodeURIComponent('SELECT * FROM test_execution ORDER BY time DESC LIMIT 20');
            const influxRes = await fetch(`http://localhost:${QASL_MOBILE_PORTS.influxdb}/query?db=qasl_mobile&q=${q}`);
            const influxData = await influxRes.json();
            let totalTests = 0, passed = 0, failed = 0, avgDuration = 0;
            if (influxData.results?.[0]?.series?.[0]?.values) {
              const rows = influxData.results[0].series[0].values;
              const cols = influxData.results[0].series[0].columns;
              totalTests = rows.length;
              rows.forEach(r => {
                if (r[cols.indexOf('status')] === 'passed') passed++; else failed++;
                avgDuration += (r[cols.indexOf('duration_ms')] || 0);
              });
              avgDuration = totalTests > 0 ? (avgDuration / totalTests / 1000).toFixed(1) : 0;
            }
            const passRate = totalTests > 0 ? ((passed / totalTests) * 100).toFixed(1) : '0.0';
            extraData = { mobileData: { totalTests, passed, failed, passRate, avgDuration } };
          } catch (e) { console.error('[INGRID] Error consultando InfluxDB mobile:', e); }
        }
        const result = await generateAndSendReport(targetEmail, reportType, extraData);
        const elapsed = Date.now() - startTime;
        const sizeKB = (result.size / 1024).toFixed(1);

        return res.json({
          response: `Listo, envie el informe ${reportTypeLabels[reportType]} a **${targetEmail}**.\n\nTamano: ${sizeKB}KB. Revisa tu bandeja de entrada.`,
          category: 'email',
          timestamp: new Date().toISOString(),
          elapsed_ms: elapsed,
        });
      } catch (error) {
        console.error('[INGRID] Error enviando email:', error);
        return res.json({
          response: `No pude enviar el email a ${targetEmail}. Error: ${error.message}\n\nVerifica que la direccion sea correcta.`,
          category: 'email_error',
          timestamp: new Date().toISOString(),
          elapsed_ms: Date.now() - startTime,
        });
      }
    } else {
      // El usuario no puso un email válido, cancelar espera
      pendingEmailState = null;
      // Continuar procesamiento normal
    }
  }

  // =========================================================================
  // PASO 2: Detectar si el usuario quiere enviar un informe por email
  // =========================================================================
  const qNorm = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const sendVerbs = ['envi', 'enviar', 'enviame', 'envie', 'envies', 'envio', 'mandar', 'mandame', 'manda', 'mande', 'mandes', 'mando', 'necesito'];
  const reportWords = ['informe', 'reporte', 'report', 'pdf', 'garak'];
  const emailWords = ['correo', 'email', 'mail'];

  const hasSendVerb = sendVerbs.some(v => qNorm.includes(v));
  const hasReportWord = reportWords.some(r => qNorm.includes(r));
  const hasEmailWord = emailWords.some(e => qNorm.includes(e));

  // Solo activar si hay verbo de envío + (reporte o email)
  // EXCLUIR pedidos de mobile - esos los maneja PASO 2.5
  const mobileInMessage = ['mobile', 'mobille', 'movil', 'movile', 'celular', 'maestro'].some(k => qNorm.includes(k));
  const wantsEmail = hasSendVerb && (hasReportWord || hasEmailWord) && !mobileInMessage;

  if (wantsEmail) {
    const reportType = detectReportType(question);

    // Si el mensaje ya incluye un email, enviar directo
    if (emailMatch) {
      const targetEmail = emailMatch[0];
      try {
        console.log(`[INGRID] Enviando informe (${reportType}) directo a ${targetEmail}...`);
        const result = await generateAndSendReport(targetEmail, reportType);
        const elapsed = Date.now() - startTime;
        const sizeKB = (result.size / 1024).toFixed(1);

        return res.json({
          response: `Listo, envie el informe ${reportTypeLabels[reportType]} a **${targetEmail}**.\n\nTamano: ${sizeKB}KB. Revisa tu bandeja de entrada.`,
          category: 'email',
          timestamp: new Date().toISOString(),
          elapsed_ms: elapsed,
        });
      } catch (error) {
        console.error('[INGRID] Error enviando email:', error);
        return res.json({
          response: `No pude enviar el email a ${targetEmail}. Error: ${error.message}`,
          category: 'email_error',
          timestamp: new Date().toISOString(),
          elapsed_ms: Date.now() - startTime,
        });
      }
    }

    // No hay email en el mensaje - preguntar (guardar reportType)
    pendingEmailState = { awaitingEmail: true, reportType, timestamp: Date.now() };
    return res.json({
      response: `Voy a preparar el informe ${reportTypeLabels[reportType]}. ¿A que direccion de correo electronico lo envio?`,
      category: 'email_prompt',
      timestamp: new Date().toISOString(),
      elapsed_ms: Date.now() - startTime,
    });
  }

  // =========================================================================
  // PASO 2.5: Detectar comandos QASL-MOBILE
  // =========================================================================

  // Helper para consultar datos de QASL-MOBILE InfluxDB
  async function queryMobileInfluxDB() {
    const { default: fetch } = await import('node-fetch');
    const query = encodeURIComponent('SELECT * FROM test_execution ORDER BY time DESC LIMIT 20');
    const influxRes = await fetch(`http://localhost:${QASL_MOBILE_PORTS.influxdb}/query?db=qasl_mobile&q=${query}`);
    const influxData = await influxRes.json();
    let totalTests = 0, passed = 0, failed = 0, avgDuration = 0;
    if (influxData.results?.[0]?.series?.[0]?.values) {
      const rows = influxData.results[0].series[0].values;
      const cols = influxData.results[0].series[0].columns;
      const statusIdx = cols.indexOf('status');
      const durationIdx = cols.indexOf('duration_ms');
      totalTests = rows.length;
      rows.forEach(r => {
        if (r[statusIdx] === 'passed') passed++;
        else failed++;
        avgDuration += (r[durationIdx] || 0);
      });
      avgDuration = totalTests > 0 ? (avgDuration / totalTests / 1000).toFixed(1) : 0;
    }
    const passRate = totalTests > 0 ? ((passed / totalTests) * 100).toFixed(1) : '0.0';
    return { totalTests, passed, failed, passRate, avgDuration };
  }

  const mobileKeywords = ['mobile', 'mobille', 'movil', 'movile', 'celular', 'maestro', 'qasl-mobile', 'qasl mobile', 'android', 'emulador'];
  const mobileActions = {
    levantar: ['levanta', 'inicia', 'arranca', 'sube', 'enciende', 'activa', 'lanza', 'abre'],
    email:    ['envi', 'enviar', 'enviame', 'mandame', 'manda', 'correo mobile', 'email mobile', 'mail mobile', 'informe mobile', 'reporte mobile', 'report mobile'],
    apagar:   ['apaga', 'detiene', 'detener', 'para mobile', 'baja mobile', 'cierra mobile', 'stop mobile'],
    estado:   ['estado mobile', 'status mobile', 'como esta mobile'],
    grafana:  ['grafana mobile', 'dashboard mobile', 'panel mobile'],
  };

  const hasMobileKeyword = mobileKeywords.some(k => qNorm.includes(k));
  const hasMobileAction = Object.values(mobileActions).flat().some(a => qNorm.includes(a));

  if (hasMobileKeyword || hasMobileAction) {
    try {
      let mobileResponse = '';
      let mobileAction = 'info';

      // Funcion para verificar si un puerto esta libre
      async function checkPort(port) {
        try {
          const { stdout } = await execAsync(`netstat -ano | findstr ":${port}"`, { timeout: 5000 });
          return stdout.trim().length > 0 ? 'occupied' : 'free';
        } catch { return 'free'; }
      }

      // Detectar accion especifica
      if (mobileActions.email.some(a => qNorm.includes(a)) && (qNorm.includes('informe') || qNorm.includes('reporte') || qNorm.includes('correo') || qNorm.includes('email')))  {
        mobileAction = 'email';
        console.log('[INGRID-MOBILE] Solicitaron enviar informe mobile por email...');
        const emailRegexMobile = /[\w.+-]+@[\w-]+\.[\w.-]+/;
        const emailMatchMobile = question.match(emailRegexMobile);

        if (emailMatchMobile) {
          const targetEmail = emailMatchMobile[0];
          try {
            const mobileData = await queryMobileInfluxDB();
            const result = await generateAndSendReport(targetEmail, 'mobile', { mobileData });
            const sizeKB = (result.size / 1024).toFixed(1);
            mobileResponse = `**Informe mobile enviado a ${targetEmail}.**\n\n` +
              `Datos: ${mobileData.totalTests} tests, Pass Rate: ${mobileData.passRate}%\n` +
              `Tamano: ${sizeKB}KB. Revisa tu bandeja de entrada.`;
          } catch (err) {
            console.error('[INGRID-MOBILE] Error enviando email mobile:', err);
            mobileResponse = `**No pude enviar el informe mobile.** Error: ${err.message}`;
          }
        } else {
          pendingEmailState = { awaitingEmail: true, reportType: 'mobile', timestamp: Date.now() };
          mobileResponse = `Voy a preparar el **informe de testing mobile**. ¿A que direccion de correo electronico lo envio?`;
          return res.json({ response: mobileResponse, category: 'mobile_email_prompt', timestamp: new Date().toISOString(), elapsed_ms: Date.now() - startTime });
        }

      } else if (mobileActions.apagar.some(a => qNorm.includes(a))) {
        mobileAction = 'apagar';
        console.log('[INGRID-MOBILE] Deteniendo QASL-MOBILE...');
        await execAsync('docker-compose down', { cwd: QASL_MOBILE_PATH, timeout: 30000 });
        mobileResponse = `**QASL-MOBILE detenido correctamente.**\n\n` +
          `Contenedores Docker apagados correctamente.\n` +
          `Para volver a iniciar: *"levanta mobile"*`;

      } else if (mobileActions.levantar.some(a => qNorm.includes(a))) {
        mobileAction = 'levantar';
        console.log('[INGRID-MOBILE] Verificando puertos...');

        // Verificar puertos antes de levantar
        const grafanaStatus = await checkPort(QASL_MOBILE_PORTS.grafana);
        const influxStatus = await checkPort(QASL_MOBILE_PORTS.influxdb);

        // Si los puertos ya estan ocupados, verificar si son los contenedores de QASL-MOBILE
        if (grafanaStatus === 'occupied' || influxStatus === 'occupied') {
          try {
            const { stdout: containers } = await execAsync('docker ps --format "{{.Names}}"', { timeout: 5000 });
            const isMobileRunning = containers.includes('qasl-mobile-grafana');
            if (isMobileRunning) {
              mobileResponse = `**QASL-MOBILE ya esta corriendo.**\n\n` +
                `- Dashboard Grafana: [localhost:${QASL_MOBILE_PORTS.grafana}](${QASL_MOBILE_GRAFANA})\n` +
                `- InfluxDB: localhost:${QASL_MOBILE_PORTS.influxdb}\n\n` +
                `Los resultados de los tests ejecutados desde QASL-MOBILE se reflejan automaticamente en el dashboard.`;
              return res.json({ response: mobileResponse, category: 'mobile_levantar', timestamp: new Date().toISOString(), elapsed_ms: Date.now() - startTime });
            }
          } catch { /* ignore */ }

          // Puerto ocupado por otro servicio
          const portIssues = [];
          if (grafanaStatus === 'occupied') portIssues.push(`**:${QASL_MOBILE_PORTS.grafana}** (Grafana)`);
          if (influxStatus === 'occupied') portIssues.push(`**:${QASL_MOBILE_PORTS.influxdb}** (InfluxDB)`);
          mobileResponse = `**No puedo levantar QASL-MOBILE.**\n\n` +
            `Los siguientes puertos estan ocupados por otro servicio:\n${portIssues.join('\n')}\n\n` +
            `Libera esos puertos primero o detiene los contenedores que los usan.`;
          return res.json({ response: mobileResponse, category: 'mobile_error', timestamp: new Date().toISOString(), elapsed_ms: Date.now() - startTime });
        }

        console.log('[INGRID-MOBILE] Puertos libres. Levantando...');
        await execAsync('docker-compose up -d', { cwd: QASL_MOBILE_PATH, timeout: 60000 });
        mobileResponse = `**QASL-MOBILE iniciado correctamente.**\n\n` +
          `Puertos verificados y libres. Infraestructura Docker levantada.\n\n` +
          `- Dashboard Grafana: [localhost:${QASL_MOBILE_PORTS.grafana}](${QASL_MOBILE_GRAFANA})\n` +
          `- InfluxDB: localhost:${QASL_MOBILE_PORTS.influxdb}\n\n` +
          `Los tests se ejecutan desde QASL-MOBILE y los resultados se reflejan automaticamente en el dashboard.\n` +
          `Para solicitar un informe: *"enviame el reporte mobile"*`;

      } else if (mobileActions.grafana.some(a => qNorm.includes(a))) {
        mobileAction = 'grafana';
        mobileResponse = `**QASL-MOBILE Dashboard**\n\n` +
          `Accede al dashboard completo de testing mobile:\n\n` +
          `- Grafana: [localhost:3004](${QASL_MOBILE_GRAFANA})\n` +
          `- Usuario: admin / Password: admin\n\n` +
          `El dashboard incluye: Pass Rate, Test Duration, Screenshots, Device Stream, Recent Executions.`;

      } else {
        // Info general sobre QASL-MOBILE
        mobileAction = 'info';
        mobileResponse = `**QASL-MOBILE - Testing Mobile con IA**\n\n` +
          `Modulo satelite de testing mobile Android integrado en QASL-SENTINEL.\n` +
          `Los tests se ejecutan directamente desde QASL-MOBILE y los resultados se reflejan en el dashboard.\n\n` +
          `**Comandos disponibles:**\n` +
          `- *"levanta mobile"* - Inicia Docker (InfluxDB + Grafana)\n` +
          `- *"enviame el reporte mobile"* - Genera y envia informe PDF por email\n` +
          `- *"grafana mobile"* - Accede al dashboard mobile\n` +
          `- *"estado mobile"* - Verifica el estado de los contenedores\n` +
          `- *"apaga mobile"* - Detiene contenedores\n\n` +
          `Dashboard: [localhost:3004](${QASL_MOBILE_GRAFANA})`;
      }

      return res.json({
        response: mobileResponse,
        category: `mobile_${mobileAction}`,
        timestamp: new Date().toISOString(),
        elapsed_ms: Date.now() - startTime,
      });
    } catch (error) {
      console.error('[INGRID-MOBILE] Error:', error.message);
      return res.json({
        response: `**Error ejecutando comando mobile:**\n\n${error.message}\n\nVerifica que QASL-MOBILE este en la ruta correcta y que Docker este disponible.`,
        category: 'mobile_error',
        timestamp: new Date().toISOString(),
        elapsed_ms: Date.now() - startTime,
      });
    }
  }

  // =========================================================================
  // PASO 3: Procesamiento normal con Claude AI
  // =========================================================================
  try {
    // 1. Obtener contexto de métricas relevantes
    const metricsContext = await getMetricsContext(question);
    console.log(`[INGRID] Categoría detectada: ${metricsContext.category}`);

    // 2. Generar respuesta con Claude
    const response = await generateResponse(question, metricsContext);

    const elapsed = Date.now() - startTime;
    console.log(`[INGRID] Respuesta generada en ${elapsed}ms`);

    res.json({
      response,
      category: metricsContext.category,
      timestamp: new Date().toISOString(),
      elapsed_ms: elapsed,
    });
  } catch (error) {
    console.error('[INGRID] Error procesando pregunta:', error);
    res.status(500).json({
      error: 'Error interno procesando la pregunta.',
      detail: error.message,
    });
  }
});

/**
 * GET /api/health - Health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'QASL-INGRID',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    config: {
      claude_model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
      prometheus: process.env.PROMETHEUS_URL || 'http://localhost:9095',
      influxdb: process.env.INFLUXDB_URL || 'http://localhost:8088',
    },
  });
});

/**
 * GET /api/suggestions - Preguntas sugeridas
 */
app.get('/api/suggestions', (req, res) => {
  res.json({
    suggestions: [
      '¿Cómo está el sistema ahora?',
      '¿Cuál es la disponibilidad de las APIs?',
      '¿Hay alguna API con latencia alta?',
      '¿Cuál es el nivel DEFCON actual?',
      '¿Cómo está el compliance?',
      '¿Hay errores en alguna API?',
      '¿Cuál es el score de seguridad?',
      '¿Qué APIs están caídas?',
      '¿Cómo están los certificados SSL?',
      '¿Hay alertas activas?',
      'Enviame un informe por email',
      'Levanta mobile',
      'Ejecuta tests mobile',
      'Grafana mobile',
    ],
  });
});

// =============================================================================
// INICIO DEL SERVIDOR
// =============================================================================

app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('  QASL-INGRID - Chatbot Inteligente');
  console.log('='.repeat(60));
  console.log(`  Servidor:    http://localhost:${PORT}`);
  console.log(`  Chat API:    POST http://localhost:${PORT}/api/chat`);
  console.log(`  Health:      GET  http://localhost:${PORT}/api/health`);
  console.log(`  Widget JS:   http://localhost:${PORT}/widget/ingrid-widget.js`);
  console.log(`  Widget CSS:  http://localhost:${PORT}/widget/ingrid-widget.css`);
  console.log(`  Modelo:      ${process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929'}`);
  console.log('='.repeat(60));
  console.log('  Esperando preguntas...');
  console.log('');
});
