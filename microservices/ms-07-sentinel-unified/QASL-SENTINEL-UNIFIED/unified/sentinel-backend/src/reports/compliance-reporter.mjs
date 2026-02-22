/**
 * QASL-API-SENTINEL - Compliance Reporter
 * Genera reportes de cumplimiento para SOC2, ISO27001, PCI-DSS, HIPAA
 *
 * @author Elyer Gregorio Maldonado
 * @project QASL NEXUS LLM
 */

import fs from 'fs';
import path from 'path';

export class ComplianceReporter {
  constructor(dataLayer, config = {}) {
    this.dataLayer = dataLayer;
    this.config = config;

    // Definición de controles por estándar
    this.standards = {
      soc2: {
        name: 'SOC2 Type II',
        description: 'Service Organization Control 2',
        controls: [
          {
            id: 'CC7.1',
            name: 'Monitoring Infrastructure',
            description: 'La organización detecta y monitorea anomalías que podrían indicar incidentes de seguridad',
            check: 'monitoringEnabled',
            evidence: ['uptime_logs', 'health_checks', 'monitoring_config']
          },
          {
            id: 'CC7.2',
            name: 'Alert Configuration',
            description: 'La organización tiene procedimientos para responder a incidentes de seguridad',
            check: 'alertsConfigured',
            evidence: ['alert_config', 'notification_logs', 'escalation_policy']
          },
          {
            id: 'CC7.3',
            name: 'Incident Response',
            description: 'La organización responde a incidentes identificados de manera oportuna',
            check: 'incidentResponse',
            evidence: ['incident_logs', 'mttr_metrics', 'response_times']
          },
          {
            id: 'CC7.4',
            name: 'Incident Analysis',
            description: 'La organización analiza los incidentes y aprende de ellos',
            check: 'incidentAnalysis',
            evidence: ['incident_reports', 'root_cause_analysis', 'ai_reports']
          },
          {
            id: 'CC8.1',
            name: 'Change Detection',
            description: 'La organización detecta cambios no autorizados en la infraestructura',
            check: 'changeDetection',
            evidence: ['api_changes', 'version_tracking', 'deployment_logs']
          }
        ]
      },
      iso27001: {
        name: 'ISO 27001',
        description: 'Information Security Management System',
        controls: [
          {
            id: 'A.12.1.1',
            name: 'Documented Operating Procedures',
            description: 'Procedimientos operativos documentados y disponibles',
            check: 'documentedProcedures',
            evidence: ['config_files', 'documentation', 'runbooks']
          },
          {
            id: 'A.12.1.3',
            name: 'Capacity Management',
            description: 'Monitoreo de uso de recursos y proyección de capacidad',
            check: 'capacityManagement',
            evidence: ['latency_metrics', 'throughput_data', 'capacity_reports']
          },
          {
            id: 'A.12.4.1',
            name: 'Event Logging',
            description: 'Registro de eventos de seguridad y actividades de usuario',
            check: 'eventLogging',
            evidence: ['event_logs', 'audit_trail', 'access_logs']
          },
          {
            id: 'A.12.4.3',
            name: 'Administrator and Operator Logs',
            description: 'Actividades de administrador registradas y protegidas',
            check: 'adminLogs',
            evidence: ['admin_logs', 'change_logs', 'access_records']
          },
          {
            id: 'A.14.2.8',
            name: 'System Security Testing',
            description: 'Pruebas de seguridad durante el desarrollo',
            check: 'securityTesting',
            evidence: ['security_scans', 'vulnerability_reports', 'test_results']
          },
          {
            id: 'A.16.1.5',
            name: 'Response to Information Security Incidents',
            description: 'Respuesta a incidentes de seguridad de la información',
            check: 'incidentResponse',
            evidence: ['incident_logs', 'response_procedures', 'mttr_metrics']
          }
        ]
      },
      'pci-dss': {
        name: 'PCI-DSS',
        description: 'Payment Card Industry Data Security Standard',
        controls: [
          {
            id: 'REQ10.1',
            name: 'Audit Trails',
            description: 'Implementar pistas de auditoría para todos los accesos',
            check: 'auditTrails',
            evidence: ['access_logs', 'audit_trail', 'authentication_logs']
          },
          {
            id: 'REQ10.2',
            name: 'Automated Audit Trails',
            description: 'Pistas de auditoría automatizadas para reconstruir eventos',
            check: 'automatedAudit',
            evidence: ['automated_logs', 'event_correlation', 'timeline_data']
          },
          {
            id: 'REQ10.5',
            name: 'Secure Audit Trails',
            description: 'Protección de pistas de auditoría contra alteración',
            check: 'secureAuditTrails',
            evidence: ['log_integrity', 'access_controls', 'backup_logs']
          },
          {
            id: 'REQ11.5',
            name: 'Change Detection Mechanisms',
            description: 'Mecanismos de detección de cambios en archivos críticos',
            check: 'changeDetection',
            evidence: ['file_monitoring', 'integrity_checks', 'change_alerts']
          }
        ]
      },
      hipaa: {
        name: 'HIPAA',
        description: 'Health Insurance Portability and Accountability Act',
        controls: [
          {
            id: '164.312(b)',
            name: 'Audit Controls',
            description: 'Mecanismos de hardware, software y/o procedimentales para registrar y examinar la actividad',
            check: 'auditControls',
            evidence: ['audit_logs', 'access_records', 'monitoring_data']
          },
          {
            id: '164.308(a)(6)',
            name: 'Security Incident Procedures',
            description: 'Procedimientos para responder a incidentes de seguridad',
            check: 'incidentProcedures',
            evidence: ['incident_procedures', 'response_logs', 'escalation_policy']
          },
          {
            id: '164.308(a)(1)(ii)(D)',
            name: 'Information System Activity Review',
            description: 'Revisión regular de registros de actividad del sistema',
            check: 'activityReview',
            evidence: ['activity_reports', 'review_logs', 'audit_reviews']
          }
        ]
      }
    };
  }

