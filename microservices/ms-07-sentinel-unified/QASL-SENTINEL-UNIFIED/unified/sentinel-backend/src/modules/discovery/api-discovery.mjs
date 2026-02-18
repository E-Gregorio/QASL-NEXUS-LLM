/**
 * API Discovery - Auto-descubrimiento de APIs
 *
 * Descubre APIs automáticamente mediante:
 * - Análisis de tráfico de red
 * - Parsing de documentación (Swagger/OpenAPI)
 * - Crawling de endpoints conocidos
 * - Análisis de código fuente
 */

export class ApiDiscovery {
  constructor(config = {}) {
    this.config = {
      // Timeouts
      timeout: config.timeout || 10000,
      crawlDelay: config.crawlDelay || 500,

      // Límites
      maxEndpoints: config.maxEndpoints || 1000,
      maxDepth: config.maxDepth || 3,

      // Paths comunes a explorar
      commonPaths: config.commonPaths || [
        '/api', '/api/v1', '/api/v2', '/api/v3',
        '/rest', '/graphql', '/ws',
        '/swagger.json', '/openapi.json', '/api-docs',
        '/swagger/v1/swagger.json', '/v1/swagger.json',
        '/.well-known/openapi.json',
        '/health', '/healthz', '/ready', '/live',
        '/status', '/info', '/version', '/metrics'
      ],

      // Patrones de endpoints
      endpointPatterns: config.endpointPatterns || [
        '/api/*',
        '/v[0-9]/*',
        '*/query',
        '*/search',
        '*/list',
        '*/get*',
        '*/create*',
        '*/update*',
        '*/delete*'
      ],

      // Headers para requests
      userAgent: config.userAgent || 'QASL-API-Discovery/1.0',

      ...config
    };

    // APIs descubiertas
    this.discoveredApis = new Map();

    // Historial de descubrimientos
    this.discoveryHistory = [];
  }

  /**
   * Descubre APIs desde un base URL
   */
  async discover(baseUrl, options = {}) {
    const startTime = Date.now();

    const result = {
      baseUrl,
      timestamp: new Date().toISOString(),
      duration: 0,
      endpoints: [],
      swagger: null,
      summary: {
        total: 0,
        byMethod: {},
        byCategory: {}
      }
    };

    try {
      // 1. Buscar documentación OpenAPI/Swagger
      const swaggerDoc = await this.findSwaggerDoc(baseUrl);
      if (swaggerDoc) {
        result.swagger = {
          found: true,
          url: swaggerDoc.url,
          version: swaggerDoc.version,
          title: swaggerDoc.title
        };

        // Extraer endpoints del Swagger
        const swaggerEndpoints = this.parseSwaggerDoc(swaggerDoc.doc, baseUrl);
        result.endpoints.push(...swaggerEndpoints);
      }

      // 2. Crawlear paths comunes
      const discoveredPaths = await this.crawlCommonPaths(baseUrl, options);
      result.endpoints.push(...discoveredPaths);

      // 3. Si hay endpoints, intentar descubrir más con fuzzing ligero
      if (options.fuzz && result.endpoints.length > 0) {
        const fuzzedEndpoints = await this.fuzzEndpoints(baseUrl, result.endpoints);
        result.endpoints.push(...fuzzedEndpoints);
      }

      // 4. Deduplicar endpoints
      result.endpoints = this.deduplicateEndpoints(result.endpoints);

      // 5. Categorizar endpoints
      this.categorizeEndpoints(result.endpoints);

      // 6. Calcular resumen
      this.calculateSummary(result);

      // Guardar en cache
      for (const endpoint of result.endpoints) {
        this.discoveredApis.set(`${endpoint.method}:${endpoint.url}`, endpoint);
      }

    } catch (error) {
      result.error = error.message;
    }

    result.duration = Date.now() - startTime;

    // Guardar en historial
    this.discoveryHistory.push({
      baseUrl,
      timestamp: result.timestamp,
      endpointsFound: result.endpoints.length,
      duration: result.duration
    });

    return result;
  }

