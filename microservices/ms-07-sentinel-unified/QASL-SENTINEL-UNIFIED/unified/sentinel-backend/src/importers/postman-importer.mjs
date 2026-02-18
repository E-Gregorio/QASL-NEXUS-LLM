/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                          POSTMAN IMPORTER                                    ║
 * ║                Importa APIs desde colecciones Postman                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { readFileSync } from 'fs';
import { log } from '../core/banner.mjs';

export class PostmanImporter {
  constructor() {
    // Variables globales que se encontrarán
    this.variables = {};
  }

  /**
   * Importa APIs desde una colección Postman
   */
  async import(filePath) {
    log(`Importando colección Postman: ${filePath}`, 'info');

    const content = readFileSync(filePath, 'utf-8');
    const collection = JSON.parse(content);

    // Validar formato
    if (!collection.info || !collection.item) {
      throw new Error('Formato de colección Postman inválido');
    }

    // Extraer variables
    if (collection.variable) {
      for (const v of collection.variable) {
        this.variables[v.key] = v.value;
      }
    }

    // Parsear items recursivamente
    const apis = this.parseItems(collection.item, []);

    log(`Colección importada: ${apis.length} requests detectados`, 'success');
    return apis;
  }

  /**
   * Parsea items recursivamente (pueden ser folders o requests)
   */
  parseItems(items, folderPath) {
    const apis = [];

    for (const item of items) {
      // Si tiene sub-items, es un folder
      if (item.item) {
        const newPath = [...folderPath, item.name];
        apis.push(...this.parseItems(item.item, newPath));
      } else if (item.request) {
        // Es un request
        const api = this.parseRequest(item, folderPath);
        if (api) {
          apis.push(api);
        }
      }
    }

    return apis;
  }

