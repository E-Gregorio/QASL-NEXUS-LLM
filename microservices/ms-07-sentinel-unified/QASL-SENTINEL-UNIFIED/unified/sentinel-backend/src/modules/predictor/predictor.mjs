/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                          PREDICTOR MODULE                                    ║
 * ║              Predicción de problemas basada en tendencias                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { EventEmitter } from 'events';
import { log } from '../../core/banner.mjs';

export class Predictor extends EventEmitter {
  constructor(options = {}) {
    super();

    this.ai = options.ai;
    this.data = options.data;

    // Umbrales de predicción
    this.thresholds = {
      latencyTrend: 1.5,     // 50% de aumento
      errorTrend: 2.0,       // 100% de aumento
      minSamples: 10         // Mínimo de muestras para predecir
    };
  }

  /**
   * Ejecuta análisis predictivo
   */
  async analyze() {
    if (!this.data) {
      log('Predictor: No hay data layer configurado', 'warning');
      return [];
    }

    log('Ejecutando análisis predictivo...', 'ai');

    const predictions = [];

    try {
      // Cargar historial
      const history = await this.data.loadHistoryRange(7); // 7 días

      if (history.length < this.thresholds.minSamples) {
        log('Predictor: Datos insuficientes para predicción', 'info');
        return [];
      }

      // Agrupar por API
      const byApi = this.groupByApi(history);

      // Analizar cada API
      for (const [apiId, entries] of Object.entries(byApi)) {
        const apiPredictions = this.analyzeApiTrend(apiId, entries);
        predictions.push(...apiPredictions);
      }

      // Si hay AI disponible, enriquecer predicciones
      if (this.ai?.isAvailable() && predictions.length > 0) {
        const aiAnalysis = await this.ai.predict(
          this.calculateMetrics(history),
          history.slice(-100) // Últimas 100 entradas
        );

        if (aiAnalysis?.predictions) {
          predictions.push(...aiAnalysis.predictions.map(p => ({
            ...p,
            source: 'ai'
          })));
        }
      }

      // Emitir predicciones de alto riesgo
      for (const prediction of predictions) {
        if (prediction.risk === 'high' || prediction.severity === 'critical') {
          this.emit('prediction', prediction);
        }
      }

      log(`Análisis predictivo completado: ${predictions.length} predicciones`, 'ai');

    } catch (error) {
      log(`Error en predictor: ${error.message}`, 'error');
    }

    return predictions;
  }

  /**
   * Agrupa historial por API
   */
  groupByApi(history) {
    const groups = {};

    for (const entry of history) {
      const apiId = entry.api?.id || 'unknown';
      if (!groups[apiId]) {
        groups[apiId] = [];
      }
      groups[apiId].push(entry);
    }

    return groups;
  }

