/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                            HAR IMPORTER                                      ║
 * ║        Importa APIs desde archivos HAR (capturados del browser)              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * HAR (HTTP Archive) captura TODO el tráfico del browser:
 * - Las APIs REALES que usa el frontend
 * - Headers exactos (incluyendo tokens)
 * - Cookies de sesión
 * - Payloads reales
 * - Response times reales
 */

import { readFileSync } from 'fs';
import { log } from '../core/banner.mjs';

export class HarImporter {
  constructor() {
    // Patrones para filtrar (excluir recursos estáticos)
    this.excludePatterns = [
      /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i,
      /google-analytics/i,
      /googletagmanager/i,
      /facebook\.com/i,
      /fonts\.googleapis/i,
      /cdn\./i,
      /static\//i,
      /assets\//i
    ];

    // Patrones para detectar APIs
    this.apiPatterns = [
      /\/api\//i,
      /\/v\d+\//i,
      /\/rest\//i,
      /\/graphql/i,
      /\/query/i,
      /\/mutation/i
    ];
  }

  /**
   * Importa APIs desde un archivo HAR
   */
  async import(filePath) {
    log(`Importando HAR: ${filePath}`, 'info');

    const content = readFileSync(filePath, 'utf-8');
    const har = JSON.parse(content);

    if (!har.log || !har.log.entries) {
      throw new Error('Formato HAR inválido');
    }

    const apis = [];
    const seen = new Set(); // Para evitar duplicados

    for (const entry of har.log.entries) {
      const api = this.parseEntry(entry);

      if (api && !seen.has(api.id)) {
        seen.add(api.id);
        apis.push(api);
      }
    }

    log(`HAR importado: ${apis.length} APIs detectadas`, 'success');
    return apis;
  }

