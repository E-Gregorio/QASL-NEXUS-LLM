/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    MULTI-LOCATION MONITOR v1.0                               ║
 * ║          Monitoreo desde Múltiples Ubicaciones Geográficas                   ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Verifica disponibilidad y latencia desde diferentes regiones:               ║
 * ║  - Monitoreo multi-región (simular con proxies/VPN endpoints)                ║
 * ║  - Detección de problemas regionales                                         ║
 * ║  - Latencia por ubicación                                                    ║
 * ║  - CDN y edge performance                                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { EventEmitter } from 'events';
import https from 'https';
import http from 'http';

export class MultiLocationMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      checkInterval: config.checkInterval || 300000, // 5 minutos
      timeout: config.timeout || 15000,
      parallelChecks: config.parallelChecks !== false,
      ...config
    };

    // Ubicaciones configuradas
    // En producción, estos serían proxies o endpoints en diferentes regiones
    this.locations = new Map([
      ['local', {
        name: 'Local',
        region: 'local',
        country: 'Local',
        proxy: null, // Sin proxy, directo
        enabled: true
      }],
      ['us-east', {
        name: 'US East (Virginia)',
        region: 'us-east-1',
        country: 'US',
        proxy: config.proxies?.usEast || null,
        enabled: !!config.proxies?.usEast
      }],
      ['us-west', {
        name: 'US West (Oregon)',
        region: 'us-west-2',
        country: 'US',
        proxy: config.proxies?.usWest || null,
        enabled: !!config.proxies?.usWest
      }],
      ['eu-west', {
        name: 'Europe (Ireland)',
        region: 'eu-west-1',
        country: 'IE',
        proxy: config.proxies?.euWest || null,
        enabled: !!config.proxies?.euWest
      }],
      ['eu-central', {
        name: 'Europe (Frankfurt)',
        region: 'eu-central-1',
        country: 'DE',
        proxy: config.proxies?.euCentral || null,
        enabled: !!config.proxies?.euCentral
      }],
      ['sa-east', {
        name: 'South America (São Paulo)',
        region: 'sa-east-1',
        country: 'BR',
        proxy: config.proxies?.saEast || null,
        enabled: !!config.proxies?.saEast
      }],
      ['ar-buenos-aires', {
        name: 'Argentina (Buenos Aires)',
        region: 'ar-bue-1',
        country: 'AR',
        proxy: config.proxies?.arBuenosAires || null,
        enabled: !!config.proxies?.arBuenosAires
      }],
      ['ap-southeast', {
        name: 'Asia Pacific (Singapore)',
        region: 'ap-southeast-1',
        country: 'SG',
        proxy: config.proxies?.apSoutheast || null,
        enabled: !!config.proxies?.apSoutheast
      }],
      ['ap-northeast', {
        name: 'Asia Pacific (Tokyo)',
        region: 'ap-northeast-1',
        country: 'JP',
        proxy: config.proxies?.apNortheast || null,
        enabled: !!config.proxies?.apNortheast
      }]
    ]);

    // APIs a monitorear
    this.apis = new Map();

    // Resultados por ubicación
    this.results = new Map();

    // Historial para análisis
    this.history = [];

    this.checkInterval = null;
  }

  /**
   * Inicia el monitor multi-ubicación
   */
  start() {
    const enabledLocations = this.getEnabledLocations();
    console.log(`📍 Multi-Location Monitor iniciado (${enabledLocations.length} ubicaciones)`);

    this.checkInterval = setInterval(() => this.runChecks(), this.config.checkInterval);
    // Primera verificación inmediata
    this.runChecks();
  }

  /**
   * Detiene el monitor
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('📍 Multi-Location Monitor detenido');
  }

  /**
   * Agrega una ubicación personalizada
   */
  addLocation(id, locationConfig) {
    this.locations.set(id, {
      name: locationConfig.name || id,
      region: locationConfig.region || id,
      country: locationConfig.country || 'Unknown',
      proxy: locationConfig.proxy || null,
      enabled: locationConfig.enabled !== false
    });
  }

  /**
   * Obtiene ubicaciones habilitadas
   */
  getEnabledLocations() {
    return [...this.locations.entries()]
      .filter(([_, loc]) => loc.enabled)
      .map(([id, loc]) => ({ id, ...loc }));
  }

  /**
   * Registra una API para monitoreo multi-ubicación
   */
  registerApi(api) {
    this.apis.set(api.id || api.url, {
      api,
      addedAt: new Date().toISOString()
    });
  }

  /**
   * Ejecuta verificaciones desde todas las ubicaciones
   */
  async runChecks() {
    const enabledLocations = this.getEnabledLocations();
    const results = [];

    for (const [apiId, apiInfo] of this.apis.entries()) {
      const apiResults = await this.checkApiFromAllLocations(apiInfo.api, enabledLocations);
      results.push({
        apiId,
        api: apiInfo.api,
        results: apiResults,
        timestamp: new Date().toISOString()
      });

      // Detectar problemas regionales
      const issues = this.detectRegionalIssues(apiResults);
      if (issues.length > 0) {
        this.emit('regional-issue', {
          apiId,
          api: apiInfo.api,
          issues,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Guardar en historial
    this.history.push({
      timestamp: new Date().toISOString(),
      results
    });

    // Mantener solo últimas 24 horas de historia
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.history = this.history.filter(h =>
      new Date(h.timestamp).getTime() > oneDayAgo
    );

    this.emit('checks-completed', {
      totalApis: this.apis.size,
      locations: enabledLocations.length,
      results
    });

    return results;
  }

  /**
   * Verifica una API desde todas las ubicaciones
   */
  async checkApiFromAllLocations(api, locations) {
    const results = {};

    if (this.config.parallelChecks) {
      // Verificar en paralelo
      const promises = locations.map(async (location) => {
        const result = await this.checkFromLocation(api, location);
        return { locationId: location.id, result };
      });

      const allResults = await Promise.all(promises);
      for (const { locationId, result } of allResults) {
        results[locationId] = result;
      }
    } else {
      // Verificar secuencialmente
      for (const location of locations) {
        results[location.id] = await this.checkFromLocation(api, location);
      }
    }

    // Almacenar resultados
    this.results.set(api.id || api.url, results);

    return results;
  }

  /**
   * Verifica una API desde una ubicación específica
   */
  async checkFromLocation(api, location) {
    const startTime = Date.now();

    try {
      const response = await this.makeRequest(api.url, location);
      const duration = Date.now() - startTime;

      return {
        location: location.name,
        region: location.region,
        country: location.country,
        success: true,
        statusCode: response.statusCode,
        latency: duration,
        headers: {
          server: response.headers?.server,
          'x-cache': response.headers?.['x-cache'],
          'x-served-by': response.headers?.['x-served-by'],
          'cf-ray': response.headers?.['cf-ray'] // Cloudflare
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        location: location.name,
        region: location.region,
        country: location.country,
        success: false,
        error: error.message,
        errorCode: error.code,
        latency: duration,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Realiza request HTTP/HTTPS (con soporte de proxy)
   */
  async makeRequest(url, location) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        timeout: this.config.timeout,
        headers: {
          'User-Agent': `QASL-Sentinel-MultiLocation/${location.region}`,
          'X-Sentinel-Location': location.id
        }
      };

      // Si hay proxy configurado, usar agent de proxy
      if (location.proxy) {
        // En producción, usar http-proxy-agent o https-proxy-agent
        options.headers['X-Forwarded-For'] = location.proxy;
      }

      const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data.substring(0, 1000) // Solo primeros 1000 chars
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  /**
   * Detecta problemas específicos de región
   */
  detectRegionalIssues(results) {
    const issues = [];
    const locations = Object.entries(results);

    // Calcular estadísticas
    const successfulResults = locations.filter(([_, r]) => r.success);
    const failedResults = locations.filter(([_, r]) => !r.success);

    // Issue: Algunas regiones fallan mientras otras funcionan
    if (failedResults.length > 0 && successfulResults.length > 0) {
      issues.push({
        type: 'partial-outage',
        severity: 'high',
        message: `API unavailable in ${failedResults.length} of ${locations.length} locations`,
        affectedLocations: failedResults.map(([id, r]) => ({
          id,
          location: r.location,
          error: r.error
        })),
        workingLocations: successfulResults.map(([id, r]) => ({
          id,
          location: r.location
        }))
      });
    }

    // Issue: Latencia muy diferente entre regiones
    if (successfulResults.length >= 2) {
      const latencies = successfulResults.map(([_, r]) => r.latency);
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      const minLatency = Math.min(...latencies);

      // Si la diferencia es mayor al 300%, hay problema
      if (maxLatency > minLatency * 3) {
        const slowest = successfulResults.find(([_, r]) => r.latency === maxLatency);
        const fastest = successfulResults.find(([_, r]) => r.latency === minLatency);

        issues.push({
          type: 'latency-disparity',
          severity: 'medium',
          message: `High latency disparity: ${minLatency}ms to ${maxLatency}ms`,
          slowestLocation: {
            id: slowest[0],
            location: slowest[1].location,
            latency: slowest[1].latency
          },
          fastestLocation: {
            id: fastest[0],
            location: fastest[1].location,
            latency: fastest[1].latency
          },
          averageLatency: Math.round(avgLatency)
        });
      }

      // Issue: Latencia alta global (todas las regiones lentas)
      if (avgLatency > 2000) {
        issues.push({
          type: 'high-global-latency',
          severity: 'medium',
          message: `High average latency across all regions: ${Math.round(avgLatency)}ms`,
          averageLatency: Math.round(avgLatency),
          latenciesByLocation: successfulResults.map(([id, r]) => ({
            id,
            location: r.location,
            latency: r.latency
          }))
        });
      }
    }

    // Issue: Todas las regiones fallan
    if (failedResults.length === locations.length && locations.length > 0) {
      issues.push({
        type: 'global-outage',
        severity: 'critical',
        message: 'API unavailable from all monitored locations',
        locations: failedResults.map(([id, r]) => ({
          id,
          location: r.location,
          error: r.error
        }))
      });
    }

    return issues;
  }

  /**
   * Obtiene el estado actual por API
   */
  getStatus() {
    const status = {
      enabledLocations: this.getEnabledLocations().length,
      totalLocations: this.locations.size,
      apisMonitored: this.apis.size,
      results: {}
    };

    for (const [apiId, results] of this.results.entries()) {
      const locationResults = Object.entries(results);
      const successful = locationResults.filter(([_, r]) => r.success).length;
      const failed = locationResults.filter(([_, r]) => !r.success).length;
      const avgLatency = locationResults
        .filter(([_, r]) => r.success)
        .reduce((sum, [_, r]) => sum + r.latency, 0) / Math.max(successful, 1);

      status.results[apiId] = {
        locations: locationResults.length,
        successful,
        failed,
        averageLatency: Math.round(avgLatency),
        status: failed === 0 ? 'healthy' :
                failed < successful ? 'partial' : 'down',
        byLocation: results
      };
    }

    return status;
  }

  /**
   * Obtiene latencia promedio por región (histórico)
   */
  getLatencyByRegion() {
    const latencyByRegion = {};

    for (const record of this.history) {
      for (const apiResult of record.results) {
        for (const [locationId, result] of Object.entries(apiResult.results)) {
          if (!result.success) continue;

          if (!latencyByRegion[locationId]) {
            latencyByRegion[locationId] = {
              location: result.location,
              region: result.region,
              country: result.country,
              samples: [],
              min: Infinity,
              max: 0,
              sum: 0
            };
          }

          const stats = latencyByRegion[locationId];
          stats.samples.push(result.latency);
          stats.min = Math.min(stats.min, result.latency);
          stats.max = Math.max(stats.max, result.latency);
          stats.sum += result.latency;
        }
      }
    }

    // Calcular promedios
    for (const [locationId, stats] of Object.entries(latencyByRegion)) {
      stats.average = Math.round(stats.sum / stats.samples.length);
      stats.sampleCount = stats.samples.length;
      delete stats.samples; // No devolver todos los datos raw
      delete stats.sum;
    }

    return latencyByRegion;
  }

  /**
   * Obtiene métricas para Prometheus
   */
  getMetrics() {
    const status = this.getStatus();
    const metrics = {
      multilocation_enabled_locations: status.enabledLocations,
      multilocation_apis_monitored: status.apisMonitored
    };

    // Métricas por API y ubicación
    for (const [apiId, result] of Object.entries(status.results)) {
      const sanitizedApiId = apiId.replace(/[^a-zA-Z0-9]/g, '_');
      metrics[`multilocation_${sanitizedApiId}_healthy`] = result.successful;
      metrics[`multilocation_${sanitizedApiId}_failed`] = result.failed;
      metrics[`multilocation_${sanitizedApiId}_avg_latency`] = result.averageLatency;

      // Por ubicación
      for (const [locId, locResult] of Object.entries(result.byLocation)) {
        const sanitizedLocId = locId.replace(/[^a-zA-Z0-9]/g, '_');
        metrics[`multilocation_${sanitizedApiId}_${sanitizedLocId}_latency`] = locResult.latency || 0;
        metrics[`multilocation_${sanitizedApiId}_${sanitizedLocId}_success`] = locResult.success ? 1 : 0;
      }
    }

    return metrics;
  }

  /**
   * Genera reporte de monitoreo multi-ubicación
   */
  generateReport() {
    const status = this.getStatus();
    const latencyByRegion = this.getLatencyByRegion();

    return {
      title: 'Multi-Location Monitor Report',
      generatedAt: new Date().toISOString(),
      summary: {
        locationsEnabled: status.enabledLocations,
        totalLocations: status.totalLocations,
        apisMonitored: status.apisMonitored
      },
      locations: this.getEnabledLocations(),
      latencyByRegion,
      currentStatus: status.results,
      recentIssues: this.history
        .flatMap(h => h.results.flatMap(r => {
          const issues = this.detectRegionalIssues(r.results);
          return issues.map(i => ({
            ...i,
            apiId: r.apiId,
            timestamp: h.timestamp
          }));
        }))
        .slice(-20)
    };
  }
}

export default MultiLocationMonitor;
