/**
 * Failure Predictor - Predicción de fallos con ML
 *
 * Predice fallos antes de que ocurran usando:
 * - Análisis de patrones históricos
 * - Correlación multi-métrica
 * - Regresión para predicción temporal
 * - Detección de degradación progresiva
 */

export class FailurePredictor {
  constructor(dataLayer, config = {}) {
    this.dataLayer = dataLayer;
    this.config = {
      // Horizonte de predicción
      predictionHorizon: config.predictionHorizon || 60, // minutos

      // Umbrales de riesgo
      highRiskThreshold: config.highRiskThreshold || 0.7,
      mediumRiskThreshold: config.mediumRiskThreshold || 0.4,

      // Ventanas de análisis
      shortTermWindow: config.shortTermWindow || 15,   // minutos
      mediumTermWindow: config.mediumTermWindow || 60, // minutos
      longTermWindow: config.longTermWindow || 1440,   // 24 horas

      // Pesos de factores
      weights: {
        latencyTrend: 0.25,
        errorRateTrend: 0.30,
        availabilityTrend: 0.25,
        historicalPattern: 0.20
      },

      ...config
    };

    // Historial de predicciones
    this.predictionHistory = [];

    // Patrones de fallo conocidos
    this.failurePatterns = [];

    // Correlaciones aprendidas
    this.correlations = new Map();
  }

  /**
   * Predice riesgo de fallo para una API
   */
  async predictFailure(apiId, metricsData) {
    const prediction = {
      apiId,
      timestamp: new Date().toISOString(),
      horizon: `${this.config.predictionHorizon}m`,
      factors: {},
      riskScore: 0,
      riskLevel: 'low',
      confidence: 0,
      warnings: [],
      recommendations: []
    };

    // 1. Analizar tendencia de latencia
    if (metricsData.latency) {
      prediction.factors.latency = this.analyzeLatencyTrend(metricsData.latency);
    }

    // 2. Analizar tendencia de errores
    if (metricsData.errorRate) {
      prediction.factors.errorRate = this.analyzeErrorRateTrend(metricsData.errorRate);
    }

    // 3. Analizar disponibilidad
    if (metricsData.availability) {
      prediction.factors.availability = this.analyzeAvailabilityTrend(metricsData.availability);
    }

    // 4. Buscar patrones históricos similares
    prediction.factors.historical = await this.findHistoricalPatterns(apiId, metricsData);

    // 5. Calcular correlaciones multi-métrica
    prediction.factors.correlation = this.analyzeMultiMetricCorrelation(metricsData);

    // 6. Calcular score de riesgo ponderado
    prediction.riskScore = this.calculateRiskScore(prediction.factors);

    // 7. Determinar nivel de riesgo
    prediction.riskLevel = this.determineRiskLevel(prediction.riskScore);

    // 8. Calcular confianza
    prediction.confidence = this.calculateConfidence(prediction.factors);

    // 9. Generar warnings específicos
    prediction.warnings = this.generateWarnings(prediction.factors);

    // 10. Generar recomendaciones
    prediction.recommendations = this.generateRecommendations(prediction);

    // Guardar predicción
    this.recordPrediction(prediction);

    return prediction;
  }

  /**
   * Analiza tendencia de latencia
   */
  analyzeLatencyTrend(latencyData) {
    const values = Array.isArray(latencyData) ? latencyData : [latencyData.current];

    if (values.length < 3) {
      return {
        risk: 0,
        trend: 'stable',
        details: 'Datos insuficientes'
      };
    }

    // Calcular estadísticas
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const recent = values.slice(-5);
    const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;

    // Calcular pendiente
    const slope = this.calculateSlope(values);
    const normalizedSlope = slope / mean;

    // Detectar aceleración
    const acceleration = this.calculateAcceleration(values);

    // Evaluar riesgo
    let risk = 0;
    let trend = 'stable';

    // Tendencia alcista = mayor riesgo
    if (normalizedSlope > 0.1) {
      risk += 0.4;
      trend = 'increasing';
    } else if (normalizedSlope > 0.05) {
      risk += 0.2;
      trend = 'slight_increase';
    }

    // Aceleración positiva = riesgo adicional
    if (acceleration > 0.05) {
      risk += 0.3;
    }

    // Latencia ya alta = riesgo adicional
    if (recentMean > 2000) risk += 0.2;
    if (recentMean > 5000) risk += 0.3;

    // Picos recientes
    const maxRecent = Math.max(...recent);
    if (maxRecent > mean * 2) {
      risk += 0.2;
    }

    return {
      risk: Math.min(risk, 1),
      trend,
      slope: normalizedSlope,
      acceleration,
      currentMean: recentMean,
      overallMean: mean,
      details: this.formatTrendDetails('latency', normalizedSlope, recentMean)
    };
  }

