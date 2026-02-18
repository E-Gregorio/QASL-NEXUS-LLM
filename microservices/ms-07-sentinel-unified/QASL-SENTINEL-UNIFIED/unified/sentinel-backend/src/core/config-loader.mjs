/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                         CONFIG LOADER                                        ║
 * ║                    Cargador de configuración                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Configuración por defecto
 */
const DEFAULT_CONFIG = {
  apis: [],
  auth: {
    default: 'none',
    strategies: {}
  },
  monitoring: {
    intervals: {
      critical: 30,    // segundos
      normal: 120,     // segundos
      low: 300         // segundos
    },
    thresholds: {
      latency: {
        warning: 1000,  // ms
        critical: 3000  // ms
      },
      errorRate: {
        warning: 0.05,  // 5%
        critical: 0.10  // 10%
      }
    }
  },
  alerts: {
    email: {
      enabled: false,
      recipients: []
    },
    slack: {
      enabled: false,
      webhookUrl: ''
    },
    sms: {
      enabled: false,
      recipients: []
    }
  },
  reports: {
    schedules: {
      every5h: '0 */5 * * *',
      daily: '0 8 * * *',
      weekly: '0 8 * * 1'
    }
  },
  ai: {
    model: 'claude-sonnet-4-20250514',
    language: 'es'
  }
};

export class ConfigLoader {
  constructor(configPath = './config') {
    this.configPath = configPath;
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Carga toda la configuración
   */
  async load() {
    // Asegurar que existe el directorio
    if (!existsSync(this.configPath)) {
      mkdirSync(this.configPath, { recursive: true });
    }

    // Cargar cada archivo de config
    this.loadFile('apis.json', 'apis');
    this.loadFile('auth.json', 'auth');
    this.loadFile('monitoring.json', 'monitoring');
    this.loadFile('alerts.json', 'alerts');
    this.loadFile('reports.json', 'reports');

    // Crear archivos por defecto si no existen
    await this.createDefaultConfigs();

    return this.config;
  }

  /**
   * Carga un archivo de configuración
   */
  loadFile(filename, key) {
    const filePath = join(this.configPath, filename);

    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        this.config[key] = this.mergeDeep(this.config[key], data);
      } catch (error) {
        console.warn(`⚠️ Error cargando ${filename}: ${error.message}`);
      }
    }
  }

  /**
   * Crea archivos de configuración por defecto
   */
  async createDefaultConfigs() {
    // apis.json
    this.createIfNotExists('apis.json', {
      apis: [],
      _comment: 'Lista de APIs a monitorear. Se pueden agregar manualmente o importar desde HAR/Swagger/Postman'
    });

    // auth.json
    this.createIfNotExists('auth.json', {
      default: 'none',
      strategies: {
        bearer: {
          type: 'bearer',
          tokenEnvVar: 'DEFAULT_BEARER_TOKEN'
        },
        keycloak: {
          type: 'keycloak',
          url: '${KEYCLOAK_URL}',
          realm: '${KEYCLOAK_REALM}',
          clientId: '${KEYCLOAK_CLIENT_ID}',
          clientSecret: '${KEYCLOAK_CLIENT_SECRET}'
        },
        oauth2: {
          type: 'oauth2',
          tokenUrl: '${OAUTH2_TOKEN_URL}',
          clientId: '${OAUTH2_CLIENT_ID}',
          clientSecret: '${OAUTH2_CLIENT_SECRET}'
        }
      },
      _comment: 'Configuración de autenticación. Las variables ${VAR} se leen del .env'
    });

    // monitoring.json
    this.createIfNotExists('monitoring.json', {
      intervals: {
        critical: 30,
        normal: 120,
        low: 300
      },
      thresholds: {
        latency: {
          warning: 1000,
          critical: 3000
        },
        errorRate: {
          warning: 0.05,
          critical: 0.10
        }
      },
      _comment: 'Intervalos en segundos, latencia en ms, errorRate en porcentaje decimal'
    });

    // alerts.json
    this.createIfNotExists('alerts.json', {
      email: {
        enabled: false,
        recipients: []
      },
      slack: {
        enabled: false,
        webhookUrl: '',
        channel: '#api-alerts'
      },
      sms: {
        enabled: false,
        recipients: [],
        onlyForCritical: true
      },
      _comment: 'Configuración de alertas. Habilita los canales que necesites'
    });

    // reports.json
    this.createIfNotExists('reports.json', {
      schedules: {
        every5h: '0 */5 * * *',
        daily: '0 8 * * *',
        weekly: '0 8 * * 1'
      },
      recipients: [],
      _comment: 'Expresiones cron para reportes automáticos'
    });
  }

  /**
   * Crea un archivo si no existe
   */
  createIfNotExists(filename, content) {
    const filePath = join(this.configPath, filename);

    if (!existsSync(filePath)) {
      writeFileSync(filePath, JSON.stringify(content, null, 2));
    }
  }

  /**
   * Obtiene un valor de configuración
   */
  get(key) {
    if (!key) return this.config;

    const keys = key.split('.');
    let value = this.config;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Establece un valor de configuración
   */
  set(key, value) {
    const keys = key.split('.');
    let obj = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in obj)) {
        obj[keys[i]] = {};
      }
      obj = obj[keys[i]];
    }

    obj[keys[keys.length - 1]] = value;
  }

  /**
   * Merge profundo de objetos
   */
  mergeDeep(target, source) {
    const output = { ...target };

    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.mergeDeep(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }

    return output;
  }

  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}
