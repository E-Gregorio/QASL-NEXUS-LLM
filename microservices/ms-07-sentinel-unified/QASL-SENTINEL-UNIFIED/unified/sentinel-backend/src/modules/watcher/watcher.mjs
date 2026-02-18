/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                              WATCHER MODULE                                  ║
 * ║                    Vigilancia 24/7 de APIs                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * El corazón del sistema - vigila que las APIs estén:
 * - Respondiendo (health check)
 * - Dentro de tiempos normales (latencia)
 * - Sin errores (códigos HTTP)
 * - Con auth funcionando
 */

import { EventEmitter } from 'events';
import { log } from '../../core/banner.mjs';

// Para soportar certificados autofirmados en desarrollo
// Se configura via NODE_TLS_REJECT_UNAUTHORIZED=0 en .env

export class Watcher extends EventEmitter {
  constructor(options = {}) {
    super();

    this.auth = options.auth;
    this.data = options.data;
    this.config = options.config;

    // APIs organizadas por prioridad
    this.apis = {
      critical: [],
      normal: [],
      low: []
    };

    // Estado actual de cada API
    this.status = new Map();

    // Configuración de thresholds
    this.thresholds = {
      latency: {
        warning: 1000,  // ms
        critical: 3000  // ms
      },
      errorRate: {
        warning: 0.05,  // 5%
        critical: 0.10  // 10%
      },
      timeout: 30000    // 30 segundos
    };
  }

  /**
   * Configura las APIs a vigilar
   */
  setApis(apis) {
    // Limpiar
    this.apis = { critical: [], normal: [], low: [] };

    // Organizar por prioridad
    for (const api of apis) {
      const priority = api.priority || 'normal';
      if (this.apis[priority]) {
        this.apis[priority].push(api);
      } else {
        this.apis.normal.push(api);
      }
    }

    log(`Watcher configurado: ${apis.length} APIs (${this.apis.critical.length} críticas, ${this.apis.normal.length} normales, ${this.apis.low.length} bajas)`, 'watch');
  }