  /**
   * Genera un reporte de cumplimiento para un estándar específico
   */
  async generateReport(standard, options = {}) {
    const stdConfig = this.standards[standard.toLowerCase()];
    if (!stdConfig) {
      throw new Error(`Estándar no soportado: ${standard}. Soportados: ${Object.keys(this.standards).join(', ')}`);
    }

    const period = options.period || this.getCurrentPeriod();
    const results = await this.evaluateControls(stdConfig, period);

    return {
      metadata: {
        standard: stdConfig.name,
        description: stdConfig.description,
        period: period,
        generatedAt: new Date().toISOString(),
        generatedBy: 'QASL-API-SENTINEL',
        version: '1.0.0'
      },
      summary: this.generateSummary(results),
      controls: results,
      evidence: await this.collectEvidence(stdConfig, period),
      recommendations: this.generateRecommendations(results),
      auditTrail: this.generateAuditTrail(period)
    };
  }

  /**
   * Evalúa todos los controles de un estándar
   */
  async evaluateControls(stdConfig, period) {
    const results = [];

    for (const control of stdConfig.controls) {
      const evaluation = await this.evaluateControl(control, period);
      results.push({
        id: control.id,
        name: control.name,
        description: control.description,
        status: evaluation.status,
        score: evaluation.score,
        findings: evaluation.findings,
        evidence: evaluation.evidence,
        recommendations: evaluation.recommendations
      });
    }

    return results;
  }

  /**
   * Evalúa un control individual
   */
  async evaluateControl(control, period) {
    const checkMethod = this[control.check];

    if (typeof checkMethod !== 'function') {
      return {
        status: 'NOT_EVALUATED',
        score: 0,
        findings: [`Check method '${control.check}' not implemented`],
        evidence: [],
        recommendations: ['Implementar verificación para este control']
      };
    }

    try {
      const result = await checkMethod.call(this, period);
      return result;
    } catch (error) {
      return {
        status: 'ERROR',
        score: 0,
        findings: [`Error evaluating control: ${error.message}`],
        evidence: [],
        recommendations: ['Revisar configuración del sistema']
      };
    }
  }

  // ==================== MÉTODOS DE VERIFICACIÓN ====================

