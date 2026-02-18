/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                              DATA LAYER                                      ║
 * ║              Persistencia de datos (historial, métricas, alertas)            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

export class DataLayer {
  constructor(dataPath = './data') {
    this.dataPath = dataPath;
    this.paths = {
      history: join(dataPath, 'history'),
      alerts: join(dataPath, 'alerts'),
      metrics: join(dataPath, 'metrics'),
      baselines: join(dataPath, 'baselines'),
      apis: join(dataPath, 'apis.json'),
      state: join(dataPath, 'state.json')
    };
  }

  /**
   * Inicializa el data layer
   */
  async init() {
    // Crear directorios si no existen
    for (const key of ['history', 'alerts', 'metrics', 'baselines']) {
      const dir = this.paths[key];
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }

    // Crear archivo de APIs si no existe
    if (!existsSync(this.paths.apis)) {
      writeFileSync(this.paths.apis, JSON.stringify([], null, 2));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APIs
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Carga las APIs guardadas
   */
  async loadApis() {
    if (!existsSync(this.paths.apis)) {
      return [];
    }

    try {
      const content = readFileSync(this.paths.apis, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  /**
   * Guarda las APIs
   */
  async saveApis(apis) {
    writeFileSync(this.paths.apis, JSON.stringify(apis, null, 2));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HISTORIAL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Guarda un registro en el historial
   */
  async saveHistory(data) {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `${date}.json`;
    const filepath = join(this.paths.history, filename);

    let history = [];
    if (existsSync(filepath)) {
      try {
        history = JSON.parse(readFileSync(filepath, 'utf-8'));
      } catch {
        history = [];
      }
    }

    history.push({
      timestamp: new Date().toISOString(),
      ...data
    });

    writeFileSync(filepath, JSON.stringify(history, null, 2));
  }

  /**
   * Carga el historial de un día
   */
  async loadHistory(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const filename = `${targetDate}.json`;
    const filepath = join(this.paths.history, filename);

    if (!existsSync(filepath)) {
      return [];
    }

    try {
      return JSON.parse(readFileSync(filepath, 'utf-8'));
    } catch {
      return [];
    }
  }

  /**
   * Carga historial de múltiples días
   */
  async loadHistoryRange(days = 7) {
    const history = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayHistory = await this.loadHistory(dateStr);
      history.push(...dayHistory);
    }

    return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ALERTAS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Guarda una alerta
   */
  async saveAlert(alert) {
    const date = new Date().toISOString().split('T')[0];
    const filename = `${date}.json`;
    const filepath = join(this.paths.alerts, filename);

    let alerts = [];
    if (existsSync(filepath)) {
      try {
        alerts = JSON.parse(readFileSync(filepath, 'utf-8'));
      } catch {
        alerts = [];
      }
    }

    const alertWithId = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      resolved: false,
      ...alert
    };

    alerts.push(alertWithId);
    writeFileSync(filepath, JSON.stringify(alerts, null, 2));

    return alertWithId;
  }

  /**
   * Carga alertas de un día
   */
  async loadAlerts(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const filename = `${targetDate}.json`;
    const filepath = join(this.paths.alerts, filename);

    if (!existsSync(filepath)) {
      return [];
    }

    try {
      return JSON.parse(readFileSync(filepath, 'utf-8'));
    } catch {
      return [];
    }
  }

  /**
   * Resuelve una alerta
   */
  async resolveAlert(alertId, resolution) {
    // Buscar en archivos de los últimos 7 días
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const filename = `${dateStr}.json`;
      const filepath = join(this.paths.alerts, filename);

      if (!existsSync(filepath)) continue;

      const alerts = JSON.parse(readFileSync(filepath, 'utf-8'));
      const alertIndex = alerts.findIndex(a => a.id === alertId);

      if (alertIndex !== -1) {
        alerts[alertIndex].resolved = true;
        alerts[alertIndex].resolvedAt = new Date().toISOString();
        alerts[alertIndex].resolution = resolution;
        writeFileSync(filepath, JSON.stringify(alerts, null, 2));
        return alerts[alertIndex];
      }
    }

    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTRICAS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Guarda métricas
   */
  async saveMetrics(apiId, metrics) {
    const date = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours().toString().padStart(2, '0');
    const filename = `${date}_${hour}.json`;
    const filepath = join(this.paths.metrics, filename);

    let allMetrics = {};
    if (existsSync(filepath)) {
      try {
        allMetrics = JSON.parse(readFileSync(filepath, 'utf-8'));
      } catch {
        allMetrics = {};
      }
    }

    if (!allMetrics[apiId]) {
      allMetrics[apiId] = [];
    }

    allMetrics[apiId].push({
      timestamp: new Date().toISOString(),
      ...metrics
    });

    writeFileSync(filepath, JSON.stringify(allMetrics, null, 2));
  }

  /**
   * Carga métricas de un API
   */
  async loadMetrics(apiId, hours = 24) {
    const metrics = [];
    const now = new Date();

    for (let i = 0; i < hours; i++) {
      const date = new Date(now);
      date.setHours(date.getHours() - i);
      const dateStr = date.toISOString().split('T')[0];
      const hour = date.getHours().toString().padStart(2, '0');
      const filename = `${dateStr}_${hour}.json`;
      const filepath = join(this.paths.metrics, filename);

      if (!existsSync(filepath)) continue;

      try {
        const allMetrics = JSON.parse(readFileSync(filepath, 'utf-8'));
        if (allMetrics[apiId]) {
          metrics.push(...allMetrics[apiId]);
        }
      } catch {
        // Ignorar archivos corruptos
      }
    }

    return metrics.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BASELINES (comportamiento normal)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Guarda/actualiza baseline de un API
   */
  async updateBaseline(apiId, baseline) {
    const filepath = join(this.paths.baselines, `${this.sanitizeFilename(apiId)}.json`);

    let existing = {};
    if (existsSync(filepath)) {
      try {
        existing = JSON.parse(readFileSync(filepath, 'utf-8'));
      } catch {
        existing = {};
      }
    }

    const updated = {
      ...existing,
      ...baseline,
      updatedAt: new Date().toISOString()
    };

    writeFileSync(filepath, JSON.stringify(updated, null, 2));
    return updated;
  }

  /**
   * Carga baseline de un API
   */
  async loadBaseline(apiId) {
    const filepath = join(this.paths.baselines, `${this.sanitizeFilename(apiId)}.json`);

    if (!existsSync(filepath)) {
      return null;
    }

    try {
      return JSON.parse(readFileSync(filepath, 'utf-8'));
    } catch {
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO GENERAL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Guarda el estado del sistema
   */
  async saveState(state) {
    writeFileSync(this.paths.state, JSON.stringify({
      ...state,
      savedAt: new Date().toISOString()
    }, null, 2));
  }

  /**
   * Carga el estado del sistema
   */
  async loadState() {
    if (!existsSync(this.paths.state)) {
      return null;
    }

    try {
      return JSON.parse(readFileSync(this.paths.state, 'utf-8'));
    } catch {
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILIDADES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Sanitiza un nombre de archivo
   */
  sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 100);
  }

  /**
   * Limpia datos antiguos
   */
  async cleanup(retentionDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    for (const dir of ['history', 'alerts', 'metrics']) {
      const dirPath = this.paths[dir];
      if (!existsSync(dirPath)) continue;

      const files = readdirSync(dirPath);
      for (const file of files) {
        // Extraer fecha del nombre del archivo (YYYY-MM-DD)
        const match = file.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) {
          const fileDate = new Date(match[1]);
          if (fileDate < cutoffDate) {
            const filepath = join(dirPath, file);
            // En lugar de borrar, mover a backup o simplemente omitir
            console.log(`Archivo antiguo: ${filepath}`);
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS PARA COMPLIANCE REPORTER
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Obtiene las APIs monitoreadas
   */
  async getMonitoredApis() {
    return this.loadApis();
  }

  /**
   * Obtiene historial de health checks
   */
  async getHealthHistory(hours = 24) {
    const history = [];
    const now = new Date();

    for (let i = 0; i < Math.ceil(hours / 24); i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const filepath = join(this.paths.history, `${dateStr}.json`);

      if (!existsSync(filepath)) continue;

      try {
        const dayHistory = JSON.parse(readFileSync(filepath, 'utf-8'));
        history.push(...dayHistory);
      } catch {
        // Ignorar archivos corruptos
      }
    }

    // Filtrar por horas si es menos de 24
    if (hours < 24) {
      const cutoff = new Date(now);
      cutoff.setHours(cutoff.getHours() - hours);
      return history.filter(h => new Date(h.timestamp) >= cutoff);
    }

    return history;
  }

  /**
   * Obtiene historial de alertas
   */
  async getAlertHistory(days = 30) {
    const alerts = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const filepath = join(this.paths.alerts, `${dateStr}.json`);

      if (!existsSync(filepath)) continue;

      try {
        const dayAlerts = JSON.parse(readFileSync(filepath, 'utf-8'));
        alerts.push(...dayAlerts);
      } catch {
        // Ignorar archivos corruptos
      }
    }

    return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Obtiene incidentes (alertas críticas resueltas y no resueltas)
   */
  async getIncidents(days = 30) {
    const alerts = await this.getAlertHistory(days);
    return alerts.filter(a => a.severity === 'critical' || a.type === 'api_down');
  }

  /**
   * Obtiene reportes AI generados
   */
  async getAIReports(days = 30) {
    const reportsDir = join(this.dataPath, 'ai-reports');
    if (!existsSync(reportsDir)) return [];

    const reports = [];
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);

    try {
      const files = readdirSync(reportsDir);
      for (const file of files) {
        const match = file.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) {
          const fileDate = new Date(match[1]);
          if (fileDate >= cutoff) {
            reports.push({
              filename: file,
              date: match[1]
            });
          }
        }
      }
    } catch {
      // Directorio no existe o error
    }

    return reports;
  }

  /**
   * Obtiene predicciones realizadas
   */
  async getPredictions(days = 30) {
    const predictionsDir = join(this.dataPath, 'predictions');
    if (!existsSync(predictionsDir)) return [];

    const predictions = [];
    try {
      const files = readdirSync(predictionsDir);
      predictions.push(...files.map(f => ({ filename: f })));
    } catch {
      // Directorio no existe
    }

    return predictions;
  }

  /**
   * Obtiene cambios detectados en APIs
   */
  async getApiChanges(days = 30) {
    const changesDir = join(this.dataPath, 'changes');
    if (!existsSync(changesDir)) return [];

    const changes = [];
    try {
      const files = readdirSync(changesDir);
      changes.push(...files.map(f => ({ filename: f })));
    } catch {
      // Directorio no existe
    }

    return changes;
  }

  /**
   * Obtiene métricas de latencia
   */
  async getLatencyMetrics(days = 30) {
    const allMetrics = [];
    const now = new Date();

    for (let i = 0; i < days * 24; i++) {
      const date = new Date(now);
      date.setHours(date.getHours() - i);
      const dateStr = date.toISOString().split('T')[0];
      const hour = date.getHours().toString().padStart(2, '0');
      const filename = `${dateStr}_${hour}.json`;
      const filepath = join(this.paths.metrics, filename);

      if (!existsSync(filepath)) continue;

      try {
        const metrics = JSON.parse(readFileSync(filepath, 'utf-8'));
        for (const apiId of Object.keys(metrics)) {
          allMetrics.push(...metrics[apiId]);
        }
      } catch {
        // Ignorar archivos corruptos
      }
    }

    if (allMetrics.length === 0) return null;

    // Calcular estadísticas
    const latencies = allMetrics.map(m => m.latency || m.responseTime || 0).filter(l => l > 0);
    if (latencies.length === 0) return null;

    latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(latencies.length * 0.95);

    return {
      count: latencies.length,
      avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      min: latencies[0],
      max: latencies[latencies.length - 1],
      p95: latencies[p95Index] || latencies[latencies.length - 1]
    };
  }

  /**
   * Obtiene métricas de throughput
   */
  async getThroughputMetrics(days = 30) {
    const latencyMetrics = await this.getLatencyMetrics(days);
    return latencyMetrics ? { count: latencyMetrics.count } : null;
  }

  /**
   * Obtiene escaneos de seguridad
   */
  async getSecurityScans(days = 30) {
    const scansDir = join(this.dataPath, 'security-scans');
    if (!existsSync(scansDir)) return [];

    const scans = [];
    try {
      const files = readdirSync(scansDir);
      scans.push(...files.map(f => ({ filename: f })));
    } catch {
      // Directorio no existe
    }

    return scans;
  }

  /**
   * Obtiene reportes generados
   */
  async getGeneratedReports(days = 30) {
    const reportsDir = './reports';
    if (!existsSync(reportsDir)) return [];

    const reports = [];
    try {
      const files = readdirSync(reportsDir);
      reports.push(...files.filter(f => f.endsWith('.pdf') || f.endsWith('.json')).map(f => ({ filename: f })));
    } catch {
      // Directorio no existe
    }

    return reports;
  }

  /**
   * Obtiene el tipo de almacenamiento
   */
  getStorageType() {
    // Por ahora es file-based, pero podría ser sqlite/postgresql en el futuro
    return 'file';
  }
}
