/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                              SCHEDULER                                       ║
 * ║                    Programador de tareas periódicas                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { CronJob } from 'cron';
import { readFileSync, writeFileSync } from 'fs';
import { log } from './banner.mjs';

export class Scheduler {
  constructor(options = {}) {
    this.watcher = options.watcher;
    this.reporter = options.reporter;
    this.predictor = options.predictor;
    this.config = options.config;

    this.jobs = [];
    this.intervals = [];
    this.running = false;
  }

  /**
   * Inicia el scheduler
   */
  async start() {
    if (this.running) return;

    log('Iniciando tareas programadas...', 'info');

    // Health checks periódicos
    this.scheduleHealthChecks();

    // Reportes programados
    this.scheduleReports();

    // Análisis predictivo
    this.schedulePredictions();

    // Limpieza de datos antiguos
    this.scheduleCleanup();

    // Cumplimiento normativo automático
    this.scheduleCompliance();

    this.running = true;
    log('Scheduler iniciado', 'success');
  }

  /**
   * Detiene el scheduler
   */
  async stop() {
    // Detener todos los cron jobs
    for (const job of this.jobs) {
      job.stop();
    }
    this.jobs = [];

    // Limpiar intervalos
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals = [];

    this.running = false;
    log('Scheduler detenido', 'info');
  }

  /**
   * Programa los health checks
   */
  scheduleHealthChecks() {
    const intervals = this.config?.get('monitoring.intervals') || {
      critical: 30,
      normal: 120,
      low: 300
    };

    // Health check crítico (cada 30 seg por defecto)
    const criticalInterval = setInterval(async () => {
      if (this.watcher) {
        await this.watcher.checkCriticalApis();
      }
    }, intervals.critical * 1000);
    this.intervals.push(criticalInterval);

    // Health check normal (cada 2 min por defecto)
    const normalInterval = setInterval(async () => {
      if (this.watcher) {
        await this.watcher.checkNormalApis();
      }
    }, intervals.normal * 1000);
    this.intervals.push(normalInterval);

    // Health check bajo (cada 5 min por defecto)
    const lowInterval = setInterval(async () => {
      if (this.watcher) {
        await this.watcher.checkLowPriorityApis();
      }
    }, intervals.low * 1000);
    this.intervals.push(lowInterval);

    log(`Health checks programados: crítico=${intervals.critical}s, normal=${intervals.normal}s, bajo=${intervals.low}s`, 'info');
  }

  /**
   * Programa los reportes
   *
   * CONFIGURACIÓN (.env):
   * - REPORT_EVERY_5H: vacío = deshabilitado
   * - REPORT_DAILY: "0 8 * * *" = 08:00 AM diario (ÚNICO EMAIL)
   * - REPORT_WEEKLY: vacío = deshabilitado
   */
  scheduleReports() {
    // Leer desde .env primero (prioridad), luego de config
    // Si la variable está definida en .env (incluso vacía), usarla. Sino, usar config.
    const getSchedule = (envKey, configKey, defaultVal = '') => {
      // Si existe en process.env (incluso como string vacía), usarla
      if (envKey in process.env) {
        return process.env[envKey];
      }
      // Sino, intentar config
      return this.config?.get(configKey) || defaultVal;
    };

    const schedules = {
      every5h: getSchedule('REPORT_EVERY_5H', 'reports.schedules.every5h'),
      daily: getSchedule('REPORT_DAILY', 'reports.schedules.daily', '0 8 * * *'),
      weekly: getSchedule('REPORT_WEEKLY', 'reports.schedules.weekly')
    };

    // Reporte cada 5 horas (deshabilitado si vacío)
    if (schedules.every5h && schedules.every5h.trim()) {
      const job5h = new CronJob(schedules.every5h, async () => {
        log('Generando reporte de 5 horas...', 'info');
        if (this.reporter) {
          await this.reporter.generateReport('5h');
        }
      }, null, true, 'America/Argentina/Buenos_Aires');
      this.jobs.push(job5h);
      log(`Reporte 5h programado: ${schedules.every5h}`, 'info');
    }

    // Reporte diario - ÚNICO EMAIL A LAS 08:00 AM
    if (schedules.daily && schedules.daily.trim()) {
      const jobDaily = new CronJob(schedules.daily, async () => {
        log('📧 Generando y enviando reporte diario (08:00 AM)...', 'info');
        if (this.reporter) {
          await this.reporter.generateReport('daily');
        }
      }, null, true, 'America/Argentina/Buenos_Aires');
      this.jobs.push(jobDaily);
      log(`📧 Reporte DIARIO programado: ${schedules.daily} (08:00 AM Argentina)`, 'success');
    }

    // Reporte semanal (deshabilitado si vacío)
    if (schedules.weekly && schedules.weekly.trim()) {
      const jobWeekly = new CronJob(schedules.weekly, async () => {
        log('Generando reporte semanal...', 'info');
        if (this.reporter) {
          await this.reporter.generateReport('weekly');
        }
      }, null, true, 'America/Argentina/Buenos_Aires');
      this.jobs.push(jobWeekly);
      log(`Reporte semanal programado: ${schedules.weekly}`, 'info');
    }

    log('Configuración de reportes aplicada', 'info');
  }