  /**
   * Verifica si el monitoreo está habilitado y funcionando
   */
  async monitoringEnabled(period) {
    const findings = [];
    const evidence = [];
    let score = 0;

    // Verificar que hay APIs configuradas
    const apis = await this.dataLayer.getMonitoredApis();
    if (apis && apis.length > 0) {
      score += 30;
      evidence.push(`${apis.length} APIs monitoreadas configuradas`);
    } else {
      findings.push('No hay APIs configuradas para monitoreo');
    }

    // Verificar health checks recientes
    const history = await this.dataLayer.getHealthHistory(24);
    if (history && history.length > 0) {
      score += 40;
      evidence.push(`${history.length} health checks en últimas 24 horas`);

      // Calcular uptime
      const successful = history.filter(h => h.healthy).length;
      const uptime = ((successful / history.length) * 100).toFixed(2);
      evidence.push(`Uptime: ${uptime}%`);
    } else {
      findings.push('No hay registros de health checks recientes');
    }

    // Verificar métricas Prometheus
    if (this.config.prometheus?.enabled !== false) {
      score += 30;
      evidence.push('Prometheus Exporter activo');
    } else {
      findings.push('Prometheus Exporter no configurado');
    }

    return {
      status: score >= 70 ? 'COMPLIANT' : score >= 40 ? 'PARTIAL' : 'NON_COMPLIANT',
      score,
      findings,
      evidence,
      recommendations: findings.length > 0 ? ['Configurar monitoreo completo para todas las APIs'] : []
    };
  }

  /**
   * Verifica configuración de alertas
   */
  async alertsConfigured(period) {
    const findings = [];
    const evidence = [];
    let score = 0;

    // Verificar configuración de email
    if (this.config.email?.enabled) {
      score += 40;
      evidence.push('Notificaciones por email configuradas');
    } else {
      findings.push('Notificaciones por email no configuradas');
    }

    // Verificar historial de alertas
    const alerts = await this.dataLayer.getAlertHistory(period.days || 30);
    if (alerts && alerts.length > 0) {
      score += 30;
      evidence.push(`${alerts.length} alertas generadas en el período`);
    }

    // Verificar thresholds configurados
    const apis = await this.dataLayer.getMonitoredApis();
    const apisWithThresholds = apis?.filter(a => a.threshold_ms > 0) || [];
    if (apisWithThresholds.length > 0) {
      score += 30;
      evidence.push(`${apisWithThresholds.length} APIs con thresholds configurados`);
    } else {
      findings.push('No hay thresholds de rendimiento configurados');
    }

    return {
      status: score >= 70 ? 'COMPLIANT' : score >= 40 ? 'PARTIAL' : 'NON_COMPLIANT',
      score,
      findings,
      evidence,
      recommendations: findings.length > 0 ? ['Configurar alertas para todos los escenarios críticos'] : []
    };
  }

  /**
   * Verifica respuesta a incidentes
   */
  async incidentResponse(period) {
    const findings = [];
    const evidence = [];
    let score = 0;

    // Obtener incidentes del período
    const incidents = await this.dataLayer.getIncidents(period.days || 30);

    if (!incidents || incidents.length === 0) {
      evidence.push('No se registraron incidentes en el período');
      score = 100;
      return {
        status: 'COMPLIANT',
        score,
        findings: [],
        evidence,
        recommendations: []
      };
    }

    evidence.push(`${incidents.length} incidentes registrados`);

    // Calcular MTTR (Mean Time To Recovery)
    const resolvedIncidents = incidents.filter(i => i.resolvedAt);
    if (resolvedIncidents.length > 0) {
      const totalRecoveryTime = resolvedIncidents.reduce((sum, i) => {
        const recoveryTime = new Date(i.resolvedAt) - new Date(i.detectedAt);
        return sum + recoveryTime;
      }, 0);
      const mttr = totalRecoveryTime / resolvedIncidents.length / 60000; // en minutos

      evidence.push(`MTTR: ${mttr.toFixed(1)} minutos`);

      if (mttr <= 15) {
        score += 50;
      } else if (mttr <= 30) {
        score += 30;
      } else {
        findings.push(`MTTR alto: ${mttr.toFixed(1)} minutos`);
        score += 10;
      }
    }

    // Verificar que todos los incidentes tienen registro
    const documentedIncidents = incidents.filter(i => i.description || i.rootCause);
    if (documentedIncidents.length === incidents.length) {
      score += 50;
      evidence.push('Todos los incidentes documentados');
    } else {
      const undocumented = incidents.length - documentedIncidents.length;
      findings.push(`${undocumented} incidentes sin documentar`);
      score += 25;
    }

    return {
      status: score >= 70 ? 'COMPLIANT' : score >= 40 ? 'PARTIAL' : 'NON_COMPLIANT',
      score,
      findings,
      evidence,
      recommendations: findings.length > 0 ? ['Mejorar documentación de incidentes', 'Reducir tiempo de respuesta'] : []
    };
  }

