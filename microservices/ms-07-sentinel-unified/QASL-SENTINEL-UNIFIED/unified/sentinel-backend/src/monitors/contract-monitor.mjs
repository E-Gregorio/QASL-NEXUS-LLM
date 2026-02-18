/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                       CONTRACT MONITOR v1.0                                  ║
 * ║              Monitoreo de Contratos y Schema Drift                           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Detecta cambios en la estructura de respuestas de APIs:                     ║
 * ║  - Schema Drift Detection (campos añadidos/eliminados/modificados)           ║
 * ║  - Breaking Changes Alert                                                    ║
 * ║  - Contract Versioning                                                       ║
 * ║  - Backward Compatibility Check                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { EventEmitter } from 'events';
import https from 'https';
import http from 'http';
import crypto from 'crypto';

export class ContractMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      checkInterval: config.checkInterval || 3600000, // 1 hora
      timeout: config.timeout || 30000,
      strictMode: config.strictMode || false, // Si true, cualquier cambio es breaking
      ignoreAdditions: config.ignoreAdditions || false, // Ignorar campos nuevos
      sampleSize: config.sampleSize || 5, // Número de muestras para establecer baseline
      ...config
    };

    // Contratos baseline: apiId -> { schema, samples, version }
    this.contracts = new Map();

    // Historial de cambios
    this.changeHistory = [];

    // Alertas activas
    this.activeAlerts = [];

    this.checkInterval = null;
  }

  /**
   * Inicia el monitor de contratos
   */
  start() {
    console.log('🔄 Contract Monitor iniciado');
    this.checkInterval = setInterval(() => this.runChecks(), this.config.checkInterval);
  }

  /**
   * Detiene el monitor
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('🔄 Contract Monitor detenido');
  }

  /**
   * Registra una API para monitoreo de contrato
   */
  async registerApi(api, options = {}) {
    const apiId = api.id || api.url;

    // Si ya tiene un contrato definido (OpenAPI/Swagger), usarlo
    if (api.spec || options.schema) {
      this.contracts.set(apiId, {
        api,
        schema: this.normalizeSchema(options.schema || this.extractSchemaFromSpec(api.spec)),
        schemaHash: this.hashSchema(options.schema || api.spec),
        source: options.schema ? 'manual' : 'spec',
        version: options.version || '1.0.0',
        createdAt: new Date().toISOString(),
        samples: [],
        status: 'active'
      });
    } else {
      // Aprender el schema de las respuestas reales
      const samples = await this.collectSamples(api, options.sampleSize || this.config.sampleSize);
      const inferredSchema = this.inferSchemaFromSamples(samples);

      this.contracts.set(apiId, {
        api,
        schema: inferredSchema,
        schemaHash: this.hashSchema(inferredSchema),
        source: 'inferred',
        version: '1.0.0-inferred',
        createdAt: new Date().toISOString(),
        samples,
        status: 'active'
      });
    }

    return this.contracts.get(apiId);
  }

  /**
   * Recolecta muestras de respuesta de una API
   */
  async collectSamples(api, count = 5) {
    const samples = [];

    for (let i = 0; i < count; i++) {
      try {
        const response = await this.fetchApiResponse(api);
        samples.push({
          timestamp: new Date().toISOString(),
          statusCode: response.statusCode,
          body: response.body,
          headers: response.headers
        });

        // Pequeña pausa entre requests
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.error(`Error collecting sample ${i + 1} for ${api.name}:`, error.message);
      }
    }

    return samples;
  }

  /**
   * Infiere schema de múltiples muestras
   */
  inferSchemaFromSamples(samples) {
    const validSamples = samples.filter(s => s.statusCode === 200 && s.body);

    if (validSamples.length === 0) {
      return { type: 'unknown', fields: {} };
    }

    // Parsear bodies JSON
    const parsedBodies = validSamples.map(s => {
      try {
        return JSON.parse(s.body);
      } catch {
        return null;
      }
    }).filter(Boolean);

    if (parsedBodies.length === 0) {
      return { type: 'non-json', rawSample: validSamples[0].body.substring(0, 500) };
    }

    // Inferir schema del primer body y validar con el resto
    return this.inferObjectSchema(parsedBodies);
  }

  /**
   * Infiere schema de un conjunto de objetos
   */
  inferObjectSchema(objects) {
    if (objects.length === 0) return { type: 'empty' };

    const first = objects[0];

    if (Array.isArray(first)) {
      return {
        type: 'array',
        items: first.length > 0 ? this.inferValueSchema(first[0], objects.map(o => o[0])) : { type: 'unknown' },
        minLength: Math.min(...objects.map(o => o?.length || 0)),
        maxLength: Math.max(...objects.map(o => o?.length || 0))
      };
    }

    if (typeof first === 'object' && first !== null) {
      const schema = {
        type: 'object',
        fields: {},
        required: [],
        optional: []
      };

      // Recolectar todos los campos de todas las muestras
      const allFields = new Set();
      for (const obj of objects) {
        if (obj && typeof obj === 'object') {
          Object.keys(obj).forEach(k => allFields.add(k));
        }
      }

      // Para cada campo, determinar tipo y si es requerido
      for (const field of allFields) {
        const values = objects.map(o => o?.[field]);
        const presentCount = values.filter(v => v !== undefined).length;

        schema.fields[field] = this.inferValueSchema(values.find(v => v !== undefined), values.filter(v => v !== undefined));

        if (presentCount === objects.length) {
          schema.required.push(field);
        } else {
          schema.optional.push(field);
        }
      }

      return schema;
    }

    return this.inferValueSchema(first, objects);
  }

  /**
   * Infiere schema de un valor
   */
  inferValueSchema(value, allValues = [value]) {
    if (value === null) {
      return { type: 'null', nullable: true };
    }

    if (Array.isArray(value)) {
      return {
        type: 'array',
        items: value.length > 0 ?
          this.inferValueSchema(value[0], allValues.flat().filter(Boolean)) :
          { type: 'unknown' }
      };
    }

    switch (typeof value) {
      case 'string':
        // Detectar formatos especiales
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
          return { type: 'string', format: 'date-time' };
        }
        if (/^[a-f0-9-]{36}$/i.test(value)) {
          return { type: 'string', format: 'uuid' };
        }
        if (/^[\w.-]+@[\w.-]+\.\w+$/.test(value)) {
          return { type: 'string', format: 'email' };
        }
        if (/^https?:\/\//.test(value)) {
          return { type: 'string', format: 'uri' };
        }
        return {
          type: 'string',
          minLength: Math.min(...allValues.filter(v => typeof v === 'string').map(v => v.length)),
          maxLength: Math.max(...allValues.filter(v => typeof v === 'string').map(v => v.length))
        };

      case 'number':
        const numbers = allValues.filter(v => typeof v === 'number');
        return {
          type: Number.isInteger(value) ? 'integer' : 'number',
          minimum: Math.min(...numbers),
          maximum: Math.max(...numbers)
        };

      case 'boolean':
        return { type: 'boolean' };

      case 'object':
        return this.inferObjectSchema(allValues.filter(v => v && typeof v === 'object'));

      default:
        return { type: typeof value };
    }
  }

  /**
   * Normaliza un schema para comparación
   */
  normalizeSchema(schema) {
    if (!schema) return { type: 'unknown' };

    // Si viene de OpenAPI/Swagger
    if (schema.properties) {
      return {
        type: 'object',
        fields: Object.entries(schema.properties).reduce((acc, [key, value]) => {
          acc[key] = this.normalizeSchema(value);
          return acc;
        }, {}),
        required: schema.required || [],
        optional: Object.keys(schema.properties).filter(k => !(schema.required || []).includes(k))
      };
    }

    return schema;
  }

  /**
   * Extrae schema de una especificación OpenAPI
   */
  extractSchemaFromSpec(spec) {
    if (!spec) return null;

    // Buscar respuestas 200 en los paths
    const schemas = {};

    if (spec.paths) {
      for (const [path, methods] of Object.entries(spec.paths)) {
        for (const [method, operation] of Object.entries(methods)) {
          if (operation.responses?.['200']?.content?.['application/json']?.schema) {
            schemas[`${method.toUpperCase()} ${path}`] = operation.responses['200'].content['application/json'].schema;
          }
        }
      }
    }

    return schemas;
  }

  /**
   * Ejecuta verificaciones de contratos
   */
  async runChecks() {
    const results = [];

    for (const [apiId, contract] of this.contracts.entries()) {
      try {
        const result = await this.checkContract(apiId, contract);
        results.push(result);

        if (result.changes.length > 0) {
          this.emit('contract-change', {
            apiId,
            api: contract.api,
            changes: result.changes,
            severity: result.severity,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`Error checking contract for ${apiId}:`, error.message);
      }
    }

    return results;
  }

  /**
   * Verifica un contrato específico
   */
  async checkContract(apiId, contract) {
    // Obtener respuesta actual
    const currentResponse = await this.fetchApiResponse(contract.api);

    let currentBody;
    try {
      currentBody = JSON.parse(currentResponse.body);
    } catch {
      return {
        apiId,
        status: 'error',
        error: 'Response is not valid JSON',
        changes: [{
          type: 'format-change',
          severity: 'breaking',
          message: 'API response is no longer valid JSON'
        }],
        severity: 'breaking'
      };
    }

    // Inferir schema actual
    const currentSchema = this.inferObjectSchema([currentBody]);

    // Comparar con baseline
    const changes = this.compareSchemas(contract.schema, currentSchema);

    // Determinar severidad
    let severity = 'none';
    if (changes.some(c => c.severity === 'breaking')) {
      severity = 'breaking';
    } else if (changes.some(c => c.severity === 'warning')) {
      severity = 'warning';
    } else if (changes.length > 0) {
      severity = 'info';
    }

    // Guardar en historial
    if (changes.length > 0) {
      this.changeHistory.push({
        apiId,
        timestamp: new Date().toISOString(),
        changes,
        severity,
        previousSchema: contract.schema,
        newSchema: currentSchema
      });

      // Si hay cambios breaking, crear alerta
      if (severity === 'breaking') {
        this.activeAlerts.push({
          apiId,
          api: contract.api,
          type: 'breaking-change',
          severity: 'critical',
          changes,
          timestamp: new Date().toISOString()
        });
      }
    }

    return {
      apiId,
      status: changes.length === 0 ? 'healthy' : 'changed',
      changes,
      severity,
      currentSchema,
      baselineSchema: contract.schema,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Compara dos schemas y detecta cambios
   */
  compareSchemas(baseline, current, path = '') {
    const changes = [];

    // Si no hay baseline, todo es nuevo
    if (!baseline) {
      return [{
        type: 'new-schema',
        path,
        severity: 'info',
        message: 'New schema detected'
      }];
    }

    // Tipos diferentes
    if (baseline.type !== current.type) {
      changes.push({
        type: 'type-change',
        path: path || 'root',
        severity: 'breaking',
        message: `Type changed from ${baseline.type} to ${current.type}`,
        was: baseline.type,
        now: current.type
      });
      return changes;
    }

    // Comparar objetos
    if (baseline.type === 'object' && current.type === 'object') {
      const baselineFields = new Set(Object.keys(baseline.fields || {}));
      const currentFields = new Set(Object.keys(current.fields || {}));

      // Campos eliminados (BREAKING)
      for (const field of baselineFields) {
        if (!currentFields.has(field)) {
          changes.push({
            type: 'field-removed',
            path: path ? `${path}.${field}` : field,
            severity: 'breaking',
            message: `Field '${field}' was removed`,
            wasType: baseline.fields[field]?.type
          });
        }
      }

      // Campos nuevos (generalmente OK, pero puede ser warning)
      for (const field of currentFields) {
        if (!baselineFields.has(field)) {
          if (!this.config.ignoreAdditions) {
            changes.push({
              type: 'field-added',
              path: path ? `${path}.${field}` : field,
              severity: 'info',
              message: `New field '${field}' added`,
              newType: current.fields[field]?.type
            });
          }
        }
      }

      // Campos modificados
      for (const field of baselineFields) {
        if (currentFields.has(field)) {
          const fieldChanges = this.compareSchemas(
            baseline.fields[field],
            current.fields[field],
            path ? `${path}.${field}` : field
          );
          changes.push(...fieldChanges);
        }
      }

      // Cambios en campos requeridos
      const baselineRequired = new Set(baseline.required || []);
      const currentRequired = new Set(current.required || []);

      for (const field of baselineRequired) {
        if (!currentRequired.has(field) && currentFields.has(field)) {
          changes.push({
            type: 'required-to-optional',
            path: path ? `${path}.${field}` : field,
            severity: 'warning',
            message: `Field '${field}' changed from required to optional`
          });
        }
      }

      for (const field of currentRequired) {
        if (!baselineRequired.has(field) && baselineFields.has(field)) {
          changes.push({
            type: 'optional-to-required',
            path: path ? `${path}.${field}` : field,
            severity: 'breaking',
            message: `Field '${field}' changed from optional to required`
          });
        }
      }
    }

    // Comparar arrays
    if (baseline.type === 'array' && current.type === 'array') {
      if (baseline.items && current.items) {
        const itemChanges = this.compareSchemas(
          baseline.items,
          current.items,
          path ? `${path}[]` : '[]'
        );
        changes.push(...itemChanges);
      }
    }

    // Comparar formatos de strings
    if (baseline.type === 'string' && current.type === 'string') {
      if (baseline.format && baseline.format !== current.format) {
        changes.push({
          type: 'format-change',
          path: path || 'root',
          severity: 'warning',
          message: `String format changed from ${baseline.format} to ${current.format || 'none'}`,
          was: baseline.format,
          now: current.format
        });
      }
    }

    return changes;
  }

  /**
   * Fetch response de una API
   */
  async fetchApiResponse(api) {
    return new Promise((resolve, reject) => {
      const url = new URL(api.url);
      const protocol = url.protocol === 'https:' ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: api.method || 'GET',
        timeout: this.config.timeout,
        headers: api.headers || {}
      };

      const req = protocol.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body
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
   * Genera hash de un schema para comparación rápida
   */
  hashSchema(schema) {
    const normalized = JSON.stringify(schema, Object.keys(schema || {}).sort());
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  /**
   * Actualiza el baseline de un contrato
   */
  updateBaseline(apiId, newSchema = null) {
    const contract = this.contracts.get(apiId);
    if (!contract) return null;

    const previousVersion = contract.version;
    const [major, minor, patch] = previousVersion.split('.').map(Number);

    contract.schema = newSchema || contract.schema;
    contract.schemaHash = this.hashSchema(contract.schema);
    contract.version = `${major}.${minor + 1}.0`;
    contract.updatedAt = new Date().toISOString();

    this.contracts.set(apiId, contract);

    this.emit('baseline-updated', {
      apiId,
      previousVersion,
      newVersion: contract.version,
      timestamp: contract.updatedAt
    });

    return contract;
  }

  /**
   * Obtiene el estado de todos los contratos
   */
  getStatus() {
    const status = {
      totalContracts: this.contracts.size,
      healthy: 0,
      changed: 0,
      breaking: 0,
      contracts: {}
    };

    for (const [apiId, contract] of this.contracts.entries()) {
      const recentChanges = this.changeHistory
        .filter(h => h.apiId === apiId)
        .slice(-5);

      const hasBreaking = recentChanges.some(c => c.severity === 'breaking');
      const hasChanges = recentChanges.length > 0;

      if (hasBreaking) status.breaking++;
      else if (hasChanges) status.changed++;
      else status.healthy++;

      status.contracts[apiId] = {
        apiName: contract.api.name,
        source: contract.source,
        version: contract.version,
        status: hasBreaking ? 'breaking' : hasChanges ? 'changed' : 'healthy',
        lastCheck: contract.lastCheck,
        recentChanges
      };
    }

    return status;
  }

  /**
   * Obtiene métricas para Prometheus
   */
  getMetrics() {
    const status = this.getStatus();

    return {
      contract_total: status.totalContracts,
      contract_healthy: status.healthy,
      contract_changed: status.changed,
      contract_breaking: status.breaking,
      contract_changes_total: this.changeHistory.length,
      contract_active_alerts: this.activeAlerts.length
    };
  }

  /**
   * Genera reporte de contratos
   */
  generateReport() {
    const status = this.getStatus();

    return {
      title: 'Contract Monitor Report',
      generatedAt: new Date().toISOString(),
      summary: {
        total: status.totalContracts,
        healthy: status.healthy,
        changed: status.changed,
        breaking: status.breaking
      },
      contracts: Object.entries(status.contracts).map(([id, contract]) => ({
        apiId: id,
        ...contract
      })),
      recentChanges: this.changeHistory.slice(-20),
      activeAlerts: this.activeAlerts
    };
  }
}

export default ContractMonitor;
