/**
 * Security Scanner - Escaneo de seguridad de APIs
 *
 * Detecta vulnerabilidades comunes:
 * - Headers de seguridad faltantes
 * - CORS mal configurado
 * - Exposición de información sensible
 * - SSL/TLS débil
 * - Rate limiting ausente
 * - Autenticación débil
 */

export class SecurityScanner {
  constructor(config = {}) {
    this.config = {
      timeout: config.timeout || 10000,
      followRedirects: config.followRedirects !== false,
      maxRedirects: config.maxRedirects || 5,
      userAgent: config.userAgent || 'QASL-Security-Scanner/1.0',

      // Checks a realizar
      checks: {
        securityHeaders: config.checks?.securityHeaders !== false,
        cors: config.checks?.cors !== false,
        ssl: config.checks?.ssl !== false,
        informationExposure: config.checks?.informationExposure !== false,
        authentication: config.checks?.authentication !== false,
        rateLimiting: config.checks?.rateLimiting !== false,
        httpMethods: config.checks?.httpMethods !== false,
        contentSecurity: config.checks?.contentSecurity !== false
      },

      ...config
    };

    // Headers de seguridad requeridos
    this.requiredHeaders = {
      'strict-transport-security': {
        name: 'HSTS',
        severity: 'high',
        description: 'Fuerza conexiones HTTPS'
      },
      'x-content-type-options': {
        name: 'X-Content-Type-Options',
        severity: 'medium',
        description: 'Previene MIME-sniffing'
      },
      'x-frame-options': {
        name: 'X-Frame-Options',
        severity: 'medium',
        description: 'Previene clickjacking'
      },
      'content-security-policy': {
        name: 'CSP',
        severity: 'medium',
        description: 'Política de seguridad de contenido'
      },
      'x-xss-protection': {
        name: 'XSS Protection',
        severity: 'low',
        description: 'Protección XSS del navegador (legacy)'
      },
      'referrer-policy': {
        name: 'Referrer-Policy',
        severity: 'low',
        description: 'Controla información del referrer'
      },
      'permissions-policy': {
        name: 'Permissions-Policy',
        severity: 'low',
        description: 'Controla características del navegador'
      }
    };

    // Historial de escaneos
    this.scanHistory = [];
  }

  /**
   * Escanea una API completa
   */
  async scan(apiConfig) {
    const startTime = Date.now();

    const result = {
      apiId: apiConfig.id || apiConfig.url,
      url: apiConfig.url,
      method: apiConfig.method || 'GET',
      timestamp: new Date().toISOString(),
      duration: 0,
      findings: [],
      score: 100,
      grade: 'A+',
      summary: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0
      }
    };

    try {
      // Realizar request inicial
      const response = await this.makeRequest(apiConfig);

      // Ejecutar checks
      if (this.config.checks.securityHeaders) {
        const headerFindings = this.checkSecurityHeaders(response.headers);
        result.findings.push(...headerFindings);
      }

      if (this.config.checks.cors) {
        const corsFindings = await this.checkCORS(apiConfig, response.headers);
        result.findings.push(...corsFindings);
      }

      if (this.config.checks.ssl) {
        const sslFindings = this.checkSSL(apiConfig.url);
        result.findings.push(...sslFindings);
      }

      if (this.config.checks.informationExposure) {
        const infoFindings = this.checkInformationExposure(response);
        result.findings.push(...infoFindings);
      }

      if (this.config.checks.authentication) {
        const authFindings = this.checkAuthentication(response);
        result.findings.push(...authFindings);
      }

      if (this.config.checks.rateLimiting) {
        const rateFindings = this.checkRateLimiting(response.headers);
        result.findings.push(...rateFindings);
      }

      if (this.config.checks.httpMethods) {
        const methodFindings = await this.checkHTTPMethods(apiConfig);
        result.findings.push(...methodFindings);
      }

      if (this.config.checks.contentSecurity) {
        const contentFindings = this.checkContentSecurity(response);
        result.findings.push(...contentFindings);
      }

    } catch (error) {
      result.findings.push({
        check: 'connectivity',
        severity: 'critical',
        title: 'Error de conexión',
        description: `No se pudo conectar: ${error.message}`,
        recommendation: 'Verificar que la API esté accesible'
      });
    }