  /**
   * Programa análisis predictivo
   */
  schedulePredictions() {
    // Análisis predictivo cada hora
    const predictionInterval = setInterval(async () => {
      if (this.predictor) {
        await this.predictor.analyze();
      }
    }, 60 * 60 * 1000); // 1 hora

    this.intervals.push(predictionInterval);
    log('Análisis predictivo programado cada hora', 'info');
  }

  /**
   * Programa cumplimiento normativo automático
   * Ejecuta al inicio y cada 6 horas
   */
  scheduleCompliance() {
    const runCompliance = async () => {
      try {
        const { DataLayer } = await import('./data-layer.mjs');
        const { ConfigLoader } = await import('./config-loader.mjs');
        const { ComplianceReporter } = await import('../reports/compliance-reporter.mjs');

        const dataLayer = new DataLayer('./data');
        await dataLayer.init();
        const configLoader = new ConfigLoader('./config');
        await configLoader.load();
        const reporter = new ComplianceReporter(dataLayer, configLoader.config);

        const standards = ['soc2', 'iso27001', 'pci-dss', 'hipaa'];
        let metrics = {};
        try { metrics = JSON.parse(readFileSync('./data/compliance-metrics.json', 'utf-8')); } catch {}

        for (const std of standards) {
          try {
            const result = await reporter.quickCheck(std);
            if (std === 'soc2') metrics.soc2 = result.score;
            else if (std === 'iso27001') metrics.iso27001 = result.score;
            else if (std === 'pci-dss') metrics.pciDss = result.score;
            else if (std === 'hipaa') metrics.hipaa = result.score;
          } catch {}
        }

        writeFileSync('./data/compliance-metrics.json', JSON.stringify(metrics, null, 2));
        log('Cumplimiento normativo actualizado (SOC2/ISO27001/PCI-DSS/HIPAA)', 'success');
      } catch (e) {
        log(`Error en compliance automático: ${e.message}`, 'warning');
      }
    };

    // Ejecutar al inicio (con delay de 30s para que el sistema esté estable)
    setTimeout(runCompliance, 30 * 1000);

    // Repetir cada 6 horas
    const complianceJob = new CronJob('0 */6 * * *', runCompliance, null, true, 'America/Argentina/Buenos_Aires');
    this.jobs.push(complianceJob);
    log('Cumplimiento normativo programado: al inicio + cada 6 horas', 'success');
  }

  /**
   * Programa limpieza de datos
   */
  scheduleCleanup() {
    // Limpieza una vez al día a las 3am
    const cleanupJob = new CronJob('0 3 * * *', async () => {
      log('Ejecutando limpieza de datos antiguos...', 'info');
      // La limpieza se hace en el data layer
    }, null, true, 'America/Argentina/Buenos_Aires');

    this.jobs.push(cleanupJob);
    log('Limpieza diaria programada', 'info');
  }

  /**
   * Ejecuta una tarea inmediatamente
   */
  async runNow(taskName) {
    switch (taskName) {
      case 'healthcheck':
        if (this.watcher) {
          await this.watcher.checkAllApis();
        }
        break;
      case 'report':
        if (this.reporter) {
          await this.reporter.generateReport('manual');
        }
        break;
      case 'predict':
        if (this.predictor) {
          await this.predictor.analyze();
        }
        break;
      default:
        throw new Error(`Tarea desconocida: ${taskName}`);
    }
  }
}