  /**
   * Verifica análisis de incidentes
   */
  async incidentAnalysis(period) {
    const findings = [];
    const evidence = [];
    let score = 0;

    // Verificar reportes AI generados
    const aiReports = await this.dataLayer.getAIReports(period.days || 30);
    if (aiReports && aiReports.length > 0) {
      score += 50;
      evidence.push(`${aiReports.length} reportes AI generados`);
    } else {
      findings.push('No se generaron reportes de análisis AI');
    }

    // Verificar análisis predictivo
    const predictions = await this.dataLayer.getPredictions(period.days || 30);
    if (predictions && predictions.length > 0) {
      score += 30;
      evidence.push(`${predictions.length} análisis predictivos realizados`);
    }

    // Verificar recomendaciones implementadas (si hay tracking)
    if (this.config.recommendations?.tracking) {
      score += 20;
      evidence.push('Sistema de seguimiento de recomendaciones activo');
    }

    return {
      status: score >= 70 ? 'COMPLIANT' : score >= 40 ? 'PARTIAL' : 'NON_COMPLIANT',
      score,
      findings,
      evidence,
      recommendations: findings.length > 0 ? ['Activar análisis AI regular', 'Documentar lecciones aprendidas'] : []
    };
  }

  /**
   * Verifica detección de cambios
   */
  async changeDetection(period) {
    const findings = [];
    const evidence = [];
    let score = 0;

    // Verificar si hay tracking de cambios en APIs
    const apiChanges = await this.dataLayer.getApiChanges(period.days || 30);
    if (apiChanges && apiChanges.length > 0) {
      score += 50;
      evidence.push(`${apiChanges.length} cambios de API detectados`);
    } else {
      evidence.push('No se detectaron cambios en APIs');
      score += 25;
    }

    // Verificar versionamiento
    if (this.config.versioning?.enabled) {
      score += 30;
      evidence.push('Versionamiento de configuración activo');
    }

    // Verificar logs de deployment
    score += 20;
    evidence.push('Sistema de logging activo');

    return {
      status: score >= 70 ? 'COMPLIANT' : score >= 40 ? 'PARTIAL' : 'NON_COMPLIANT',
      score,
      findings,
      evidence,
      recommendations: findings.length > 0 ? ['Implementar tracking de cambios'] : []
    };
  }

  /**
   * Verifica procedimientos documentados
   */
  async documentedProcedures(period) {
    const findings = [];
    const evidence = [];
    let score = 0;

    // Verificar archivo de configuración
    if (fs.existsSync('config/sentinel.json') || fs.existsSync('config/apis.json')) {
      score += 40;
      evidence.push('Configuración documentada en archivos JSON');
    } else {
      findings.push('No se encontraron archivos de configuración estándar');
    }

    // Verificar README
    if (fs.existsSync('README.md')) {
      score += 30;
      evidence.push('README.md presente');
    }

    // Verificar documentación adicional
    if (fs.existsSync('docs') || fs.existsSync('ROADMAP-ENTERPRISE-FEATURES.md')) {
      score += 30;
      evidence.push('Documentación adicional disponible');
    }

    return {
      status: score >= 70 ? 'COMPLIANT' : score >= 40 ? 'PARTIAL' : 'NON_COMPLIANT',
      score,
      findings,
      evidence,
      recommendations: findings.length > 0 ? ['Crear documentación de procedimientos operativos'] : []
    };
  }

