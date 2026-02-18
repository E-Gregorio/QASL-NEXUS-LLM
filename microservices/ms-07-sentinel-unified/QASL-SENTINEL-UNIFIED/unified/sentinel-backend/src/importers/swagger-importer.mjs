/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                          SWAGGER/OPENAPI IMPORTER                            ║
 * ║               Importa APIs desde especificaciones OpenAPI/Swagger            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { readFileSync } from 'fs';
import SwaggerParser from '@apidevtools/swagger-parser';
import { log } from '../core/banner.mjs';

export class SwaggerImporter {
  constructor() {
    this.parser = SwaggerParser;
  }

  /**
   * Importa APIs desde un archivo o URL OpenAPI/Swagger
   */
  async import(source) {
    log(`Importando OpenAPI/Swagger: ${source}`, 'info');

    try {
      // swagger-parser maneja tanto archivos como URLs
      const api = await this.parser.dereference(source);

      const apis = this.parseSpec(api);

      log(`OpenAPI importado: ${apis.length} endpoints detectados`, 'success');
      return apis;
    } catch (error) {
      log(`Error importando OpenAPI: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Parsea la especificación OpenAPI
   */
  parseSpec(spec) {
    const apis = [];
    const baseUrl = this.getBaseUrl(spec);
    const globalSecurity = spec.security || [];

    // Iterar sobre paths
    for (const [path, pathItem] of Object.entries(spec.paths || {})) {
      // Iterar sobre métodos
      for (const method of ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']) {
        const operation = pathItem[method];
        if (!operation) continue;

        const api = this.parseOperation(
          path,
          method.toUpperCase(),
          operation,
          pathItem,
          baseUrl,
          spec,
          globalSecurity
        );

        apis.push(api);
      }
    }

    return apis;
  }

  /**
   * Obtiene la URL base del spec
   */
  getBaseUrl(spec) {
    // OpenAPI 3.x
    if (spec.servers && spec.servers.length > 0) {
      return spec.servers[0].url;
    }

    // Swagger 2.x
    if (spec.host) {
      const scheme = spec.schemes?.[0] || 'https';
      const basePath = spec.basePath || '';
      return `${scheme}://${spec.host}${basePath}`;
    }

    return '';
  }

  /**
   * Parsea una operación/endpoint
   */
  parseOperation(path, method, operation, pathItem, baseUrl, spec, globalSecurity) {
    // Construir URL completa
    const url = `${baseUrl}${path}`;

    // Determinar autenticación
    const auth = this.parseAuth(operation.security || globalSecurity, spec);

    // Parsear parámetros
    const params = this.parseParameters([
      ...(pathItem.parameters || []),
      ...(operation.parameters || [])
    ]);

    // Parsear request body (OpenAPI 3.x)
    const body = operation.requestBody ?
      this.parseRequestBody(operation.requestBody) : null;

    // Determinar prioridad
    const priority = this.determinePriority(path, method, operation.tags);

    return {
      id: this.generateId(method, path),
      name: operation.summary || operation.operationId || `${method} ${path}`,
      description: operation.description,
      url: url,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      pathParams: params.path,
      queryParams: params.query,
      headerParams: params.header,
      body: body,
      auth: auth,
      priority: priority,
      tags: operation.tags || [],
      source: 'swagger',
      metadata: {
        operationId: operation.operationId,
        deprecated: operation.deprecated || false,
        responses: this.parseResponses(operation.responses),
        importedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Parsea la autenticación del spec
   */
  parseAuth(security, spec) {
    if (!security || security.length === 0) {
      return { type: 'none', detected: [] };
    }

    const securitySchemes = spec.components?.securitySchemes ||
      spec.securityDefinitions || {};

    const auth = {
      type: 'none',
      detected: [],
      schemes: []
    };

    for (const requirement of security) {
      for (const [schemeName, scopes] of Object.entries(requirement)) {
        const scheme = securitySchemes[schemeName];
        if (!scheme) continue;

        auth.schemes.push({
          name: schemeName,
          scopes: scopes
        });

        // Determinar tipo
        const type = scheme.type?.toLowerCase();
        const schemeType = scheme.scheme?.toLowerCase();

        if (type === 'http' && schemeType === 'bearer') {
          auth.type = 'bearer';
          auth.detected.push(`Bearer Token (${schemeName})`);
        } else if (type === 'oauth2') {
          auth.type = 'oauth2';
          auth.detected.push(`OAuth2 (${schemeName})`);
          auth.oauth2 = {
            flows: scheme.flows,
            scopes: scopes
          };
        } else if (type === 'apikey') {
          auth.type = 'api-key';
          auth.detected.push(`API Key en ${scheme.in}: ${scheme.name}`);
          auth.apiKey = {
            in: scheme.in,
            name: scheme.name
          };
        } else if (type === 'http' && schemeType === 'basic') {
          auth.type = 'basic';
          auth.detected.push('Basic Auth');
        } else if (type === 'openidconnect') {
          auth.type = 'oidc';
          auth.detected.push(`OpenID Connect (${schemeName})`);
          auth.oidcUrl = scheme.openIdConnectUrl;
        }
      }
    }

    return auth;
  }

  /**
   * Parsea los parámetros
   */
  parseParameters(parameters) {
    const result = {
      path: {},
      query: {},
      header: {}
    };

    for (const param of parameters) {
      const location = param.in;
      const name = param.name;

      const paramInfo = {
        name: name,
        required: param.required || false,
        description: param.description,
        schema: param.schema,
        example: param.example || this.generateExample(param.schema)
      };

      if (location === 'path') {
        result.path[name] = paramInfo;
      } else if (location === 'query') {
        result.query[name] = paramInfo;
      } else if (location === 'header') {
        result.header[name] = paramInfo;
      }
    }

    return result;
  }

  /**
   * Parsea el request body
   */
  parseRequestBody(requestBody) {
    const content = requestBody.content;
    if (!content) return null;

    // Preferir JSON
    const jsonContent = content['application/json'];
    if (jsonContent) {
      return {
        type: 'json',
        required: requestBody.required || false,
        schema: jsonContent.schema,
        example: jsonContent.example ||
          jsonContent.examples?.[Object.keys(jsonContent.examples)[0]]?.value ||
          this.generateExampleFromSchema(jsonContent.schema)
      };
    }

    // Form data
    const formContent = content['application/x-www-form-urlencoded'] ||
      content['multipart/form-data'];
    if (formContent) {
      return {
        type: formContent === content['multipart/form-data'] ? 'multipart' : 'form',
        required: requestBody.required || false,
        schema: formContent.schema
      };
    }

    return null;
  }

  /**
   * Parsea las responses
   */
  parseResponses(responses) {
    const result = {};

    for (const [code, response] of Object.entries(responses || {})) {
      result[code] = {
        description: response.description,
        schema: response.content?.['application/json']?.schema
      };
    }

    return result;
  }

  /**
   * Genera un ejemplo desde un schema
   */
  generateExampleFromSchema(schema) {
    if (!schema) return null;

    if (schema.example) return schema.example;

    if (schema.type === 'object' && schema.properties) {
      const example = {};
      for (const [key, prop] of Object.entries(schema.properties)) {
        example[key] = this.generateExample(prop);
      }
      return example;
    }

    if (schema.type === 'array' && schema.items) {
      return [this.generateExample(schema.items)];
    }

    return this.generateExample(schema);
  }

  /**
   * Genera un ejemplo según el tipo
   */
  generateExample(schema) {
    if (!schema) return null;
    if (schema.example) return schema.example;
    if (schema.default) return schema.default;

    switch (schema.type) {
      case 'string':
        if (schema.format === 'date') return '2025-01-01';
        if (schema.format === 'date-time') return '2025-01-01T00:00:00Z';
        if (schema.format === 'email') return 'user@example.com';
        if (schema.format === 'uuid') return '550e8400-e29b-41d4-a716-446655440000';
        if (schema.enum) return schema.enum[0];
        return 'string';
      case 'integer':
      case 'number':
        return schema.minimum || 0;
      case 'boolean':
        return true;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return null;
    }
  }

  /**
   * Genera ID único
   */
  generateId(method, path) {
    const normalizedPath = path.replace(/\{[^}]+\}/g, '_id_');
    return `${method}_${normalizedPath}`.replace(/[^a-zA-Z0-9]/g, '_');
  }

  /**
   * Determina prioridad
   */
  determinePriority(path, method, tags = []) {
    const criticalPaths = ['/auth', '/login', '/token', '/payment', '/transfer'];
    const criticalTags = ['auth', 'authentication', 'payment', 'security'];

    if (criticalPaths.some(p => path.toLowerCase().includes(p))) {
      return 'critical';
    }

    if (tags.some(t => criticalTags.includes(t.toLowerCase()))) {
      return 'critical';
    }

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return 'normal';
    }

    return 'low';
  }

  /**
   * Descarga y parsea un OpenAPI desde URL
   */
  async importFromUrl(url) {
    return this.import(url);
  }

  /**
   * Analiza un spec y devuelve estadísticas
   */
  async analyze(source) {
    const api = await this.parser.dereference(source);

    const stats = {
      title: api.info?.title,
      version: api.info?.version,
      totalEndpoints: 0,
      methods: {},
      tags: new Set(),
      authTypes: new Set(),
      deprecated: 0
    };

    for (const [path, pathItem] of Object.entries(api.paths || {})) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
        const operation = pathItem[method];
        if (!operation) continue;

        stats.totalEndpoints++;
        stats.methods[method.toUpperCase()] = (stats.methods[method.toUpperCase()] || 0) + 1;

        for (const tag of operation.tags || []) {
          stats.tags.add(tag);
        }

        if (operation.deprecated) {
          stats.deprecated++;
        }
      }
    }

    // Auth types
    const securitySchemes = api.components?.securitySchemes || api.securityDefinitions || {};
    for (const scheme of Object.values(securitySchemes)) {
      stats.authTypes.add(scheme.type);
    }

    stats.tags = Array.from(stats.tags);
    stats.authTypes = Array.from(stats.authTypes);

    return stats;
  }
}
