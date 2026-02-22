/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    QASL-API-SENTINEL - Template Manager                       ║
 * ║                    Gestión de Templates de Industria                          ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  QASL NEXUS LLM                                                               ║
 * ║  Elyer Gregorio Maldonado                                                     ║
 * ║  Plataforma QA Multi-LLM                                                      ║
 * ║  Líder Técnico QA: Elyer Gregorio Maldonado                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TemplateManager {
  constructor() {
    this.templatesDir = __dirname;
    this.templates = new Map();
  }

  /**
   * Lista todos los templates disponibles
   */
  async listTemplates() {
    const files = await fs.readdir(this.templatesDir);
    const templates = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const templatePath = path.join(this.templatesDir, file);
        const content = await fs.readFile(templatePath, 'utf-8');
        const template = JSON.parse(content);
        templates.push({
          id: file.replace('.json', ''),
          name: template.name,
          description: template.description,
          industry: template.industry,
          apiCount: template.apis?.length || 0,
          sla: template.sla
        });
      }
    }

    return templates;
  }

  /**
   * Carga un template por ID
   */
  async loadTemplate(templateId) {
    const templatePath = path.join(this.templatesDir, `${templateId}.json`);

    try {
      const content = await fs.readFile(templatePath, 'utf-8');
      const template = JSON.parse(content);
      this.templates.set(templateId, template);
      return template;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Template '${templateId}' not found. Use 'sentinel templates list' to see available templates.`);
      }
      throw error;
    }
  }

  /**
   * Genera configuración de APIs desde un template
   */
  async generateConfig(templateId, options = {}) {
    const template = await this.loadTemplate(templateId);
    const { baseUrl = 'http://localhost:3000', outputPath } = options;

    // Reemplazar variables en las URLs
    const apis = template.apis.map(api => ({
      ...api,
      url: api.url.replace('{{BASE_URL}}', baseUrl)
    }));

    const config = {
      name: options.projectName || template.name,
      description: template.description,
      generatedFrom: templateId,
      generatedAt: new Date().toISOString(),
      baseUrl,
      apis,
      alerts: template.alerts,
      sla: template.sla,
      monitoring: template.monitoring
    };

    if (outputPath) {
      await fs.writeFile(outputPath, JSON.stringify(config, null, 2));
    }

    return config;
  }

  /**
   * Valida un template
   */
  async validateTemplate(templateId) {
    const template = await this.loadTemplate(templateId);
    const errors = [];
    const warnings = [];

    // Validar estructura básica
    if (!template.name) errors.push('Missing required field: name');
    if (!template.apis || !Array.isArray(template.apis)) errors.push('Missing or invalid apis array');

    // Validar cada API
    if (template.apis) {
      template.apis.forEach((api, index) => {
        if (!api.id) errors.push(`API ${index}: missing id`);
        if (!api.url) errors.push(`API ${index}: missing url`);
        if (!api.method) errors.push(`API ${index}: missing method`);
        if (!api.threshold_ms) warnings.push(`API ${index}: no threshold_ms defined, using default`);
        if (!api.priority) warnings.push(`API ${index}: no priority defined`);
      });
    }

    // Validar SLA
    if (!template.sla) {
      warnings.push('No SLA configuration defined');
    } else {
      if (!template.sla.availability) warnings.push('SLA: no availability target defined');
      if (!template.sla.latency_p95) warnings.push('SLA: no latency_p95 target defined');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalApis: template.apis?.length || 0,
        criticalApis: template.apis?.filter(a => a.priority === 'critical').length || 0,
        highApis: template.apis?.filter(a => a.priority === 'high').length || 0,
        authRequired: template.apis?.filter(a => a.requiresAuth).length || 0
      }
    };
  }

  /**
   * Compara dos templates
   */
  async compareTemplates(templateId1, templateId2) {
    const t1 = await this.loadTemplate(templateId1);
    const t2 = await this.loadTemplate(templateId2);

    return {
      template1: {
        id: templateId1,
        name: t1.name,
        apiCount: t1.apis?.length || 0,
        sla: t1.sla
      },
      template2: {
        id: templateId2,
        name: t2.name,
        apiCount: t2.apis?.length || 0,
        sla: t2.sla
      },
      comparison: {
        apiCountDiff: (t1.apis?.length || 0) - (t2.apis?.length || 0),
        availabilityDiff: (t1.sla?.availability || 0) - (t2.sla?.availability || 0),
        latencyDiff: (t1.sla?.latency_p95 || 0) - (t2.sla?.latency_p95 || 0)
      }
    };
  }

  /**
   * Exporta un template a diferentes formatos
   */
  async exportTemplate(templateId, format = 'json') {
    const template = await this.loadTemplate(templateId);

    switch (format) {
      case 'json':
        return JSON.stringify(template, null, 2);

      case 'yaml':
        return this.toYaml(template);

      case 'markdown':
        return this.toMarkdown(template);

      case 'postman':
        return this.toPostmanCollection(template);

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Convierte a YAML (formato simple)
   */
  toYaml(obj, indent = 0) {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;

      if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        value.forEach(item => {
          if (typeof item === 'object') {
            yaml += `${spaces}- \n${this.toYaml(item, indent + 2)}`;
          } else {
            yaml += `${spaces}- ${item}\n`;
          }
        });
      } else if (typeof value === 'object') {
        yaml += `${spaces}${key}:\n${this.toYaml(value, indent + 1)}`;
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }

    return yaml;
  }

  /**
   * Convierte a Markdown
   */
  toMarkdown(template) {
    let md = `# ${template.name}\n\n`;
    md += `${template.description}\n\n`;
    md += `**Industry:** ${template.industry}\n\n`;

    md += `## APIs (${template.apis?.length || 0})\n\n`;
    md += `| Endpoint | Method | Priority | Threshold |\n`;
    md += `|----------|--------|----------|----------|\n`;

    template.apis?.forEach(api => {
      md += `| ${api.name} | ${api.method} | ${api.priority} | ${api.threshold_ms}ms |\n`;
    });

    if (template.sla) {
      md += `\n## SLA\n\n`;
      md += `- **Availability:** ${template.sla.availability}%\n`;
      md += `- **Latency P95:** ${template.sla.latency_p95}ms\n`;
      md += `- **Latency P99:** ${template.sla.latency_p99}ms\n`;
    }

    return md;
  }

  /**
   * Convierte a Postman Collection
   */
  toPostmanCollection(template) {
    const collection = {
      info: {
        name: template.name,
        description: template.description,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: []
    };

    // Agrupar por categoría
    const categories = {};
    template.apis?.forEach(api => {
      const cat = api.category || 'default';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(api);
    });

    for (const [category, apis] of Object.entries(categories)) {
      const folder = {
        name: category.charAt(0).toUpperCase() + category.slice(1),
        item: apis.map(api => ({
          name: api.name,
          request: {
            method: api.method,
            url: api.url,
            header: api.headers ? Object.entries(api.headers).map(([key, value]) => ({ key, value })) : [],
            body: api.body ? {
              mode: 'raw',
              raw: JSON.stringify(api.body, null, 2),
              options: { raw: { language: 'json' } }
            } : undefined
          }
        }))
      };
      collection.item.push(folder);
    }

    return JSON.stringify(collection, null, 2);
  }
}

// CLI Helper Functions
export async function listTemplates() {
  const manager = new TemplateManager();
  return await manager.listTemplates();
}

export async function loadTemplate(templateId) {
  const manager = new TemplateManager();
  return await manager.loadTemplate(templateId);
}

export async function generateConfig(templateId, options) {
  const manager = new TemplateManager();
  return await manager.generateConfig(templateId, options);
}

export async function validateTemplate(templateId) {
  const manager = new TemplateManager();
  return await manager.validateTemplate(templateId);
}

export async function exportTemplate(templateId, format) {
  const manager = new TemplateManager();
  return await manager.exportTemplate(templateId, format);
}

export default TemplateManager;