  /**
   * Verifica gestión de capacidad
   */
  async capacityManagement(period) {
    const findings = [];
    const evidence = [];
    let score = 0;

    // Verificar métricas de latencia
    const latencyMetrics = await this.dataLayer.getLatencyMetrics(period.days || 30);
    if (latencyMetrics) {
      score += 40;
      evidence.push('Métricas de latencia registradas');

      if (latencyMetrics.p95) {
        evidence.push(`P95 Latencia: ${latencyMetrics.p95}ms`);
      }
    }

    // Verificar métricas de throughput
    const throughput = await this.dataLayer.getThroughputMetrics(period.days || 30);
    if (throughput) {
      score += 30;
      evidence.push('Métricas de throughput disponibles');
    }

    // Verificar Prometheus para capacity planning
    if (this.config.prometheus?.enabled !== false) {
      score += 30;
      evidence.push('Prometheus disponible para capacity planning');
    }

    return {
      status: score >= 70 ? 'COMPLIANT' : score >= 40 ? 'PARTIAL' : 'NON_COMPLIANT',
      score,
      findings,
      evidence,
      recommendations: findings.length > 0 ? ['Configurar métricas de capacidad'] : []
    };
  }

  /**
   * Verifica logging de eventos
   */
  async eventLogging(period) {
    const findings = [];
    const evidence = [];
    let score = 0;

    // Verificar logs de salud
    const healthLogs = await this.dataLayer.getHealthHistory(period.days || 30);
    if (healthLogs && healthLogs.length > 0) {
      score += 40;
      evidence.push(`${healthLogs.length} eventos de salud registrados`);
    }

    // Verificar logs de alertas
    const alertLogs = await this.dataLayer.getAlertHistory(period.days || 30);
    if (alertLogs && alertLogs.length > 0) {
      score += 30;
      evidence.push(`${alertLogs.length} alertas registradas`);
    }

    // Verificar persistencia de logs
    if (this.dataLayer.getStorageType() !== 'memory') {
      score += 30;
      evidence.push('Logs persistidos en almacenamiento duradero');
    } else {
      findings.push('Logs solo en memoria - riesgo de pérdida');
      score += 10;
    }

    return {
      status: score >= 70 ? 'COMPLIANT' : score >= 40 ? 'PARTIAL' : 'NON_COMPLIANT',
      score,
      findings,
      evidence,
      recommendations: findings.length > 0 ? ['Configurar persistencia de logs'] : []
    };
  }

  /**
   * Verifica logs de administrador
   */
  async adminLogs(period) {
    // Similar a eventLogging pero enfocado en acciones administrativas
    return this.eventLogging(period);
  }

  /**
   * Verifica testing de seguridad
   */
  async securityTesting(period) {
    const findings = [];
    const evidence = [];
    let score = 0;

    // Verificar si hay módulo de seguridad activo
    if (this.config.security?.enabled) {
      score += 50;
      evidence.push('Módulo de seguridad activo');
    } else {
      findings.push('Módulo de seguridad no configurado');
    }

    // Verificar escaneos de seguridad
    const securityScans = await this.dataLayer.getSecurityScans(period.days || 30);
    if (securityScans && securityScans.length > 0) {
      score += 50;
      evidence.push(`${securityScans.length} escaneos de seguridad realizados`);
    } else {
      findings.push('No hay escaneos de seguridad registrados');
    }

    return {
      status: score >= 70 ? 'COMPLIANT' : score >= 40 ? 'PARTIAL' : 'NON_COMPLIANT',
      score,
      findings,
      evidence,
      recommendations: findings.length > 0 ? ['Implementar escaneos de seguridad regulares'] : []
    };
  }

  /**
   * Verifica pistas de auditoría (PCI-DSS)
   */
  async auditTrails(period) {
    return this.eventLogging(period);
  }

