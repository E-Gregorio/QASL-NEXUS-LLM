/**
 * ============================================================================
 *                         THRESHOLD MANAGER
 *                   Gestion de Umbrales de Alerta
 * ============================================================================
 * QASL NEXUS LLM - Elyer Gregorio Maldonado
 * Lider Tecnico QA: Elyer Gregorio Maldonado
 * ============================================================================
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { log } from '../../core/banner.mjs';

export class ThresholdManager {
  constructor(options = {}) {
    this.configPath = options.configPath || join(process.cwd(), 'config', 'thresholds.json');
    this.thresholds = {};

    // Cargar configuracion
    this.load();
  }

  /**
   * Carga configuracion de umbrales
   */
  load() {
    if (existsSync(this.configPath)) {
      try {
        this.thresholds = JSON.parse(readFileSync(this.configPath, 'utf-8'));
        log('Umbrales cargados correctamente', 'info');
      } catch (error) {
        log(`Error cargando umbrales: ${error.message}`, 'warning');
        this.setDefaults();
      }
    } else {
      this.setDefaults();
    }
  }

  /**
   * Establece valores por defecto
   */
  setDefaults() {
    this.thresholds = {
      latency: { warning: 500, critical: 1000, timeout: 30000 },
      availability: { warning: 99, critical: 95 },
      consecutiveFailures: { warning: 2, critical: 5 },
      errorRate: { window: 300000, warning: 5, critical: 20 },
      healthCheck: { interval: 30000, timeout: 10000, retries: 2 },
      notifications: { cooldown: 300000, grouping: true, groupWindow: 60000 }
    };
  }

  /**
   * Obtiene umbral para una metrica
   */
  get(path, apiId = null) {
    // Primero buscar umbral personalizado para la API
    if (apiId && this.thresholds.customThresholds?.[apiId]) {
      const custom = this.getNestedValue(this.thresholds.customThresholds[apiId], path);
      if (custom !== undefined) {
        return custom;
      }
    }

    // Umbral global
    return this.getNestedValue(this.thresholds, path);
  }

  /**
   * Obtiene valor anidado de un objeto
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((curr, key) => curr?.[key], obj);
  }

  /**
   * Evalua si un valor supera el umbral
   */
  evaluate(metric, value, apiId = null) {
    const warning = this.get(`${metric}.warning`, apiId);
    const critical = this.get(`${metric}.critical`, apiId);

    // Para latencia: mayor es peor
    if (metric === 'latency') {
      if (value >= critical) return { level: 'critical', threshold: critical };
      if (value >= warning) return { level: 'warning', threshold: warning };
      return { level: 'ok', threshold: null };
    }

    // Para disponibilidad: menor es peor
    if (metric === 'availability') {
      if (value <= critical) return { level: 'critical', threshold: critical };
      if (value <= warning) return { level: 'warning', threshold: warning };
      return { level: 'ok', threshold: null };
    }

    // Para fallos consecutivos: mayor es peor
    if (metric === 'consecutiveFailures') {
      if (value >= critical) return { level: 'critical', threshold: critical };
      if (value >= warning) return { level: 'warning', threshold: warning };
      return { level: 'ok', threshold: null };
    }

    // Para tasa de error: mayor es peor
    if (metric === 'errorRate') {
      if (value >= critical) return { level: 'critical', threshold: critical };
      if (value >= warning) return { level: 'warning', threshold: warning };
      return { level: 'ok', threshold: null };
    }

    return { level: 'unknown', threshold: null };
  }

  /**
   * Evalua resultado de health check
   */
  evaluateHealthCheck(result, apiId = null) {
    const evaluations = [];

    // Evaluar latencia
    if (result.latency !== undefined) {
      const latencyEval = this.evaluate('latency', result.latency, apiId);
      if (latencyEval.level !== 'ok') {
        evaluations.push({
          metric: 'latency',
          value: result.latency,
          ...latencyEval,
          message: `Latencia ${latencyEval.level}: ${result.latency}ms (umbral: ${latencyEval.threshold}ms)`
        });
      }
    }

    // Evaluar estado HTTP
    if (!result.healthy) {
      evaluations.push({
        metric: 'status',
        value: result.status,
        level: result.status >= 500 ? 'critical' : 'warning',
        message: `Estado HTTP: ${result.status}`
      });
    }

    return evaluations;
  }

  /**
   * Obtiene color segun nivel de severidad
   */
  getColor(level) {
    const colors = this.thresholds.severityColors || {
      ok: '#6bcb77',
      warning: '#ffd93d',
      critical: '#ff6b6b'
    };
    return colors[level] || '#888888';
  }

  /**
   * Verifica si debe enviar notificacion (cooldown)
   */
  shouldNotify(apiId, lastNotification) {
    const cooldown = this.get('notifications.cooldown');
    if (!lastNotification) return true;

    const elapsed = Date.now() - new Date(lastNotification).getTime();
    return elapsed >= cooldown;
  }

  /**
   * Obtiene intervalo de health check
   */
  getCheckInterval(apiId = null) {
    return this.get('healthCheck.interval', apiId);
  }

  /**
   * Obtiene timeout de health check
   */
  getCheckTimeout(apiId = null) {
    return this.get('healthCheck.timeout', apiId);
  }

  /**
   * Obtiene reintentos de health check
   */
  getCheckRetries(apiId = null) {
    return this.get('healthCheck.retries', apiId);
  }

  /**
   * Resumen de configuracion actual
   */
  getSummary() {
    return {
      latency: {
        warning: `${this.get('latency.warning')}ms`,
        critical: `${this.get('latency.critical')}ms`,
        timeout: `${this.get('latency.timeout')}ms`
      },
      availability: {
        warning: `${this.get('availability.warning')}%`,
        critical: `${this.get('availability.critical')}%`
      },
      consecutiveFailures: {
        warning: this.get('consecutiveFailures.warning'),
        critical: this.get('consecutiveFailures.critical')
      },
      healthCheck: {
        interval: `${this.get('healthCheck.interval') / 1000}s`,
        timeout: `${this.get('healthCheck.timeout') / 1000}s`,
        retries: this.get('healthCheck.retries')
      }
    };
  }
}
