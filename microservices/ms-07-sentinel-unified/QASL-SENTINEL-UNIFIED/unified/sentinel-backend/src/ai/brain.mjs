/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                              AI BRAIN                                        ║
 * ║              El Cerebro del Sistema - Powered by Claude                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * Funciones del cerebro:
 * - ANALYZER: ¿Qué está pasando?
 * - PREDICTOR: ¿Qué va a pasar?
 * - ADVISOR: ¿Qué debemos hacer?
 * - REPORTER: Comunica en español claro
 * - CHAT: Responde preguntas del equipo
 */

import Anthropic from '@anthropic-ai/sdk';
import { log } from '../core/banner.mjs';
import { PROMPTS } from './prompts/index.mjs';

export class AIBrain {
  constructor(options = {}) {
    this.data = options.data;
    this.config = options.config;

    // Inicializar cliente de Claude
    this.client = null;
    this.model = options.model || process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
    this.language = options.language || 'es';

    this.initClient();
  }

  /**
   * Inicializa el cliente de Anthropic
   */
  initClient() {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      log('⚠️ ANTHROPIC_API_KEY no configurada - AI deshabilitado', 'warning');
      return;
    }

    this.client = new Anthropic({ apiKey });
    log('🧠 AI Brain inicializado con Claude', 'ai');
  }

  /**
   * Verifica si el AI está disponible
   */
  isAvailable() {
    return !!this.client;
  }

  /**
   * Envía un mensaje a Claude
   */
  async sendMessage(systemPrompt, userMessage, options = {}) {
    if (!this.client) {
      throw new Error('AI no disponible - configura ANTHROPIC_API_KEY');
    }

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options.maxTokens || 4096,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ]
      });

      return response.content[0].text;
    } catch (error) {
      log(`Error en AI: ${error.message}`, 'error');
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYZER - ¿Qué está pasando?
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Analiza el estado actual del sistema
   */
  async analyzeStatus(data) {
    const systemPrompt = PROMPTS.analyzer.system(this.language);
    const userMessage = PROMPTS.analyzer.status(data);

    return await this.sendMessage(systemPrompt, userMessage);
  }

  /**
   * Diagnostica un problema específico
   */
  async diagnose(incident) {
    if (!this.isAvailable()) {
      return {
        diagnosis: 'AI no disponible',
        recommendations: ['Verificar configuración de ANTHROPIC_API_KEY']
      };
    }

    const systemPrompt = PROMPTS.analyzer.system(this.language);
    const userMessage = PROMPTS.analyzer.diagnose(incident);

    try {
      const response = await this.sendMessage(systemPrompt, userMessage);

      // Intentar parsear como JSON
      try {
        return JSON.parse(response);
      } catch {
        return {
          diagnosis: response,
          recommendations: []
        };
      }
    } catch (error) {
      return {
        diagnosis: `Error analizando: ${error.message}`,
        recommendations: ['Reintentar análisis']
      };
    }
  }

  /**
   * Analiza cambios detectados en APIs
   */
  async analyzeChanges(changes, context = {}) {
    const systemPrompt = PROMPTS.analyzer.system(this.language);
    const userMessage = PROMPTS.analyzer.changes(changes, context);

    return await this.sendMessage(systemPrompt, userMessage);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PREDICTOR - ¿Qué va a pasar?
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Predice problemas basado en tendencias
   */
  async predict(metrics, history) {
    if (!this.isAvailable()) {
      return { predictions: [], risk: 'unknown' };
    }

    const systemPrompt = PROMPTS.predictor.system(this.language);
    const userMessage = PROMPTS.predictor.trends(metrics, history);

    try {
      const response = await this.sendMessage(systemPrompt, userMessage);

      try {
        return JSON.parse(response);
      } catch {
        return {
          predictions: [response],
          risk: 'medium'
        };
      }
    } catch (error) {
      return {
        predictions: [`Error en predicción: ${error.message}`],
        risk: 'unknown'
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADVISOR - ¿Qué debemos hacer?
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Genera recomendaciones
   */
  async recommend(situation) {
    const systemPrompt = PROMPTS.advisor.system(this.language);
    const userMessage = PROMPTS.advisor.recommend(situation);

    return await this.sendMessage(systemPrompt, userMessage);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTER - Genera reportes inteligentes
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Genera un reporte de estado
   */
  async generateReport(type, data) {
    if (!this.isAvailable()) {
      return this.generateFallbackReport(type, data);
    }

    const systemPrompt = PROMPTS.reporter.system(this.language);
    const userMessage = PROMPTS.reporter[type]?.(data) || PROMPTS.reporter.general(data);

    return await this.sendMessage(systemPrompt, userMessage);
  }

  /**
   * Genera un reporte sin AI (fallback)
   */
  generateFallbackReport(type, data) {
    const timestamp = new Date().toLocaleString('es-AR');

    let report = `📊 REPORTE QASL-API-SENTINEL\n`;
    report += `📅 ${timestamp}\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (data.summary) {
      report += `RESUMEN:\n`;
      report += `• APIs monitoreadas: ${data.summary.total || 0}\n`;
      report += `• Saludables: ${data.summary.healthy || 0}\n`;
      report += `• Con problemas: ${data.summary.warning || 0}\n`;
      report += `• Críticas: ${data.summary.critical || 0}\n`;
      report += `• Uptime: ${data.summary.uptime || 100}%\n`;
      report += `• Latencia promedio: ${data.summary.avgLatency || 0}ms\n\n`;
    }

    if (data.alerts?.length > 0) {
      report += `⚠️ ALERTAS:\n`;
      for (const alert of data.alerts.slice(0, 5)) {
        report += `• ${alert.message || alert}\n`;
      }
      report += `\n`;
    }

    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `🐝 QASL-API-SENTINEL v1.0\n`;

    return report;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAT - Interfaz conversacional
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Chat con el sistema
   */
  async chat(message, context = {}) {
    if (!this.isAvailable()) {
      return 'Lo siento, el AI no está disponible. Verifica que ANTHROPIC_API_KEY esté configurada.';
    }

    const systemPrompt = PROMPTS.chat.system(this.language, context);

    try {
      return await this.sendMessage(systemPrompt, message);
    } catch (error) {
      return `Error procesando tu pregunta: ${error.message}`;
    }
  }

  /**
   * Responde una pregunta específica sobre el sistema
   */
  async askAbout(topic, data) {
    const questions = {
      status: '¿Cuál es el estado actual del sistema?',
      errors: '¿Qué errores hay y por qué ocurrieron?',
      performance: '¿Cómo está el rendimiento de las APIs?',
      auth: '¿Hay problemas de autenticación?',
      trends: '¿Qué tendencias ves en los datos?'
    };

    const question = questions[topic] || topic;

    return await this.chat(question, data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GRAFANA/PROMETHEUS METRICS ANALYZER
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Analiza métricas de Prometheus/Grafana y genera un informe inteligente
   */
  async analyzeGrafanaMetrics(metrics) {
    if (!this.isAvailable()) {
      return this.generateFallbackGrafanaReport(metrics);
    }

    const systemPrompt = PROMPTS.grafana.system(this.language);
    const userMessage = PROMPTS.grafana.analyze(metrics);

    try {
      return await this.sendMessage(systemPrompt, userMessage, { maxTokens: 4096 });
    } catch (error) {
      log(`Error analizando métricas: ${error.message}`, 'error');
      return this.generateFallbackGrafanaReport(metrics);
    }
  }

  /**
   * Responde preguntas sobre las métricas actuales
   */
  async askAboutMetrics(question, metrics) {
    if (!this.isAvailable()) {
      return 'AI no disponible. Configura ANTHROPIC_API_KEY para habilitar análisis inteligente.';
    }

    const systemPrompt = PROMPTS.grafana.system(this.language);
    const userMessage = PROMPTS.grafana.question(question, metrics);

    return await this.sendMessage(systemPrompt, userMessage);
  }

  /**
   * Genera un informe básico sin AI (fallback)
   */
  generateFallbackGrafanaReport(metrics) {
    const timestamp = new Date().toLocaleString('es-AR');
    const healthyApis = metrics.apis.filter(a => a.healthy);
    const unhealthyApis = metrics.apis.filter(a => !a.healthy);

    let report = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    INFORME DE MÉTRICAS QASL-API-SENTINEL                     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Proyecto: SIGMA | Cliente: AGIP | Empresa: Epidata                          ║
║  Generado: ${timestamp.padEnd(55)}║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 RESUMEN EJECUTIVO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sistema: ${unhealthyApis.length === 0 ? '🟢 OPERATIVO' : '🔴 CON FALLAS'}
APIs monitoreadas: ${metrics.global.totalApis}
Disponibilidad: ${metrics.global.uptimePercentage}%
Latencia promedio: ${metrics.global.avgLatency}ms

🚦 ESTADO DE SERVICIOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    if (healthyApis.length > 0) {
      report += `\n🟢 OPERATIVAS (${healthyApis.length}):\n`;
      for (const api of healthyApis) {
        report += `   • ${api.name} - ${api.status} (${api.latency}ms)\n`;
      }
    }

    if (unhealthyApis.length > 0) {
      report += `\n🔴 CON FALLAS (${unhealthyApis.length}):\n`;
      for (const api of unhealthyApis) {
        report += `   • ${api.name} - HTTP ${api.status} (${api.latency}ms)\n`;
      }
    }

    report += `
📈 MÉTRICAS CLAVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Verificaciones totales: ${metrics.global.totalChecks}
• Exitosas: ${metrics.global.successChecks}
• Fallidas: ${metrics.global.failedChecks}
• Tiempo activo: ${Math.floor(metrics.global.uptime / 60)} minutos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🐝 QASL-API-SENTINEL v1.0 | Líder Técnico QA: Elyer Gregorio Maldonado
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    return report;
  }
}
