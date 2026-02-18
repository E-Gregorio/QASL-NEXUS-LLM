/**
 * ============================================================================
 *                         INCIDENT TRACKER
 *                   Historico de Incidentes de APIs
 * ============================================================================
 * Proyecto: SIGMA | Cliente: AGIP | Empresa: Epidata
 * Lider Tecnico QA: Elyer Gregorio Maldonado
 * ============================================================================
 *
 * Registra y gestiona el historico de caidas y recuperaciones de APIs
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { log } from '../../core/banner.mjs';

export class IncidentTracker {
  constructor(options = {}) {
    this.dataPath = options.dataPath || join(process.cwd(), 'data', 'incidents');
    this.webhookManager = options.webhookManager;
    this.config = options.config;

    // Estado de APIs (UP/DOWN)
    this.apiStates = new Map();

    // Incidentes activos
    this.activeIncidents = new Map();

    // Historial de incidentes
    this.incidents = [];

    // Contadores de fallos consecutivos
    this.consecutiveFailures = new Map();

    // Crear directorio si no existe
    if (!existsSync(this.dataPath)) {
      mkdirSync(this.dataPath, { recursive: true });
    }

    // Cargar historial existente
    this.loadHistory();
  }

  /**
   * Carga historial de incidentes desde archivo
   */
  loadHistory() {
    const historyFile = join(this.dataPath, 'incidents.json');

    if (existsSync(historyFile)) {
      try {
        const data = JSON.parse(readFileSync(historyFile, 'utf-8'));
        this.incidents = data.incidents || [];

        // Restaurar incidentes activos
        for (const incident of this.incidents) {
          if (!incident.resolvedAt) {
            this.activeIncidents.set(incident.apiId, incident);
            this.apiStates.set(incident.apiId, 'DOWN');
          }
        }

        log(`Historial cargado: ${this.incidents.length} incidentes`, 'info');
      } catch (error) {
        log(`Error cargando historial: ${error.message}`, 'warning');
      }
    }
  }

  /**
   * Guarda historial de incidentes
   */
  saveHistory() {
    const historyFile = join(this.dataPath, 'incidents.json');

    try {
      writeFileSync(historyFile, JSON.stringify({
        lastUpdated: new Date().toISOString(),
        incidents: this.incidents
      }, null, 2), 'utf-8');
    } catch (error) {
      log(`Error guardando historial: ${error.message}`, 'error');
    }
  }

  /**
   * Procesa resultado de health check
   */
  async processCheck(result) {
    const apiId = result.api?.id;
    if (!apiId) return;

    const previousState = this.apiStates.get(apiId) || 'UNKNOWN';
    const currentState = result.healthy ? 'UP' : 'DOWN';

    // Actualizar estado
    this.apiStates.set(apiId, currentState);

    // Manejar contadores de fallos consecutivos
    if (!result.healthy) {
      const count = (this.consecutiveFailures.get(apiId) || 0) + 1;
      this.consecutiveFailures.set(apiId, count);

      // Notificar si supera umbral
      const threshold = this.config?.get('thresholds.consecutiveFailures') || 3;
      if (count === threshold && this.webhookManager) {
        await this.webhookManager.notifyConsecutiveFailures(result.api, count, threshold);
      }
    } else {
      this.consecutiveFailures.set(apiId, 0);
    }

    // Detectar transicion UP -> DOWN (nueva caida)
    if (previousState !== 'DOWN' && currentState === 'DOWN') {
      await this.openIncident(result);
    }

    // Detectar transicion DOWN -> UP (recuperacion)
    if (previousState === 'DOWN' && currentState === 'UP') {
      await this.closeIncident(result);
    }

    return {
      apiId,
      previousState,
      currentState,
      changed: previousState !== currentState
    };
  }

  /**
   * Abre un nuevo incidente
   */
  async openIncident(result) {
    const apiId = result.api?.id;

    // No crear duplicado si ya hay incidente activo
    if (this.activeIncidents.has(apiId)) {
      return;
    }

    const incident = {
      id: `INC-${Date.now()}-${apiId}`,
      apiId,
      apiName: result.api?.name,
      apiUrl: result.api?.url,
      method: result.api?.method,
      type: 'DOWN',
      status: result.status,
      error: result.error,
      startedAt: new Date().toISOString(),
      resolvedAt: null,
      duration: null,
      checks: 1
    };

    this.incidents.push(incident);
    this.activeIncidents.set(apiId, incident);
    this.saveHistory();

    log(`INCIDENTE ABIERTO: ${incident.id} - ${result.api?.name}`, 'error');

    // Notificar via webhook
    if (this.webhookManager) {
      await this.webhookManager.notifyApiDown(result.api, result);
    }

    return incident;
  }

  /**
   * Cierra un incidente existente
   */
  async closeIncident(result) {
    const apiId = result.api?.id;
    const incident = this.activeIncidents.get(apiId);

    if (!incident) {
      return;
    }

    incident.resolvedAt = new Date().toISOString();
    incident.duration = new Date(incident.resolvedAt) - new Date(incident.startedAt);
    incident.recoveryStatus = result.status;
    incident.recoveryLatency = result.latency;

    this.activeIncidents.delete(apiId);
    this.saveHistory();

    log(`INCIDENTE CERRADO: ${incident.id} - Duracion: ${this.formatDuration(incident.duration)}`, 'success');

    // Notificar via webhook
    if (this.webhookManager) {
      await this.webhookManager.notifyApiUp(result.api, result, incident.duration);
    }

    return incident;
  }

  /**
   * Obtiene incidentes activos
   */
  getActiveIncidents() {
    return Array.from(this.activeIncidents.values());
  }

  /**
   * Obtiene incidentes resueltos
   */
  getResolvedIncidents() {
    return this.incidents.filter(i => i.resolvedAt !== null);
  }

  /**
   * Obtiene historial de una API especifica
   */
  getApiHistory(apiId) {
    return this.incidents.filter(i => i.apiId === apiId);
  }

  /**
   * Obtiene incidentes en un rango de tiempo
   */
  getIncidentsInRange(startDate, endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    return this.incidents.filter(i => {
      const incidentStart = new Date(i.startedAt).getTime();
      return incidentStart >= start && incidentStart <= end;
    });
  }

  /**
   * Obtiene estadisticas de incidentes
   */
  getStats(apiId = null) {
    let incidents = apiId
      ? this.incidents.filter(i => i.apiId === apiId)
      : this.incidents;

    const resolved = incidents.filter(i => i.resolvedAt !== null);
    const active = incidents.filter(i => i.resolvedAt === null);

    // Calcular MTTR (Mean Time To Recovery)
    let mttr = 0;
    if (resolved.length > 0) {
      const totalDuration = resolved.reduce((sum, i) => sum + (i.duration || 0), 0);
      mttr = totalDuration / resolved.length;
    }

    // Calcular MTBF (Mean Time Between Failures)
    let mtbf = 0;
    if (resolved.length > 1) {
      const sortedIncidents = [...resolved].sort(
        (a, b) => new Date(a.startedAt) - new Date(b.startedAt)
      );

      let totalTimeBetween = 0;
      for (let i = 1; i < sortedIncidents.length; i++) {
        const prevEnd = new Date(sortedIncidents[i - 1].resolvedAt);
        const currStart = new Date(sortedIncidents[i].startedAt);
        totalTimeBetween += currStart - prevEnd;
      }
      mtbf = totalTimeBetween / (resolved.length - 1);
    }

    return {
      total: incidents.length,
      active: active.length,
      resolved: resolved.length,
      mttr,
      mttrFormatted: this.formatDuration(mttr),
      mtbf,
      mtbfFormatted: this.formatDuration(mtbf),
      lastIncident: incidents.length > 0
        ? incidents[incidents.length - 1]
        : null
    };
  }

  /**
   * Genera reporte de incidentes
   */
  generateReport(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const incidents = this.getIncidentsInRange(startDate, new Date());
    const stats = this.getStats();

    // Agrupar por API
    const byApi = {};
    for (const incident of incidents) {
      if (!byApi[incident.apiId]) {
        byApi[incident.apiId] = {
          apiName: incident.apiName,
          incidents: [],
          totalDowntime: 0
        };
      }
      byApi[incident.apiId].incidents.push(incident);
      if (incident.duration) {
        byApi[incident.apiId].totalDowntime += incident.duration;
      }
    }

    return {
      period: `Ultimos ${days} dias`,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      summary: {
        totalIncidents: incidents.length,
        activeIncidents: stats.active,
        resolvedIncidents: incidents.filter(i => i.resolvedAt).length,
        mttr: stats.mttrFormatted,
        mtbf: stats.mtbfFormatted
      },
      byApi,
      incidents
    };
  }

  /**
   * Formatea duracion en formato legible
   */
  formatDuration(ms) {
    if (!ms || ms === 0) return '0s';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;

    const hours = Math.floor(ms / 3600000);
    const minutes = Math.round((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  /**
   * Limpia incidentes antiguos
   */
  cleanup(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const before = this.incidents.length;
    this.incidents = this.incidents.filter(i =>
      new Date(i.startedAt) >= cutoffDate || !i.resolvedAt
    );

    const removed = before - this.incidents.length;
    if (removed > 0) {
      this.saveHistory();
      log(`Limpieza: ${removed} incidentes antiguos eliminados`, 'info');
    }

    return removed;
  }
}
