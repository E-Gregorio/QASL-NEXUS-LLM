// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    QASL-API-SENTINEL - Scheduled Reporter                    ║
// ║                    Reportes Programados Automáticos por Email                ║
// ╠══════════════════════════════════════════════════════════════════════════════╣
// ║  QASL NEXUS LLM - Elyer Gregorio Maldonado                                   ║
// ║  Líder Técnico QA: Elyer Gregorio Maldonado                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { EventEmitter } from 'events';
import { CronJob } from 'cron';
import { EmailNotifier } from '../notifications/email-notifier.mjs';
import chalk from 'chalk';

/**
 * ScheduledReporter - Genera y envía reportes programados automáticamente
 * Usa el formato profesional existente de EmailNotifier
 */
export class ScheduledReporter extends EventEmitter {
  constructor(options = {}) {
    super();

    this.emailNotifier = new EmailNotifier(false);
    this.enabled = options.enabled !== false;
    this.verbose = options.verbose || false;
    this.data = options.data;
    this.watcher = options.watcher;

    // Configuración de schedules (cron expressions)
    this.schedules = {
      every5h: options.schedules?.every5h || '0 */5 * * *',
      daily: options.schedules?.daily || '0 8 * * *',
      weekly: options.schedules?.weekly || '0 8 * * 1',
    };

    // Tipos de reportes habilitados
    this.reportTypes = {
      every5h: options.reportTypes?.every5h !== false,
      daily: options.reportTypes?.daily !== false,
      weekly: options.reportTypes?.weekly !== false,
    };

    // Jobs activos
    this.jobs = [];
    this.running = false;

    // Estadísticas
    this.stats = {
      reportsSent: 0,
      lastReport: null,
      errors: 0,
    };

    this.log('ScheduledReporter inicializado', 'info');
  }

  /**
   * Inicia los reportes programados
   */
  start() {
    if (this.running) {
      this.log('ScheduledReporter ya está corriendo', 'warn');
      return;
    }

    if (!this.enabled) {
      this.log('ScheduledReporter deshabilitado', 'warn');
      return;
    }

    this.log('Iniciando reportes programados...', 'info');

    const timezone = process.env.TZ || 'America/Argentina/Buenos_Aires';

    // === REPORTE CADA 5 HORAS ===
    if (this.reportTypes.every5h) {
      const job5h = new CronJob(
        this.schedules.every5h,
        async () => await this.generateAndSendReport('5h'),
        null,
        true,
        timezone
      );
      this.jobs.push({ name: 'every5h', job: job5h });
      this.log(`Reporte cada 5h programado: ${this.schedules.every5h}`, 'success');
    }

    // === REPORTE DIARIO ===
    if (this.reportTypes.daily) {
      const jobDaily = new CronJob(
        this.schedules.daily,
        async () => await this.generateAndSendReport('daily'),
        null,
        true,
        timezone
      );
      this.jobs.push({ name: 'daily', job: jobDaily });
      this.log(`Reporte diario programado: ${this.schedules.daily}`, 'success');
    }

    // === REPORTE SEMANAL ===
    if (this.reportTypes.weekly) {
      const jobWeekly = new CronJob(
        this.schedules.weekly,
        async () => await this.generateAndSendReport('weekly'),
        null,
        true,
        timezone
      );
      this.jobs.push({ name: 'weekly', job: jobWeekly });
      this.log(`Reporte semanal programado: ${this.schedules.weekly}`, 'success');
    }

    this.running = true;
    this.log(`${this.jobs.length} reportes programados activos`, 'success');
    this.emit('started', { jobs: this.jobs.length });
  }

  /**
   * Detiene los reportes programados
   */
  stop() {
    for (const { name, job } of this.jobs) {
      job.stop();
      this.log(`Reporte ${name} detenido`, 'info');
    }
    this.jobs = [];
    this.running = false;
    this.emit('stopped');
  }

  /**
   * Genera y envía un reporte usando el formato profesional
   */
  async generateAndSendReport(type) {
    this.log(`Generando reporte: ${type.toUpperCase()}...`, 'info');

    try {
      // Recolectar datos del watcher
      const reportData = await this.collectReportData(type);

      // Enviar usando el formato profesional existente
      const result = await this.emailNotifier.sendMonitoringReport(reportData);

      if (result) {
        this.stats.reportsSent++;
        this.stats.lastReport = { type, timestamp: new Date().toISOString() };
        this.log(`Reporte ${type.toUpperCase()} enviado exitosamente`, 'success');
        this.emit('report:sent', { type, reportData });
      }

      return result;

    } catch (error) {
      this.stats.errors++;
      this.log(`Error generando reporte ${type}: ${error.message}`, 'error');
      this.emit('report:error', { type, error });
      return false;
    }
  }

  /**
   * Recolecta datos para el reporte en formato compatible con EmailNotifier
   */
  async collectReportData(type) {
    // Obtener datos del watcher si está disponible
    let apis = [];
    let checkResults = [];

    if (this.watcher) {
      const watcherStatus = this.watcher.getStatus();
      apis = watcherStatus.apis || [];

      // Ejecutar health checks para obtener datos frescos
      try {
        checkResults = await this.watcher.checkAllApis();
      } catch (e) {
        this.log(`Error en health checks: ${e.message}`, 'warn');
      }
    }

    // Calcular métricas
    const totalApis = checkResults.length || apis.length;
    const healthyApis = checkResults.filter(r => r.healthy).length;
    const totalLatency = checkResults.reduce((sum, r) => sum + (r.latency || 0), 0);
    const avgLatency = totalApis > 0 ? Math.round(totalLatency / totalApis) : 0;
    const availability = totalApis > 0 ? ((healthyApis / totalApis) * 100) : 100;

    // Determinar estado general
    let status = 'healthy';
    if (healthyApis === 0 && totalApis > 0) {
      status = 'critical';
    } else if (healthyApis < totalApis) {
      status = 'degraded';
    }

    // Formato compatible con EmailNotifier.sendMonitoringReport
    return {
      status,
      totalApis,
      availability,
      avgLatency,
      successChecks: healthyApis,
      failedChecks: totalApis - healthyApis,
      reportType: type,
      apis: checkResults.map(r => ({
        name: r.api?.name || r.api?.id || 'Unknown',
        status: r.healthy ? 'up' : 'down',
        latency: r.latency || 0,
        uptime: r.healthy ? 100 : 0
      }))
    };
  }

  /**
   * Envía un reporte manual inmediato
   */
  async sendNow(type = 'daily') {
    return await this.generateAndSendReport(type);
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return {
      enabled: this.enabled,
      running: this.running,
      activeJobs: this.jobs.map(j => j.name),
      schedules: this.schedules,
      reportTypes: this.reportTypes,
      ...this.stats,
    };
  }

  /**
   * Obtiene próximas ejecuciones
   */
  getNextRuns() {
    return this.jobs.map(({ name, job }) => ({
      name,
      nextRun: job.nextDate()?.toJSDate?.()?.toISOString() || 'N/A',
    }));
  }

  /**
   * Log interno
   */
  log(message, type = 'info') {
    if (!this.verbose && type === 'info') return;

    const colors = {
      info: chalk.cyan,
      success: chalk.green,
      warn: chalk.yellow,
      error: chalk.red,
    };

    const color = colors[type] || chalk.white;
    console.log(color(`[ScheduledReporter] ${message}`));
  }
}

export default ScheduledReporter;