  /**
   * Busca documentación OpenAPI/Swagger
   */
  async findSwaggerDoc(baseUrl) {
    const swaggerPaths = [
      '/swagger.json',
      '/openapi.json',
      '/api-docs',
      '/swagger/v1/swagger.json',
      '/v1/swagger.json',
      '/v2/swagger.json',
      '/v3/swagger.json',
      '/.well-known/openapi.json',
      '/api/swagger.json',
      '/api/openapi.json',
      '/docs/swagger.json',
      '/api-docs/swagger.json'
    ];

    for (const path of swaggerPaths) {
      try {
        const url = new URL(path, baseUrl).href;
        const response = await this.makeRequest(url);

        if (response.status === 200 && response.body) {
          try {
            const doc = JSON.parse(response.body);

            // Verificar que es un documento OpenAPI válido
            if (doc.swagger || doc.openapi) {
              return {
                url,
                doc,
                version: doc.swagger || doc.openapi,
                title: doc.info?.title
              };
            }
          } catch (e) {
            // No es JSON válido
          }
        }
      } catch (e) {
        // Path no existe o error de conexión
      }
    }

    return null;
  }

  /**
   * Parsea documento Swagger/OpenAPI
   */
  parseSwaggerDoc(doc, baseUrl) {
    const endpoints = [];

    // Determinar base path
    let basePath = '';
    if (doc.basePath) {
      basePath = doc.basePath;
    } else if (doc.servers && doc.servers.length > 0) {
      try {
        const serverUrl = new URL(doc.servers[0].url, baseUrl);
        basePath = serverUrl.pathname;
      } catch (e) {
        basePath = doc.servers[0].url;
      }
    }

    // Extraer paths
    const paths = doc.paths || {};

    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, details] of Object.entries(methods)) {
        if (['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method.toLowerCase())) {
          const fullPath = basePath + path;
          const url = new URL(fullPath, baseUrl).href;

          endpoints.push({
            url,
            method: method.toUpperCase(),
            path: fullPath,
            summary: details.summary || '',
            description: details.description || '',
            operationId: details.operationId,
            tags: details.tags || [],
            parameters: this.extractParameters(details.parameters || []),
            requestBody: this.extractRequestBody(details.requestBody),
            responses: this.extractResponses(details.responses || {}),
            security: details.security,
            source: 'swagger',
            discovered: new Date().toISOString()
          });
        }
      }
    }

    return endpoints;
  }

  /**
   * Extrae parámetros del Swagger
   */
  extractParameters(params) {
    return params.map(p => ({
      name: p.name,
      in: p.in,
      required: p.required || false,
      type: p.schema?.type || p.type,
      description: p.description
    }));
  }

  /**
   * Extrae request body del Swagger
   */
  extractRequestBody(requestBody) {
    if (!requestBody) return null;

    const content = requestBody.content || {};
    const types = Object.keys(content);

    return {
      required: requestBody.required || false,
      contentTypes: types,
      schema: types.length > 0 ? content[types[0]]?.schema : null
    };
  }

  /**
   * Extrae respuestas del Swagger
   */
  extractResponses(responses) {
    const result = {};

    for (const [code, details] of Object.entries(responses)) {
      result[code] = {
        description: details.description || '',
        contentTypes: details.content ? Object.keys(details.content) : []
      };
    }

    return result;
  }

  /**
   * Crawlea paths comunes
   */
  async crawlCommonPaths(baseUrl, options = {}) {
    const endpoints = [];
    const tested = new Set();

    for (const path of this.config.commonPaths) {
      try {
        const url = new URL(path, baseUrl).href;

        if (tested.has(url)) continue;
        tested.add(url);

        // Probar GET
        const response = await this.makeRequest(url);

        if (response.status < 400) {
          const endpoint = {
            url,
            method: 'GET',
            path,
            status: response.status,
            contentType: response.headers['content-type'],
            source: 'crawl',
            discovered: new Date().toISOString()
          };

          // Detectar tipo de endpoint
          endpoint.type = this.detectEndpointType(url, response);

          endpoints.push(endpoint);

          // Si es JSON, intentar inferir estructura
          if (response.body && response.headers['content-type']?.includes('json')) {
            try {
              const data = JSON.parse(response.body);
              endpoint.responseSchema = this.inferSchema(data);
            } catch (e) {
              // Ignore
            }
          }
        }

        // Rate limiting
        await this.delay(this.config.crawlDelay);

      } catch (e) {
        // Path no accesible
      }
    }

    return endpoints;
  }

  /**
   * Fuzzing ligero de endpoints
   */
  async fuzzEndpoints(baseUrl, existingEndpoints) {
    const fuzzedEndpoints = [];
    const tested = new Set();

    // Extraer patrones de endpoints existentes
    for (const endpoint of existingEndpoints) {
      const url = new URL(endpoint.url);
      const pathParts = url.pathname.split('/').filter(p => p);

      // Intentar variaciones
      const variations = this.generateVariations(pathParts);

      for (const variation of variations) {
        const testUrl = new URL('/' + variation.join('/'), baseUrl).href;

        if (tested.has(testUrl)) continue;
        tested.add(testUrl);

        if (tested.size > this.config.maxEndpoints) break;

        try {
          const response = await this.makeRequest(testUrl);

          if (response.status < 400 && response.status !== 404) {
            fuzzedEndpoints.push({
              url: testUrl,
              method: 'GET',
              path: '/' + variation.join('/'),
              status: response.status,
              source: 'fuzz',
              discovered: new Date().toISOString()
            });
          }

          await this.delay(this.config.crawlDelay);

        } catch (e) {
          // Ignore
        }
      }
    }

    return fuzzedEndpoints;
  }

  /**
   * Genera variaciones de paths
   */
  generateVariations(pathParts) {
    const variations = [];

    // Variaciones de versión
    const versionPattern = /^v\d+$/;
    const versions = ['v1', 'v2', 'v3'];

    for (let i = 0; i < pathParts.length; i++) {
      if (versionPattern.test(pathParts[i])) {
        for (const v of versions) {
          if (v !== pathParts[i]) {
            const newPath = [...pathParts];
            newPath[i] = v;
            variations.push(newPath);
          }
        }
      }
    }

    // Añadir plurales/singulares
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      if (part.endsWith('s') && part.length > 2) {
        const singular = part.slice(0, -1);
        const newPath = [...pathParts];
        newPath[i] = singular;
        variations.push(newPath);
      } else if (!part.endsWith('s') && part.length > 1) {
        const plural = part + 's';
        const newPath = [...pathParts];
        newPath[i] = plural;
        variations.push(newPath);
      }
    }

    return variations;
  }

  /**
   * Detecta tipo de endpoint
   */
  detectEndpointType(url, response) {
    const urlLower = url.toLowerCase();

    if (urlLower.includes('swagger') || urlLower.includes('openapi')) return 'documentation';
    if (urlLower.includes('health') || urlLower.includes('ready') || urlLower.includes('live')) return 'health';
    if (urlLower.includes('metrics')) return 'metrics';
    if (urlLower.includes('graphql')) return 'graphql';
    if (urlLower.includes('ws') || urlLower.includes('websocket')) return 'websocket';
    if (urlLower.includes('auth') || urlLower.includes('login') || urlLower.includes('token')) return 'auth';

    if (response.headers['content-type']?.includes('json')) return 'rest';
    if (response.headers['content-type']?.includes('xml')) return 'soap';
    if (response.headers['content-type']?.includes('html')) return 'web';

    return 'unknown';
  }

  /**
   * Infiere schema de datos JSON
   */
  inferSchema(data, depth = 0) {
    if (depth > 5) return { type: 'any' };

    if (data === null) return { type: 'null' };
    if (typeof data === 'boolean') return { type: 'boolean' };
    if (typeof data === 'number') return { type: Number.isInteger(data) ? 'integer' : 'number' };
    if (typeof data === 'string') return { type: 'string' };

    if (Array.isArray(data)) {
      if (data.length === 0) return { type: 'array', items: { type: 'any' } };
      return {
        type: 'array',
        items: this.inferSchema(data[0], depth + 1)
      };
    }

    if (typeof data === 'object') {
      const properties = {};
      for (const [key, value] of Object.entries(data)) {
        properties[key] = this.inferSchema(value, depth + 1);
      }
      return {
        type: 'object',
        properties
      };
    }

    return { type: 'any' };
  }

  /**
   * Deduplica endpoints
   */
  deduplicateEndpoints(endpoints) {
    const seen = new Map();

    for (const endpoint of endpoints) {
      const key = `${endpoint.method}:${endpoint.url}`;

      if (!seen.has(key)) {
        seen.set(key, endpoint);
      } else {
        // Merge información
        const existing = seen.get(key);
        seen.set(key, {
          ...existing,
          ...endpoint,
          sources: [existing.source, endpoint.source].filter(Boolean)
        });
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Categoriza endpoints
   */
  categorizeEndpoints(endpoints) {
    for (const endpoint of endpoints) {
      const url = endpoint.url.toLowerCase();
      const path = endpoint.path?.toLowerCase() || '';

      // Categorizar por tipo de operación
      if (path.includes('/create') || path.includes('/add') || path.includes('/new')) {
        endpoint.category = 'create';
      } else if (path.includes('/update') || path.includes('/edit') || path.includes('/modify')) {
        endpoint.category = 'update';
      } else if (path.includes('/delete') || path.includes('/remove')) {
        endpoint.category = 'delete';
      } else if (path.includes('/get') || path.includes('/list') || path.includes('/query') || path.includes('/search')) {
        endpoint.category = 'read';
      } else if (path.includes('/auth') || path.includes('/login') || path.includes('/logout')) {
        endpoint.category = 'auth';
      } else if (path.includes('/health') || path.includes('/status')) {
        endpoint.category = 'health';
      } else {
        endpoint.category = 'other';
      }

      // Estimar criticidad
      if (endpoint.category === 'auth') {
        endpoint.criticality = 'critical';
      } else if (['create', 'update', 'delete'].includes(endpoint.category)) {
        endpoint.criticality = 'high';
      } else if (endpoint.category === 'read') {
        endpoint.criticality = 'normal';
      } else {
        endpoint.criticality = 'low';
      }
    }
  }

  /**
   * Calcula resumen
   */
  calculateSummary(result) {
    result.summary.total = result.endpoints.length;

    for (const endpoint of result.endpoints) {
      // Por método
      const method = endpoint.method || 'UNKNOWN';
      result.summary.byMethod[method] = (result.summary.byMethod[method] || 0) + 1;

      // Por categoría
      const category = endpoint.category || 'other';
      result.summary.byCategory[category] = (result.summary.byCategory[category] || 0) + 1;
    }
  }

  /**
   * Realiza request HTTP
   */
  async makeRequest(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'application/json, text/html, */*'
        },
        redirect: 'follow',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      let body = null;
      const contentLength = parseInt(headers['content-length'] || '0');
      if (contentLength < 1024 * 500) { // < 500KB
        try {
          body = await response.text();
        } catch (e) {
          body = null;
        }
      }

      return {
        status: response.status,
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
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Descubre APIs desde HAR file
   */
  async discoverFromHar(harContent) {
    const endpoints = [];

    try {
      const har = typeof harContent === 'string' ? JSON.parse(harContent) : harContent;

      for (const entry of har.log.entries) {
        const request = entry.request;
        const response = entry.response;

        // Filtrar solo requests API
        const contentType = response.content?.mimeType || '';
        if (contentType.includes('json') || contentType.includes('xml')) {
          endpoints.push({
            url: request.url,
            method: request.method,
            status: response.status,
            contentType,
            timing: entry.time,
            headers: request.headers,
            source: 'har',
            discovered: new Date().toISOString()
          });
        }
      }

    } catch (error) {
      throw new Error(`Error parsing HAR: ${error.message}`);
    }

    return this.deduplicateEndpoints(endpoints);
  }

  /**
   * Obtiene APIs descubiertas
   */
  getDiscoveredApis(options = {}) {
    let apis = Array.from(this.discoveredApis.values());

    if (options.method) {
      apis = apis.filter(a => a.method === options.method.toUpperCase());
    }

    if (options.category) {
      apis = apis.filter(a => a.category === options.category);
    }

    if (options.source) {
      apis = apis.filter(a => a.source === options.source || a.sources?.includes(options.source));
    }

    return apis;
  }

  /**
   * Exporta APIs descubiertas a formato de configuración
   */
  exportToConfig(apis) {
    return apis.map(api => ({
      id: this.generateApiId(api),
      name: api.summary || this.generateApiName(api),
      url: api.url,
      method: api.method,
      priority: api.criticality === 'critical' ? 'critical' :
                api.criticality === 'high' ? 'normal' : 'low',
      headers: api.parameters?.filter(p => p.in === 'header').map(p => ({
        name: p.name,
        value: `{{${p.name}}}`
      })) || [],
      body: api.requestBody?.schema || null,
      expectedStatus: [200, 201, 204],
      tags: api.tags || []
    }));
  }

  /**
   * Genera ID para API
   */
  generateApiId(api) {
    const url = new URL(api.url);
    const pathParts = url.pathname.split('/').filter(p => p && !p.startsWith('{'));
    return `${api.method.toLowerCase()}_${pathParts.join('_')}`.replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Genera nombre legible para API
   */
  generateApiName(api) {
    const url = new URL(api.url);
    const pathParts = url.pathname.split('/').filter(p => p && !p.startsWith('{'));
    const lastPart = pathParts[pathParts.length - 1] || 'api';

    return `${api.method} ${lastPart}`;
  }

  /**
   * Obtiene historial de descubrimientos
   */
  getDiscoveryHistory() {
    return [...this.discoveryHistory];
  }

  /**
   * Obtiene estado del módulo
   */
  getStatus() {
    return {
      discoveredApisCount: this.discoveredApis.size,
      discoveryCount: this.discoveryHistory.length,
      config: {
        timeout: this.config.timeout,
        maxEndpoints: this.config.maxEndpoints,
        commonPathsCount: this.config.commonPaths.length
      }
    };
  }
}

export default ApiDiscovery;