  /**
   * Analiza tendencia de una API
   */
  analyzeApiTrend(apiId, entries) {
    const predictions = [];

    // Ordenar por timestamp
    entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Dividir en mitades para comparar
    const midpoint = Math.floor(entries.length / 2);
    const firstHalf = entries.slice(0, midpoint);
    const secondHalf = entries.slice(midpoint);

    // Calcular métricas de cada mitad
    const firstMetrics = this.calculatePeriodMetrics(firstHalf);
    const secondMetrics = this.calculatePeriodMetrics(secondHalf);

    // Detectar tendencia de latencia
    if (firstMetrics.avgLatency > 0 && secondMetrics.avgLatency > 0) {
      const latencyRatio = secondMetrics.avgLatency / firstMetrics.avgLatency;

      if (latencyRatio > this.thresholds.latencyTrend) {
        predictions.push({
          type: 'latency_degradation',
          apiId,
          risk: latencyRatio > 2 ? 'high' : 'medium',
          description: `La latencia de ${apiId} está aumentando`,
          trend: `${((latencyRatio - 1) * 100).toFixed(0)}% de aumento`,
          current: Math.round(secondMetrics.avgLatency) + 'ms',
          previous: Math.round(firstMetrics.avgLatency) + 'ms',
          prediction: 'Si continúa, podría causar timeouts',
          source: 'trend_analysis'
        });
      }
    }

    // Detectar tendencia de errores
    if (secondMetrics.errorRate > firstMetrics.errorRate) {
      const errorRatio = firstMetrics.errorRate > 0 ?
        secondMetrics.errorRate / firstMetrics.errorRate :
        secondMetrics.errorRate > 0 ? Infinity : 1;

      if (errorRatio > this.thresholds.errorTrend || secondMetrics.errorRate > 0.1) {
        predictions.push({
          type: 'error_rate_increase',
          apiId,
          risk: secondMetrics.errorRate > 0.2 ? 'high' : 'medium',
          description: `El rate de errores de ${apiId} está aumentando`,
          trend: `${(secondMetrics.errorRate * 100).toFixed(1)}% de errores`,
          current: `${(secondMetrics.errorRate * 100).toFixed(1)}%`,
          previous: `${(firstMetrics.errorRate * 100).toFixed(1)}%`,
          prediction: 'Posible problema de disponibilidad',
          source: 'trend_analysis'
        });
      }
    }

    // Detectar patrones de caídas recurrentes
    const downEvents = entries.filter(e => !e.healthy);
    if (downEvents.length >= 3) {
      // Verificar si hay un patrón temporal
      const pattern = this.detectTemporalPattern(downEvents);
      if (pattern) {
        predictions.push({
          type: 'recurring_outage',
          apiId,
          risk: 'high',
          description: `${apiId} tiene caídas recurrentes`,
          pattern: pattern.description,
          nextPredicted: pattern.nextOccurrence,
          source: 'pattern_analysis'
        });
      }
    }

    return predictions;
  }

  /**
   * Calcula métricas de un período
   */
  calculatePeriodMetrics(entries) {
    if (entries.length === 0) {
      return { avgLatency: 0, errorRate: 0, count: 0 };
    }

    const latencies = entries
      .filter(e => e.latency)
      .map(e => e.latency);

    const avgLatency = latencies.length > 0 ?
      latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

    const errors = entries.filter(e => !e.healthy).length;
    const errorRate = errors / entries.length;

    return {
      avgLatency,
      errorRate,
      count: entries.length
    };
  }

  /**
   * Calcula métricas generales
   */
  calculateMetrics(history) {
    const metrics = this.calculatePeriodMetrics(history);

    // Agregar más métricas
    const latencies = history.filter(e => e.latency).map(e => e.latency);

    if (latencies.length > 0) {
      latencies.sort((a, b) => a - b);
      metrics.p50 = latencies[Math.floor(latencies.length * 0.5)];
      metrics.p95 = latencies[Math.floor(latencies.length * 0.95)];
      metrics.p99 = latencies[Math.floor(latencies.length * 0.99)];
    }

    return metrics;
  }

  /**
   * Detecta patrones temporales en eventos
   */
  detectTemporalPattern(events) {
    if (events.length < 3) return null;

    // Extraer horas de los eventos
    const hours = events.map(e => new Date(e.timestamp).getHours());

    // Buscar hora más común
    const hourCounts = {};
    for (const hour of hours) {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }

    const maxHour = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])[0];

    if (maxHour && maxHour[1] >= 2) {
      // Calcular próxima ocurrencia
      const now = new Date();
      const nextOccurrence = new Date(now);
      nextOccurrence.setHours(parseInt(maxHour[0]), 0, 0, 0);

      if (nextOccurrence <= now) {
        nextOccurrence.setDate(nextOccurrence.getDate() + 1);
      }

      return {
        type: 'hourly',
        hour: parseInt(maxHour[0]),
        frequency: maxHour[1],
        description: `Caídas frecuentes alrededor de las ${maxHour[0]}:00`,
        nextOccurrence: nextOccurrence.toISOString()
      };
    }

    return null;
  }

  /**
   * Obtiene predicciones activas
   */
  getActivePredictions() {
    // Las predicciones no se guardan en estado, se calculan on-demand
    return [];
  }
}
