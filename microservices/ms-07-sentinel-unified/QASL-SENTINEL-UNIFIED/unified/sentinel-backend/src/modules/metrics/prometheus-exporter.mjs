/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    PROMETHEUS METRICS EXPORTER                               ║
 * ║                    QASL-API-SENTINEL Mission Control                         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  QASL NEXUS LLM                                                              ║
 * ║  Elyer Gregorio Maldonado                                                    ║
 * ║  Plataforma QA Multi-LLM                                                     ║
 * ║  Líder Técnico QA: Elyer Gregorio Maldonado                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * Exporta métricas en formato Prometheus para visualización en Grafana
 */

import http from 'http';
import { readFileSync, existsSync } from 'fs';
import { log } from '../../core/banner.mjs';

export class PrometheusExporter {
  constructor(options = {}) {
    this.port = options.port || process.env.PROMETHEUS_PORT || 9091;
    this.sentinel = options.sentinel;
    this.server = null;

    // Métricas de monitores avanzados v2.0
    this.advancedMetrics = {
      connectivity: null,
      dependency: null,
      multiLocation: null,
      contract: null,
      rum: null
    };

    // Métricas acumuladas
    this.metrics = {
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      totalLatency: 0,
      apiMetrics: new Map(),
      startTime: Date.now(),
      // Enterprise Metrics
      enterprise: {
        security: {
          score: 0,
          criticalIssues: 0,
          highIssues: 0,
          mediumIssues: 0,
          lowIssues: 0,
          lastScan: 0
        },
        anomaly: {
          detected: 0,
          zScoreAlerts: 0,
          isolationForestAlerts: 0,
          movingAverageAlerts: 0,
          lastAnalysis: 0
        },
        prediction: {
          failuresNext24h: 0,
          confidence: 0,
          apisAtRisk: 0,
          lastPrediction: 0
        },
        compliance: {
          soc2Score: 0,
          iso27001Score: 0,
          pciDssScore: 0,
          hipaaScore: 0,
          lastAudit: 0
        },
        webhooks: {
          total: 0,
          active: 0,
          triggered: 0,
          failed: 0
        },
        zap: {
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          status: 1,
          lastScan: 0,
          topVulnerabilities: []
        }
      }
    };
  }