    // Calcular resumen y score
    this.calculateSummary(result);
    this.calculateScore(result);
    result.grade = this.calculateGrade(result.score);

    result.duration = Date.now() - startTime;

    // Guardar en historial
    this.scanHistory.push(result);

    return result;
  }

  /**
   * Realiza request HTTP
   */
  async makeRequest(apiConfig) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(apiConfig.url, {
        method: apiConfig.method || 'GET',
        headers: {
          'User-Agent': this.config.userAgent,
          ...(apiConfig.headers || {})
        },
        redirect: this.config.followRedirects ? 'follow' : 'manual',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Convertir headers a objeto
      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      // Obtener body si es pequeño
      let body = null;
      const contentLength = parseInt(headers['content-length'] || '0');
      if (contentLength < 1024 * 100) { // < 100KB
        try {
          body = await response.text();
        } catch (e) {
          body = null;
        }
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers,
        body,
        url: response.url
      };

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Verifica headers de seguridad
   */
  checkSecurityHeaders(headers) {
    const findings = [];

    for (const [header, info] of Object.entries(this.requiredHeaders)) {
      if (!headers[header]) {
        findings.push({
          check: 'security_headers',
          severity: info.severity,
          title: `Header ${info.name} faltante`,
          description: info.description,
          header,
          recommendation: `Agregar header ${header}`,
          references: ['https://owasp.org/www-project-secure-headers/']
        });
      }
    }

    // Verificar configuración de HSTS
    if (headers['strict-transport-security']) {
      const hsts = headers['strict-transport-security'];
      if (!hsts.includes('max-age=')) {
        findings.push({
          check: 'security_headers',
          severity: 'medium',
          title: 'HSTS mal configurado',
          description: 'El header HSTS no tiene max-age definido',
          recommendation: 'Usar: strict-transport-security: max-age=31536000; includeSubDomains'
        });
      }
    }

    // Verificar X-Content-Type-Options
    if (headers['x-content-type-options'] && headers['x-content-type-options'] !== 'nosniff') {
      findings.push({
        check: 'security_headers',
        severity: 'low',
        title: 'X-Content-Type-Options incorrecto',
        description: 'El valor debe ser "nosniff"',
        recommendation: 'Usar: x-content-type-options: nosniff'
      });
    }

    // Verificar headers que no deberían estar
    const dangerousHeaders = ['server', 'x-powered-by', 'x-aspnet-version'];
    for (const header of dangerousHeaders) {
      if (headers[header]) {
        findings.push({
          check: 'security_headers',
          severity: 'low',
          title: `Header ${header} expone información`,
          description: `El header ${header} revela tecnología del servidor`,
          value: headers[header],
          recommendation: `Eliminar o ofuscar el header ${header}`
        });
      }
    }

    return findings;
  }

  /**
   * Verifica configuración CORS
   */
  async checkCORS(apiConfig, headers) {
    const findings = [];

    const acao = headers['access-control-allow-origin'];
    const acac = headers['access-control-allow-credentials'];

    if (acao === '*') {
      if (acac === 'true') {
        findings.push({
          check: 'cors',
          severity: 'critical',
          title: 'CORS peligrosamente permisivo',
          description: 'CORS permite cualquier origen con credenciales',
          recommendation: 'No usar "*" con allow-credentials: true'
        });
      } else {
        findings.push({
          check: 'cors',
          severity: 'medium',
          title: 'CORS permite cualquier origen',
          description: 'Access-Control-Allow-Origin: * permite cualquier dominio',
          recommendation: 'Especificar orígenes permitidos explícitamente'
        });
      }
    }

    // Verificar si refleja el origen
    try {
      const testOrigin = 'https://malicious-site.com';
      const corsResponse = await fetch(apiConfig.url, {
        method: 'OPTIONS',
        headers: {
          'Origin': testOrigin,
          'Access-Control-Request-Method': 'GET'
        }
      });

      const reflectedOrigin = corsResponse.headers.get('access-control-allow-origin');
      if (reflectedOrigin === testOrigin) {
        findings.push({
          check: 'cors',
          severity: 'high',
          title: 'CORS refleja origen arbitrario',
          description: 'El servidor refleja cualquier origen en ACAO',
          recommendation: 'Validar orígenes contra una whitelist'
        });
      }
    } catch (e) {
      // Ignorar errores de preflight
    }

    return findings;
  }

  /**
   * Verifica configuración SSL/TLS
   */
  checkSSL(url) {
    const findings = [];

    // Verificar que usa HTTPS
    if (!url.startsWith('https://')) {
      findings.push({
        check: 'ssl',
        severity: 'critical',
        title: 'API no usa HTTPS',
        description: 'La API usa HTTP en lugar de HTTPS',
        recommendation: 'Migrar a HTTPS con certificado válido'
      });
    }

    // Nota: Verificación completa de TLS requiere librerías especializadas
    // Aquí solo hacemos verificaciones básicas

    return findings;
  }

  /**
   * Verifica exposición de información
   */
  checkInformationExposure(response) {
    const findings = [];

    // Verificar error responses detallados
    if (response.status >= 400 && response.body) {
      // Stack traces
      if (response.body.includes('at ') && response.body.includes('Error:')) {
        findings.push({
          check: 'info_exposure',
          severity: 'high',
          title: 'Stack trace expuesto',
          description: 'La respuesta de error contiene stack trace',
          recommendation: 'Ocultar detalles técnicos en producción'
        });
      }

      // SQL errors
      if (response.body.match(/sql|mysql|postgres|oracle|sqlite/i) &&
          response.body.match(/error|syntax|query/i)) {
        findings.push({
          check: 'info_exposure',
          severity: 'critical',
          title: 'Error SQL expuesto',
          description: 'La respuesta revela errores de base de datos',
          recommendation: 'No exponer errores de base de datos'
        });
      }

      // File paths
      if (response.body.match(/[A-Z]:\\|\/home\/|\/var\/|\/usr\//)) {
        findings.push({
          check: 'info_exposure',
          severity: 'medium',
          title: 'Rutas del sistema expuestas',
          description: 'La respuesta contiene rutas del sistema de archivos',
          recommendation: 'Sanitizar mensajes de error'
        });
      }
    }

    // Verificar headers informativos
    const infoHeaders = ['x-debug', 'x-runtime', 'x-request-id'];
    for (const header of infoHeaders) {
      if (response.headers[header]) {
        findings.push({
          check: 'info_exposure',
          severity: 'info',
          title: `Header informativo: ${header}`,
          description: `El header ${header} puede revelar información`,
          value: response.headers[header]
        });
      }
    }

    return findings;
  }

  /**
   * Verifica autenticación
   */
  checkAuthentication(response) {
    const findings = [];

    // Verificar si recursos sensibles están sin autenticación
    if (response.status === 200) {
      const authHeader = response.headers['www-authenticate'];

      // Si no hay header de autenticación y el endpoint parece sensible
      if (!authHeader) {
        const url = response.url.toLowerCase();
        const sensitivePatterns = ['/admin', '/api/user', '/api/config', '/internal', '/debug'];

        for (const pattern of sensitivePatterns) {
          if (url.includes(pattern)) {
            findings.push({
              check: 'authentication',
              severity: 'high',
              title: 'Endpoint sensible sin autenticación',
              description: `El endpoint ${pattern} parece no requerir autenticación`,
              recommendation: 'Implementar autenticación para endpoints sensibles'
            });
            break;
          }
        }
      }
    }

    // Verificar tipo de autenticación
    const authHeader = response.headers['www-authenticate'];
    if (authHeader && authHeader.toLowerCase().includes('basic')) {
      findings.push({
        check: 'authentication',
        severity: 'medium',
        title: 'Autenticación Basic detectada',
        description: 'Basic Auth envía credenciales en base64 (no encriptado)',
        recommendation: 'Usar OAuth 2.0 o JWT para mayor seguridad'
      });
    }

    return findings;
  }

  /**
   * Verifica rate limiting
   */
  checkRateLimiting(headers) {
    const findings = [];

    const rateLimitHeaders = [
      'x-rate-limit-limit',
      'x-ratelimit-limit',
      'ratelimit-limit',
      'retry-after',
      'x-rate-limit-remaining'
    ];

    const hasRateLimit = rateLimitHeaders.some(h => headers[h]);

    if (!hasRateLimit) {
      findings.push({
        check: 'rate_limiting',
        severity: 'medium',
        title: 'Rate limiting no detectado',
        description: 'No se encontraron headers de rate limiting',
        recommendation: 'Implementar rate limiting para prevenir abusos'
      });
    }

    return findings;
  }

  /**
   * Verifica métodos HTTP permitidos
   */
  async checkHTTPMethods(apiConfig) {
    const findings = [];

    try {
      // Verificar métodos peligrosos
      const dangerousMethods = ['TRACE', 'TRACK'];

      for (const method of dangerousMethods) {
        try {
          const response = await fetch(apiConfig.url, {
            method,
            headers: { 'User-Agent': this.config.userAgent }
          });

          if (response.status !== 405 && response.status !== 501) {
            findings.push({
              check: 'http_methods',
              severity: 'medium',
              title: `Método ${method} habilitado`,
              description: `El método ${method} está habilitado y puede usarse para ataques XST`,
              recommendation: `Deshabilitar el método ${method}`
            });
          }
        } catch (e) {
          // Método no soportado, está bien
        }
      }

      // Verificar OPTIONS para ver métodos permitidos
      const optionsResponse = await fetch(apiConfig.url, {
        method: 'OPTIONS',
        headers: { 'User-Agent': this.config.userAgent }
      });

      const allowHeader = optionsResponse.headers.get('allow');
      if (allowHeader) {
        const methods = allowHeader.split(',').map(m => m.trim().toUpperCase());

        // Verificar si PUT/DELETE están habilitados globalmente
        if (methods.includes('DELETE') || methods.includes('PUT')) {
          findings.push({
            check: 'http_methods',
            severity: 'info',
            title: 'Métodos modificadores habilitados',
            description: `Los métodos ${methods.filter(m => ['PUT', 'DELETE', 'PATCH'].includes(m)).join(', ')} están habilitados`,
            allowedMethods: methods,
            recommendation: 'Verificar que solo los métodos necesarios estén habilitados'
          });
        }
      }
    } catch (e) {
      // Ignorar errores
    }

    return findings;
  }

  /**
   * Verifica seguridad de contenido
   */
  checkContentSecurity(response) {
    const findings = [];

    // Verificar Content-Type
    const contentType = response.headers['content-type'];
    if (!contentType) {
      findings.push({
        check: 'content_security',
        severity: 'low',
        title: 'Content-Type no especificado',
        description: 'La respuesta no tiene header Content-Type',
        recommendation: 'Siempre especificar Content-Type'
      });
    }

    // Verificar charset para prevenir encoding attacks
    if (contentType && contentType.includes('text/html') && !contentType.includes('charset')) {
      findings.push({
        check: 'content_security',
        severity: 'low',
        title: 'Charset no especificado',
        description: 'El Content-Type no especifica charset',
        recommendation: 'Agregar charset=utf-8 al Content-Type'
      });
    }

    // Verificar JSON response
    if (contentType && contentType.includes('application/json') && response.body) {
      try {
        const json = JSON.parse(response.body);

        // Verificar si hay datos sensibles
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey', 'api_key'];
        const foundSensitive = this.findSensitiveFields(json, sensitiveFields);

        if (foundSensitive.length > 0) {
          findings.push({
            check: 'content_security',
            severity: 'high',
            title: 'Posibles datos sensibles en respuesta',
            description: `Campos potencialmente sensibles encontrados: ${foundSensitive.join(', ')}`,
            recommendation: 'No exponer datos sensibles en respuestas'
          });
        }
      } catch (e) {
        // JSON inválido
      }
    }

    return findings;
  }

  /**
   * Busca campos sensibles en objeto JSON
   */
  findSensitiveFields(obj, sensitiveNames, path = '', found = []) {
    if (!obj || typeof obj !== 'object') return found;

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (sensitiveNames.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
        found.push(currentPath);
      }

      if (typeof value === 'object' && value !== null) {
        this.findSensitiveFields(value, sensitiveNames, currentPath, found);
      }
    }

    return found;
  }

  /**
   * Calcula resumen de findings
   */
  calculateSummary(result) {
    for (const finding of result.findings) {
      const severity = finding.severity || 'info';
      result.summary[severity] = (result.summary[severity] || 0) + 1;
    }
  }

  /**
   * Calcula score de seguridad
   */
  calculateScore(result) {
    // Penalizaciones por severidad
    const penalties = {
      critical: 25,
      high: 15,
      medium: 8,
      low: 3,
      info: 0
    };

    let score = 100;

    for (const finding of result.findings) {
      score -= penalties[finding.severity] || 0;
    }

    result.score = Math.max(0, score);
  }

  /**
   * Calcula grado basado en score
   */
  calculateGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    if (score >= 55) return 'C-';
    if (score >= 50) return 'D';
    return 'F';
  }

  /**
   * Escanea múltiples APIs
   */
  async scanMultiple(apiConfigs, options = {}) {
    const results = [];
    const concurrency = options.concurrency || 3;

    for (let i = 0; i < apiConfigs.length; i += concurrency) {
      const batch = apiConfigs.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(api => this.scan(api))
      );
      results.push(...batchResults);

      // Rate limiting entre batches
      if (i + concurrency < apiConfigs.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Genera reporte consolidado
   */
  async generateReport(scanResults) {
    const report = {
      timestamp: new Date().toISOString(),
      totalApis: scanResults.length,
      summary: {
        avgScore: 0,
        grades: {},
        findings: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0
        }
      },
      topVulnerabilities: [],
      apiResults: scanResults
    };

    // Calcular métricas
    let totalScore = 0;

    for (const result of scanResults) {
      totalScore += result.score;

      report.summary.grades[result.grade] = (report.summary.grades[result.grade] || 0) + 1;

      for (const [severity, count] of Object.entries(result.summary)) {
        report.summary.findings[severity] = (report.summary.findings[severity] || 0) + count;
      }
    }

    report.summary.avgScore = totalScore / scanResults.length;

    // Top vulnerabilidades
    const vulnCount = {};
    for (const result of scanResults) {
      for (const finding of result.findings) {
        const key = `${finding.check}:${finding.title}`;
        if (!vulnCount[key]) {
          vulnCount[key] = {
            ...finding,
            count: 0,
            affectedApis: []
          };
        }
        vulnCount[key].count++;
        vulnCount[key].affectedApis.push(result.apiId);
      }
    }

    report.topVulnerabilities = Object.values(vulnCount)
      .sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        return severityDiff !== 0 ? severityDiff : b.count - a.count;
      })
      .slice(0, 10);

    return report;
  }

  /**
   * Obtiene historial de escaneos
   */
  getScanHistory(options = {}) {
    let history = [...this.scanHistory];

    if (options.apiId) {
      history = history.filter(s => s.apiId === options.apiId);
    }

    if (options.minScore !== undefined) {
      history = history.filter(s => s.score >= options.minScore);
    }

    if (options.maxScore !== undefined) {
      history = history.filter(s => s.score <= options.maxScore);
    }

    if (options.since) {
      const since = new Date(options.since);
      history = history.filter(s => new Date(s.timestamp) >= since);
    }

    if (options.limit) {
      history = history.slice(-options.limit);
    }

    return history;
  }

  /**
   * Obtiene estado del scanner
   */
  getStatus() {
    return {
      scansPerformed: this.scanHistory.length,
      checksEnabled: Object.entries(this.config.checks)
        .filter(([_, enabled]) => enabled)
        .map(([check]) => check),
      config: {
        timeout: this.config.timeout,
        followRedirects: this.config.followRedirects
      }
    };
  }
}

export default SecurityScanner;
