/**
 * ML Anomaly Detector - Detección de anomalías con Machine Learning
 *
 * Implementa múltiples algoritmos:
 * - Z-Score para detección de outliers
 * - Moving Average para detección de tendencias
 * - Isolation Forest simplificado
 * - Seasonal decomposition para patrones temporales
 */

export class AnomalyDetector {
  constructor(dataLayer, config = {}) {
    this.dataLayer = dataLayer;
    this.config = {
      // Umbrales de detección
      zScoreThreshold: config.zScoreThreshold || 3,
      sensitivity: config.sensitivity || 'medium', // low, medium, high

      // Ventanas de análisis
      shortWindow: config.shortWindow || 10,    // últimas 10 muestras
      longWindow: config.longWindow || 100,     // últimas 100 muestras
      seasonalPeriod: config.seasonalPeriod || 24, // 24 horas

      // Tipos de anomalías a detectar
      detectSpikes: config.detectSpikes !== false,
      detectDrops: config.detectDrops !== false,
      detectTrends: config.detectTrends !== false,
      detectSeasonalDeviation: config.detectSeasonalDeviation !== false,

      // Métricas a monitorear
      metrics: config.metrics || ['latency', 'errorRate', 'throughput', 'availability'],

      ...config
    };

    // Modelos entrenados por API/métrica
    this.models = new Map();

    // Historial de anomalías detectadas
    this.anomalyHistory = [];

    // Estadísticas de baseline por métrica
    this.baselines = new Map();

    // Sensibilidad ajustada
    this.sensitivityMultiplier = {
      low: 1.5,
      medium: 1.0,
      high: 0.7
    };
  }

  /**
   * Entrena el modelo con datos históricos
   */
  async train(apiId, metric, historicalData) {
    if (!historicalData || historicalData.length < this.config.longWindow) {
      console.log(`⚠ Datos insuficientes para entrenar modelo de ${metric} en ${apiId}`);
      return false;
    }

    const values = historicalData.map(d => d.value);

    // Calcular estadísticas base
    const stats = this.calculateStats(values);

    // Calcular percentiles
    const percentiles = this.calculatePercentiles(values);

    // Detectar estacionalidad
    const seasonality = this.detectSeasonality(values);

    // Calcular baseline adaptativo
    const baseline = {
      mean: stats.mean,
      std: stats.std,
      min: stats.min,
      max: stats.max,
      median: percentiles.p50,
      p95: percentiles.p95,
      p99: percentiles.p99,
      seasonality,
      trainedAt: new Date().toISOString(),
      sampleSize: values.length
    };

    const key = `${apiId}:${metric}`;
    this.baselines.set(key, baseline);

    // Crear modelo para detección
    const model = {
      apiId,
      metric,
      baseline,
      isolationForest: this.trainIsolationForest(values),
      movingAvg: this.calculateMovingAverage(values, this.config.shortWindow)
    };

    this.models.set(key, model);

    console.log(`✓ Modelo entrenado para ${metric} en ${apiId} (${values.length} muestras)`);
    return true;
  }

