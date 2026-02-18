// ═══════════════════════════════════════════════════════════════
// INGRID - AI TESTING FRAMEWORK
// Configuration - Personalizar para cada proyecto
// ═══════════════════════════════════════════════════════════════

import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  // ═══════════════════════════════════════════════════════════════
  // CHATBOT TARGET - Configurar según el proyecto
  // ═══════════════════════════════════════════════════════════════
  chatbot: {
    // URL del chatbot a testear
    url: process.env.CHATBOT_URL || 'http://localhost:3000',

    // Selectores CSS del chatbot (inspeccionar en DevTools)
    inputSelector: process.env.CHATBOT_INPUT || 'input[type="text"], textarea',
    sendSelector: process.env.CHATBOT_SEND || 'button[type="submit"]',
    responseSelector: process.env.CHATBOT_RESPONSE || '.message.bot, .response',

    // Timeout para esperar respuesta del bot (ms)
    waitForResponse: Number(process.env.CHATBOT_WAIT) || 10000,
  },

  // ═══════════════════════════════════════════════════════════════
  // CLAUDE API - Para evaluación LLM-as-Judge
  // ═══════════════════════════════════════════════════════════════
  claude: {
    apiKey: process.env.CLAUDE_API_KEY || '',
    // Modelo recomendado para evaluación
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
    maxTokens: Number(process.env.CLAUDE_MAX_TOKENS) || 1024,
  },

  // ═══════════════════════════════════════════════════════════════
  // UMBRALES DE MÉTRICAS - Scores mínimos para PASS
  // Ajustar según estándares del proyecto
  // ═══════════════════════════════════════════════════════════════
  thresholds: {
    // Métricas de calidad (0-10, mayor es mejor)
    relevance: Number(process.env.THRESHOLD_RELEVANCE) || 7,
    accuracy: Number(process.env.THRESHOLD_ACCURACY) || 8,
    coherence: Number(process.env.THRESHOLD_COHERENCE) || 7,
    completeness: Number(process.env.THRESHOLD_COMPLETENESS) || 6,
    consistency: Number(process.env.THRESHOLD_CONSISTENCY) || 7,

    // Métricas inversas (0-10, menor es mejor)
    hallucination: Number(process.env.THRESHOLD_HALLUCINATION) || 2,
    toxicity: Number(process.env.THRESHOLD_TOXICITY) || 1,
  },

  // ═══════════════════════════════════════════════════════════════
  // PERFORMANCE - Tiempos máximos aceptables (ms)
  // ═══════════════════════════════════════════════════════════════
  performance: {
    maxResponseTime: Number(process.env.PERF_MAX_RESPONSE) || 3000,
    maxLatency: Number(process.env.PERF_MAX_LATENCY) || 5000,
    maxColdStart: Number(process.env.PERF_MAX_COLDSTART) || 4500,
    maxDegradation: Number(process.env.PERF_MAX_DEGRADATION) || 50, // porcentaje
  },

  // ═══════════════════════════════════════════════════════════════
  // SECURITY - Configuración de tests de seguridad
  // ═══════════════════════════════════════════════════════════════
  security: {
    // Modos: 'quick' (5 random), 'critical' (solo críticos), 'full' (todos)
    defaultMode: (process.env.SECURITY_MODE as 'quick' | 'critical' | 'full') || 'critical',
    // Incluir ataques personalizados de data/attacks.json
    includeCustomAttacks: process.env.SECURITY_INCLUDE_CUSTOM === 'true',
    // Dominio específico: 'government', 'banking', 'healthcare'
    domain: process.env.SECURITY_DOMAIN as 'government' | 'banking' | 'healthcare' | undefined,
  },

  // ═══════════════════════════════════════════════════════════════
  // GRAFANA - Métricas y dashboards
  // ═══════════════════════════════════════════════════════════════
  grafana: {
    url: process.env.GRAFANA_URL || 'http://localhost:3001',
    pushgateway: process.env.PUSHGATEWAY_URL || 'http://localhost:9091',
    enabled: process.env.GRAFANA_ENABLED !== 'false',
  },

  // ═══════════════════════════════════════════════════════════════
  // REPORTES
  // ═══════════════════════════════════════════════════════════════
  reports: {
    outputDir: process.env.REPORTS_DIR || './reports',
    allureResults: process.env.ALLURE_RESULTS || './allure-results',
    metricsFile: process.env.METRICS_FILE || './reports/metrics.json',
    screenshotsDir: process.env.SCREENSHOTS_DIR || './reports/screenshots',
  },

  // ═══════════════════════════════════════════════════════════════
  // PROJECT INFO
  // ═══════════════════════════════════════════════════════════════
  project: {
    name: process.env.PROJECT_NAME || 'AI Testing',
    version: process.env.PROJECT_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
};

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Valida que la configuración mínima esté presente
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!CONFIG.chatbot.url) {
    errors.push('CHATBOT_URL is required');
  }

  if (!CONFIG.claude.apiKey) {
    errors.push('CLAUDE_API_KEY is required for LLM-as-Judge evaluation');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Imprime la configuración actual (sin secrets)
 */
export function printConfig(): void {
  console.log('\n=== INGRID Configuration ===');
  console.log(`Project: ${CONFIG.project.name} v${CONFIG.project.version}`);
  console.log(`Environment: ${CONFIG.project.environment}`);
  console.log(`Chatbot URL: ${CONFIG.chatbot.url}`);
  console.log(`Claude Model: ${CONFIG.claude.model}`);
  console.log(`Claude API Key: ${CONFIG.claude.apiKey ? '***configured***' : 'NOT SET'}`);
  console.log(`Performance Threshold: ${CONFIG.performance.maxResponseTime}ms`);
  console.log(`Security Mode: ${CONFIG.security.defaultMode}`);
  console.log('=============================\n');
}

export type Config = typeof CONFIG;
