/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                      CONNECTIVITY MONITOR v1.0                               ║
 * ║         Monitoreo de Conectividad Front-End ↔ API                           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Detecta problemas de conectividad entre Front-End y APIs:                   ║
 * ║  - CORS Issues                                                                ║
 * ║  - SSL/TLS Certificate Problems                                               ║
 * ║  - DNS Resolution Failures                                                    ║
 * ║  - Network Path Issues                                                        ║
 * ║  - Authentication Flow Problems                                               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { EventEmitter } from 'events';
import https from 'https';
import http from 'http';
import dns from 'dns';
import { promisify } from 'util';
import tls from 'tls';

const dnsLookup = promisify(dns.lookup);
const dnsResolve = promisify(dns.resolve);

export class ConnectivityMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      checkInterval: config.checkInterval || 60000, // 1 minuto
      timeout: config.timeout || 10000,
      corsOrigins: config.corsOrigins || ['http://localhost:3000', 'http://localhost:4200'],
      sslWarningDays: config.sslWarningDays || 30,
      ...config
    };

    this.connections = new Map(); // apiId -> connection status
    this.frontendApis = new Map(); // APIs capturadas desde frontend
    this.issues = [];
    this.stats = {
      totalChecks: 0,
      corsIssues: 0,
      sslIssues: 0,
      dnsIssues: 0,
      networkIssues: 0,
      authIssues: 0
    };

    this.checkInterval = null;
  }

  /**
   * Inicia el monitor de conectividad
   */
  start() {
    console.log('🔗 Connectivity Monitor iniciado');
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
    console.log('🔗 Connectivity Monitor detenido');
  }

  /**
   * Registra una API para monitoreo de conectividad
   */
  registerApi(api, options = {}) {
    const connectionInfo = {
      api,
      source: options.source || 'swagger', // swagger, har, playwright, manual
      frontendOrigin: options.frontendOrigin || null,
      expectedCors: options.expectedCors || this.config.corsOrigins,
      lastCheck: null,
      status: 'pending',
      issues: []
    };

    this.connections.set(api.id || api.url, connectionInfo);

    // Si viene de Playwright, es una API real del frontend
    if (options.source === 'playwright' || options.source === 'har') {
      this.frontendApis.set(api.id || api.url, {
        ...connectionInfo,
        capturedFrom: options.capturedFrom || 'unknown',
        capturedAt: new Date().toISOString()
      });
    }

    return connectionInfo;
  }

  /**
   * Ejecuta todas las verificaciones de conectividad
   */
  async runChecks() {
    this.stats.totalChecks++;
    const results = [];

    for (const [apiId, connInfo] of this.connections.entries()) {
      try {
        const result = await this.checkConnectivity(connInfo);
        results.push(result);

        // Emitir evento si hay problemas
        if (result.issues.length > 0) {
          this.emit('connectivity-issue', {
            apiId,
            api: connInfo.api,
            issues: result.issues,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`Error checking connectivity for ${apiId}:`, error.message);
      }
    }

    this.emit('checks-completed', {
      total: results.length,
      healthy: results.filter(r => r.status === 'healthy').length,
      issues: results.filter(r => r.status !== 'healthy').length
    });

    return results;
  }

  /**
   * Verifica la conectividad completa de una API
   */
  async checkConnectivity(connInfo) {
    const api = connInfo.api;
    const url = new URL(api.url);
    const issues = [];
    const checks = {};

    // 1. DNS Check
    checks.dns = await this.checkDns(url.hostname);
    if (!checks.dns.success) {
      issues.push({
        type: 'dns',
        severity: 'critical',
        message: checks.dns.error,
        details: checks.dns
      });
      this.stats.dnsIssues++;
    }

    // 2. SSL/TLS Check (solo para HTTPS)
    if (url.protocol === 'https:') {
      checks.ssl = await this.checkSsl(url.hostname, url.port || 443);
      if (!checks.ssl.success) {
        issues.push({
          type: 'ssl',
          severity: checks.ssl.expiringSoon ? 'warning' : 'critical',
          message: checks.ssl.error || 'SSL Certificate Issue',
          details: checks.ssl
        });
        this.stats.sslIssues++;
      }
    }

    // 3. CORS Check
    checks.cors = await this.checkCors(api.url, connInfo.expectedCors);
    if (!checks.cors.success) {
      issues.push({
        type: 'cors',
        severity: 'critical',
        message: 'CORS not properly configured',
        details: checks.cors
      });
      this.stats.corsIssues++;
    }

    // 4. Network Path Check
    checks.network = await this.checkNetworkPath(api.url);
    if (!checks.network.success) {
      issues.push({
        type: 'network',
        severity: 'critical',
        message: checks.network.error,
        details: checks.network
      });
      this.stats.networkIssues++;
    }

    // 5. Authentication Check (si aplica)
    if (api.auth && api.auth.type !== 'none') {
      checks.auth = await this.checkAuthFlow(api);
      if (!checks.auth.success) {
        issues.push({
          type: 'auth',
          severity: 'warning',
          message: 'Authentication flow issue',
          details: checks.auth
        });
        this.stats.authIssues++;
      }
    }

    // Actualizar estado
    connInfo.lastCheck = new Date().toISOString();
    connInfo.issues = issues;
    connInfo.status = issues.length === 0 ? 'healthy' :
                      issues.some(i => i.severity === 'critical') ? 'critical' : 'warning';
    connInfo.checks = checks;

    this.connections.set(api.id || api.url, connInfo);

    return {
      apiId: api.id || api.url,
      apiName: api.name,
      status: connInfo.status,
      issues,
      checks,
      timestamp: connInfo.lastCheck
    };
  }

  /**
   * Verifica resolución DNS
   */
  async checkDns(hostname) {
    try {
      const startTime = Date.now();
      const result = await dnsLookup(hostname);
      const duration = Date.now() - startTime;

      // También verificar registros adicionales
      let records = {};
      try {
        records.a = await dnsResolve(hostname, 'A').catch(() => []);
        records.aaaa = await dnsResolve(hostname, 'AAAA').catch(() => []);
        records.cname = await dnsResolve(hostname, 'CNAME').catch(() => []);
      } catch (e) {
        // Algunos registros pueden no existir
      }

      return {
        success: true,
        ip: result.address,
        family: result.family,
        duration,
        records
      };
    } catch (error) {
      return {
        success: false,
        error: `DNS resolution failed: ${error.message}`,
        code: error.code
      };
    }
  }

  /**
   * Verifica certificado SSL/TLS
   */
  async checkSsl(hostname, port = 443) {
    return new Promise((resolve) => {
      const socket = tls.connect(port, hostname, {
        rejectUnauthorized: false, // Para poder inspeccionar certificados inválidos
        servername: hostname
      }, () => {
        const cert = socket.getPeerCertificate();
        socket.end();

        if (!cert || Object.keys(cert).length === 0) {
          resolve({
            success: false,
            error: 'No certificate found'
          });
          return;
        }

        const now = new Date();
        const validFrom = new Date(cert.valid_from);
        const validTo = new Date(cert.valid_to);
        const daysUntilExpiry = Math.floor((validTo - now) / (1000 * 60 * 60 * 24));

        const isValid = now >= validFrom && now <= validTo;
        const expiringSoon = daysUntilExpiry <= this.config.sslWarningDays;

        resolve({
          success: isValid && !expiringSoon,
          isValid,
          expiringSoon,
          daysUntilExpiry,
          issuer: cert.issuer,
          subject: cert.subject,
          validFrom: validFrom.toISOString(),
          validTo: validTo.toISOString(),
          fingerprint: cert.fingerprint,
          error: !isValid ? 'Certificate is invalid or expired' :
                 expiringSoon ? `Certificate expires in ${daysUntilExpiry} days` : null
        });
      });

      socket.on('error', (error) => {
        resolve({
          success: false,
          error: `SSL connection failed: ${error.message}`,
          code: error.code
        });
      });

      socket.setTimeout(this.config.timeout, () => {
        socket.destroy();
        resolve({
          success: false,
          error: 'SSL connection timeout'
        });
      });
    });
  }

  /**
   * Verifica configuración CORS
   */
  async checkCors(apiUrl, expectedOrigins) {
    const results = {
      success: true,
      origins: {}
    };

    for (const origin of expectedOrigins) {
      try {
        const corsResult = await this.testCorsForOrigin(apiUrl, origin);
        results.origins[origin] = corsResult;

        if (!corsResult.allowed) {
          results.success = false;
        }
      } catch (error) {
        results.origins[origin] = {
          allowed: false,
          error: error.message
        };
        results.success = false;
      }
    }

    return results;
  }

  /**
   * Prueba CORS para un origen específico
   */
  async testCorsForOrigin(apiUrl, origin) {
    return new Promise((resolve) => {
      const url = new URL(apiUrl);
      const protocol = url.protocol === 'https:' ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'OPTIONS',
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        },
        timeout: this.config.timeout
      };

      const req = protocol.request(options, (res) => {
        const allowOrigin = res.headers['access-control-allow-origin'];
        const allowMethods = res.headers['access-control-allow-methods'];
        const allowHeaders = res.headers['access-control-allow-headers'];
        const allowCredentials = res.headers['access-control-allow-credentials'];

        const allowed = allowOrigin === '*' || allowOrigin === origin;

        resolve({
          allowed,
          statusCode: res.statusCode,
          headers: {
            'access-control-allow-origin': allowOrigin,
            'access-control-allow-methods': allowMethods,
            'access-control-allow-headers': allowHeaders,
            'access-control-allow-credentials': allowCredentials
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          allowed: false,
          error: error.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          allowed: false,
          error: 'CORS preflight request timeout'
        });
      });

      req.end();
    });
  }

  /**
   * Verifica la ruta de red hacia la API
   */
  async checkNetworkPath(apiUrl) {
    return new Promise((resolve) => {
      const url = new URL(apiUrl);
      const protocol = url.protocol === 'https:' ? https : http;
      const startTime = Date.now();

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'HEAD',
        timeout: this.config.timeout
      };

      const req = protocol.request(options, (res) => {
        const duration = Date.now() - startTime;

        resolve({
          success: true,
          statusCode: res.statusCode,
          duration,
          headers: {
            server: res.headers['server'],
            'content-type': res.headers['content-type'],
            'x-powered-by': res.headers['x-powered-by']
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          error: `Network error: ${error.message}`,
          code: error.code,
          duration: Date.now() - startTime
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          error: 'Network request timeout',
          duration: Date.now() - startTime
        });
      });

      req.end();
    });
  }

  /**
   * Verifica el flujo de autenticación
   */
  async checkAuthFlow(api) {
    // Verificación básica del endpoint de auth
    const authConfig = api.auth;

    if (!authConfig) {
      return { success: true, message: 'No auth required' };
    }

    const checks = {
      type: authConfig.type,
      configValid: true,
      issues: []
    };

    // Verificar configuración según tipo
    switch (authConfig.type) {
      case 'oauth2':
        if (!authConfig.tokenUrl) {
          checks.configValid = false;
          checks.issues.push('Missing tokenUrl for OAuth2');
        }
        if (!authConfig.clientId) {
          checks.configValid = false;
          checks.issues.push('Missing clientId for OAuth2');
        }
        // Verificar que el token endpoint es accesible
        if (authConfig.tokenUrl) {
          const tokenEndpoint = await this.checkNetworkPath(authConfig.tokenUrl);
          checks.tokenEndpointReachable = tokenEndpoint.success;
          if (!tokenEndpoint.success) {
            checks.issues.push(`Token endpoint unreachable: ${tokenEndpoint.error}`);
          }
        }
        break;

      case 'jwt':
      case 'bearer':
        // Verificar que hay un token o forma de obtenerlo
        if (!authConfig.token && !authConfig.tokenUrl) {
          checks.issues.push('No token or tokenUrl configured');
        }
        break;

      case 'api-key':
        if (!authConfig.key) {
          checks.configValid = false;
          checks.issues.push('Missing API key');
        }
        break;

      case 'basic':
        if (!authConfig.username || !authConfig.password) {
          checks.configValid = false;
          checks.issues.push('Missing username or password for Basic auth');
        }
        break;
    }

    return {
      success: checks.configValid && checks.issues.length === 0,
      ...checks
    };
  }

  /**
   * Obtiene el estado de conectividad de todas las APIs
   */
  getStatus() {
    const status = {
      totalApis: this.connections.size,
      frontendApis: this.frontendApis.size,
      swaggerApis: [...this.connections.values()].filter(c => c.source === 'swagger').length,
      healthy: 0,
      warning: 0,
      critical: 0,
      pending: 0,
      issues: [],
      stats: this.stats
    };

    for (const [apiId, connInfo] of this.connections.entries()) {
      switch (connInfo.status) {
        case 'healthy': status.healthy++; break;
        case 'warning': status.warning++; break;
        case 'critical': status.critical++; break;
        default: status.pending++;
      }

      if (connInfo.issues.length > 0) {
        status.issues.push({
          apiId,
          apiName: connInfo.api.name,
          source: connInfo.source,
          issues: connInfo.issues
        });
      }
    }

    return status;
  }

  /**
   * Obtiene métricas para Prometheus
   */
  getMetrics() {
    const status = this.getStatus();

    return {
      connectivity_apis_total: status.totalApis,
      connectivity_frontend_apis: status.frontendApis,
      connectivity_swagger_apis: status.swaggerApis,
      connectivity_healthy: status.healthy,
      connectivity_warning: status.warning,
      connectivity_critical: status.critical,
      connectivity_cors_issues: this.stats.corsIssues,
      connectivity_ssl_issues: this.stats.sslIssues,
      connectivity_dns_issues: this.stats.dnsIssues,
      connectivity_network_issues: this.stats.networkIssues,
      connectivity_auth_issues: this.stats.authIssues,
      connectivity_checks_total: this.stats.totalChecks
    };
  }

  /**
   * Genera reporte de conectividad
   */
  generateReport() {
    const status = this.getStatus();

    return {
      title: 'Connectivity Monitor Report',
      generatedAt: new Date().toISOString(),
      summary: {
        total: status.totalApis,
        fromFrontend: status.frontendApis,
        fromSwagger: status.swaggerApis,
        healthy: status.healthy,
        withIssues: status.warning + status.critical
      },
      issuesByType: {
        cors: this.stats.corsIssues,
        ssl: this.stats.sslIssues,
        dns: this.stats.dnsIssues,
        network: this.stats.networkIssues,
        auth: this.stats.authIssues
      },
      details: [...this.connections.entries()].map(([id, info]) => ({
        apiId: id,
        apiName: info.api.name,
        url: info.api.url,
        source: info.source,
        status: info.status,
        lastCheck: info.lastCheck,
        issues: info.issues,
        checks: info.checks
      }))
    };
  }
}

export default ConnectivityMonitor;