  /**
   * Detecta anomalías en nuevos datos
   */
  async detect(apiId, metric, currentValue, context = {}) {
    const key = `${apiId}:${metric}`;
    const model = this.models.get(key);

    if (!model) {
      // Si no hay modelo, usar detección básica
      return this.basicDetection(currentValue, context);
    }

    const anomalies = [];
    const baseline = model.baseline;
    const threshold = this.config.zScoreThreshold * this.sensitivityMultiplier[this.config.sensitivity];

    // 1. Z-Score Detection
    if (this.config.detectSpikes || this.config.detectDrops) {
      const zScore = (currentValue - baseline.mean) / baseline.std;

      if (Math.abs(zScore) > threshold) {
        anomalies.push({
          type: zScore > 0 ? 'spike' : 'drop',
          algorithm: 'z-score',
          severity: this.calculateSeverity(Math.abs(zScore), threshold),
          score: Math.abs(zScore),
          expected: baseline.mean,
          actual: currentValue,
          deviation: ((currentValue - baseline.mean) / baseline.mean * 100).toFixed(2) + '%'
        });
      }
    }

    // 2. Isolation Forest Detection
    const isolationScore = this.predictIsolationForest(model.isolationForest, currentValue);
    if (isolationScore > 0.6) { // Umbral de anomalía
      anomalies.push({
        type: 'isolation',
        algorithm: 'isolation-forest',
        severity: isolationScore > 0.8 ? 'critical' : 'warning',
        score: isolationScore,
        expected: `${baseline.p95} (p95)`,
        actual: currentValue
      });
    }

    // 3. Moving Average Trend Detection
    if (this.config.detectTrends && context.recentValues) {
      const trendAnomaly = this.detectTrendAnomaly(context.recentValues, baseline);
      if (trendAnomaly) {
        anomalies.push(trendAnomaly);
      }
    }

    // 4. Seasonal Deviation Detection
    if (this.config.detectSeasonalDeviation && baseline.seasonality.detected) {
      const seasonalAnomaly = this.detectSeasonalAnomaly(currentValue, baseline, context.hour);
      if (seasonalAnomaly) {
        anomalies.push(seasonalAnomaly);
      }
    }

    // 5. Percentile-based Detection
    if (currentValue > baseline.p99) {
      anomalies.push({
        type: 'percentile_breach',
        algorithm: 'percentile',
        severity: 'warning',
        score: currentValue / baseline.p99,
        expected: `< ${baseline.p99} (p99)`,
        actual: currentValue
      });
    }

    // Registrar anomalías detectadas
    if (anomalies.length > 0) {
      this.recordAnomalies(apiId, metric, currentValue, anomalies, context);
    }

    return {
      isAnomaly: anomalies.length > 0,
      anomalies,
      value: currentValue,
      baseline: {
        mean: baseline.mean,
        std: baseline.std,
        p95: baseline.p95
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Analiza múltiples métricas de una API
   */
  async analyzeApi(apiId, metricsData) {
    const results = {
      apiId,
      timestamp: new Date().toISOString(),
      metrics: {},
      anomalyCount: 0,
      overallHealth: 'healthy'
    };

    for (const [metric, data] of Object.entries(metricsData)) {
      if (!this.config.metrics.includes(metric)) continue;

      const detection = await this.detect(apiId, metric, data.current, {
        recentValues: data.recent,
        hour: new Date().getHours()
      });

      results.metrics[metric] = detection;

      if (detection.isAnomaly) {
        results.anomalyCount += detection.anomalies.length;
      }
    }

    // Determinar salud general
    if (results.anomalyCount === 0) {
      results.overallHealth = 'healthy';
    } else if (results.anomalyCount <= 2) {
      results.overallHealth = 'warning';
    } else {
      results.overallHealth = 'critical';
    }

    return results;
  }

  /**
   * Calcula estadísticas básicas
   */
  calculateStats(values) {
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const std = Math.sqrt(variance);

    return {
      mean,
      std,
      variance,
      min: Math.min(...values),
      max: Math.max(...values),
      range: Math.max(...values) - Math.min(...values)
    };
  }

  /**
   * Calcula percentiles
   */
  calculatePercentiles(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    return {
      p25: sorted[Math.floor(n * 0.25)],
      p50: sorted[Math.floor(n * 0.50)],
      p75: sorted[Math.floor(n * 0.75)],
      p90: sorted[Math.floor(n * 0.90)],
      p95: sorted[Math.floor(n * 0.95)],
      p99: sorted[Math.floor(n * 0.99)]
    };
  }

  /**
   * Detecta patrones de estacionalidad
   */
  detectSeasonality(values) {
    if (values.length < this.config.seasonalPeriod * 2) {
      return { detected: false, reason: 'insufficient_data' };
    }

    const period = this.config.seasonalPeriod;
    const seasons = [];

    // Agrupar valores por hora del día
    for (let i = 0; i < values.length; i++) {
      const seasonIndex = i % period;
      if (!seasons[seasonIndex]) seasons[seasonIndex] = [];
      seasons[seasonIndex].push(values[i]);
    }

    // Calcular media por período
    const seasonalMeans = seasons.map(s =>
      s.reduce((a, b) => a + b, 0) / s.length
    );

    // Calcular varianza entre períodos
    const overallMean = seasonalMeans.reduce((a, b) => a + b, 0) / seasonalMeans.length;
    const seasonalVariance = seasonalMeans.reduce((sum, m) =>
      sum + Math.pow(m - overallMean, 2), 0) / seasonalMeans.length;

    // Si hay varianza significativa, hay estacionalidad
    const detected = seasonalVariance > (overallMean * 0.1);

    return {
      detected,
      period,
      seasonalMeans,
      variance: seasonalVariance
    };
  }

  /**
   * Entrena un Isolation Forest simplificado
   */
  trainIsolationForest(values, numTrees = 100) {
    const trees = [];
    const sampleSize = Math.min(256, values.length);

    for (let t = 0; t < numTrees; t++) {
      // Muestrear datos
      const sample = this.randomSample(values, sampleSize);

      // Construir árbol
      const tree = this.buildIsolationTree(sample, 0, Math.ceil(Math.log2(sampleSize)));
      trees.push(tree);
    }

    return { trees, sampleSize };
  }

  /**
   * Construye un árbol de aislamiento
   */
  buildIsolationTree(data, depth, maxDepth) {
    if (depth >= maxDepth || data.length <= 1) {
      return { type: 'leaf', size: data.length };
    }

    const min = Math.min(...data);
    const max = Math.max(...data);

    if (min === max) {
      return { type: 'leaf', size: data.length };
    }

    // Punto de corte aleatorio
    const splitValue = min + Math.random() * (max - min);

    const left = data.filter(v => v < splitValue);
    const right = data.filter(v => v >= splitValue);

    return {
      type: 'node',
      splitValue,
      left: this.buildIsolationTree(left, depth + 1, maxDepth),
      right: this.buildIsolationTree(right, depth + 1, maxDepth)
    };
  }

  /**
   * Predice con Isolation Forest
   */
  predictIsolationForest(model, value) {
    const pathLengths = model.trees.map(tree => this.getPathLength(tree, value, 0));
    const avgPathLength = pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length;

    // Calcular score de anomalía
    const c = this.averagePathLength(model.sampleSize);
    const score = Math.pow(2, -avgPathLength / c);

    return score;
  }

  /**
   * Obtiene la longitud del camino en un árbol
   */
  getPathLength(node, value, depth) {
    if (node.type === 'leaf') {
      return depth + this.averagePathLength(node.size);
    }

    if (value < node.splitValue) {
      return this.getPathLength(node.left, value, depth + 1);
    } else {
      return this.getPathLength(node.right, value, depth + 1);
    }
  }

  /**
   * Calcula la longitud promedio esperada
   */
  averagePathLength(n) {
    if (n <= 1) return 0;
    if (n === 2) return 1;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
  }

  /**
   * Calcula media móvil
   */
  calculateMovingAverage(values, window) {
    const result = [];
    for (let i = window - 1; i < values.length; i++) {
      const windowValues = values.slice(i - window + 1, i + 1);
      result.push(windowValues.reduce((a, b) => a + b, 0) / window);
    }
    return result;
  }

  /**
   * Detecta anomalías en tendencias
   */
  detectTrendAnomaly(recentValues, baseline) {
    if (recentValues.length < this.config.shortWindow) return null;

    // Calcular tendencia reciente
    const recentMean = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    const trendDeviation = (recentMean - baseline.mean) / baseline.mean;

    // Calcular pendiente
    const slope = this.calculateSlope(recentValues);
    const normalizedSlope = slope / baseline.mean;

    // Detectar tendencia significativa
    if (Math.abs(trendDeviation) > 0.2 || Math.abs(normalizedSlope) > 0.05) {
      return {
        type: trendDeviation > 0 ? 'upward_trend' : 'downward_trend',
        algorithm: 'trend-analysis',
        severity: Math.abs(trendDeviation) > 0.5 ? 'critical' : 'warning',
        score: Math.abs(trendDeviation),
        slope: normalizedSlope,
        recentMean,
        baselineMean: baseline.mean,
        deviation: (trendDeviation * 100).toFixed(2) + '%'
      };
    }

    return null;
  }

  /**
   * Detecta desviación estacional
   */
  detectSeasonalAnomaly(currentValue, baseline, hour) {
    if (!baseline.seasonality.detected) return null;

    const expectedMean = baseline.seasonality.seasonalMeans[hour % baseline.seasonality.period];
    const deviation = (currentValue - expectedMean) / expectedMean;

    if (Math.abs(deviation) > 0.3) {
      return {
        type: 'seasonal_deviation',
        algorithm: 'seasonal-decomposition',
        severity: Math.abs(deviation) > 0.5 ? 'critical' : 'warning',
        score: Math.abs(deviation),
        expected: expectedMean,
        actual: currentValue,
        hour,
        deviation: (deviation * 100).toFixed(2) + '%'
      };
    }

    return null;
  }

  /**
   * Calcula la pendiente de una serie
   */
  calculateSlope(values) {
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
   * Calcula severidad basada en score
   */
  calculateSeverity(score, threshold) {
    if (score > threshold * 2) return 'critical';
    if (score > threshold * 1.5) return 'high';
    if (score > threshold) return 'warning';
    return 'info';
  }

  /**
   * Detección básica sin modelo entrenado
   */
  basicDetection(value, context) {
    const anomalies = [];

    // Usar umbrales por defecto
    if (context.metric === 'latency' && value > 5000) {
      anomalies.push({
        type: 'spike',
        algorithm: 'threshold',
        severity: value > 10000 ? 'critical' : 'warning',
        score: value / 5000,
        expected: '< 5000ms',
        actual: value
      });
    }

    if (context.metric === 'errorRate' && value > 5) {
      anomalies.push({
        type: 'spike',
        algorithm: 'threshold',
        severity: value > 10 ? 'critical' : 'warning',
        score: value / 5,
        expected: '< 5%',
        actual: value
      });
    }

    return {
      isAnomaly: anomalies.length > 0,
      anomalies,
      value,
      baseline: null,
      timestamp: new Date().toISOString(),
      note: 'No trained model available, using threshold detection'
    };
  }

  /**
   * Registra anomalías detectadas
   */
  recordAnomalies(apiId, metric, value, anomalies, context) {
    const record = {
      id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      apiId,
      metric,
      value,
      anomalies,
      context,
      timestamp: new Date().toISOString()
    };

    this.anomalyHistory.push(record);

    // Mantener solo últimas 1000 anomalías
    if (this.anomalyHistory.length > 1000) {
      this.anomalyHistory = this.anomalyHistory.slice(-1000);
    }

    return record;
  }

  /**
   * Obtiene historial de anomalías
   */
  getAnomalyHistory(options = {}) {
    let history = [...this.anomalyHistory];

    if (options.apiId) {
      history = history.filter(a => a.apiId === options.apiId);
    }

    if (options.metric) {
      history = history.filter(a => a.metric === options.metric);
    }

    if (options.severity) {
      history = history.filter(a =>
        a.anomalies.some(an => an.severity === options.severity)
      );
    }

    if (options.since) {
      const since = new Date(options.since);
      history = history.filter(a => new Date(a.timestamp) >= since);
    }

    if (options.limit) {
      history = history.slice(-options.limit);
    }

    return history;
  }

  /**
   * Genera reporte de anomalías
   */
  async generateReport(options = {}) {
    const period = options.period || 24; // horas
    const since = new Date(Date.now() - period * 60 * 60 * 1000);

    const recentAnomalies = this.getAnomalyHistory({ since: since.toISOString() });

    // Agrupar por API
    const byApi = {};
    for (const anomaly of recentAnomalies) {
      if (!byApi[anomaly.apiId]) {
        byApi[anomaly.apiId] = [];
      }
      byApi[anomaly.apiId].push(anomaly);
    }

    // Agrupar por tipo
    const byType = {};
    for (const anomaly of recentAnomalies) {
      for (const a of anomaly.anomalies) {
        if (!byType[a.type]) {
          byType[a.type] = 0;
        }
        byType[a.type]++;
      }
    }

    // Calcular estadísticas
    const criticalCount = recentAnomalies.filter(a =>
      a.anomalies.some(an => an.severity === 'critical')
    ).length;

    const warningCount = recentAnomalies.filter(a =>
      a.anomalies.some(an => an.severity === 'warning') &&
      !a.anomalies.some(an => an.severity === 'critical')
    ).length;

    return {
      period: `${period}h`,
      generatedAt: new Date().toISOString(),
      summary: {
        totalAnomalies: recentAnomalies.length,
        critical: criticalCount,
        warning: warningCount,
        affectedApis: Object.keys(byApi).length
      },
      byApi,
      byType,
      models: {
        trained: this.models.size,
        apis: [...new Set([...this.models.keys()].map(k => k.split(':')[0]))]
      },
      recentAnomalies: recentAnomalies.slice(-10)
    };
  }

  /**
   * Muestra aleatorio para Isolation Forest
   */
  randomSample(array, size) {
    const sample = [];
    const indices = new Set();

    while (sample.length < size && indices.size < array.length) {
      const idx = Math.floor(Math.random() * array.length);
      if (!indices.has(idx)) {
        indices.add(idx);
        sample.push(array[idx]);
      }
    }

    return sample;
  }

  /**
   * Exporta modelos entrenados
   */
  exportModels() {
    const exported = {};

    for (const [key, model] of this.models.entries()) {
      exported[key] = {
        apiId: model.apiId,
        metric: model.metric,
        baseline: model.baseline
        // No exportamos árboles de Isolation Forest por tamaño
      };
    }

    return exported;
  }

  /**
   * Importa modelos previamente exportados
   */
  importModels(exported) {
    for (const [key, data] of Object.entries(exported)) {
      this.baselines.set(key, data.baseline);

      // Recrear modelo básico (sin Isolation Forest)
      this.models.set(key, {
        apiId: data.apiId,
        metric: data.metric,
        baseline: data.baseline,
        isolationForest: null,
        movingAvg: []
      });
    }

    console.log(`✓ Importados ${Object.keys(exported).length} modelos`);
  }

  /**
   * Obtiene el estado del detector
   */
  getStatus() {
    return {
      modelsCount: this.models.size,
      anomalyHistorySize: this.anomalyHistory.length,
      config: {
        sensitivity: this.config.sensitivity,
        zScoreThreshold: this.config.zScoreThreshold,
        metrics: this.config.metrics
      },
      models: [...this.models.keys()].map(key => {
        const baseline = this.baselines.get(key);
        return {
          key,
          trainedAt: baseline?.trainedAt,
          sampleSize: baseline?.sampleSize
        };
      })
    };
  }
}

export default AnomalyDetector;