  /**
   * Verifica todas las APIs
   */
  async checkAllApis() {
    const results = [];

    for (const priority of ['critical', 'normal', 'low']) {
      for (const api of this.apis[priority]) {
        const result = await this.checkApi(api);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Verifica solo APIs críticas
   */
  async checkCriticalApis() {
    const results = [];

    for (const api of this.apis.critical) {
      const result = await this.checkApi(api);
      results.push(result);
    }

    return results;
  }

  /**
   * Verifica APIs de prioridad normal
   */
  async checkNormalApis() {
    const results = [];

    for (const api of this.apis.normal) {
      const result = await this.checkApi(api);
      results.push(result);
    }

    return results;
  }

  /**
   * Verifica APIs de baja prioridad
   */
  async checkLowPriorityApis() {
    const results = [];

    for (const api of this.apis.low) {
      const result = await this.checkApi(api);
      results.push(result);
    }

    return results;
  }

  /**
   * Verifica una API individual
   */
  async checkApi(api) {
    const startTime = Date.now();

    const result = {
      api: {
        id: api.id,
        name: api.name,
        url: api.url,
        method: api.method
      },
      timestamp: new Date().toISOString(),
      status: null,
      latency: null,
      healthy: false,
      error: null,
      alerts: []
    };

    try {
      // Obtener headers de auth
      let headers = { ...api.headers };
      if (this.auth && api.auth?.type !== 'none') {
        const authHeaders = await this.auth.getAuthHeaders(api);
        headers = { ...headers, ...authHeaders };
      }

      // Preparar request
      const requestOptions = {
        method: api.method || 'GET',
        headers,
        signal: AbortSignal.timeout(this.thresholds.timeout)
      };

      // Agregar body si existe y el método lo permite
      if (api.body && ['POST', 'PUT', 'PATCH'].includes(api.method)) {
        if (api.body.type === 'json' || api.body.type === 'raw') {
          // raw y json se envían como JSON
          requestOptions.body = JSON.stringify(api.body.data);
          headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        } else if (api.body.type === 'form') {
          requestOptions.body = new URLSearchParams(api.body.data).toString();
          headers['Content-Type'] = headers['Content-Type'] || 'application/x-www-form-urlencoded';
        } else if (api.body.type === 'multipart') {
          // Para multipart, no enviamos body en health check (requiere archivo)
          // Solo verificamos que el endpoint responda
          delete requestOptions.body;
        }
      }

      // Hacer request
      const response = await fetch(api.url, requestOptions);

      // Calcular latencia
      result.latency = Date.now() - startTime;
      result.status = response.status;

      // Evaluar resultado
      // Soporta expectedStatus como número, array, o usa response.ok por defecto
      if (api.expectedStatus) {
        const expectedStatuses = Array.isArray(api.expectedStatus)
          ? api.expectedStatus
          : [api.expectedStatus];
        result.healthy = expectedStatuses.includes(response.status);
      } else {
        result.healthy = response.ok;
      }

      // Verificar latencia
      if (result.latency > this.thresholds.latency.critical) {
        result.alerts.push({
          type: 'latency_critical',
          message: `Latencia crítica: ${result.latency}ms (umbral: ${this.thresholds.latency.critical}ms)`
        });
      } else if (result.latency > this.thresholds.latency.warning) {
        result.alerts.push({
          type: 'latency_warning',
          message: `Latencia alta: ${result.latency}ms (umbral: ${this.thresholds.latency.warning}ms)`
        });
      }

      // Verificar status code
      if (response.status >= 500) {
        result.alerts.push({
          type: 'server_error',
          message: `Error de servidor: ${response.status}`
        });
      } else if (response.status === 401 || response.status === 403) {
        result.alerts.push({
          type: 'auth_error',
          message: `Error de autenticación: ${response.status}`
        });
      } else if (response.status >= 400) {
        result.alerts.push({
          type: 'client_error',
          message: `Error de cliente: ${response.status}`
        });
      }

    } catch (error) {
      result.latency = Date.now() - startTime;
      result.healthy = false;
      result.error = error.message;

      if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        result.alerts.push({
          type: 'timeout',
          message: `Timeout después de ${this.thresholds.timeout}ms`
        });
      } else if (error.code === 'ECONNREFUSED') {
        result.alerts.push({
          type: 'connection_refused',
          message: 'Conexión rechazada - servidor no accesible'
        });
      } else if (error.code === 'ENOTFOUND') {
        result.alerts.push({
          type: 'dns_error',
          message: 'Error DNS - dominio no encontrado'
        });
      } else {
        result.alerts.push({
          type: 'network_error',
          message: `Error de red: ${error.message}`
        });
      }
    }

    // Actualizar estado
    await this.updateStatus(api, result);

    // Guardar en historial
    if (this.data) {
      await this.data.saveHistory({
        type: 'health_check',
        ...result
      });

      // Guardar métricas
      await this.data.saveMetrics(api.id, {
        status: result.status,
        latency: result.latency,
        healthy: result.healthy
      });
    }

    // Emitir eventos según resultado
    this.emitEvents(api, result);

    return result;
  }

  /**
   * Actualiza el estado de una API
   */
  async updateStatus(api, result) {
    const previous = this.status.get(api.id);
    const current = {
      ...result,
      lastCheck: new Date(),
      consecutiveFailures: result.healthy ? 0 : (previous?.consecutiveFailures || 0) + 1,
      consecutiveSuccess: result.healthy ? (previous?.consecutiveSuccess || 0) + 1 : 0
    };

    this.status.set(api.id, current);

    // Detectar cambios de estado
    if (previous) {
      if (previous.healthy && !current.healthy) {
        // API se cayó
        this.emit('api:down', { api, result, previous });
        log(`🔴 API CAÍDA: ${api.name} (${result.error || result.status})`, 'error');
      } else if (!previous.healthy && current.healthy) {
        // API se recuperó
        this.emit('api:recovered', { api, result, previous });
        log(`🟢 API RECUPERADA: ${api.name}`, 'success');
      }
    }

    // Actualizar baseline si está healthy
    if (result.healthy && this.data) {
      await this.updateBaseline(api, result);
    }
  }

  /**
   * Actualiza el baseline de comportamiento normal
   */
  async updateBaseline(api, result) {
    const baseline = await this.data.loadBaseline(api.id) || {
      avgLatency: result.latency,
      minLatency: result.latency,
      maxLatency: result.latency,
      samples: 0
    };

    // Calcular nuevo promedio (media móvil exponencial)
    const alpha = 0.1; // Factor de suavizado
    baseline.avgLatency = alpha * result.latency + (1 - alpha) * baseline.avgLatency;
    baseline.minLatency = Math.min(baseline.minLatency, result.latency);
    baseline.maxLatency = Math.max(baseline.maxLatency, result.latency);
    baseline.samples++;
    baseline.lastUpdate = new Date().toISOString();

    await this.data.updateBaseline(api.id, baseline);
  }

  /**
   * Emite eventos según el resultado del check
   */
  emitEvents(api, result) {
    // Evento general de check completado
    this.emit('check:complete', { api, result });

    // Eventos específicos
    if (!result.healthy) {
      const status = this.status.get(api.id);

      // Si es la primera falla, solo warning
      if (status?.consecutiveFailures === 1) {
        this.emit('api:warning', { api, result });
      }
      // Si son 3 o más fallas consecutivas, es crítico
      else if (status?.consecutiveFailures >= 3) {
        this.emit('api:critical', { api, result, consecutiveFailures: status.consecutiveFailures });
      }
    }

    // Alertas de latencia
    for (const alert of result.alerts) {
      if (alert.type.includes('latency')) {
        this.emit('latency:alert', { api, alert, latency: result.latency });
      }
    }

    // Alertas de auth
    for (const alert of result.alerts) {
      if (alert.type.includes('auth')) {
        this.emit('auth:error', { api, alert, status: result.status });
      }
    }

    // Detectar anomalías
    this.checkForAnomalies(api, result);
  }

  /**
   * Detecta anomalías comparando con baseline
   */
  async checkForAnomalies(api, result) {
    if (!this.data || !result.healthy) return;

    const baseline = await this.data.loadBaseline(api.id);
    if (!baseline || baseline.samples < 10) return;

    // Anomalía de latencia (más del 200% del promedio)
    if (result.latency > baseline.avgLatency * 2) {
      this.emit('anomaly', {
        type: 'latency_spike',
        api,
        current: result.latency,
        baseline: baseline.avgLatency,
        deviation: ((result.latency / baseline.avgLatency) - 1) * 100
      });
    }
  }

  /**
   * Obtiene el estado actual de todas las APIs
   */
  getStatus() {
    const status = {};

    for (const [apiId, state] of this.status.entries()) {
      status[apiId] = {
        healthy: state.healthy,
        status: state.status,
        latency: state.latency,
        lastCheck: state.lastCheck,
        consecutiveFailures: state.consecutiveFailures
      };
    }

    return status;
  }

  /**
   * Obtiene resumen del estado
   */
  getSummary() {
    let healthy = 0;
    let warning = 0;
    let critical = 0;
    let totalLatency = 0;
    let count = 0;

    for (const state of this.status.values()) {
      if (state.healthy) {
        healthy++;
      } else if (state.consecutiveFailures >= 3) {
        critical++;
      } else {
        warning++;
      }

      if (state.latency) {
        totalLatency += state.latency;
        count++;
      }
    }

    return {
      total: this.status.size,
      healthy,
      warning,
      critical,
      avgLatency: count > 0 ? Math.round(totalLatency / count) : 0,
      uptime: this.status.size > 0 ? ((healthy / this.status.size) * 100).toFixed(2) : 100
    };
  }
}