  /**
   * Parsea un request de Postman
   */
  parseRequest(item, folderPath) {
    const request = item.request;

    // Obtener URL
    let url, method;

    if (typeof request === 'string') {
      // Formato simplificado
      url = request;
      method = 'GET';
    } else {
      method = request.method || 'GET';

      // URL puede ser string u objeto
      if (typeof request.url === 'string') {
        url = request.url;
      } else if (request.url) {
        url = this.buildUrl(request.url);
      } else {
        return null;
      }
    }

    // Resolver variables
    url = this.resolveVariables(url);

    // Parsear URL
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch {
      // Si no es URL válida, puede tener variables sin resolver
      return {
        id: this.generateId(method, url),
        name: item.name,
        url: url,
        method: method,
        needsConfig: true,
        source: 'postman',
        folderPath: folderPath
      };
    }

    // Extraer headers
    const headers = this.parseHeaders(request.header);

    // Extraer auth
    const auth = this.parseAuth(request.auth, headers);

    // Extraer body
    const body = this.parseBody(request.body);

    // Extraer tests (para referencia)
    const tests = this.parseTests(item.event);

    return {
      id: this.generateId(method, urlObj.pathname),
      name: item.name,
      description: request.description,
      url: `${urlObj.origin}${urlObj.pathname}`,
      method: method,
      headers: headers,
      queryParams: Object.fromEntries(urlObj.searchParams),
      body: body,
      auth: auth,
      priority: this.determinePriority(urlObj.pathname, method),
      tags: folderPath,
      source: 'postman',
      metadata: {
        folderPath: folderPath,
        hasTests: tests.length > 0,
        tests: tests,
        importedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Construye URL desde objeto Postman
   */
  buildUrl(urlObj) {
    // Si hay raw URL, usarla primero
    if (urlObj.raw) {
      return urlObj.raw;
    }

    let url = '';

    // Host - puede ser un array o string
    let host = '';
    if (Array.isArray(urlObj.host)) {
      host = urlObj.host.join('.');
    } else if (urlObj.host) {
      host = urlObj.host;
    }

    // Si el host ya tiene protocolo (o es una variable que lo tendrá), no agregar
    if (host.includes('://') || host.startsWith('{{')) {
      url = host;
    } else {
      const protocol = urlObj.protocol || 'https';
      url = `${protocol}://${host}`;
    }

    // Puerto
    if (urlObj.port) {
      url += `:${urlObj.port}`;
    }

    // Path
    if (urlObj.path) {
      const path = Array.isArray(urlObj.path) ?
        urlObj.path.join('/') : urlObj.path;
      url += `/${path}`;
    }

    // Query params
    if (urlObj.query && urlObj.query.length > 0) {
      const params = urlObj.query
        .filter(q => !q.disabled)
        .map(q => `${q.key}=${q.value || ''}`)
        .join('&');
      if (params) {
        url += `?${params}`;
      }
    }

    return url;
  }

  /**
   * Resuelve variables de Postman {{variable}}
   */
  resolveVariables(text) {
    if (!text) return text;

    return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      return this.variables[varName] || match;
    });
  }

  /**
   * Parsea headers
   */
  parseHeaders(headers) {
    const result = {};

    if (!headers) return result;

    for (const header of headers) {
      if (!header.disabled) {
        result[header.key] = this.resolveVariables(header.value);
      }
    }

    return result;
  }

  /**
   * Parsea autenticación
   */
  parseAuth(auth, headers) {
    const result = {
      type: 'none',
      detected: []
    };

    // Auth de Postman
    if (auth) {
      switch (auth.type) {
        case 'bearer':
          result.type = 'bearer';
          result.detected.push('Bearer Token (configurado en Postman)');
          if (auth.bearer) {
            const tokenValue = auth.bearer.find(b => b.key === 'token')?.value;
            result.tokenPattern = tokenValue ? 'Bearer {{TOKEN}}' : null;
          }
          break;

        case 'basic':
          result.type = 'basic';
          result.detected.push('Basic Auth (configurado en Postman)');
          break;

        case 'oauth2':
          result.type = 'oauth2';
          result.detected.push('OAuth2 (configurado en Postman)');
          break;

        case 'apikey':
          result.type = 'api-key';
          const apiKey = auth.apikey || [];
          const keyName = apiKey.find(a => a.key === 'key')?.value;
          const keyIn = apiKey.find(a => a.key === 'in')?.value || 'header';
          result.detected.push(`API Key en ${keyIn}: ${keyName}`);
          result.apiKey = { name: keyName, in: keyIn };
          break;
      }
    }

    // Detectar auth en headers
    if (headers['Authorization']) {
      const authValue = headers['Authorization'];
      if (authValue.startsWith('Bearer')) {
        result.type = 'bearer';
        result.detected.push('Bearer Token en header');
      } else if (authValue.startsWith('Basic')) {
        result.type = 'basic';
        result.detected.push('Basic Auth en header');
      }
    }

    // Detectar API Key en headers
    const apiKeyHeaders = ['x-api-key', 'api-key', 'apikey'];
    for (const [key, value] of Object.entries(headers)) {
      if (apiKeyHeaders.includes(key.toLowerCase())) {
        result.type = 'api-key';
        result.detected.push(`API Key en header: ${key}`);
      }
    }

    return result;
  }

  /**
   * Parsea body
   */
  parseBody(body) {
    if (!body) return null;

    switch (body.mode) {
      case 'raw':
        const rawContent = this.resolveVariables(body.raw);
        let parsed = rawContent;

        // Intentar parsear como JSON
        try {
          parsed = JSON.parse(rawContent);
        } catch {
          // No es JSON, mantener como string
        }

        return {
          type: body.options?.raw?.language === 'json' ? 'json' : 'raw',
          data: parsed
        };

      case 'formdata':
        return {
          type: 'multipart',
          data: body.formdata?.map(f => ({
            key: f.key,
            value: f.value,
            type: f.type
          })) || []
        };

      case 'urlencoded':
        const urlencoded = {};
        for (const item of body.urlencoded || []) {
          urlencoded[item.key] = item.value;
        }
        return {
          type: 'form',
          data: urlencoded
        };

      case 'file':
        return {
          type: 'file',
          data: body.file
        };

      default:
        return null;
    }
  }

  /**
   * Parsea tests de Postman
   */
  parseTests(events) {
    const tests = [];

    if (!events) return tests;

    for (const event of events) {
      if (event.listen === 'test' && event.script) {
        const script = event.script.exec;
        if (Array.isArray(script)) {
          // Buscar pm.test() calls
          const scriptText = script.join('\n');
          const testMatches = scriptText.match(/pm\.test\s*\(\s*['"]([^'"]+)['"]/g);
          if (testMatches) {
            for (const match of testMatches) {
              const testName = match.match(/['"]([^'"]+)['"]/)?.[1];
              if (testName) {
                tests.push(testName);
              }
            }
          }
        }
      }
    }

    return tests;
  }

  /**
   * Genera ID único
   */
  generateId(method, path) {
    const normalizedPath = path.replace(/\{\{[^}]+\}\}/g, '_var_');
    return `${method}_${normalizedPath}`.replace(/[^a-zA-Z0-9]/g, '_');
  }

  /**
   * Determina prioridad
   */
  determinePriority(pathname, method) {
    const criticalPaths = ['/login', '/auth', '/token', '/payment'];

    if (criticalPaths.some(p => pathname.toLowerCase().includes(p))) {
      return 'critical';
    }

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return 'normal';
    }

    return 'low';
  }

  /**
   * Analiza colección y devuelve estadísticas
   */
  async analyze(filePath) {
    const content = readFileSync(filePath, 'utf-8');
    const collection = JSON.parse(content);

    const stats = {
      name: collection.info?.name,
      totalRequests: 0,
      folders: 0,
      methods: {},
      hasTests: 0,
      variables: Object.keys(collection.variable || []).length
    };

    const countItems = (items) => {
      for (const item of items) {
        if (item.item) {
          stats.folders++;
          countItems(item.item);
        } else if (item.request) {
          stats.totalRequests++;

          const method = typeof item.request === 'string' ?
            'GET' : item.request.method || 'GET';
          stats.methods[method] = (stats.methods[method] || 0) + 1;

          if (item.event?.some(e => e.listen === 'test')) {
            stats.hasTests++;
          }
        }
      }
    };

    countItems(collection.item || []);

    return stats;
  }
}
