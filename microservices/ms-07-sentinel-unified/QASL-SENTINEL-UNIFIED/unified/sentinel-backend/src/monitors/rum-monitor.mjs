/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                         RUM MONITOR v1.0                                     ║
 * ║                  Real User Monitoring para APIs                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Recolecta y analiza métricas de usuarios REALES:                            ║
 * ║  - Latencia real experimentada por usuarios                                  ║
 * ║  - Errores en producción                                                     ║
 * ║  - User Journey Tracking                                                     ║
 * ║  - Geographic Distribution                                                   ║
 * ║  - Device/Browser metrics                                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { EventEmitter } from 'events';
import http from 'http';
import crypto from 'crypto';

export class RumMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      collectorPort: config.collectorPort || 9099,
      maxEventsPerMinute: config.maxEventsPerMinute || 10000,
      sessionTimeout: config.sessionTimeout || 1800000, // 30 minutos
      aggregationInterval: config.aggregationInterval || 60000, // 1 minuto
      retentionHours: config.retentionHours || 24,
      ...config
    };

    // Eventos crudos recibidos
    this.rawEvents = [];

    // Sesiones de usuario activas
    this.sessions = new Map();

    // Métricas agregadas
    this.metrics = {
      byApi: new Map(),
      byLocation: new Map(),
      byDevice: new Map(),
      byBrowser: new Map(),
      errors: [],
      latencyPercentiles: {}
    };

    // Servidor HTTP para recibir datos RUM
    this.server = null;

    // Rate limiting
    this.eventCount = 0;
    this.lastEventCountReset = Date.now();

    this.aggregationInterval = null;
  }

  /**
   * Inicia el monitor RUM y servidor de recolección
   */
  start() {
    // Iniciar servidor HTTP para recibir eventos RUM
    this.server = http.createServer((req, res) => this.handleRequest(req, res));

    this.server.listen(this.config.collectorPort, () => {
      console.log(`📊 RUM Monitor iniciado en puerto ${this.config.collectorPort}`);
    });

    // Iniciar agregación periódica
    this.aggregationInterval = setInterval(() => {
      this.aggregateMetrics();
      this.cleanupOldData();
    }, this.config.aggregationInterval);

    // Reset rate limiter cada minuto
    setInterval(() => {
      this.eventCount = 0;
      this.lastEventCountReset = Date.now();
    }, 60000);
  }

  /**
   * Detiene el monitor
   */
  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = null;
    }
    console.log('📊 RUM Monitor detenido');
  }

  /**
   * Maneja requests HTTP entrantes
   */
  handleRequest(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(405);
      res.end('Method not allowed');
      return;
    }

    // Rate limiting
    if (this.eventCount >= this.config.maxEventsPerMinute) {
      res.writeHead(429);
      res.end('Too many requests');
      return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const event = JSON.parse(body);
        this.processEvent(event, req);
        res.writeHead(200);
        res.end('OK');
      } catch (error) {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
  }

  /**
   * Procesa un evento RUM entrante
   */
  processEvent(event, req) {
    this.eventCount++;

    // Enriquecer evento con información del request
    const enrichedEvent = {
      ...event,
      receivedAt: new Date().toISOString(),
      clientIp: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    // Parsear User-Agent
    enrichedEvent.deviceInfo = this.parseUserAgent(enrichedEvent.userAgent);

    // Determinar ubicación (en producción usar GeoIP)
    enrichedEvent.location = this.estimateLocation(enrichedEvent.clientIp);

    // Gestionar sesión
    const sessionId = event.sessionId || this.generateSessionId(enrichedEvent);
    this.updateSession(sessionId, enrichedEvent);
    enrichedEvent.sessionId = sessionId;

    // Almacenar evento
    this.rawEvents.push(enrichedEvent);

    // Emitir evento para procesamiento en tiempo real
    this.emit('rum-event', enrichedEvent);

    // Si es un error, procesarlo especialmente
    if (event.type === 'error' || event.error) {
      this.processError(enrichedEvent);
    }

    return enrichedEvent;
  }

  /**
   * Parsea User-Agent para extraer info de dispositivo/browser
   */
  parseUserAgent(ua = '') {
    const info = {
      browser: 'Unknown',
      browserVersion: 'Unknown',
      os: 'Unknown',
      device: 'Desktop',
      isMobile: false
    };

    // Detectar browser
    if (ua.includes('Chrome')) {
      info.browser = 'Chrome';
      const match = ua.match(/Chrome\/(\d+)/);
      if (match) info.browserVersion = match[1];
    } else if (ua.includes('Firefox')) {
      info.browser = 'Firefox';
      const match = ua.match(/Firefox\/(\d+)/);
      if (match) info.browserVersion = match[1];
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      info.browser = 'Safari';
      const match = ua.match(/Version\/(\d+)/);
      if (match) info.browserVersion = match[1];
    } else if (ua.includes('Edge')) {
      info.browser = 'Edge';
      const match = ua.match(/Edge\/(\d+)/);
      if (match) info.browserVersion = match[1];
    }

    // Detectar OS
    if (ua.includes('Windows')) info.os = 'Windows';
    else if (ua.includes('Mac OS')) info.os = 'MacOS';
    else if (ua.includes('Linux')) info.os = 'Linux';
    else if (ua.includes('Android')) info.os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone')) info.os = 'iOS';

    // Detectar dispositivo
    if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) {
      info.device = 'Mobile';
      info.isMobile = true;
    } else if (ua.includes('Tablet') || ua.includes('iPad')) {
      info.device = 'Tablet';
      info.isMobile = true;
    }

    return info;
  }

  /**
   * Estima ubicación basada en IP (simplificado)
   */
  estimateLocation(ip) {
    // En producción, usar MaxMind GeoIP o similar
    // Por ahora, retornar ubicación genérica
    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  /**
   * Genera ID de sesión
   */
  generateSessionId(event) {
    const data = `${event.clientIp}-${event.userAgent}-${Date.now()}`;
    return crypto.createHash('md5').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Actualiza o crea sesión de usuario
   */
  updateSession(sessionId, event) {
    let session = this.sessions.get(sessionId);

    if (!session) {
      session = {
        id: sessionId,
        startedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        eventCount: 0,
        apiCalls: [],
        errors: [],
        deviceInfo: event.deviceInfo,
        location: event.location
      };
    }

    session.lastActivity = new Date().toISOString();
    session.eventCount++;

    if (event.apiUrl) {
      session.apiCalls.push({
        url: event.apiUrl,
        method: event.method,
        latency: event.latency,
        statusCode: event.statusCode,
        timestamp: event.timestamp
      });
    }

    if (event.type === 'error' || event.error) {
      session.errors.push({
        message: event.error || event.message,
        apiUrl: event.apiUrl,
        timestamp: event.timestamp
      });
    }

    this.sessions.set(sessionId, session);

    // Limpiar sesiones inactivas
    const now = Date.now();
    for (const [id, sess] of this.sessions.entries()) {
      if (now - new Date(sess.lastActivity).getTime() > this.config.sessionTimeout) {
        this.emit('session-ended', sess);
        this.sessions.delete(id);
      }
    }
  }

  /**
   * Procesa errores para análisis
   */
  processError(event) {
    const errorInfo = {
      timestamp: event.timestamp || event.receivedAt,
      apiUrl: event.apiUrl,
      method: event.method,
      statusCode: event.statusCode,
      error: event.error || event.message,
      sessionId: event.sessionId,
      deviceInfo: event.deviceInfo,
      location: event.location
    };

    this.metrics.errors.push(errorInfo);

    // Mantener solo últimos 1000 errores
    if (this.metrics.errors.length > 1000) {
      this.metrics.errors = this.metrics.errors.slice(-1000);
    }

    this.emit('rum-error', errorInfo);
  }

  /**
   * Agrega métricas de los eventos crudos
   */
  aggregateMetrics() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Filtrar eventos del último minuto
    const recentEvents = this.rawEvents.filter(e =>
      new Date(e.receivedAt).getTime() > oneMinuteAgo
    );

    // Agregar por API
    for (const event of recentEvents) {
      if (!event.apiUrl) continue;

      const apiKey = event.apiUrl;
      if (!this.metrics.byApi.has(apiKey)) {
        this.metrics.byApi.set(apiKey, {
          url: apiKey,
          requestCount: 0,
          errorCount: 0,
          latencies: [],
          lastMinuteRequests: 0
        });
      }

      const apiMetrics = this.metrics.byApi.get(apiKey);
      apiMetrics.requestCount++;
      apiMetrics.lastMinuteRequests++;

      if (event.latency) {
        apiMetrics.latencies.push(event.latency);
      }

      if (event.statusCode >= 400 || event.error) {
        apiMetrics.errorCount++;
      }
    }

    // Agregar por ubicación
    for (const event of recentEvents) {
      const locationKey = event.location?.country || 'Unknown';
      if (!this.metrics.byLocation.has(locationKey)) {
        this.metrics.byLocation.set(locationKey, {
          country: locationKey,
          requestCount: 0,
          averageLatency: 0,
          latencies: []
        });
      }

      const locMetrics = this.metrics.byLocation.get(locationKey);
      locMetrics.requestCount++;
      if (event.latency) {
        locMetrics.latencies.push(event.latency);
      }
    }

    // Agregar por dispositivo
    for (const event of recentEvents) {
      const deviceKey = event.deviceInfo?.device || 'Unknown';
      if (!this.metrics.byDevice.has(deviceKey)) {
        this.metrics.byDevice.set(deviceKey, {
          device: deviceKey,
          requestCount: 0,
          errorRate: 0,
          errors: 0
        });
      }

      const deviceMetrics = this.metrics.byDevice.get(deviceKey);
      deviceMetrics.requestCount++;
      if (event.statusCode >= 400 || event.error) {
        deviceMetrics.errors++;
      }
    }

    // Agregar por browser
    for (const event of recentEvents) {
      const browserKey = event.deviceInfo?.browser || 'Unknown';
      if (!this.metrics.byBrowser.has(browserKey)) {
        this.metrics.byBrowser.set(browserKey, {
          browser: browserKey,
          requestCount: 0,
          averageLatency: 0,
          latencies: []
        });
      }

      const browserMetrics = this.metrics.byBrowser.get(browserKey);
      browserMetrics.requestCount++;
      if (event.latency) {
        browserMetrics.latencies.push(event.latency);
      }
    }

    // Calcular percentiles de latencia global
    const allLatencies = recentEvents
      .filter(e => e.latency)
      .map(e => e.latency)
      .sort((a, b) => a - b);

    if (allLatencies.length > 0) {
      this.metrics.latencyPercentiles = {
        p50: this.percentile(allLatencies, 50),
        p75: this.percentile(allLatencies, 75),
        p90: this.percentile(allLatencies, 90),
        p95: this.percentile(allLatencies, 95),
        p99: this.percentile(allLatencies, 99),
        min: allLatencies[0],
        max: allLatencies[allLatencies.length - 1],
        avg: allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length
      };
    }

    // Calcular promedios para cada categoría
    for (const [key, metrics] of this.metrics.byApi.entries()) {
      if (metrics.latencies.length > 0) {
        metrics.averageLatency = metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length;
        metrics.p95Latency = this.percentile(metrics.latencies.sort((a, b) => a - b), 95);
      }
      metrics.errorRate = metrics.requestCount > 0 ? metrics.errorCount / metrics.requestCount : 0;
    }

    for (const [key, metrics] of this.metrics.byLocation.entries()) {
      if (metrics.latencies.length > 0) {
        metrics.averageLatency = metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length;
      }
    }

    for (const [key, metrics] of this.metrics.byDevice.entries()) {
      metrics.errorRate = metrics.requestCount > 0 ? metrics.errors / metrics.requestCount : 0;
    }

    for (const [key, metrics] of this.metrics.byBrowser.entries()) {
      if (metrics.latencies.length > 0) {
        metrics.averageLatency = metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length;
      }
    }

    this.emit('metrics-aggregated', {
      timestamp: new Date().toISOString(),
      eventsProcessed: recentEvents.length,
      percentiles: this.metrics.latencyPercentiles
    });
  }

  /**
   * Calcula percentil
   */
  percentile(arr, p) {
    if (arr.length === 0) return 0;
    const index = Math.ceil((p / 100) * arr.length) - 1;
    return arr[Math.max(0, index)];
  }

  /**
   * Limpia datos antiguos
   */
  cleanupOldData() {
    const cutoff = Date.now() - (this.config.retentionHours * 60 * 60 * 1000);

    // Limpiar eventos crudos
    this.rawEvents = this.rawEvents.filter(e =>
      new Date(e.receivedAt).getTime() > cutoff
    );

    // Limpiar errores antiguos
    this.metrics.errors = this.metrics.errors.filter(e =>
      new Date(e.timestamp).getTime() > cutoff
    );
  }

  /**
   * Obtiene el estado actual del RUM
   */
  getStatus() {
    return {
      activeSessions: this.sessions.size,
      totalEvents: this.rawEvents.length,
      eventsPerMinute: this.eventCount,
      apisMonitored: this.metrics.byApi.size,
      latencyPercentiles: this.metrics.latencyPercentiles,
      errorCount: this.metrics.errors.length,
      byDevice: [...this.metrics.byDevice.entries()].map(([k, v]) => ({
        device: k,
        ...v
      })),
      byBrowser: [...this.metrics.byBrowser.entries()].map(([k, v]) => ({
        browser: k,
        ...v
      })),
      byLocation: [...this.metrics.byLocation.entries()].map(([k, v]) => ({
        country: k,
        ...v
      }))
    };
  }

  /**
   * Obtiene métricas para Prometheus
   */
  getMetrics() {
    const status = this.getStatus();

    const metrics = {
      rum_active_sessions: status.activeSessions,
      rum_events_total: status.totalEvents,
      rum_events_per_minute: status.eventsPerMinute,
      rum_apis_monitored: status.apisMonitored,
      rum_errors_total: status.errorCount,
      rum_latency_p50: status.latencyPercentiles.p50 || 0,
      rum_latency_p90: status.latencyPercentiles.p90 || 0,
      rum_latency_p95: status.latencyPercentiles.p95 || 0,
      rum_latency_p99: status.latencyPercentiles.p99 || 0,
      rum_latency_avg: status.latencyPercentiles.avg || 0
    };

    // Métricas por API
    for (const [apiUrl, apiMetrics] of this.metrics.byApi.entries()) {
      const sanitizedUrl = apiUrl.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      metrics[`rum_api_${sanitizedUrl}_requests`] = apiMetrics.requestCount;
      metrics[`rum_api_${sanitizedUrl}_errors`] = apiMetrics.errorCount;
      metrics[`rum_api_${sanitizedUrl}_latency_avg`] = apiMetrics.averageLatency || 0;
    }

    return metrics;
  }

  /**
   * Genera el script cliente para inyectar en el frontend
   */
  generateClientScript() {
    const collectorUrl = `http://localhost:${this.config.collectorPort}`;

    return `
// QASL-SENTINEL RUM Client v1.0
(function() {
  const COLLECTOR_URL = '${collectorUrl}';
  const SESSION_ID = localStorage.getItem('qasl_session') ||
    Math.random().toString(36).substring(2, 15);
  localStorage.setItem('qasl_session', SESSION_ID);

  // Interceptar fetch
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const startTime = performance.now();
    const url = typeof args[0] === 'string' ? args[0] : args[0].url;

    try {
      const response = await originalFetch.apply(this, args);
      const endTime = performance.now();

      sendRumEvent({
        type: 'api-call',
        apiUrl: url,
        method: args[1]?.method || 'GET',
        statusCode: response.status,
        latency: Math.round(endTime - startTime),
        timestamp: new Date().toISOString(),
        sessionId: SESSION_ID
      });

      return response;
    } catch (error) {
      const endTime = performance.now();

      sendRumEvent({
        type: 'error',
        apiUrl: url,
        method: args[1]?.method || 'GET',
        error: error.message,
        latency: Math.round(endTime - startTime),
        timestamp: new Date().toISOString(),
        sessionId: SESSION_ID
      });

      throw error;
    }
  };

  // Interceptar XMLHttpRequest
  const originalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    const xhr = new originalXHR();
    const startTime = { value: 0 };
    let method = 'GET';
    let url = '';

    const originalOpen = xhr.open;
    xhr.open = function(m, u) {
      method = m;
      url = u;
      return originalOpen.apply(this, arguments);
    };

    const originalSend = xhr.send;
    xhr.send = function() {
      startTime.value = performance.now();

      xhr.addEventListener('loadend', function() {
        const endTime = performance.now();

        sendRumEvent({
          type: xhr.status >= 400 ? 'error' : 'api-call',
          apiUrl: url,
          method: method,
          statusCode: xhr.status,
          latency: Math.round(endTime - startTime.value),
          timestamp: new Date().toISOString(),
          sessionId: SESSION_ID,
          error: xhr.status >= 400 ? xhr.statusText : undefined
        });
      });

      return originalSend.apply(this, arguments);
    };

    return xhr;
  };

  // Capturar errores globales
  window.addEventListener('error', function(event) {
    sendRumEvent({
      type: 'error',
      error: event.message,
      source: event.filename,
      line: event.lineno,
      timestamp: new Date().toISOString(),
      sessionId: SESSION_ID
    });
  });

  // Enviar evento al collector
  function sendRumEvent(event) {
    try {
      navigator.sendBeacon(COLLECTOR_URL, JSON.stringify(event));
    } catch (e) {
      // Fallback a fetch
      fetch(COLLECTOR_URL, {
        method: 'POST',
        body: JSON.stringify(event),
        keepalive: true
      }).catch(() => {});
    }
  }

  console.log('🐝 QASL-SENTINEL RUM initialized');
})();
`;
  }

  /**
   * Genera reporte de RUM
   */
  generateReport() {
    const status = this.getStatus();

    return {
      title: 'Real User Monitoring Report',
      generatedAt: new Date().toISOString(),
      summary: {
        activeSessions: status.activeSessions,
        totalEvents: status.totalEvents,
        eventsPerMinute: status.eventsPerMinute,
        apisMonitored: status.apisMonitored,
        errorCount: status.errorCount
      },
      latencyPercentiles: status.latencyPercentiles,
      byDevice: status.byDevice,
      byBrowser: status.byBrowser,
      byLocation: status.byLocation,
      topApis: [...this.metrics.byApi.entries()]
        .map(([url, metrics]) => ({
          url,
          ...metrics,
          latencies: undefined // No incluir array completo
        }))
        .sort((a, b) => b.requestCount - a.requestCount)
        .slice(0, 10),
      recentErrors: this.metrics.errors.slice(-20)
    };
  }
}

export default RumMonitor;
