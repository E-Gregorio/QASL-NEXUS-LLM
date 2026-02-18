/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                         SENTINEL CORE ENGINE v2.0                            ║
 * ║                    Orquestador principal del sistema                         ║
 * ║                                                                              ║
 * ║  Módulos de Monitoreo:                                                       ║
 * ║  • Watcher - Vigilancia 24/7 de APIs                                         ║
 * ║  • Security - Detección de intrusos                                          ║
 * ║  • Connectivity - Front-End ↔ API                                            ║
 * ║  • Dependency - API → API (Cascada)                                          ║
 * ║  • MultiLocation - Regiones geográficas                                      ║
 * ║  • Contract - Schema Drift Detection                                         ║
 * ║  • RUM - Real User Monitoring                                                ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { EventEmitter } from 'events';
import { log, displayModuleStatus } from './banner.mjs';
import { Scheduler } from './scheduler.mjs';
import { DataLayer } from './data-layer.mjs';
import { ConfigLoader } from './config-loader.mjs';

// Importers
import { HarImporter } from '../importers/har-importer.mjs';
import { SwaggerImporter } from '../importers/swagger-importer.mjs';
import { PostmanImporter } from '../importers/postman-importer.mjs';

// Auth
import { AuthManager } from '../auth/auth-manager.mjs';

// Core Modules
import { Watcher } from '../modules/watcher/watcher.mjs';
import { SecurityModule } from '../modules/security/security-module.mjs';
import { Predictor } from '../modules/predictor/predictor.mjs';

// Advanced Monitors (v2.0)
import { ConnectivityMonitor } from '../monitors/connectivity-monitor.mjs';
import { DependencyMonitor } from '../monitors/dependency-monitor.mjs';
import { MultiLocationMonitor } from '../monitors/multi-location-monitor.mjs';
import { ContractMonitor } from '../monitors/contract-monitor.mjs';
import { RumMonitor } from '../monitors/rum-monitor.mjs';

// AI
import { AIBrain } from '../ai/brain.mjs';

// Reporters
import { ReportManager } from '../reporters/report-manager.mjs';

// Metrics
import { PrometheusExporter } from '../modules/metrics/prometheus-exporter.mjs';

// Alerts
import { AlertManager } from '../modules/alerts/alert-manager.mjs';

/**
 * Clase principal del Sentinel
 * Orquesta todos los módulos del sistema
 */