  /**
   * Analiza tendencia de tasa de errores
   */
  analyzeErrorRateTrend(errorData) {
    const values = Array.isArray(errorData) ? errorData : [errorData.current];

    if (values.length < 3) {
      return {
        risk: values[0] > 5 ? 0.5 : 0,
        trend: 'stable',
        details: 'Datos insuficientes'
      };
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const recent = values.slice(-5);
    const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const slope = this.calculateSlope(values);

    let risk = 0;
    let trend = 'stable';

    // Error rate actual
    if (recentMean > 1) risk += 0.2;
    if (recentMean > 5) risk += 0.4;
    if (recentMean > 10) risk += 0.3;

    // Tendencia
    if (slope > 0.5) {
      risk += 0.3;
      trend = 'increasing';
    } else if (slope > 0.1) {
      risk += 0.15;
      trend = 'slight_increase';
    }

    // Ráfagas de errores
    const maxRecent = Math.max(...recent);
    if (maxRecent > mean * 3) {
      risk += 0.2;
    }

    return {
      risk: Math.min(risk, 1),
      trend,
      slope,
      currentRate: recentMean,
      overallRate: mean,
      details: this.formatTrendDetails('errorRate', slope, recentMean)
    };
  }

  /**
   * Analiza tendencia de disponibilidad
   */
  analyzeAvailabilityTrend(availabilityData) {
    const values = Array.isArray(availabilityData) ? availabilityData : [availabilityData.current];

    if (values.length < 3) {
      return {
        risk: values[0] < 99 ? 0.5 : 0,
        trend: 'stable',
        details: 'Datos insuficientes'
      };
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const recent = values.slice(-5);
    const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const slope = this.calculateSlope(values);

    let risk = 0;
    let trend = 'stable';

    // Disponibilidad actual
    if (recentMean < 99.9) risk += 0.1;
    if (recentMean < 99.5) risk += 0.2;
    if (recentMean < 99) risk += 0.3;
    if (recentMean < 95) risk += 0.3;

    // Tendencia negativa
    if (slope < -0.1) {
      risk += 0.4;
      trend = 'decreasing';
    } else if (slope < -0.01) {
      risk += 0.2;
      trend = 'slight_decrease';
    }

    // Caídas recientes
    const minRecent = Math.min(...recent);
    if (minRecent < 90) {
      risk += 0.3;
    }

    return {
      risk: Math.min(risk, 1),
      trend,
      slope,
      currentAvailability: recentMean,
      overallAvailability: mean,
      details: this.formatTrendDetails('availability', slope, recentMean)
    };
  }

  /**
   * Busca patrones históricos similares
   */
  async findHistoricalPatterns(apiId, currentMetrics) {
    // Buscar en historial de predicciones previas que resultaron en fallos
    const pastFailures = this.predictionHistory.filter(p =>
      p.apiId === apiId &&
      p.actualOutcome === 'failure'
    );

    if (pastFailures.length === 0) {
      return {
        risk: 0,
        matchedPatterns: 0,
        details: 'Sin historial de fallos'
      };
    }

    // Comparar métricas actuales con métricas pre-fallo
    let matchScore = 0;
    let matchedPatterns = 0;

    for (const pastFailure of pastFailures) {
      const similarity = this.calculateMetricSimilarity(currentMetrics, pastFailure.metrics);
      if (similarity > 0.7) {
        matchScore += similarity;
        matchedPatterns++;
      }
    }

    const risk = matchedPatterns > 0 ? Math.min(matchScore / matchedPatterns, 1) : 0;

    return {
      risk,
      matchedPatterns,
      totalHistoricalFailures: pastFailures.length,
      details: matchedPatterns > 0
        ? `${matchedPatterns} patrones similares encontrados`
        : 'Ningún patrón similar'
    };
  }

  /**
   * Analiza correlaciones entre múltiples métricas
   */
  analyzeMultiMetricCorrelation(metricsData) {
    const correlations = [];
    let compositeRisk = 0;

    // Correlación latencia-errores (alta latencia -> más errores)
    if (metricsData.latency && metricsData.errorRate) {
      const latencyHigh = (metricsData.latency.current || metricsData.latency) > 2000;
      const errorsRising = this.calculateSlope(
        Array.isArray(metricsData.errorRate) ? metricsData.errorRate : []
      ) > 0;

      if (latencyHigh && errorsRising) {
        correlations.push({
          type: 'latency_error_correlation',
          description: 'Alta latencia correlacionada con aumento de errores',
          risk: 0.6
        });
        compositeRisk += 0.6;
      }
    }

    // Correlación throughput-latencia (bajo throughput + alta latencia = saturación)
    if (metricsData.throughput && metricsData.latency) {
      const latencyValues = Array.isArray(metricsData.latency) ? metricsData.latency : [];
      const throughputValues = Array.isArray(metricsData.throughput) ? metricsData.throughput : [];

      const latencyRising = this.calculateSlope(latencyValues) > 0.1;
      const throughputDropping = this.calculateSlope(throughputValues) < -0.1;

      if (latencyRising && throughputDropping) {
        correlations.push({
          type: 'saturation_indicator',
          description: 'Indicadores de saturación detectados',
          risk: 0.7
        });
        compositeRisk += 0.7;
      }
    }

    // Correlación disponibilidad-errores
    if (metricsData.availability && metricsData.errorRate) {
      const availabilityDrop = this.calculateSlope(
        Array.isArray(metricsData.availability) ? metricsData.availability : []
      ) < -0.05;
      const errorSpike = this.calculateSlope(
        Array.isArray(metricsData.errorRate) ? metricsData.errorRate : []
      ) > 0.5;

      if (availabilityDrop && errorSpike) {
        correlations.push({
          type: 'degradation_correlation',
          description: 'Degradación progresiva detectada',
          risk: 0.8
        });
        compositeRisk += 0.8;
      }
    }

    return {
      risk: Math.min(compositeRisk / Math.max(correlations.length, 1), 1),
      correlations,
      details: correlations.length > 0
        ? `${correlations.length} correlaciones de riesgo detectadas`
        : 'Sin correlaciones de riesgo'
    };
  }

  /**
   * Calcula score de riesgo ponderado
   */
  calculateRiskScore(factors) {
    const weights = this.config.weights;
    let totalWeight = 0;
    let weightedSum = 0;

    if (factors.latency) {
      weightedSum += factors.latency.risk * weights.latencyTrend;
      totalWeight += weights.latencyTrend;
    }

    if (factors.errorRate) {
      weightedSum += factors.errorRate.risk * weights.errorRateTrend;
      totalWeight += weights.errorRateTrend;
    }

    if (factors.availability) {
      weightedSum += factors.availability.risk * weights.availabilityTrend;
      totalWeight += weights.availabilityTrend;
    }

    if (factors.historical) {
      weightedSum += factors.historical.risk * weights.historicalPattern;
      totalWeight += weights.historicalPattern;
    }

    // Agregar correlaciones como factor extra
    if (factors.correlation && factors.correlation.risk > 0) {
      weightedSum += factors.correlation.risk * 0.3;
      totalWeight += 0.3;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Determina nivel de riesgo
   */
  determineRiskLevel(riskScore) {
    if (riskScore >= this.config.highRiskThreshold) return 'high';
    if (riskScore >= this.config.mediumRiskThreshold) return 'medium';
    return 'low';
  }

  /**
   * Calcula confianza de la predicción
   */
  calculateConfidence(factors) {
    let dataPoints = 0;
    let factorsWithData = 0;

    for (const [key, factor] of Object.entries(factors)) {
      if (factor && factor.risk !== undefined) {
        factorsWithData++;
        if (factor.details && !factor.details.includes('insuficientes')) {
          dataPoints++;
        }
      }
    }

    // Más factores con datos = mayor confianza
    const factorConfidence = dataPoints / Math.max(factorsWithData, 1);

    // Historial disponible = mayor confianza
    const historicalConfidence = this.predictionHistory.length > 10 ? 0.2 : 0;

    return Math.min(factorConfidence * 0.8 + historicalConfidence, 1);
  }

  /**
   * Genera warnings específicos
   */
  generateWarnings(factors) {
    const warnings = [];

    if (factors.latency?.trend === 'increasing') {
      warnings.push({
        type: 'latency_trend',
        message: 'Latencia en tendencia alcista',
        severity: factors.latency.risk > 0.5 ? 'high' : 'medium'
      });
    }

    if (factors.errorRate?.trend === 'increasing') {
      warnings.push({
        type: 'error_trend',
        message: 'Tasa de errores en aumento',
        severity: factors.errorRate.risk > 0.5 ? 'high' : 'medium'
      });
    }

    if (factors.availability?.trend === 'decreasing') {
      warnings.push({
        type: 'availability_trend',
        message: 'Disponibilidad en descenso',
        severity: factors.availability.risk > 0.5 ? 'high' : 'medium'
      });
    }

    if (factors.correlation?.correlations?.length > 0) {
      for (const corr of factors.correlation.correlations) {
        warnings.push({
          type: corr.type,
          message: corr.description,
          severity: corr.risk > 0.6 ? 'high' : 'medium'
        });
      }
    }

    if (factors.historical?.matchedPatterns > 0) {
      warnings.push({
        type: 'historical_pattern',
        message: `Patrón similar a ${factors.historical.matchedPatterns} fallos anteriores`,
        severity: 'high'
      });
    }

    return warnings;
  }

  /**
   * Genera recomendaciones
   */
  generateRecommendations(prediction) {
    const recommendations = [];

    if (prediction.riskLevel === 'high') {
      recommendations.push({
        priority: 'critical',
        action: 'Revisar logs y métricas inmediatamente',
        reason: 'Alto riesgo de fallo detectado'
      });

      recommendations.push({
        priority: 'high',
        action: 'Preparar plan de contingencia',
        reason: 'Posible interrupción del servicio'
      });
    }

    if (prediction.factors.latency?.risk > 0.5) {
      recommendations.push({
        priority: 'high',
        action: 'Investigar causa de alta latencia',
        reason: prediction.factors.latency.details
      });

      recommendations.push({
        priority: 'medium',
        action: 'Considerar escalado horizontal',
        reason: 'Puede ayudar a reducir la carga'
      });
    }

    if (prediction.factors.errorRate?.risk > 0.5) {
      recommendations.push({
        priority: 'high',
        action: 'Analizar errores en logs',
        reason: 'Tasa de errores anormal'
      });

      recommendations.push({
        priority: 'medium',
        action: 'Verificar dependencias externas',
        reason: 'Los errores pueden ser por servicios downstream'
      });
    }

    if (prediction.factors.correlation?.risk > 0.5) {
      recommendations.push({
        priority: 'critical',
        action: 'Actuar de forma preventiva',
        reason: 'Múltiples indicadores de degradación correlacionados'
      });
    }

    if (prediction.riskLevel === 'low' && recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        action: 'Continuar monitoreo normal',
        reason: 'Sin indicadores de riesgo significativos'
      });
    }

    return recommendations;
  }

  /**
   * Registra predicción en historial
   */
  recordPrediction(prediction) {
    this.predictionHistory.push({
      ...prediction,
      recordedAt: new Date().toISOString()
    });

    // Mantener últimas 500 predicciones
    if (this.predictionHistory.length > 500) {
      this.predictionHistory = this.predictionHistory.slice(-500);
    }
  }

  /**
   * Registra resultado real (para aprendizaje)
   */
  recordOutcome(apiId, outcome, timestamp = new Date()) {
    // Buscar predicciones recientes para esta API
    const windowStart = new Date(timestamp - this.config.predictionHorizon * 60 * 1000);

    const relevantPredictions = this.predictionHistory.filter(p =>
      p.apiId === apiId &&
      new Date(p.timestamp) >= windowStart &&
      new Date(p.timestamp) <= timestamp
    );

    // Marcar predicciones con resultado real
    for (const pred of relevantPredictions) {
      pred.actualOutcome = outcome;
      pred.outcomeRecordedAt = timestamp.toISOString();
    }

    // Aprender de este caso
    this.learnFromOutcome(relevantPredictions, outcome);
  }

  /**
   * Aprende de resultados reales
   */
  learnFromOutcome(predictions, outcome) {
    // Analizar qué factores predijeron correctamente
    for (const pred of predictions) {
      const wasCorrect = (
        (outcome === 'failure' && pred.riskLevel === 'high') ||
        (outcome === 'success' && pred.riskLevel === 'low')
      );

      // Guardar patrón si fue un fallo
      if (outcome === 'failure') {
        this.failurePatterns.push({
          factors: pred.factors,
          riskScore: pred.riskScore,
          timestamp: pred.timestamp,
          wasDetected: pred.riskLevel === 'high'
        });

        // Mantener solo últimos 100 patrones
        if (this.failurePatterns.length > 100) {
          this.failurePatterns = this.failurePatterns.slice(-100);
        }
      }
    }
  }

  /**
   * Calcula pendiente de una serie
   */
  calculateSlope(values) {
    if (!values || values.length < 2) return 0;

    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    return denominator !== 0 ? numerator / denominator : 0;
  }

  /**
   * Calcula aceleración (derivada de la pendiente)
   */
  calculateAcceleration(values) {
    if (values.length < 6) return 0;

    const mid = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, mid);
    const secondHalf = values.slice(mid);

    const slope1 = this.calculateSlope(firstHalf);
    const slope2 = this.calculateSlope(secondHalf);

    return slope2 - slope1;
  }

  /**
   * Calcula similitud entre métricas
   */
  calculateMetricSimilarity(current, historical) {
    let similarity = 0;
    let factors = 0;

    if (current.latency && historical.latency) {
      const diff = Math.abs(current.latency.risk - historical.latency.risk);
      similarity += 1 - diff;
      factors++;
    }

    if (current.errorRate && historical.errorRate) {
      const diff = Math.abs(current.errorRate.risk - historical.errorRate.risk);
      similarity += 1 - diff;
      factors++;
    }

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Formatea detalles de tendencia
   */
  formatTrendDetails(metric, slope, currentValue) {
    const trendWord = slope > 0 ? 'aumentando' : slope < 0 ? 'disminuyendo' : 'estable';

    const metricLabels = {
      latency: ['Latencia', 'ms'],
      errorRate: ['Tasa de errores', '%'],
      availability: ['Disponibilidad', '%']
    };

    const [label, unit] = metricLabels[metric] || [metric, ''];

    return `${label} ${trendWord} (actual: ${currentValue.toFixed(2)}${unit})`;
  }

  /**
   * Obtiene historial de predicciones
   */
  getPredictionHistory(options = {}) {
    let history = [...this.predictionHistory];

    if (options.apiId) {
      history = history.filter(p => p.apiId === options.apiId);
    }

    if (options.riskLevel) {
      history = history.filter(p => p.riskLevel === options.riskLevel);
    }

    if (options.since) {
      const since = new Date(options.since);
      history = history.filter(p => new Date(p.timestamp) >= since);
    }

    if (options.limit) {
      history = history.slice(-options.limit);
    }

    return history;
  }

  /**
   * Genera reporte de predicciones
   */
  async generateReport(options = {}) {
    const period = options.period || 24; // horas
    const since = new Date(Date.now() - period * 60 * 60 * 1000);

    const recentPredictions = this.getPredictionHistory({ since: since.toISOString() });

    // Estadísticas de predicciones
    const byRisk = {
      high: recentPredictions.filter(p => p.riskLevel === 'high').length,
      medium: recentPredictions.filter(p => p.riskLevel === 'medium').length,
      low: recentPredictions.filter(p => p.riskLevel === 'low').length
    };

    // Precisión (si hay datos de outcome)
    const withOutcome = recentPredictions.filter(p => p.actualOutcome);
    const correctPredictions = withOutcome.filter(p =>
      (p.actualOutcome === 'failure' && p.riskLevel === 'high') ||
      (p.actualOutcome === 'success' && p.riskLevel === 'low')
    );
    const accuracy = withOutcome.length > 0
      ? correctPredictions.length / withOutcome.length
      : null;

    // APIs con mayor riesgo
    const apiRiskScores = {};
    for (const pred of recentPredictions) {
      if (!apiRiskScores[pred.apiId]) {
        apiRiskScores[pred.apiId] = [];
      }
      apiRiskScores[pred.apiId].push(pred.riskScore);
    }

    const highRiskApis = Object.entries(apiRiskScores)
      .map(([apiId, scores]) => ({
        apiId,
        avgRisk: scores.reduce((a, b) => a + b, 0) / scores.length,
        maxRisk: Math.max(...scores)
      }))
      .filter(api => api.avgRisk > this.config.mediumRiskThreshold)
      .sort((a, b) => b.avgRisk - a.avgRisk);

    return {
      period: `${period}h`,
      generatedAt: new Date().toISOString(),
      summary: {
        totalPredictions: recentPredictions.length,
        byRiskLevel: byRisk,
        accuracy: accuracy !== null ? `${(accuracy * 100).toFixed(1)}%` : 'N/A',
        highRiskApisCount: highRiskApis.length
      },
      highRiskApis,
      failurePatternsLearned: this.failurePatterns.length,
      recentHighRisk: recentPredictions
        .filter(p => p.riskLevel === 'high')
        .slice(-10)
    };
  }

  /**
   * Obtiene estado del predictor
   */
  getStatus() {
    return {
      predictionHistorySize: this.predictionHistory.length,
      failurePatternsLearned: this.failurePatterns.length,
      config: {
        predictionHorizon: `${this.config.predictionHorizon}m`,
        highRiskThreshold: this.config.highRiskThreshold,
        mediumRiskThreshold: this.config.mediumRiskThreshold
      }
    };
  }
}

export default FailurePredictor;