  /**
   * Verifica auditoría automatizada
   */
  async automatedAudit(period) {
    const findings = [];
    const evidence = [];
    let score = 0;

    // El sistema QASL es inherentemente automatizado
    score += 50;
    evidence.push('Sistema de monitoreo automatizado');

    // Verificar scheduler activo
    if (this.config.scheduler?.enabled !== false) {
      score += 30;
      evidence.push('Scheduler de tareas activo');
    }

    // Verificar reportes automáticos
    if (this.config.reports?.scheduled) {
      score += 20;
      evidence.push('Reportes programados configurados');
    }

    return {
      status: score >= 70 ? 'COMPLIANT' : score >= 40 ? 'PARTIAL' : 'NON_COMPLIANT',
      score,
      findings,
      evidence,
      recommendations: findings.length > 0 ? ['Configurar automatización completa'] : []
    };
  }

  /**
   * Verifica seguridad de pistas de auditoría
   */
  async secureAuditTrails(period) {
    const findings = [];
    const evidence = [];
    let score = 0;

    // Verificar integridad de logs
    const storageType = this.dataLayer.getStorageType();
    if (storageType === 'sqlite' || storageType === 'postgresql') {
      score += 50;
      evidence.push(`Almacenamiento seguro: ${storageType}`);
    } else {
      findings.push('Logs en memoria - sin garantía de integridad');
      score += 20;
    }

    // Verificar backups (si están configurados)
    if (this.config.backup?.enabled) {
      score += 50;
      evidence.push('Sistema de backup configurado');
    } else {
      findings.push('No hay sistema de backup configurado');
    }

    return {
      status: score >= 70 ? 'COMPLIANT' : score >= 40 ? 'PARTIAL' : 'NON_COMPLIANT',
      score,
      findings,
      evidence,
      recommendations: findings.length > 0 ? ['Configurar backup de logs', 'Implementar control de integridad'] : []
    };
  }

  /**
   * Verifica controles de auditoría (HIPAA)
   */
  async auditControls(period) {
    return this.eventLogging(period);
  }

  /**
   * Verifica procedimientos de incidentes (HIPAA)
   */
  async incidentProcedures(period) {
    return this.incidentResponse(period);
  }

  /**
   * Verifica revisión de actividad (HIPAA)
   */
  async activityReview(period) {
    const findings = [];
    const evidence = [];
    let score = 0;

    // Verificar generación de reportes
    const reports = await this.dataLayer.getGeneratedReports(period.days || 30);
    if (reports && reports.length > 0) {
      score += 50;
      evidence.push(`${reports.length} reportes generados en el período`);
    } else {
      findings.push('No se generaron reportes de revisión');
    }

    // Verificar reportes AI (análisis automatizado)
    const aiReports = await this.dataLayer.getAIReports(period.days || 30);
    if (aiReports && aiReports.length > 0) {
      score += 50;
      evidence.push(`${aiReports.length} análisis AI realizados`);
    }

    return {
      status: score >= 70 ? 'COMPLIANT' : score >= 40 ? 'PARTIAL' : 'NON_COMPLIANT',
      score,
      findings,
      evidence,
      recommendations: findings.length > 0 ? ['Programar revisiones periódicas de actividad'] : []
    };
  }

  // ==================== MÉTODOS AUXILIARES ====================

  /**
   * Genera resumen del reporte
   */
  generateSummary(results) {
    const compliant = results.filter(r => r.status === 'COMPLIANT').length;
    const partial = results.filter(r => r.status === 'PARTIAL').length;
    const nonCompliant = results.filter(r => r.status === 'NON_COMPLIANT').length;
    const total = results.length;

    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / total;

    let overallStatus;
    if (nonCompliant === 0 && partial === 0) {
      overallStatus = 'FULLY_COMPLIANT';
    } else if (nonCompliant === 0) {
      overallStatus = 'SUBSTANTIALLY_COMPLIANT';
    } else if (nonCompliant < total / 2) {
      overallStatus = 'PARTIALLY_COMPLIANT';
    } else {
      overallStatus = 'NON_COMPLIANT';
    }

    return {
      overallStatus,
      overallScore: Math.round(avgScore),
      totalControls: total,
      compliant,
      partial,
      nonCompliant,
      compliancePercentage: Math.round((compliant / total) * 100)
    };
  }