  /**
   * Inicia el servidor de métricas Prometheus
   */
  async start() {
    this.server = http.createServer((req, res) => {
      if (req.url === '/metrics') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(this.generateMetrics());
      } else if (req.url === '/health') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'healthy', uptime: Date.now() - this.metrics.startTime }));
      } else {
        res.statusCode = 404;
        res.end('Not Found');
      }
    });

    return new Promise((resolve, reject) => {
      this.server.listen(this.port, () => {
        log(`Prometheus metrics disponibles en http://localhost:${this.port}/metrics`, 'success');
        resolve();
      });
      this.server.on('error', reject);
    });
  }

  /**
   * Detiene el servidor de métricas
   */
  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(resolve);
      });
    }
  }

  /**
   * Registra resultado de un health check
   */
  recordCheck(result) {
    this.metrics.totalChecks++;

    // Métricas por API
    const apiId = result.api?.id || 'unknown';

    if (result.healthy) {
      this.metrics.successfulChecks++;
    } else {
      this.metrics.failedChecks++;
    }

    if (result.latency) {
      this.metrics.totalLatency += result.latency;
    }
    if (!this.metrics.apiMetrics.has(apiId)) {
      this.metrics.apiMetrics.set(apiId, {
        name: result.api?.name || apiId,
        url: result.api?.url || '',
        method: result.api?.method || 'GET',
        checks: 0,
        successes: 0,
        failures: 0,
        totalLatency: 0,
        lastStatus: 0,
        lastLatency: 0,
        lastCheck: 0,
        lastHealthy: false,
        authType: result.api?.auth?.type || 'none',
        priority: result.api?.priority || 'normal'
      });
    }

    const apiMetric = this.metrics.apiMetrics.get(apiId);
    apiMetric.checks++;
    apiMetric.lastStatus = result.status || 0;
    apiMetric.lastLatency = result.latency || 0;
    apiMetric.lastCheck = Date.now();
    apiMetric.lastHealthy = result.healthy; // Guardar el estado real del Watcher

    if (result.healthy) {
      apiMetric.successes++;
    } else {
      apiMetric.failures++;
    }

    if (result.latency) {
      apiMetric.totalLatency += result.latency;
    }
  }

  /**
   * Actualiza métricas de seguridad enterprise
   */
  updateSecurityMetrics(securityData) {
    if (!securityData) return;
    this.metrics.enterprise.security = {
      score: securityData.score || 0,
      criticalIssues: securityData.critical || 0,
      highIssues: securityData.high || 0,
      mediumIssues: securityData.medium || 0,
      lowIssues: securityData.low || 0,
      lastScan: Date.now()
    };
  }

  /**
   * Actualiza métricas de detección de anomalías
   */
  updateAnomalyMetrics(anomalyData) {
    if (!anomalyData) return;
    this.metrics.enterprise.anomaly = {
      detected: anomalyData.totalAnomalies || 0,
      zScoreAlerts: anomalyData.zScore || 0,
      isolationForestAlerts: anomalyData.isolationForest || 0,
      movingAverageAlerts: anomalyData.movingAverage || 0,
      lastAnalysis: Date.now()
    };
  }

  /**
   * Actualiza métricas de predicción
   */
  updatePredictionMetrics(predictionData) {
    if (!predictionData) return;
    this.metrics.enterprise.prediction = {
      failuresNext24h: predictionData.predictedFailures || 0,
      confidence: predictionData.confidence || 0,
      apisAtRisk: predictionData.apisAtRisk || 0,
      lastPrediction: Date.now()
    };
  }

  /**
   * Actualiza métricas de compliance
   */
  updateComplianceMetrics(complianceData) {
    if (!complianceData) return;
    this.metrics.enterprise.compliance = {
      soc2Score: complianceData.soc2 || 0,
      iso27001Score: complianceData.iso27001 || 0,
      pciDssScore: complianceData.pciDss || 0,
      hipaaScore: complianceData.hipaa || 0,
      lastAudit: Date.now()
    };
  }

  /**
   * Actualiza métricas de webhooks
   */
  updateWebhookMetrics(webhookData) {
    if (!webhookData) return;
    this.metrics.enterprise.webhooks = {
      total: webhookData.total || 0,
      active: webhookData.active || 0,
      triggered: webhookData.triggered || 0,
      failed: webhookData.failed || 0
    };
  }

  /**
   * Actualiza métricas de OWASP ZAP
   */
  updateZapMetrics(zapData) {
    if (!zapData) return;
    this.metrics.enterprise.zap = {
      total: (zapData.critical || 0) + (zapData.high || 0) + (zapData.medium || 0) + (zapData.low || 0),
      critical: zapData.critical || 0,
      high: zapData.high || 0,
      medium: zapData.medium || 0,
      low: zapData.low || 0,
      status: (zapData.critical || 0) === 0 ? 1 : 0,
      lastScan: Date.now(),
      topVulnerabilities: zapData.topVulnerabilities || []
    };
  }

  /**
   * Actualiza métricas de monitores avanzados v2.0
   */
  updateAdvancedMetrics(monitors) {
    if (!monitors) return;

    // Connectivity Monitor
    if (monitors.connectivity) {
      const status = monitors.connectivity.getStatus?.() || {};
      const statsObj = status.stats || {};
      this.advancedMetrics.connectivity = {
        total: status.totalApis || 0,
        healthy: status.healthy || 0,
        cors: statsObj.corsIssues || 0,
        ssl: statsObj.sslIssues || 0,
        dns: statsObj.dnsIssues || 0,
        auth: statsObj.authIssues || 0,
        network: statsObj.networkIssues || 0,
        sslDays: 0
      };
    }

    // Dependency Monitor
    if (monitors.dependency) {
      const stats = monitors.dependency.getStats?.() || {};
      const health = stats.healthStatus || {};
      this.advancedMetrics.dependency = {
        totalApis: stats.totalApis || 0,
        totalDependencies: stats.totalDependencies || 0,
        cycles: stats.cycles?.length || 0,
        cascadeEvents: 0,
        healthy: health.healthy || 0,
        degraded: health.degraded || 0,
        down: health.down || 0
      };
    }

    // Multi-Location Monitor
    if (monitors.multiLocation) {
      const status = monitors.multiLocation.getStatus?.() || {};
      const latency = monitors.multiLocation.getLatencyByRegion?.() || {};
      const enabledLocations = monitors.multiLocation.getEnabledLocations?.() || [];

      // Calcular latencia promedio de los resultados
      let avgLatency = 0;
      const results = status.results || {};
      const resultValues = Object.values(results);
      if (resultValues.length > 0) {
        const latencies = resultValues.map(r => r.averageLatency || 0).filter(l => l > 0);
        avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
      }

      this.advancedMetrics.multiLocation = {
        activeRegions: enabledLocations.length || 0,
        apisMonitored: status.apisMonitored || 0,
        totalChecks: Object.keys(results).length,
        globalLatency: avgLatency,
        issues: 0,
        latencyByRegion: latency
      };
    }

    // Contract Monitor
    if (monitors.contract) {
      const status = monitors.contract.getStatus?.() || {};
      this.advancedMetrics.contract = {
        total: status.totalContracts || 0,
        healthy: status.healthy || 0,
        breaking: status.breaking || 0,
        schemaChanges: status.changed || 0,
        activeAlerts: 0
      };
    }

    // RUM Monitor
    if (monitors.rum) {
      const status = monitors.rum.getStatus?.() || {};
      const percentiles = status.latencyPercentiles || {};
      this.advancedMetrics.rum = {
        activeSessions: status.activeSessions || 0,
        totalEvents: status.totalEvents || 0,
        errors: status.errorCount || 0,
        p50: percentiles.p50 || 0,
        p75: percentiles.p75 || 0,
        p95: percentiles.p95 || 0,
        p99: percentiles.p99 || 0,
        successRate: 100,
        byDevice: status.byDevice || []
      };
    }
  }

  /**
   * Carga métricas desde archivos externos (para sincronización con comandos CLI)
   */
  loadExternalMetrics() {
    // Cargar métricas de compliance
    try {
      const compliancePath = './data/compliance-metrics.json';
      if (existsSync(compliancePath)) {
        const data = JSON.parse(readFileSync(compliancePath, 'utf-8'));
        if (data.soc2 !== undefined) this.metrics.enterprise.compliance.soc2Score = data.soc2;
        if (data.iso27001 !== undefined) this.metrics.enterprise.compliance.iso27001Score = data.iso27001;
        if (data.pciDss !== undefined) this.metrics.enterprise.compliance.pciDssScore = data.pciDss;
        if (data.hipaa !== undefined) this.metrics.enterprise.compliance.hipaaScore = data.hipaa;
      }
    } catch {}

    // Cargar métricas de security
    try {
      const securityPath = './data/security-metrics.json';
      if (existsSync(securityPath)) {
        const data = JSON.parse(readFileSync(securityPath, 'utf-8'));
        if (data.score !== undefined) this.metrics.enterprise.security.score = data.score;
        if (data.critical !== undefined) this.metrics.enterprise.security.criticalIssues = data.critical;
        if (data.high !== undefined) this.metrics.enterprise.security.highIssues = data.high;
        if (data.medium !== undefined) this.metrics.enterprise.security.mediumIssues = data.medium;
        if (data.low !== undefined) this.metrics.enterprise.security.lowIssues = data.low;
      }
    } catch {}

    // Cargar métricas de ML (anomaly y predict)
    try {
      const mlPath = './data/ml-metrics.json';
      if (existsSync(mlPath)) {
        const data = JSON.parse(readFileSync(mlPath, 'utf-8'));
        if (data.anomaliesTotal !== undefined) this.metrics.enterprise.ml.anomaliesDetected = data.anomaliesTotal;
        if (data.predictionsTotal !== undefined) this.metrics.enterprise.ml.predictedFailures = data.predictionsTotal;
        if (data.apisAtRisk !== undefined) this.metrics.enterprise.ml.apisAtRisk = data.apisAtRisk;
        if (data.patternsLearned !== undefined) this.metrics.enterprise.ml.predictionConfidence = Math.min(data.patternsLearned * 10, 100);
      }
    } catch {}

    // Cargar métricas de OWASP ZAP
    try {
      const zapPath = './data/zap-metrics.json';
      if (existsSync(zapPath)) {
        const data = JSON.parse(readFileSync(zapPath, 'utf-8'));
        this.metrics.enterprise.zap = {
          total: (data.critical || 0) + (data.high || 0) + (data.medium || 0) + (data.low || 0),
          critical: data.critical || 0,
          high: data.high || 0,
          medium: data.medium || 0,
          low: data.low || 0,
          status: (data.critical || 0) === 0 ? 1 : 0,
          lastScan: data.lastScan || Date.now(),
          topVulnerabilities: data.topVulnerabilities || []
        };
      }
    } catch {}
  }

  /**
   * Genera métricas en formato Prometheus
   */
  generateMetrics() {
    // Cargar métricas externas antes de generar
    this.loadExternalMetrics();

    const lines = [];

    // ═══════════════════════════════════════════════════════════════════════════════
    // HEADER
    // ═══════════════════════════════════════════════════════════════════════════════
    lines.push('# QASL-API-SENTINEL Prometheus Metrics');
    lines.push('# QASL NEXUS LLM - Elyer Gregorio Maldonado');
    lines.push('# Líder Técnico QA: Elyer Gregorio Maldonado');
    lines.push('');

    // ═══════════════════════════════════════════════════════════════════════════════
    // MÉTRICAS GLOBALES
    // ═══════════════════════════════════════════════════════════════════════════════
    lines.push('# HELP qasl_uptime_seconds Tiempo de ejecución del Sentinel en segundos');
    lines.push('# TYPE qasl_uptime_seconds gauge');
    lines.push(`qasl_uptime_seconds ${Math.floor((Date.now() - this.metrics.startTime) / 1000)}`);
    lines.push('');

    lines.push('# HELP qasl_apis_total Número total de APIs monitoreadas');
    lines.push('# TYPE qasl_apis_total gauge');
    lines.push(`qasl_apis_total ${this.metrics.apiMetrics.size}`);
    lines.push('');

    lines.push('# HELP qasl_checks_total Total de health checks realizados');
    lines.push('# TYPE qasl_checks_total counter');
    lines.push(`qasl_checks_total ${this.metrics.totalChecks}`);
    lines.push('');

    lines.push('# HELP qasl_checks_success_total Total de checks exitosos');
    lines.push('# TYPE qasl_checks_success_total counter');
    lines.push(`qasl_checks_success_total ${this.metrics.successfulChecks}`);
    lines.push('');

    lines.push('# HELP qasl_checks_failed_total Total de checks fallidos');
    lines.push('# TYPE qasl_checks_failed_total counter');
    lines.push(`qasl_checks_failed_total ${this.metrics.failedChecks}`);
    lines.push('');

    // Calcular uptime global
    const globalUptime = this.metrics.totalChecks > 0
      ? (this.metrics.successfulChecks / this.metrics.totalChecks * 100).toFixed(2)
      : 100;

    lines.push('# HELP qasl_uptime_percentage Porcentaje de disponibilidad global');
    lines.push('# TYPE qasl_uptime_percentage gauge');
    lines.push(`qasl_uptime_percentage ${globalUptime}`);
    lines.push('');

    // Latencia promedio global
    const avgLatency = this.metrics.totalChecks > 0
      ? Math.round(this.metrics.totalLatency / this.metrics.totalChecks)
      : 0;

    lines.push('# HELP qasl_latency_avg_ms Latencia promedio global en milisegundos');
    lines.push('# TYPE qasl_latency_avg_ms gauge');
    lines.push(`qasl_latency_avg_ms ${avgLatency}`);
    lines.push('');

    // ═══════════════════════════════════════════════════════════════════════════════
    // MÉTRICAS POR API
    // ═══════════════════════════════════════════════════════════════════════════════
    lines.push('# HELP qasl_api_status Estado HTTP del último check por API');
    lines.push('# TYPE qasl_api_status gauge');

    for (const [apiId, metric] of this.metrics.apiMetrics) {
      const labels = this.formatLabels({
        api_id: apiId,
        api_name: metric.name,
        method: metric.method,
        auth_type: metric.authType,
        priority: metric.priority
      });
      lines.push(`qasl_api_status{${labels}} ${metric.lastStatus}`);
    }
    lines.push('');

    lines.push('# HELP qasl_api_latency_ms Latencia del último check por API en ms');
    lines.push('# TYPE qasl_api_latency_ms gauge');

    for (const [apiId, metric] of this.metrics.apiMetrics) {
      const labels = this.formatLabels({
        api_id: apiId,
        api_name: metric.name,
        method: metric.method
      });
      lines.push(`qasl_api_latency_ms{${labels}} ${metric.lastLatency}`);
    }
    lines.push('');

    lines.push('# HELP qasl_api_healthy Estado de salud de la API (1=healthy, 0=unhealthy)');
    lines.push('# TYPE qasl_api_healthy gauge');

    for (const [apiId, metric] of this.metrics.apiMetrics) {
      const labels = this.formatLabels({
        api_id: apiId,
        api_name: metric.name,
        method: metric.method,
        priority: metric.priority
      });
      // Usar el resultado real del Watcher (respeta expectedStatus) en lugar de recalcular
      const isHealthy = metric.lastHealthy ? 1 : 0;
      lines.push(`qasl_api_healthy{${labels}} ${isHealthy}`);
    }
    lines.push('');

    lines.push('# HELP qasl_api_checks_total Total de checks por API');
    lines.push('# TYPE qasl_api_checks_total counter');

    for (const [apiId, metric] of this.metrics.apiMetrics) {
      const labels = this.formatLabels({
        api_id: apiId,
        api_name: metric.name
      });
      lines.push(`qasl_api_checks_total{${labels}} ${metric.checks}`);
    }
    lines.push('');

    lines.push('# HELP qasl_api_success_total Total de checks exitosos por API');
    lines.push('# TYPE qasl_api_success_total counter');

    for (const [apiId, metric] of this.metrics.apiMetrics) {
      const labels = this.formatLabels({
        api_id: apiId,
        api_name: metric.name
      });
      lines.push(`qasl_api_success_total{${labels}} ${metric.successes}`);
    }
    lines.push('');

    lines.push('# HELP qasl_api_failure_total Total de checks fallidos por API');
    lines.push('# TYPE qasl_api_failure_total counter');

    for (const [apiId, metric] of this.metrics.apiMetrics) {
      const labels = this.formatLabels({
        api_id: apiId,
        api_name: metric.name
      });
      lines.push(`qasl_api_failure_total{${labels}} ${metric.failures}`);
    }
    lines.push('');

    lines.push('# HELP qasl_api_uptime_percentage Porcentaje de disponibilidad por API');
    lines.push('# TYPE qasl_api_uptime_percentage gauge');

    for (const [apiId, metric] of this.metrics.apiMetrics) {
      const labels = this.formatLabels({
        api_id: apiId,
        api_name: metric.name,
        priority: metric.priority
      });
      const uptime = metric.checks > 0
        ? (metric.successes / metric.checks * 100).toFixed(2)
        : 100;
      lines.push(`qasl_api_uptime_percentage{${labels}} ${uptime}`);
    }
    lines.push('');

    lines.push('# HELP qasl_api_latency_avg_ms Latencia promedio por API en ms');
    lines.push('# TYPE qasl_api_latency_avg_ms gauge');

    for (const [apiId, metric] of this.metrics.apiMetrics) {
      const labels = this.formatLabels({
        api_id: apiId,
        api_name: metric.name
      });
      const avgLat = metric.checks > 0
        ? Math.round(metric.totalLatency / metric.checks)
        : 0;
      lines.push(`qasl_api_latency_avg_ms{${labels}} ${avgLat}`);
    }
    lines.push('');

    // ═══════════════════════════════════════════════════════════════════════════════
    // MÉTRICAS DE AUTENTICACIÓN
    // ═══════════════════════════════════════════════════════════════════════════════
    lines.push('# HELP qasl_api_auth_type Tipo de autenticación por API');
    lines.push('# TYPE qasl_api_auth_type gauge');

    const authTypes = { none: 0, bearer: 1, oauth2: 2, keycloak: 3, apiKey: 4, cookie: 5, wsaa: 6 };

    for (const [apiId, metric] of this.metrics.apiMetrics) {
      const labels = this.formatLabels({
        api_id: apiId,
        api_name: metric.name,
        auth_type: metric.authType
      });
      const authValue = authTypes[metric.authType] ?? 0;
      lines.push(`qasl_api_auth_type{${labels}} ${authValue}`);
    }
    lines.push('');

    // ═══════════════════════════════════════════════════════════════════════════════
    // ENTERPRISE METRICS - SECURITY
    // ═══════════════════════════════════════════════════════════════════════════════
    const sec = this.metrics.enterprise.security;

    lines.push('# HELP qasl_security_score Puntuación de seguridad global (0-100)');
    lines.push('# TYPE qasl_security_score gauge');
    lines.push(`qasl_security_score ${sec.score}`);
    lines.push('');

    lines.push('# HELP qasl_security_issues_total Número de issues de seguridad por severidad');
    lines.push('# TYPE qasl_security_issues_total gauge');
    lines.push(`qasl_security_issues_total{severity="critical"} ${sec.criticalIssues}`);
    lines.push(`qasl_security_issues_total{severity="high"} ${sec.highIssues}`);
    lines.push(`qasl_security_issues_total{severity="medium"} ${sec.mediumIssues}`);
    lines.push(`qasl_security_issues_total{severity="low"} ${sec.lowIssues}`);
    lines.push('');

    // ═══════════════════════════════════════════════════════════════════════════════
    // ENTERPRISE METRICS - ANOMALY DETECTION (ML)
    // ═══════════════════════════════════════════════════════════════════════════════
    const anomaly = this.metrics.enterprise.anomaly;

    lines.push('# HELP qasl_anomaly_detected_total Total de anomalías detectadas');
    lines.push('# TYPE qasl_anomaly_detected_total gauge');
    lines.push(`qasl_anomaly_detected_total ${anomaly.detected}`);
    lines.push('');

    lines.push('# HELP qasl_anomaly_by_algorithm Anomalías detectadas por algoritmo ML');
    lines.push('# TYPE qasl_anomaly_by_algorithm gauge');
    lines.push(`qasl_anomaly_by_algorithm{algorithm="zscore"} ${anomaly.zScoreAlerts}`);
    lines.push(`qasl_anomaly_by_algorithm{algorithm="isolation_forest"} ${anomaly.isolationForestAlerts}`);
    lines.push(`qasl_anomaly_by_algorithm{algorithm="moving_average"} ${anomaly.movingAverageAlerts}`);
    lines.push('');

    // ═══════════════════════════════════════════════════════════════════════════════
    // ENTERPRISE METRICS - FAILURE PREDICTION
    // ═══════════════════════════════════════════════════════════════════════════════
    const pred = this.metrics.enterprise.prediction;

    lines.push('# HELP qasl_prediction_failures_24h Fallos predichos próximas 24 horas');
    lines.push('# TYPE qasl_prediction_failures_24h gauge');
    lines.push(`qasl_prediction_failures_24h ${pred.failuresNext24h}`);
    lines.push('');

    lines.push('# HELP qasl_prediction_confidence Confianza del modelo predictivo (0-100)');
    lines.push('# TYPE qasl_prediction_confidence gauge');
    lines.push(`qasl_prediction_confidence ${pred.confidence}`);
    lines.push('');

    lines.push('# HELP qasl_prediction_apis_at_risk APIs en riesgo de fallo');
    lines.push('# TYPE qasl_prediction_apis_at_risk gauge');
    lines.push(`qasl_prediction_apis_at_risk ${pred.apisAtRisk}`);
    lines.push('');

    // ═══════════════════════════════════════════════════════════════════════════════
    // ENTERPRISE METRICS - COMPLIANCE
    // ═══════════════════════════════════════════════════════════════════════════════
    const comp = this.metrics.enterprise.compliance;

    lines.push('# HELP qasl_compliance_score Puntuación de compliance por framework (0-100)');
    lines.push('# TYPE qasl_compliance_score gauge');
    lines.push(`qasl_compliance_score{framework="SOC2"} ${comp.soc2Score}`);
    lines.push(`qasl_compliance_score{framework="ISO27001"} ${comp.iso27001Score}`);
    lines.push(`qasl_compliance_score{framework="PCI-DSS"} ${comp.pciDssScore}`);
    lines.push(`qasl_compliance_score{framework="HIPAA"} ${comp.hipaaScore}`);
    lines.push('');

    // ═══════════════════════════════════════════════════════════════════════════════
    // ENTERPRISE METRICS - WEBHOOKS
    // ═══════════════════════════════════════════════════════════════════════════════
    const wh = this.metrics.enterprise.webhooks;

    lines.push('# HELP qasl_webhooks_total Total de webhooks configurados');
    lines.push('# TYPE qasl_webhooks_total gauge');
    lines.push(`qasl_webhooks_total ${wh.total}`);
    lines.push('');

    lines.push('# HELP qasl_webhooks_active Webhooks activos');
    lines.push('# TYPE qasl_webhooks_active gauge');
    lines.push(`qasl_webhooks_active ${wh.active}`);
    lines.push('');

    lines.push('# HELP qasl_webhooks_triggered_total Total de webhooks disparados');
    lines.push('# TYPE qasl_webhooks_triggered_total counter');
    lines.push(`qasl_webhooks_triggered_total ${wh.triggered}`);
    lines.push('');

    lines.push('# HELP qasl_webhooks_failed_total Total de webhooks fallidos');
    lines.push('# TYPE qasl_webhooks_failed_total counter');
    lines.push(`qasl_webhooks_failed_total ${wh.failed}`);
    lines.push('');

    // ═══════════════════════════════════════════════════════════════════════════════
    // ENTERPRISE METRICS - OWASP ZAP SECURITY
    // ═══════════════════════════════════════════════════════════════════════════════
    const zap = this.metrics.enterprise.zap;

    lines.push('# HELP qasl_zap_vulnerabilities_total Total de vulnerabilidades OWASP ZAP');
    lines.push('# TYPE qasl_zap_vulnerabilities_total gauge');
    lines.push(`qasl_zap_vulnerabilities_total ${zap.total}`);
    lines.push('');

    lines.push('# HELP qasl_zap_vulnerabilities Vulnerabilidades OWASP ZAP por severidad');
    lines.push('# TYPE qasl_zap_vulnerabilities gauge');
    lines.push(`qasl_zap_vulnerabilities{severity="critical"} ${zap.critical}`);
    lines.push(`qasl_zap_vulnerabilities{severity="high"} ${zap.high}`);
    lines.push(`qasl_zap_vulnerabilities{severity="medium"} ${zap.medium}`);
    lines.push(`qasl_zap_vulnerabilities{severity="low"} ${zap.low}`);
    lines.push('');

    lines.push('# HELP qasl_zap_scan_status Estado del escaneo ZAP (1=sin criticos, 0=tiene criticos)');
    lines.push('# TYPE qasl_zap_scan_status gauge');
    lines.push(`qasl_zap_scan_status ${zap.status}`);
    lines.push('');

    // Top vulnerabilidades como info metrics
    if (zap.topVulnerabilities && zap.topVulnerabilities.length > 0) {
      lines.push('# HELP qasl_zap_top_vulnerability Top vulnerabilidades detectadas por OWASP ZAP');
      lines.push('# TYPE qasl_zap_top_vulnerability gauge');
      for (const vuln of zap.topVulnerabilities) {
        const vulnLabels = this.formatLabels({
          name: vuln.name || 'Unknown',
          severity: vuln.severity || 'low'
        });
        lines.push(`qasl_zap_top_vulnerability{${vulnLabels}} ${vuln.count || 0}`);
      }
      lines.push('');
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // ADVANCED MONITORS v2.0 METRICS
    // ═══════════════════════════════════════════════════════════════════════════════

    // Connectivity Monitor (Front-End ↔ API)
    if (this.advancedMetrics?.connectivity) {
      const conn = this.advancedMetrics.connectivity;
      lines.push('# HELP qasl_connectivity_apis_total Total APIs en connectivity monitor');
      lines.push('# TYPE qasl_connectivity_apis_total gauge');
      lines.push(`qasl_connectivity_apis_total ${conn.total || 0}`);
      lines.push('');

      lines.push('# HELP qasl_connectivity_healthy APIs con conexión saludable');
      lines.push('# TYPE qasl_connectivity_healthy gauge');
      lines.push(`qasl_connectivity_healthy ${conn.healthy || 0}`);
      lines.push('');

      lines.push('# HELP qasl_connectivity_issues_total Issues de conectividad por tipo');
      lines.push('# TYPE qasl_connectivity_issues_total gauge');
      lines.push(`qasl_connectivity_issues_total{type="cors"} ${conn.cors || 0}`);
      lines.push(`qasl_connectivity_issues_total{type="ssl"} ${conn.ssl || 0}`);
      lines.push(`qasl_connectivity_issues_total{type="dns"} ${conn.dns || 0}`);
      lines.push(`qasl_connectivity_issues_total{type="auth"} ${conn.auth || 0}`);
      lines.push(`qasl_connectivity_issues_total{type="network"} ${conn.network || 0}`);
      lines.push('');

      lines.push('# HELP qasl_connectivity_ssl_days Días hasta expiración SSL');
      lines.push('# TYPE qasl_connectivity_ssl_days gauge');
      lines.push(`qasl_connectivity_ssl_days ${conn.sslDays || 0}`);
      lines.push('');
    }

    // Dependency Monitor (API → API Cascada)
    if (this.advancedMetrics?.dependency) {
      const dep = this.advancedMetrics.dependency;
      lines.push('# HELP qasl_dependency_apis_total APIs en el grafo de dependencias');
      lines.push('# TYPE qasl_dependency_apis_total gauge');
      lines.push(`qasl_dependency_apis_total ${dep.totalApis || 0}`);
      lines.push('');

      lines.push('# HELP qasl_dependency_total Total de dependencias detectadas');
      lines.push('# TYPE qasl_dependency_total gauge');
      lines.push(`qasl_dependency_total ${dep.totalDependencies || 0}`);
      lines.push('');

      lines.push('# HELP qasl_dependency_cycles Ciclos de dependencia detectados');
      lines.push('# TYPE qasl_dependency_cycles gauge');
      lines.push(`qasl_dependency_cycles ${dep.cycles || 0}`);
      lines.push('');

      lines.push('# HELP qasl_dependency_cascade_events Eventos de cascada detectados');
      lines.push('# TYPE qasl_dependency_cascade_events counter');
      lines.push(`qasl_dependency_cascade_events ${dep.cascadeEvents || 0}`);
      lines.push('');

      lines.push('# HELP qasl_dependency_health Estado de salud por dependencias');
      lines.push('# TYPE qasl_dependency_health gauge');
      lines.push(`qasl_dependency_health{status="healthy"} ${dep.healthy || 0}`);
      lines.push(`qasl_dependency_health{status="degraded"} ${dep.degraded || 0}`);
      lines.push(`qasl_dependency_health{status="down"} ${dep.down || 0}`);
      lines.push('');
    }

    // Multi-Location Monitor (Regiones)
    if (this.advancedMetrics?.multiLocation) {
      const loc = this.advancedMetrics.multiLocation;
      lines.push('# HELP qasl_location_regions_active Regiones activas');
      lines.push('# TYPE qasl_location_regions_active gauge');
      lines.push(`qasl_location_regions_active ${loc.activeRegions || 0}`);
      lines.push('');

      lines.push('# HELP qasl_location_checks_total Total de checks por región');
      lines.push('# TYPE qasl_location_checks_total counter');
      lines.push(`qasl_location_checks_total ${loc.totalChecks || 0}`);
      lines.push('');

      lines.push('# HELP qasl_location_latency_global_ms Latencia global promedio');
      lines.push('# TYPE qasl_location_latency_global_ms gauge');
      lines.push(`qasl_location_latency_global_ms ${loc.globalLatency || 0}`);
      lines.push('');

      lines.push('# HELP qasl_location_issues_total Issues regionales detectados');
      lines.push('# TYPE qasl_location_issues_total gauge');
      lines.push(`qasl_location_issues_total ${loc.issues || 0}`);
      lines.push('');

      // Latencia por región
      if (loc.latencyByRegion) {
        lines.push('# HELP qasl_location_latency_by_region_ms Latencia por región en ms');
        lines.push('# TYPE qasl_location_latency_by_region_ms gauge');
        for (const [region, latency] of Object.entries(loc.latencyByRegion)) {
          lines.push(`qasl_location_latency_by_region_ms{region="${region}"} ${latency || 0}`);
        }
        lines.push('');
      }
    }

    // Contract Monitor (Schema Drift)
    if (this.advancedMetrics?.contract) {
      const ct = this.advancedMetrics.contract;
      lines.push('# HELP qasl_contract_total Total de contratos monitoreados');
      lines.push('# TYPE qasl_contract_total gauge');
      lines.push(`qasl_contract_total ${ct.total || 0}`);
      lines.push('');

      lines.push('# HELP qasl_contract_healthy Contratos sin cambios');
      lines.push('# TYPE qasl_contract_healthy gauge');
      lines.push(`qasl_contract_healthy ${ct.healthy || 0}`);
      lines.push('');

      lines.push('# HELP qasl_contract_breaking Breaking changes detectados');
      lines.push('# TYPE qasl_contract_breaking gauge');
      lines.push(`qasl_contract_breaking ${ct.breaking || 0}`);
      lines.push('');

      lines.push('# HELP qasl_contract_schema_changes Cambios de schema detectados');
      lines.push('# TYPE qasl_contract_schema_changes counter');
      lines.push(`qasl_contract_schema_changes ${ct.schemaChanges || 0}`);
      lines.push('');

      lines.push('# HELP qasl_contract_alerts_active Alertas de contrato activas');
      lines.push('# TYPE qasl_contract_alerts_active gauge');
      lines.push(`qasl_contract_alerts_active ${ct.activeAlerts || 0}`);
      lines.push('');
    }

    // RUM Monitor (Real User Monitoring)
    if (this.advancedMetrics?.rum) {
      const rum = this.advancedMetrics.rum;
      lines.push('# HELP qasl_rum_sessions_active Sesiones de usuario activas');
      lines.push('# TYPE qasl_rum_sessions_active gauge');
      lines.push(`qasl_rum_sessions_active ${rum.activeSessions || 0}`);
      lines.push('');

      lines.push('# HELP qasl_rum_events_total Total de eventos RUM');
      lines.push('# TYPE qasl_rum_events_total counter');
      lines.push(`qasl_rum_events_total ${rum.totalEvents || 0}`);
      lines.push('');

      lines.push('# HELP qasl_rum_errors_total Errores de usuario real');
      lines.push('# TYPE qasl_rum_errors_total counter');
      lines.push(`qasl_rum_errors_total ${rum.errors || 0}`);
      lines.push('');

      lines.push('# HELP qasl_rum_latency_percentile Latencia RUM por percentil en ms');
      lines.push('# TYPE qasl_rum_latency_percentile gauge');
      lines.push(`qasl_rum_latency_percentile{percentile="p50"} ${rum.p50 || 0}`);
      lines.push(`qasl_rum_latency_percentile{percentile="p75"} ${rum.p75 || 0}`);
      lines.push(`qasl_rum_latency_percentile{percentile="p95"} ${rum.p95 || 0}`);
      lines.push(`qasl_rum_latency_percentile{percentile="p99"} ${rum.p99 || 0}`);
      lines.push('');

      lines.push('# HELP qasl_rum_success_rate Tasa de éxito de usuarios');
      lines.push('# TYPE qasl_rum_success_rate gauge');
      lines.push(`qasl_rum_success_rate ${rum.successRate || 0}`);
      lines.push('');

      // Por dispositivo
      if (rum.byDevice) {
        lines.push('# HELP qasl_rum_by_device Usuarios por tipo de dispositivo');
        lines.push('# TYPE qasl_rum_by_device gauge');
        for (const [device, count] of Object.entries(rum.byDevice)) {
          lines.push(`qasl_rum_by_device{device="${device}"} ${count || 0}`);
        }
        lines.push('');
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // INFO LABELS
    // ═══════════════════════════════════════════════════════════════════════════════
    lines.push('# HELP qasl_info Información del sistema QASL-API-SENTINEL');
    lines.push('# TYPE qasl_info gauge');
    lines.push(`qasl_info{project="QASL_NEXUS_LLM",client="Elyer Gregorio Maldonado",company="QASL NEXUS LLM",qa_lead="Elyer Gregorio Maldonado",version="2.0.0"} 1`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Formatea labels para Prometheus
   */
  formatLabels(labels) {
    return Object.entries(labels)
      .map(([key, value]) => `${key}="${this.escapeLabel(value)}"`)
      .join(',');
  }

  /**
   * Escapa caracteres especiales en labels
   */
  escapeLabel(value) {
    if (typeof value !== 'string') return String(value);
    return value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');
  }

  /**
   * Obtiene métricas actuales en formato JSON (para API interna)
   */
  getMetricsJson() {
    const apis = [];

    for (const [apiId, metric] of this.metrics.apiMetrics) {
      apis.push({
        id: apiId,
        name: metric.name,
        url: metric.url,
        method: metric.method,
        status: metric.lastStatus,
        latency: metric.lastLatency,
        healthy: metric.lastHealthy || false,
        checks: metric.checks,
        successes: metric.successes,
        failures: metric.failures,
        uptime: metric.checks > 0
          ? parseFloat((metric.successes / metric.checks * 100).toFixed(2))
          : 100,
        avgLatency: metric.checks > 0
          ? Math.round(metric.totalLatency / metric.checks)
          : 0,
        authType: metric.authType,
        priority: metric.priority,
        lastCheck: new Date(metric.lastCheck).toISOString()
      });
    }

    return {
      project: 'QASL NEXUS LLM',
      client: 'Elyer Gregorio Maldonado',
      company: 'QASL NEXUS LLM',
      qaLead: 'Elyer Gregorio Maldonado',
      uptime: Math.floor((Date.now() - this.metrics.startTime) / 1000),
      global: {
        totalApis: this.metrics.apiMetrics.size,
        totalChecks: this.metrics.totalChecks,
        successfulChecks: this.metrics.successfulChecks,
        failedChecks: this.metrics.failedChecks,
        uptimePercentage: this.metrics.totalChecks > 0
          ? parseFloat((this.metrics.successfulChecks / this.metrics.totalChecks * 100).toFixed(2))
          : 100,
        avgLatency: this.metrics.totalChecks > 0
          ? Math.round(this.metrics.totalLatency / this.metrics.totalChecks)
          : 0
      },
      apis
    };
  }
}