  /**
   * Parsea una entrada del HAR
   */
  parseEntry(entry) {
    const request = entry.request;
    const response = entry.response;
    const url = request.url;

    // Filtrar recursos estáticos
    if (this.shouldExclude(url)) {
      return null;
    }

    // Verificar si es una API
    const isApi = this.isApiRequest(request);
    if (!isApi) {
      return null;
    }

    // Parsear URL
    const urlObj = new URL(url);

    // Extraer headers relevantes
    const headers = this.extractHeaders(request.headers);

    // Extraer auth info
    const auth = this.detectAuth(request.headers, request.cookies);

    // Extraer body si existe
    const body = request.postData ? this.parseBody(request.postData) : null;

    // Crear objeto API
    return {
      id: this.generateId(request.method, urlObj),
      name: this.generateName(request.method, urlObj),
      url: `${urlObj.origin}${urlObj.pathname}`,
      method: request.method,
      headers: headers,
      body: body,
      queryParams: Object.fromEntries(urlObj.searchParams),
      auth: auth,
      priority: this.determinePriority(urlObj.pathname, request.method),
      source: 'har',
      metadata: {
        originalUrl: url,
        responseStatus: response.status,
        responseTime: entry.time,
        contentType: response.content?.mimeType,
        importedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Verifica si debe excluir la URL
   */
  shouldExclude(url) {
    return this.excludePatterns.some(pattern => pattern.test(url));
  }

  /**
   * Verifica si es una request de API
   */
  isApiRequest(request) {
    const url = request.url;
    const contentType = request.headers.find(h =>
      h.name.toLowerCase() === 'content-type'
    )?.value || '';

    // Es API si:
    // 1. La URL contiene patrones de API
    // 2. Acepta o envía JSON
    // 3. Es POST/PUT/PATCH/DELETE (generalmente son APIs)

    const urlIsApi = this.apiPatterns.some(pattern => pattern.test(url));
    const isJson = contentType.includes('application/json');
    const isModifyingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);

    return urlIsApi || isJson || isModifyingMethod;
  }

  /**
   * Extrae headers relevantes (sin sensibles)
   */
  extractHeaders(headers) {
    const relevant = {};
    const includeHeaders = [
      'content-type',
      'accept',
      'accept-language',
      'x-requested-with',
      'x-api-version',
      'x-client-version'
    ];

    for (const header of headers) {
      const name = header.name.toLowerCase();
      if (includeHeaders.includes(name)) {
        relevant[header.name] = header.value;
      }
    }

    return relevant;
  }

  /**
   * Detecta el tipo de autenticación
   */
  detectAuth(headers, cookies) {
    const auth = {
      type: 'none',
      detected: []
    };

    // Buscar Authorization header
    const authHeader = headers.find(h =>
      h.name.toLowerCase() === 'authorization'
    );

    if (authHeader) {
      const value = authHeader.value;

      if (value.startsWith('Bearer ')) {
        auth.type = 'bearer';
        auth.detected.push('Bearer token en header Authorization');
        // No guardamos el token real por seguridad
        auth.tokenPattern = 'Bearer {{TOKEN}}';
      } else if (value.startsWith('Basic ')) {
        auth.type = 'basic';
        auth.detected.push('Basic auth en header Authorization');
      } else {
        auth.type = 'custom';
        auth.detected.push('Auth custom en header Authorization');
      }
    }

    // Buscar API Key en headers
    const apiKeyHeaders = ['x-api-key', 'api-key', 'apikey', 'x-auth-token'];
    for (const header of headers) {
      if (apiKeyHeaders.includes(header.name.toLowerCase())) {
        auth.type = 'api-key';
        auth.detected.push(`API Key en header ${header.name}`);
        auth.headerName = header.name;
      }
    }

    // Buscar cookies de sesión
    const sessionCookies = ['jsessionid', 'sessionid', 'session', 'sid', 'connect.sid', 'phpsessid'];
    for (const cookie of cookies || []) {
      if (sessionCookies.includes(cookie.name.toLowerCase())) {
        if (auth.type === 'none') {
          auth.type = 'cookie';
        }
        auth.detected.push(`Cookie de sesión: ${cookie.name}`);
        auth.cookieName = cookie.name;
      }
    }

    // Buscar token en cookies
    const tokenCookies = ['token', 'access_token', 'auth_token', 'jwt'];
    for (const cookie of cookies || []) {
      if (tokenCookies.includes(cookie.name.toLowerCase())) {
        auth.type = 'cookie-token';
        auth.detected.push(`Token en cookie: ${cookie.name}`);
        auth.cookieName = cookie.name;
      }
    }

    return auth;
  }

  /**
   * Parsea el body de la request
   */
  parseBody(postData) {
    if (!postData || !postData.text) {
      return null;
    }

    const mimeType = postData.mimeType || '';

    if (mimeType.includes('application/json')) {
      try {
        return {
          type: 'json',
          data: JSON.parse(postData.text)
        };
      } catch {
        return {
          type: 'json',
          data: postData.text
        };
      }
    }

    if (mimeType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(postData.text);
      return {
        type: 'form',
        data: Object.fromEntries(params)
      };
    }

    if (mimeType.includes('multipart/form-data')) {
      return {
        type: 'multipart',
        data: postData.params || []
      };
    }

    return {
      type: 'raw',
      data: postData.text
    };
  }

  /**
   * Genera un ID único para la API
   */
  generateId(method, urlObj) {
    const path = urlObj.pathname.replace(/\d+/g, '{id}'); // Normalizar IDs numéricos
    return `${method}_${urlObj.host}_${path}`.replace(/[^a-zA-Z0-9]/g, '_');
  }

  /**
   * Genera un nombre legible para la API
   */
  generateName(method, urlObj) {
    const path = urlObj.pathname;
    const parts = path.split('/').filter(p => p && !p.match(/^\d+$/));
    const resource = parts[parts.length - 1] || 'root';

    return `${method} /${resource}`;
  }

  /**
   * Determina la prioridad de monitoreo
   */
  determinePriority(pathname, method) {
    // Endpoints críticos
    const critical = ['/login', '/auth', '/token', '/payment', '/transfer', '/checkout'];
    if (critical.some(c => pathname.toLowerCase().includes(c))) {
      return 'critical';
    }

    // Endpoints de escritura son más importantes
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return 'normal';
    }

    return 'low';
  }

  /**
   * Analiza un HAR y devuelve estadísticas
   */
  async analyze(filePath) {
    const content = readFileSync(filePath, 'utf-8');
    const har = JSON.parse(content);

    const stats = {
      totalRequests: har.log.entries.length,
      apis: 0,
      static: 0,
      methods: {},
      hosts: new Set(),
      authTypes: new Set()
    };

    for (const entry of har.log.entries) {
      const isApi = this.isApiRequest(entry.request);

      if (isApi) {
        stats.apis++;

        // Contar métodos
        const method = entry.request.method;
        stats.methods[method] = (stats.methods[method] || 0) + 1;

        // Hosts
        const url = new URL(entry.request.url);
        stats.hosts.add(url.host);

        // Auth
        const auth = this.detectAuth(entry.request.headers, entry.request.cookies);
        if (auth.type !== 'none') {
          stats.authTypes.add(auth.type);
        }
      } else {
        stats.static++;
      }
    }

    stats.hosts = Array.from(stats.hosts);
    stats.authTypes = Array.from(stats.authTypes);

    return stats;
  }
}