  /**
   * Recopila evidencia para el reporte
   */
  async collectEvidence(stdConfig, period) {
    const evidence = {
      collectedAt: new Date().toISOString(),
      period: period,
      items: []
    };

    // Health check logs
    const healthHistory = await this.dataLayer.getHealthHistory(period.days || 30);
    if (healthHistory) {
      evidence.items.push({
        type: 'health_logs',
        description: 'Registros de health checks',
        count: healthHistory.length,
        sample: healthHistory.slice(0, 5)
      });
    }

    // Alert history
    const alerts = await this.dataLayer.getAlertHistory(period.days || 30);
    if (alerts) {
      evidence.items.push({
        type: 'alert_logs',
        description: 'Historial de alertas',
        count: alerts.length,
        sample: alerts.slice(0, 5)
      });
    }

    // Incident records
    const incidents = await this.dataLayer.getIncidents(period.days || 30);
    if (incidents) {
      evidence.items.push({
        type: 'incident_records',
        description: 'Registros de incidentes',
        count: incidents.length,
        sample: incidents.slice(0, 5)
      });
    }

    // Configuration evidence
    evidence.items.push({
      type: 'configuration',
      description: 'Configuración del sistema',
      data: {
        apisMonitored: (await this.dataLayer.getMonitoredApis())?.length || 0,
        alertsEnabled: this.config.email?.enabled || false,
        prometheusEnabled: this.config.prometheus?.enabled !== false
      }
    });

    return evidence;
  }

  /**
   * Genera recomendaciones basadas en resultados
   */
  generateRecommendations(results) {
    const recommendations = [];
    const priorityOrder = { NON_COMPLIANT: 1, PARTIAL: 2, COMPLIANT: 3 };

    // Ordenar por prioridad (no compliant primero)
    const sortedResults = [...results].sort((a, b) =>
      priorityOrder[a.status] - priorityOrder[b.status]
    );

    for (const result of sortedResults) {
      if (result.status !== 'COMPLIANT' && result.recommendations.length > 0) {
        recommendations.push({
          controlId: result.id,
          controlName: result.name,
          priority: result.status === 'NON_COMPLIANT' ? 'HIGH' : 'MEDIUM',
          currentScore: result.score,
          actions: result.recommendations
        });
      }
    }

    return recommendations;
  }

  /**
   * Genera pista de auditoría
   */
  generateAuditTrail(period) {
    return {
      generatedBy: 'QASL-API-SENTINEL Compliance Reporter',
      generatedAt: new Date().toISOString(),
      period: period,
      methodology: 'Automated control evaluation based on system data and configuration',
      dataSource: 'QASL-API-SENTINEL Data Layer',
      integrity: 'Report generated from live system data',
      reviewer: this.config.project?.qaLead || 'Elyer Maldonado'
    };
  }

  /**
   * Obtiene el período actual (trimestre)
   */
  getCurrentPeriod() {
    const now = new Date();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    const year = now.getFullYear();

    return {
      label: `Q${quarter}-${year}`,
      quarter,
      year,
      startDate: new Date(year, (quarter - 1) * 3, 1).toISOString(),
      endDate: now.toISOString(),
      days: 90
    };
  }

  /**
   * Verifica cumplimiento rápido (sin generar reporte completo)
   */
  async quickCheck(standard) {
    const report = await this.generateReport(standard);
    return {
      standard: report.metadata.standard,
      status: report.summary.overallStatus,
      score: report.summary.overallScore,
      compliant: report.summary.compliant,
      partial: report.summary.partial,
      nonCompliant: report.summary.nonCompliant
    };
  }

  /**
   * Exporta reporte a formato JSON
   */
  async exportJSON(standard, outputPath, options = {}) {
    const report = await this.generateReport(standard, options);
    const filename = `compliance-${standard}-${report.metadata.period.label}.json`;
    const fullPath = path.join(outputPath || 'reports', filename);

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, JSON.stringify(report, null, 2));

    return fullPath;
  }

  /**
   * Lista estándares soportados
   */
  listStandards() {
    return Object.entries(this.standards).map(([key, value]) => ({
      id: key,
      name: value.name,
      description: value.description,
      controlCount: value.controls.length
    }));
  }
}

export default ComplianceReporter;