export class Sentinel extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      configPath: options.configPath || './config',
      dataPath: options.dataPath || './data',
      ...options
    };

    // Estado del sistema
    this.state = {
      running: false,
      startTime: null,
      apis: [],
      alerts: [],
      metrics: {}
    };

    // Módulos (se inicializan en start)
    this.modules = {
      config: null,
      data: null,
      scheduler: null,
      importers: {
        har: null,
        swagger: null,
        postman: null
      },
      auth: null,
      // Core Modules
      watcher: null,
      security: null,
      predictor: null,
      // Advanced Monitors (v2.0)
      connectivity: null,    // Front-End ↔ API
      dependency: null,      // API → API (Cascada)
      multiLocation: null,   // Regiones geográficas
      contract: null,        // Schema Drift
      rum: null,             // Real User Monitoring
      // Support Modules
      ai: null,
      reporter: null,
      metrics: null,
      alerts: null
    };
  }

  /**
   * Inicia el Sentinel
   */
  async start() {
    if (this.state.running) {
      log('El Sentinel ya está corriendo', 'warning');
      return;
    }

    log('Iniciando QASL-API-SENTINEL...', 'info');
    this.state.startTime = new Date();

    try {
      // 1. Cargar configuración
      log('Cargando configuración...', 'info');
      this.modules.config = new ConfigLoader(this.options.configPath);
      await this.modules.config.load();

      // 2. Inicializar Data Layer
      log('Inicializando Data Layer...', 'info');
      this.modules.data = new DataLayer(this.options.dataPath);
      await this.modules.data.init();

      // 3. Inicializar Importers
      log('Inicializando Importers (HAR, Swagger, Postman)...', 'info');
      this.modules.importers.har = new HarImporter();
      this.modules.importers.swagger = new SwaggerImporter();
      this.modules.importers.postman = new PostmanImporter();

      // 4. Inicializar Auth Manager
      log('Inicializando Auth Manager...', 'info');
      this.modules.auth = new AuthManager(this.modules.config.get('auth'));

      // 5. Inicializar Watcher
      log('Inicializando módulo Watcher (vigilancia 24/7)...', 'watch');
      this.modules.watcher = new Watcher({
        auth: this.modules.auth,
        data: this.modules.data,
        config: this.modules.config
      });

      // 6. Inicializar Security Module
      log('Inicializando módulo Security (detección de intrusos)...', 'security');
      this.modules.security = new SecurityModule({
        data: this.modules.data
      });

      // ═══════════════════════════════════════════════════════════════════
      // ADVANCED MONITORS v2.0 - Los 5 módulos del rompecabezas completo
      // ═══════════════════════════════════════════════════════════════════

      // 7. Connectivity Monitor (Front-End ↔ API)
      log('Inicializando Connectivity Monitor (Front-End ↔ API)...', 'info');
      this.modules.connectivity = new ConnectivityMonitor({
        checkInterval: parseInt(process.env.CONNECTIVITY_CHECK_INTERVAL || '300000'), // 5 min
        sslWarningDays: parseInt(process.env.SSL_WARNING_DAYS || '30')
      });

      // 8. Dependency Monitor (API → API Cascada)
      log('Inicializando Dependency Monitor (API → API cascada)...', 'info');
      this.modules.dependency = new DependencyMonitor({
        checkInterval: parseInt(process.env.DEPENDENCY_CHECK_INTERVAL || '60000'),
        maxDepth: parseInt(process.env.DEPENDENCY_MAX_DEPTH || '10'),
        criticalThreshold: parseInt(process.env.DEPENDENCY_CRITICAL_THRESHOLD || '3')
      });

      // 9. Multi-Location Monitor (Regiones geográficas)
      log('Inicializando Multi-Location Monitor (regiones globales)...', 'info');
      const regions = this.modules.config.get('regions') || [
        { id: 'us-east', name: 'US East', enabled: true },
        { id: 'us-west', name: 'US West', enabled: true },
        { id: 'eu-west', name: 'EU West', enabled: true },
        { id: 'ar-buenos-aires', name: 'Argentina', enabled: true }
      ];
      this.modules.multiLocation = new MultiLocationMonitor({
        regions,
        checkInterval: parseInt(process.env.MULTILOCATION_CHECK_INTERVAL || '300000')
      });

      // 10. Contract Monitor (Schema Drift Detection)
      log('Inicializando Contract Monitor (Schema Drift)...', 'info');
      this.modules.contract = new ContractMonitor({
        checkInterval: parseInt(process.env.CONTRACT_CHECK_INTERVAL || '3600000'), // 1 hora
        strictMode: process.env.CONTRACT_STRICT_MODE === 'true'
      });

      // 11. RUM Monitor (Real User Monitoring)
      log('Inicializando RUM Monitor (Real User Monitoring)...', 'info');
      this.modules.rum = new RumMonitor({
        port: parseInt(process.env.RUM_PORT || '9099'),
        sessionTimeout: parseInt(process.env.RUM_SESSION_TIMEOUT || '1800000') // 30 min
      });

      // ═══════════════════════════════════════════════════════════════════

      // 12. Inicializar AI Brain
      log('Inicializando cerebro AI (Claude)...', 'ai');
      this.modules.ai = new AIBrain({
        data: this.modules.data,
        config: this.modules.config
      });

      // 8. Inicializar Predictor
      log('Inicializando módulo Predictor...', 'ai');
      this.modules.predictor = new Predictor({
        ai: this.modules.ai,
        data: this.modules.data
      });

      // 9. Inicializar Report Manager
      log('Inicializando Report Manager...', 'info');
      this.modules.reporter = new ReportManager({
        ai: this.modules.ai,
        data: this.modules.data,
        config: this.modules.config
      });

      // 10. Inicializar Prometheus Exporter
      log('Inicializando Prometheus Exporter (métricas)...', 'info');
      this.modules.metrics = new PrometheusExporter({
        sentinel: this,
        port: process.env.PROMETHEUS_PORT || 9091
      });

      // 11. Inicializar Alert Manager (alertas automáticas por email)
      log('Inicializando Alert Manager (alertas automáticas)...', 'alert');
      this.modules.alerts = new AlertManager({
        enabled: process.env.ALERTS_ENABLED !== 'false',
        verbose: process.env.ALERTS_VERBOSE === 'true',
        cooldownMs: parseInt(process.env.ALERTS_COOLDOWN_MS || '300000'), // 5 min default
        maxAlertsPerHour: parseInt(process.env.ALERTS_MAX_PER_HOUR || '20')
      });

      // Conectar AlertManager al Watcher para alertas automáticas
      this.modules.alerts.connectToWatcher(this.modules.watcher);

      // 12. Inicializar Scheduler
      log('Inicializando Scheduler (tareas programadas)...', 'info');
      this.modules.scheduler = new Scheduler({
        watcher: this.modules.watcher,
        reporter: this.modules.reporter,
        predictor: this.modules.predictor,
        config: this.modules.config
      });

      // Cargar APIs existentes
      await this.loadApis();

      // Configurar Watcher con las APIs
      if (this.modules.watcher && this.state.apis.length > 0) {
        this.modules.watcher.setApis(this.state.apis);
      }

      // Configurar event listeners
      this.setupEventListeners();

      // Mostrar estado de módulos
      displayModuleStatus({
        // Core Monitors
        'Watcher': { active: true },
        'Security': { active: true },
        // Advanced Monitors v2.0
        'Connectivity': { active: true, description: 'Front-End ↔ API' },
        'Dependency': { active: true, description: 'API → API Cascade' },
        'MultiLocation': { active: this.modules.multiLocation?.getEnabledLocations()?.length > 0 },
        'Contract': { active: true, description: 'Schema Drift' },
        'RUM': { active: true, description: 'Real User Monitoring' },
        // Support Modules
        'AI Brain': { active: !!process.env.ANTHROPIC_API_KEY },
        'Predictor': { active: true },
        'Reporter': { active: true },
        'Alerts': { active: this.modules.alerts?.enabled || false },
        'Scheduler': { active: true },
        'Prometheus': { active: true }
      });

      // Iniciar scheduler
      await this.modules.scheduler.start();

      // Iniciar Prometheus Exporter
      await this.modules.metrics.start();

      // ═══════════════════════════════════════════════════════════════════
      // Iniciar Advanced Monitors v2.0
      // ═══════════════════════════════════════════════════════════════════

      // Configurar APIs en los nuevos monitores
      if (this.state.apis.length > 0) {
        // Connectivity: registrar todas las APIs con su fuente
        for (const api of this.state.apis) {
          // Crear objeto API completo para el monitor
          const apiObj = {
            id: api.id || `${api.method}-${api.url}`,
            url: api.url,
            method: api.method,
            name: api.name || `${api.method} ${api.url}`
          };
          this.modules.connectivity.registerApi(apiObj, {
            source: api.source || 'swagger',
            frontendOrigin: api.frontendOrigin || null
          });
        }

        // Dependency: auto-detectar dependencias si hay trazas
        this.modules.dependency.autoDetectDependencies(this.state.apis);

        // Contract: establecer baseline para APIs con spec
        for (const api of this.state.apis) {
          if (api.spec || api.schema) {
            this.modules.contract.setBaseline(
              api.id || `${api.method}-${api.url}`,
              api.spec || api.schema,
              '1.0.0'
            );
          }
        }
      }

      // Iniciar monitores
      this.modules.connectivity.start();
      this.modules.dependency.start();
      this.modules.multiLocation.start();
      this.modules.contract.start();
      await this.modules.rum.start();

      log('✅ Advanced Monitors v2.0 iniciados', 'success');

      // Conectar monitores al ReportManager para reportes completos
      this.modules.reporter.setMonitors({
        connectivity: this.modules.connectivity,
        dependency: this.modules.dependency,
        multiLocation: this.modules.multiLocation,
        contract: this.modules.contract,
        rum: this.modules.rum
      });

      // Conectar monitores avanzados a Prometheus para métricas
      this.setupAdvancedMetricsSync();

      // ═══════════════════════════════════════════════════════════════════

      this.state.running = true;
      log('🐝 QASL-API-SENTINEL v2.0 iniciado correctamente!', 'success');
      log(`APIs monitoreadas: ${this.state.apis.length}`, 'info');
      log(`Regiones activas: ${this.modules.multiLocation.getEnabledLocations().length}`, 'info');

      // Si no hay APIs, mostrar instrucciones
      if (this.state.apis.length === 0) {
        this.showImportInstructions();
      }

      this.emit('started');

    } catch (error) {
      log(`Error al iniciar: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Detiene el Sentinel
   */
  async stop() {
    if (!this.state.running) {
      return;
    }

    log('Deteniendo módulos...', 'info');

    // Detener sincronización de métricas
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    // Detener scheduler
    if (this.modules.scheduler) {
      await this.modules.scheduler.stop();
    }

    // Detener Prometheus Exporter
    if (this.modules.metrics) {
      await this.modules.metrics.stop();
    }

    // ═══════════════════════════════════════════════════════════════════
    // Detener Advanced Monitors v2.0
    // ═══════════════════════════════════════════════════════════════════
    if (this.modules.connectivity) {
      this.modules.connectivity.stop();
    }
    if (this.modules.dependency) {
      this.modules.dependency.stop();
    }
    if (this.modules.multiLocation) {
      this.modules.multiLocation.stop();
    }
    if (this.modules.contract) {
      this.modules.contract.stop();
    }
    if (this.modules.rum) {
      await this.modules.rum.stop();
    }
    log('Advanced Monitors v2.0 detenidos', 'info');
    // ═══════════════════════════════════════════════════════════════════

    // Guardar estado
    if (this.modules.data) {
      await this.modules.data.saveState(this.state);
    }

    this.state.running = false;
    log('QASL-API-SENTINEL v2.0 detenido', 'success');
    this.emit('stopped');
  }

  /**
   * Carga las APIs desde configuración y data
   */
  async loadApis() {
    // Cargar desde config/apis.json
    let configApis = this.modules.config.get('apis') || [];

    // Asegurar que sea un array
    if (!Array.isArray(configApis)) {
      configApis = configApis.apis || [];
    }

    // Cargar desde imports guardados
    const savedApis = await this.modules.data.loadApis();

    // Combinar (sin duplicados)
    const allApis = [...configApis];
    for (const api of savedApis) {
      if (!allApis.find(a => a.url === api.url && a.method === api.method)) {
        allApis.push(api);
      }
    }

    this.state.apis = allApis;

    // Pasar APIs al AuthManager para soporte de dynamic-bearer
    if (this.modules.auth && this.modules.auth.setApis) {
      this.modules.auth.setApis(allApis);
    }

    log(`Cargadas ${this.state.apis.length} APIs para monitorear`, 'info');
  }

  /**
   * Importa APIs desde un archivo
   */
  async importApis(filePath, type) {
    log(`Importando APIs desde ${type.toUpperCase()}: ${filePath}`, 'info');

    let apis = [];

    switch (type.toLowerCase()) {
      case 'har':
        apis = await this.modules.importers.har.import(filePath);
        break;
      case 'swagger':
      case 'openapi':
        apis = await this.modules.importers.swagger.import(filePath);
        break;
      case 'postman':
        apis = await this.modules.importers.postman.import(filePath);
        break;
      default:
        throw new Error(`Tipo de import no soportado: ${type}`);
    }

    // Detectar autenticación
    for (const api of apis) {
      api.auth = this.modules.auth.detectAuthType(api);
    }

    // Agregar al estado
    for (const api of apis) {
      if (!this.state.apis.find(a => a.url === api.url && a.method === api.method)) {
        this.state.apis.push(api);
      }
    }

    // Guardar
    await this.modules.data.saveApis(this.state.apis);

    log(`Importadas ${apis.length} APIs correctamente`, 'success');
    this.emit('apis:imported', apis);

    return apis;
  }

  /**
   * Configura los event listeners entre módulos
   */
  setupEventListeners() {
    // ═══════════════════════════════════════════════════════════════════
    // CORE MODULE EVENTS
    // ═══════════════════════════════════════════════════════════════════

    // Watcher detecta problema -> Security analiza
    this.modules.watcher.on('anomaly', async (data) => {
      await this.modules.security.analyze(data);
    });

    // Security detecta intrusión -> AI diagnostica -> Reporter alerta
    this.modules.security.on('intrusion', async (data) => {
      const diagnosis = await this.modules.ai.diagnose(data);
      await this.modules.reporter.sendAlert({
        type: 'intrusion',
        severity: 'critical',
        data,
        diagnosis
      });
    });

    // Watcher detecta API caída -> Reporter alerta
    this.modules.watcher.on('api:down', async (api) => {
      const diagnosis = await this.modules.ai.diagnose({
        type: 'api_down',
        api
      });
      await this.modules.reporter.sendAlert({
        type: 'api_down',
        severity: 'critical',
        api,
        diagnosis
      });

      // Actualizar estado en Dependency Monitor
      if (this.modules.dependency) {
        this.modules.dependency.updateApiStatus(api.id || `${api.method}-${api.url}`, 'down');
      }
    });

    // Predictor detecta tendencia peligrosa -> Reporter advierte
    this.modules.predictor.on('prediction', async (prediction) => {
      if (prediction.risk === 'high') {
        await this.modules.reporter.sendAlert({
          type: 'prediction',
          severity: 'warning',
          prediction
        });
      }
    });

    // Watcher completa check -> Prometheus registra métricas
    this.modules.watcher.on('check:complete', ({ result }) => {
      if (this.modules.metrics) {
        this.modules.metrics.recordCheck(result);
      }

      // Actualizar estado en Dependency Monitor
      if (this.modules.dependency && result) {
        const status = result.status >= 200 && result.status < 400 ? 'healthy' :
                       result.status >= 400 && result.status < 500 ? 'degraded' : 'down';
        this.modules.dependency.updateApiStatus(result.apiId, status);
      }

      // Registrar en Connectivity Monitor
      if (this.modules.connectivity && result) {
        this.modules.connectivity.emit('check:complete', result);
      }
    });

    // ═══════════════════════════════════════════════════════════════════
    // ADVANCED MONITORS v2.0 EVENTS
    // ═══════════════════════════════════════════════════════════════════

    // Connectivity: Problemas de conexión Front-End ↔ API
    this.modules.connectivity.on('connectivity-issue', async (issue) => {
      await this.modules.reporter.sendAlert({
        type: 'connectivity_issue',
        severity: issue.type === 'ssl_expiring' ? 'warning' : 'critical',
        data: issue
      });
    });

    this.modules.connectivity.on('ssl-warning', async (data) => {
      await this.modules.reporter.sendAlert({
        type: 'ssl_expiring',
        severity: 'warning',
        data
      });
    });

    // Dependency: Impacto en cascada detectado
    this.modules.dependency.on('cascade-impact', async (impact) => {
      const diagnosis = await this.modules.ai.diagnose({
        type: 'cascade_impact',
        impact
      });
      await this.modules.reporter.sendAlert({
        type: 'cascade_impact',
        severity: impact.severity,
        data: impact,
        diagnosis
      });
    });

    // MultiLocation: Problemas regionales
    this.modules.multiLocation.on('region-issue', async (issue) => {
      await this.modules.reporter.sendAlert({
        type: 'region_issue',
        severity: issue.severity || 'warning',
        data: issue
      });
    });

    this.modules.multiLocation.on('latency-threshold', async (data) => {
      await this.modules.reporter.sendAlert({
        type: 'high_latency',
        severity: 'warning',
        data
      });
    });

    // Contract: Breaking changes detectados
    this.modules.contract.on('breaking-change', async (change) => {
      const diagnosis = await this.modules.ai.diagnose({
        type: 'breaking_change',
        change
      });
      await this.modules.reporter.sendAlert({
        type: 'breaking_change',
        severity: 'critical',
        data: change,
        diagnosis
      });
    });

    this.modules.contract.on('schema-drift', async (drift) => {
      await this.modules.reporter.sendAlert({
        type: 'schema_drift',
        severity: 'warning',
        data: drift
      });
    });

    // RUM: Errores de usuario real
    this.modules.rum.on('error-spike', async (data) => {
      await this.modules.reporter.sendAlert({
        type: 'rum_error_spike',
        severity: 'warning',
        data
      });
    });

    this.modules.rum.on('performance-degradation', async (data) => {
      await this.modules.reporter.sendAlert({
        type: 'rum_performance',
        severity: 'warning',
        data
      });
    });

    // ═══════════════════════════════════════════════════════════════════
  }

  /**
   * Muestra instrucciones para importar APIs
   */
  showImportInstructions() {
    console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                         🍽️  ALIMENTA AL SENTINEL                             ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  No hay APIs configuradas. Importa tus APIs usando:                         ║
║                                                                              ║
║  📦 POSTMAN:                                                                 ║
║     npm run import:postman -- --file=./tu-coleccion.json                    ║
║                                                                              ║
║  🌐 HAR (desde browser):                                                     ║
║     npm run import:har -- --file=./captura.har                              ║
║                                                                              ║
║  📋 SWAGGER/OPENAPI:                                                         ║
║     npm run import:swagger -- --file=./openapi.json                         ║
║     npm run import:swagger -- --url=https://api.com/swagger.json            ║
║                                                                              ║
║  📂 O coloca archivos en:                                                    ║
║     ./imports/har/                                                          ║
║     ./imports/swagger/                                                       ║
║     ./imports/postman/                                                       ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);
  }

  /**
   * Chat con el AI
   */
  async chat(message) {
    if (!this.modules.ai) {
      throw new Error('AI no inicializado');
    }

    return await this.modules.ai.chat(message, {
      apis: this.state.apis,
      alerts: this.state.alerts,
      metrics: this.state.metrics
    });
  }

  /**
   * Obtiene el estado actual
   */
  getStatus() {
    return {
      running: this.state.running,
      uptime: this.state.startTime ? Date.now() - this.state.startTime.getTime() : 0,
      version: '2.0.0',
      apis: {
        total: this.state.apis.length,
        healthy: this.state.apis.filter(a => a.lastStatus === 200).length,
        warning: this.state.apis.filter(a => a.lastStatus >= 400 && a.lastStatus < 500).length,
        error: this.state.apis.filter(a => a.lastStatus >= 500 || a.lastStatus === 0).length
      },
      alerts: {
        total: this.state.alerts.length,
        unresolved: this.state.alerts.filter(a => !a.resolved).length
      },
      // Advanced Monitors v2.0 Status
      monitors: {
        connectivity: this.modules.connectivity ? this.modules.connectivity.getStats() : null,
        dependency: this.modules.dependency ? this.modules.dependency.getStats() : null,
        multiLocation: this.modules.multiLocation ? {
          regions: this.modules.multiLocation.getEnabledLocations(),
          status: this.modules.multiLocation.getStatus()
        } : null,
        contract: this.modules.contract ? this.modules.contract.getStats() : null,
        rum: this.modules.rum ? this.modules.rum.getStats() : null
      }
    };
  }

  /**
   * Obtiene métricas para Prometheus de todos los módulos
   */
  getAllMetrics() {
    const metrics = {};

    // Core metrics
    metrics.sentinel_running = this.state.running ? 1 : 0;
    metrics.sentinel_uptime_seconds = this.state.startTime
      ? Math.floor((Date.now() - this.state.startTime.getTime()) / 1000)
      : 0;
    metrics.sentinel_apis_total = this.state.apis.length;

    // Connectivity Monitor metrics
    if (this.modules.connectivity) {
      const connMetrics = this.modules.connectivity.getMetrics();
      Object.assign(metrics, connMetrics);
    }

    // Dependency Monitor metrics
    if (this.modules.dependency) {
      const depMetrics = this.modules.dependency.getMetrics();
      Object.assign(metrics, depMetrics);
    }

    // MultiLocation Monitor metrics
    if (this.modules.multiLocation) {
      const locMetrics = this.modules.multiLocation.getMetrics();
      Object.assign(metrics, locMetrics);
    }

    // Contract Monitor metrics
    if (this.modules.contract) {
      const contractMetrics = this.modules.contract.getMetrics();
      Object.assign(metrics, contractMetrics);
    }

    // RUM Monitor metrics
    if (this.modules.rum) {
      const rumMetrics = this.modules.rum.getMetrics();
      Object.assign(metrics, rumMetrics);
    }

    return metrics;
  }

  /**
   * Configura sincronización de métricas de Advanced Monitors a Prometheus
   * Actualiza las métricas cada 10 segundos para que Grafana las vea
   */
  setupAdvancedMetricsSync() {
    if (!this.modules.metrics) {
      log('PrometheusExporter no disponible, saltando sync de métricas', 'warning');
      return;
    }

    // Actualizar métricas inmediatamente
    this.syncAdvancedMetrics();

    // Configurar intervalo de sincronización (cada 10 segundos)
    this.metricsInterval = setInterval(() => {
      this.syncAdvancedMetrics();
    }, 10000);

    log('Advanced Monitors conectados a Prometheus (sync cada 10s)', 'info');
  }

  /**
   * Sincroniza métricas de todos los Advanced Monitors a Prometheus
   */
  syncAdvancedMetrics() {
    if (!this.modules.metrics || !this.modules.metrics.updateAdvancedMetrics) {
      return;
    }

    const monitors = {
      connectivity: this.modules.connectivity,
      dependency: this.modules.dependency,
      multiLocation: this.modules.multiLocation,
      contract: this.modules.contract,
      rum: this.modules.rum
    };

    this.modules.metrics.updateAdvancedMetrics(monitors);
  }

  /**
   * Genera reporte completo del sistema
   */
  generateFullReport() {
    return {
      title: 'QASL-API-SENTINEL Full Report',
      version: '2.0.0',
      generatedAt: new Date().toISOString(),
      status: this.getStatus(),
      reports: {
        connectivity: this.modules.connectivity?.generateReport() || null,
        dependency: this.modules.dependency?.generateReport() || null,
        multiLocation: this.modules.multiLocation?.generateReport() || null,
        contract: this.modules.contract?.generateReport() || null,
        rum: this.modules.rum?.generateReport() || null
      }
    };
  }
}
