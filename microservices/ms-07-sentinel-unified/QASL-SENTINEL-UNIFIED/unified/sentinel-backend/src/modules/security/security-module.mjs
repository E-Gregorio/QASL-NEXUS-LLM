/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                          SECURITY MODULE                                     ║
 * ║              Detección de anomalías e intrusos                               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { EventEmitter } from 'events';
import { log } from '../../core/banner.mjs';

export class SecurityModule extends EventEmitter {
  constructor(options = {}) {
    super();

    this.data = options.data;

    // Patrones sospechosos
    this.patterns = {
      sqlInjection: /('|"|;|--|\/\*|\*\/|union|select|insert|update|delete|drop|exec)/i,
      xss: /(<script|javascript:|on\w+=)/i,
      pathTraversal: /(\.\.|\/etc\/|\/proc\/|%2e%2e)/i,
      bruteForce: {
        maxAttempts: 5,
        timeWindow: 60000 // 1 minuto
      }
    };

    // Tracking de requests por IP/endpoint
    this.requestTracker = new Map();

    // Alertas activas
    this.activeAlerts = [];
  }

  /**
   * Analiza un evento/anomalía
   */
  async analyze(event) {
    const threats = [];

    // Verificar patrones maliciosos en request
    if (event.request) {
      const payloadThreats = this.checkPayload(event.request);
      threats.push(...payloadThreats);
    }

    // Verificar rate de requests
    if (event.source) {
      const rateThreats = this.checkRate(event.source, event.endpoint);
      threats.push(...rateThreats);
    }

    // Verificar patrones de auth
    if (event.type === 'auth_failure') {
      const authThreats = this.checkAuthPattern(event);
      threats.push(...authThreats);
    }

    // Si hay amenazas, emitir eventos
    for (const threat of threats) {
      this.emit('threat:detected', threat);

      if (threat.severity === 'critical') {
        this.emit('intrusion', threat);
        log(`🚨 INTRUSIÓN DETECTADA: ${threat.type}`, 'security');
      }
    }

    // Guardar en historial
    if (threats.length > 0 && this.data) {
      await this.data.saveAlert({
        type: 'security',
        threats,
        event,
        timestamp: new Date().toISOString()
      });
    }

    return threats;
  }

  /**
   * Verifica el payload por patrones maliciosos
   */
  checkPayload(request) {
    const threats = [];
    const payload = JSON.stringify(request);

    if (this.patterns.sqlInjection.test(payload)) {
      threats.push({
        type: 'sql_injection',
        severity: 'critical',
        description: 'Posible intento de SQL Injection detectado',
        payload: payload.substring(0, 200)
      });
    }

    if (this.patterns.xss.test(payload)) {
      threats.push({
        type: 'xss_attempt',
        severity: 'high',
        description: 'Posible intento de XSS detectado',
        payload: payload.substring(0, 200)
      });
    }

    if (this.patterns.pathTraversal.test(payload)) {
      threats.push({
        type: 'path_traversal',
        severity: 'high',
        description: 'Posible intento de Path Traversal detectado',
        payload: payload.substring(0, 200)
      });
    }

    return threats;
  }

  /**
   * Verifica el rate de requests
   */
  checkRate(source, endpoint) {
    const threats = [];
    const key = `${source}_${endpoint}`;
    const now = Date.now();

    // Obtener historial
    let history = this.requestTracker.get(key) || [];

    // Limpiar requests antiguos
    history = history.filter(t => now - t < this.patterns.bruteForce.timeWindow);

    // Agregar request actual
    history.push(now);
    this.requestTracker.set(key, history);

    // Verificar si excede el límite
    if (history.length > this.patterns.bruteForce.maxAttempts * 10) {
      threats.push({
        type: 'rate_limit_exceeded',
        severity: 'high',
        description: `Rate excesivo desde ${source}: ${history.length} requests en ${this.patterns.bruteForce.timeWindow / 1000}s`,
        source,
        endpoint,
        count: history.length
      });
    }

    return threats;
  }

  /**
   * Verifica patrones de autenticación
   */
  checkAuthPattern(event) {
    const threats = [];
    const key = `auth_${event.source || 'unknown'}`;
    const now = Date.now();

    let failures = this.requestTracker.get(key) || [];
    failures = failures.filter(t => now - t < this.patterns.bruteForce.timeWindow);
    failures.push(now);
    this.requestTracker.set(key, failures);

    if (failures.length >= this.patterns.bruteForce.maxAttempts) {
      threats.push({
        type: 'brute_force_attempt',
        severity: 'critical',
        description: `Posible ataque de fuerza bruta: ${failures.length} intentos fallidos de auth`,
        source: event.source,
        attempts: failures.length
      });
    }

    return threats;
  }

  /**
   * Analiza patrones en el historial
   */
  async analyzeHistory(hours = 24) {
    if (!this.data) return [];

    const history = await this.data.loadHistoryRange(Math.ceil(hours / 24));
    const anomalies = [];

    // Agrupar por endpoint
    const byEndpoint = {};
    for (const entry of history) {
      const key = entry.api?.id || 'unknown';
      if (!byEndpoint[key]) {
        byEndpoint[key] = [];
      }
      byEndpoint[key].push(entry);
    }

    // Buscar anomalías por endpoint
    for (const [endpoint, entries] of Object.entries(byEndpoint)) {
      // Calcular métricas
      const errorRate = entries.filter(e => !e.healthy).length / entries.length;
      const avgLatency = entries.reduce((sum, e) => sum + (e.latency || 0), 0) / entries.length;

      // Error rate alto
      if (errorRate > 0.1) {
        anomalies.push({
          type: 'high_error_rate',
          endpoint,
          errorRate: (errorRate * 100).toFixed(2) + '%',
          severity: errorRate > 0.3 ? 'critical' : 'high'
        });
      }
    }

    return anomalies;
  }

  /**
   * Limpia el tracker de requests antiguas
   */
  cleanup() {
    const now = Date.now();
    const maxAge = this.patterns.bruteForce.timeWindow * 2;

    for (const [key, history] of this.requestTracker.entries()) {
      const filtered = history.filter(t => now - t < maxAge);
      if (filtered.length === 0) {
        this.requestTracker.delete(key);
      } else {
        this.requestTracker.set(key, filtered);
      }
    }
  }

  /**
   * Obtiene resumen de seguridad
   */
  getSummary() {
    return {
      activeTracking: this.requestTracker.size,
      activeAlerts: this.activeAlerts.length,
      patterns: Object.keys(this.patterns)
    };
  }
}
