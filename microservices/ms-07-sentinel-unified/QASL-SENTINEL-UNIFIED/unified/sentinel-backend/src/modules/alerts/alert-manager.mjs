// ═══════════════════════════════════════════════════════════════════════════════
// ║                    QASL-API-SENTINEL - Alert Manager                        ║
// ║                    Alertas Automáticas por Email                            ║
// ╠═══════════════════════════════════════════════════════════════════════════════╣
// ║  QASL NEXUS LLM - Elyer Gregorio Maldonado                                   ║
// ║  Líder Técnico QA: Elyer Gregorio Maldonado                                  ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

import { EventEmitter } from 'events';
import { EmailNotifier } from '../notifications/email-notifier.mjs';
import chalk from 'chalk';

/**
 * AlertManager - Gestiona alertas automáticas por email
 *
 * Escucha eventos del Watcher y envía emails automáticos cuando:
 * - Una API pasa de UP a DOWN (api:down)
 * - Una API se recupera de DOWN a UP (api:recovered)
 * - Una API tiene errores críticos consecutivos (api:critical)
 * - Se detectan anomalías de latencia (anomaly)
 */
export class AlertManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.emailNotifier = new EmailNotifier(false); // Sin verbose para evitar spam

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURACIÓN: ALERT_EMAILS_ENABLED=false deshabilita alertas individuales
    // Solo se enviará el reporte diario a las 08:00 AM
    // ═══════════════════════════════════════════════════════════════════════════
    const envEnabled = process.env.ALERT_EMAILS_ENABLED;
    const isEnvDisabled = envEnabled === 'false' || envEnabled === '0';

    // Si .env dice false, deshabilitar alertas individuales (solo reporte diario)
    this.enabled = isEnvDisabled ? false : (options.enabled !== false);
    this.verbose = options.verbose || false;

    if (isEnvDisabled) {
      console.log(chalk.cyan('[AlertManager] ℹ️  Alertas individuales DESHABILITADAS'));
      console.log(chalk.cyan('[AlertManager] 📧 Solo se enviará el reporte diario a las 08:00 AM'));
    }

    // Configuración de alertas
    this.config = {
      // Tipos de alertas habilitados
      alertTypes: {
        apiDown: true,           // API cayó
        apiRecovered: true,      // API recuperada
        apiCritical: true,       // 3+ fallas consecutivas
        latencyAnomaly: true,    // Latencia anormal
        authError: true,         // Errores de autenticación
      },

      // Cooldown entre alertas del mismo tipo para la misma API (ms)
      cooldownMs: options.cooldownMs || 15 * 60 * 1000, // 15 minutos por defecto

      // Máximo de alertas por hora
      maxAlertsPerHour: options.maxAlertsPerHour || 6,

      // Cooldown global entre cualquier alerta (ms)
      globalCooldownMs: options.globalCooldownMs || 2 * 60 * 1000, // 2 minutos mínimo entre emails
    };

    // Estado interno
    this.lastAlerts = new Map(); // apiId -> { type, timestamp }
    this.alertCount = { hour: 0, lastReset: Date.now() };
    this.lastGlobalAlert = 0; // Timestamp del último email enviado

    this.log('AlertManager inicializado', 'info');
  }

  /**
   * Conecta el AlertManager al Watcher
   */
  connectToWatcher(watcher) {
    if (!watcher) {
      this.log('No se proporcionó Watcher', 'error');
      return;
    }

    this.log('Conectando AlertManager al Watcher...', 'info');

    // === ALERTA: API CAÍDA ===
    watcher.on('api:down', async ({ api, result, previous }) => {
      if (!this.config.alertTypes.apiDown) return;
      if (!this.canSendAlert(api.id, 'api:down')) return;

      this.log(`🔴 API CAÍDA DETECTADA: ${api.name}`, 'alert');

      await this.sendAlertEmail({
        type: 'API_DOWN',
        severity: 'critical',
        apiName: api.name,
        apiUrl: api.url,
        message: `La API "${api.name}" ha dejado de responder`,
        details: result.error || `Status HTTP: ${result.status}`,
        previousStatus: 'UP',
        currentStatus: 'DOWN',
        timestamp: new Date().toISOString(),
        latency: result.latency,
        alerts: result.alerts,
      });

      this.recordAlert(api.id, 'api:down');
    });

    // === ALERTA: API RECUPERADA ===
    watcher.on('api:recovered', async ({ api, result, previous }) => {
      if (!this.config.alertTypes.apiRecovered) return;
      if (!this.canSendAlert(api.id, 'api:recovered')) return;

      this.log(`🟢 API RECUPERADA: ${api.name}`, 'success');

      await this.sendAlertEmail({
        type: 'API_RECOVERED',
        severity: 'info',
        apiName: api.name,
        apiUrl: api.url,
        message: `La API "${api.name}" se ha recuperado`,
        details: `Responde correctamente con status ${result.status}`,
        previousStatus: 'DOWN',
        currentStatus: 'UP',
        timestamp: new Date().toISOString(),
        latency: result.latency,
        downtime: this.calculateDowntime(api.id),
      });

      this.recordAlert(api.id, 'api:recovered');
    });

    // === ALERTA: API CRÍTICA (3+ fallas) ===
    watcher.on('api:critical', async ({ api, result, consecutiveFailures }) => {
      if (!this.config.alertTypes.apiCritical) return;
      if (!this.canSendAlert(api.id, 'api:critical')) return;

      this.log(`🚨 API CRÍTICA: ${api.name} (${consecutiveFailures} fallas)`, 'alert');

      await this.sendAlertEmail({
        type: 'API_CRITICAL',
        severity: 'critical',
        apiName: api.name,
        apiUrl: api.url,
        message: `CRÍTICO: "${api.name}" lleva ${consecutiveFailures} fallas consecutivas`,
        details: `Última error: ${result.error || 'Status ' + result.status}`,
        consecutiveFailures,
        timestamp: new Date().toISOString(),
      });

      this.recordAlert(api.id, 'api:critical');
    });

    // === ALERTA: ANOMALÍA DE LATENCIA ===
    watcher.on('anomaly', async ({ type, api, current, baseline, deviation }) => {
      if (!this.config.alertTypes.latencyAnomaly) return;
      if (type !== 'latency_spike') return;
      if (!this.canSendAlert(api.id, 'anomaly')) return;

      this.log(`⚠️ ANOMALÍA LATENCIA: ${api.name} (${deviation.toFixed(0)}% sobre normal)`, 'warn');

      await this.sendAlertEmail({
        type: 'LATENCY_ANOMALY',
        severity: 'warning',
        apiName: api.name,
        apiUrl: api.url,
        message: `Latencia anormal detectada en "${api.name}"`,
        details: `Latencia actual: ${current}ms (normal: ${Math.round(baseline)}ms) - ${deviation.toFixed(0)}% sobre el promedio`,
        currentLatency: current,
        baselineLatency: Math.round(baseline),
        deviation: deviation.toFixed(1),
        timestamp: new Date().toISOString(),
      });

      this.recordAlert(api.id, 'anomaly');
    });

    // === ALERTA: ERROR DE AUTENTICACIÓN ===
    watcher.on('auth:error', async ({ api, alert, status }) => {
      if (!this.config.alertTypes.authError) return;
      if (!this.canSendAlert(api.id, 'auth:error')) return;

      this.log(`🔐 ERROR AUTH: ${api.name} (${status})`, 'alert');

      await this.sendAlertEmail({
        type: 'AUTH_ERROR',
        severity: 'high',
        apiName: api.name,
        apiUrl: api.url,
        message: `Error de autenticación en "${api.name}"`,
        details: `HTTP ${status} - Verificar credenciales o tokens`,
        httpStatus: status,
        timestamp: new Date().toISOString(),
      });

      this.recordAlert(api.id, 'auth:error');
    });

    this.log('AlertManager conectado al Watcher - Alertas automáticas activas', 'success');
    this.emit('connected', { watcher });
  }

  /**
   * Envía email de alerta
   */
  async sendAlertEmail(alertData) {
    if (!this.enabled) {
      this.log('Alertas deshabilitadas, no se envía email', 'warn');
      return false;
    }

    // Verificar límite de alertas por hora
    this.checkAlertLimit();
    if (this.alertCount.hour >= this.config.maxAlertsPerHour) {
      this.log(`Límite de alertas/hora alcanzado (${this.config.maxAlertsPerHour})`, 'warn');
      return false;
    }

    try {
      const result = await this.emailNotifier.sendAlert(alertData);

      if (result) {
        this.alertCount.hour++;
        this.lastGlobalAlert = Date.now(); // Registrar timestamp global
        this.log(`Email de alerta enviado: ${alertData.type} - ${alertData.apiName}`, 'success');
        this.emit('alert:sent', alertData);
      }

      return result;
    } catch (error) {
      this.log(`Error enviando alerta: ${error.message}`, 'error');
      this.emit('alert:error', { error, alertData });
      return false;
    }
  }

  /**
   * Verifica si se puede enviar una alerta (cooldown)
   */
  canSendAlert(apiId, alertType) {
    const now = Date.now();

    // 1. Verificar cooldown global (mínimo entre cualquier email)
    const globalElapsed = now - this.lastGlobalAlert;
    if (globalElapsed < this.config.globalCooldownMs) {
      this.log(`Cooldown global activo (esperar ${Math.ceil((this.config.globalCooldownMs - globalElapsed) / 1000)}s)`, 'warn');
      return false;
    }

    // 2. Verificar cooldown específico por API+tipo
    const key = `${apiId}:${alertType}`;
    const lastAlert = this.lastAlerts.get(key);

    if (!lastAlert) return true;

    const elapsed = now - lastAlert.timestamp;
    if (elapsed < this.config.cooldownMs) {
      this.log(`Cooldown específico activo para ${apiId}:${alertType}`, 'warn');
      return false;
    }

    return true;
  }

  /**
   * Registra una alerta enviada
   */
  recordAlert(apiId, alertType) {
    const key = `${apiId}:${alertType}`;
    this.lastAlerts.set(key, {
      type: alertType,
      timestamp: Date.now(),
    });
  }

  /**
   * Calcula el tiempo de caída de una API
   */
  calculateDowntime(apiId) {
    const downAlert = this.lastAlerts.get(`${apiId}:api:down`);
    if (!downAlert) return 'N/A';

    const downtime = Date.now() - downAlert.timestamp;
    const minutes = Math.floor(downtime / 60000);
    const seconds = Math.floor((downtime % 60000) / 1000);

    if (minutes > 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours}h ${minutes % 60}m`;
    }

    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  }

  /**
   * Verifica y resetea el contador de alertas por hora
   */
  checkAlertLimit() {
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;

    if (now - this.alertCount.lastReset >= hourMs) {
      this.alertCount.hour = 0;
      this.alertCount.lastReset = now;
    }
  }

  /**
   * Obtiene estadísticas del AlertManager
   */
  getStats() {
    return {
      enabled: this.enabled,
      alertsThisHour: this.alertCount.hour,
      maxAlertsPerHour: this.config.maxAlertsPerHour,
      cooldownMinutes: this.config.cooldownMs / 60000,
      globalCooldownMinutes: this.config.globalCooldownMs / 60000,
      lastAlerts: Object.fromEntries(this.lastAlerts),
      alertTypesEnabled: this.config.alertTypes,
    };
  }

  /**
   * Habilita/deshabilita alertas
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.log(`Alertas ${enabled ? 'habilitadas' : 'deshabilitadas'}`, 'info');
  }

  /**
   * Configura tipos de alertas
   */
  setAlertTypes(types) {
    this.config.alertTypes = { ...this.config.alertTypes, ...types };
  }

  /**
   * Log interno
   */
  log(message, type = 'info') {
    if (!this.verbose && type === 'info') return;

    const colors = {
      info: chalk.cyan,
      success: chalk.green,
      warn: chalk.yellow,
      error: chalk.red,
      alert: chalk.red.bold,
    };

    const color = colors[type] || chalk.white;
    console.log(color(`[AlertManager] ${message}`));
  }
}

export default AlertManager;
