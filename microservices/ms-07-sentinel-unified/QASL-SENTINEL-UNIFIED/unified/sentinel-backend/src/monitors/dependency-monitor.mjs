/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                      DEPENDENCY MONITOR v1.0                                 ║
 * ║           Monitoreo de Dependencias API → API (Cascada)                      ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Detecta y monitorea dependencias entre APIs:                                ║
 * ║  - Mapeo automático de dependencias                                          ║
 * ║  - Detección de impacto en cascada                                           ║
 * ║  - Análisis de cadena de llamadas                                            ║
 * ║  - Alertas de dependencias críticas                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { EventEmitter } from 'events';

export class DependencyMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      checkInterval: config.checkInterval || 60000,
      maxDepth: config.maxDepth || 10, // Máxima profundidad de cascada
      criticalThreshold: config.criticalThreshold || 3, // Dependencias críticas
      ...config
    };

    // Grafo de dependencias: apiId -> Set<dependencyApiId>
    this.dependencyGraph = new Map();

    // Mapa inverso: apiId -> Set<apisQueDependenDeEsta>
    this.reverseDependencies = new Map();

    // Estado de las APIs
    this.apiStatus = new Map();

    // Historial de impactos
    this.impactHistory = [];

    this.checkInterval = null;
  }

  /**
   * Inicia el monitor de dependencias
   */
  start() {
    console.log('🌐 Dependency Monitor iniciado');
    this.checkInterval = setInterval(() => this.analyzeImpact(), this.config.checkInterval);
  }

  /**
   * Detiene el monitor
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('🌐 Dependency Monitor detenido');
  }

  /**
   * Registra una dependencia entre APIs
   * @param {string} apiId - API que depende
   * @param {string} dependsOnApiId - API de la que depende
   * @param {object} metadata - Información adicional
   */
  addDependency(apiId, dependsOnApiId, metadata = {}) {
    // Agregar al grafo de dependencias
    if (!this.dependencyGraph.has(apiId)) {
      this.dependencyGraph.set(apiId, new Map());
    }

    this.dependencyGraph.get(apiId).set(dependsOnApiId, {
      type: metadata.type || 'runtime', // runtime, data, auth
      criticality: metadata.criticality || 'normal', // critical, normal, low
      description: metadata.description || '',
      addedAt: new Date().toISOString()
    });

    // Agregar al mapa inverso
    if (!this.reverseDependencies.has(dependsOnApiId)) {
      this.reverseDependencies.set(dependsOnApiId, new Set());
    }
    this.reverseDependencies.get(dependsOnApiId).add(apiId);

    this.emit('dependency-added', { apiId, dependsOnApiId, metadata });
  }

  /**
   * Elimina una dependencia
   */
  removeDependency(apiId, dependsOnApiId) {
    if (this.dependencyGraph.has(apiId)) {
      this.dependencyGraph.get(apiId).delete(dependsOnApiId);
    }
    if (this.reverseDependencies.has(dependsOnApiId)) {
      this.reverseDependencies.get(dependsOnApiId).delete(apiId);
    }
  }

  /**
   * Auto-detecta dependencias desde HAR/Swagger
   */
  autoDetectDependencies(apis, traces = []) {
    const detected = [];

    // Analizar trazas de llamadas
    for (const trace of traces) {
      if (trace.calls && trace.calls.length > 1) {
        for (let i = 0; i < trace.calls.length - 1; i++) {
          const caller = trace.calls[i];
          const callee = trace.calls[i + 1];

          // Si una API llama a otra en secuencia, es dependencia
          if (caller.apiId !== callee.apiId) {
            this.addDependency(caller.apiId, callee.apiId, {
              type: 'runtime',
              source: 'auto-detected',
              traceId: trace.id
            });
            detected.push({ from: caller.apiId, to: callee.apiId });
          }
        }
      }
    }

    // Analizar Swagger/OpenAPI para dependencias declaradas
    for (const api of apis) {
      if (api.spec && api.spec.paths) {
        for (const [path, methods] of Object.entries(api.spec.paths)) {
          for (const [method, operation] of Object.entries(methods)) {
            // Buscar referencias a otras APIs en la especificación
            if (operation['x-depends-on']) {
              const deps = Array.isArray(operation['x-depends-on'])
                ? operation['x-depends-on']
                : [operation['x-depends-on']];

              for (const dep of deps) {
                this.addDependency(api.id, dep, {
                  type: 'declared',
                  path,
                  method
                });
                detected.push({ from: api.id, to: dep });
              }
            }
          }
        }
      }
    }

    return detected;
  }

  /**
   * Actualiza el estado de una API
   */
  updateApiStatus(apiId, status) {
    const previousStatus = this.apiStatus.get(apiId);
    this.apiStatus.set(apiId, {
      status, // healthy, degraded, down
      timestamp: new Date().toISOString(),
      previousStatus: previousStatus?.status
    });

    // Si cambió a down o degraded, analizar impacto
    if (status !== 'healthy' && previousStatus?.status === 'healthy') {
      const impact = this.calculateCascadeImpact(apiId);
      if (impact.affectedApis.length > 0) {
        this.emit('cascade-impact', impact);
        this.impactHistory.push(impact);
      }
    }
  }

  /**
   * Calcula el impacto en cascada si una API falla
   */
  calculateCascadeImpact(failedApiId) {
    const affected = new Set();
    const impactChain = [];

    const traverse = (apiId, depth = 0, path = []) => {
      if (depth > this.config.maxDepth) return;

      const dependents = this.reverseDependencies.get(apiId);
      if (!dependents) return;

      for (const dependentApi of dependents) {
        if (affected.has(dependentApi)) continue; // Evitar ciclos

        affected.add(dependentApi);
        const newPath = [...path, dependentApi];

        impactChain.push({
          api: dependentApi,
          depth,
          impactedBy: apiId,
          path: newPath,
          dependency: this.dependencyGraph.get(dependentApi)?.get(apiId)
        });

        // Continuar la cascada
        traverse(dependentApi, depth + 1, newPath);
      }
    };

    traverse(failedApiId);

    // Clasificar por criticidad
    const critical = impactChain.filter(i =>
      i.dependency?.criticality === 'critical' || i.depth === 0
    );

    return {
      failedApi: failedApiId,
      timestamp: new Date().toISOString(),
      affectedApis: [...affected],
      totalAffected: affected.size,
      impactChain,
      criticalImpacts: critical.length,
      maxDepth: Math.max(...impactChain.map(i => i.depth), 0),
      severity: critical.length >= this.config.criticalThreshold ? 'critical' :
                affected.size > 5 ? 'high' :
                affected.size > 0 ? 'medium' : 'low'
    };
  }

  /**
   * Analiza impacto actual basado en estado de APIs
   */
  analyzeImpact() {
    const impacts = [];

    for (const [apiId, status] of this.apiStatus.entries()) {
      if (status.status !== 'healthy') {
        const impact = this.calculateCascadeImpact(apiId);
        if (impact.affectedApis.length > 0) {
          impacts.push(impact);
        }
      }
    }

    if (impacts.length > 0) {
      this.emit('impact-analysis', {
        timestamp: new Date().toISOString(),
        totalImpacts: impacts.length,
        impacts
      });
    }

    return impacts;
  }

  /**
   * Obtiene las dependencias de una API
   */
  getDependencies(apiId) {
    const deps = this.dependencyGraph.get(apiId);
    if (!deps) return [];

    return [...deps.entries()].map(([depId, meta]) => ({
      apiId: depId,
      ...meta
    }));
  }

  /**
   * Obtiene las APIs que dependen de esta
   */
  getDependents(apiId) {
    const dependents = this.reverseDependencies.get(apiId);
    return dependents ? [...dependents] : [];
  }

  /**
   * Obtiene la cadena completa de dependencias
   */
  getDependencyChain(apiId, direction = 'down') {
    const chain = [];
    const visited = new Set();

    const traverse = (id, depth = 0) => {
      if (visited.has(id) || depth > this.config.maxDepth) return;
      visited.add(id);

      const items = direction === 'down'
        ? this.dependencyGraph.get(id)
        : this.reverseDependencies.get(id);

      if (!items) return;

      const iterator = direction === 'down'
        ? items.entries()
        : [[...items].map(i => [i, {}])][0];

      for (const [depId, meta] of (direction === 'down' ? items.entries() : [...items].map(i => [i, {}]))) {
        chain.push({
          from: direction === 'down' ? id : depId,
          to: direction === 'down' ? depId : id,
          depth,
          ...(direction === 'down' ? meta : {})
        });
        traverse(depId, depth + 1);
      }
    };

    traverse(apiId);
    return chain;
  }

  /**
   * Detecta ciclos en las dependencias
   */
  detectCycles() {
    const cycles = [];
    const visited = new Set();
    const recursionStack = new Set();

    const dfs = (apiId, path = []) => {
      visited.add(apiId);
      recursionStack.add(apiId);
      path.push(apiId);

      const deps = this.dependencyGraph.get(apiId);
      if (deps) {
        for (const [depId] of deps.entries()) {
          if (!visited.has(depId)) {
            const cycle = dfs(depId, [...path]);
            if (cycle) cycles.push(cycle);
          } else if (recursionStack.has(depId)) {
            // Encontramos un ciclo
            const cycleStart = path.indexOf(depId);
            cycles.push({
              apis: path.slice(cycleStart),
              type: 'circular-dependency'
            });
          }
        }
      }

      recursionStack.delete(apiId);
      return null;
    };

    for (const apiId of this.dependencyGraph.keys()) {
      if (!visited.has(apiId)) {
        dfs(apiId);
      }
    }

    return cycles;
  }

  /**
   * Obtiene estadísticas del grafo de dependencias
   */
  getStats() {
    const allDeps = [...this.dependencyGraph.values()];
    const totalDependencies = allDeps.reduce((sum, deps) => sum + deps.size, 0);

    // Encontrar APIs más críticas (más dependientes)
    const criticalApis = [...this.reverseDependencies.entries()]
      .map(([apiId, dependents]) => ({
        apiId,
        dependentCount: dependents.size
      }))
      .sort((a, b) => b.dependentCount - a.dependentCount)
      .slice(0, 10);

    // APIs con más dependencias
    const mostDependent = [...this.dependencyGraph.entries()]
      .map(([apiId, deps]) => ({
        apiId,
        dependencyCount: deps.size
      }))
      .sort((a, b) => b.dependencyCount - a.dependencyCount)
      .slice(0, 10);

    return {
      totalApis: this.dependencyGraph.size,
      totalDependencies,
      averageDependencies: totalDependencies / Math.max(this.dependencyGraph.size, 1),
      criticalApis,
      mostDependent,
      cycles: this.detectCycles(),
      healthStatus: {
        healthy: [...this.apiStatus.values()].filter(s => s.status === 'healthy').length,
        degraded: [...this.apiStatus.values()].filter(s => s.status === 'degraded').length,
        down: [...this.apiStatus.values()].filter(s => s.status === 'down').length
      }
    };
  }

  /**
   * Obtiene métricas para Prometheus
   */
  getMetrics() {
    const stats = this.getStats();

    return {
      dependency_apis_total: stats.totalApis,
      dependency_links_total: stats.totalDependencies,
      dependency_avg_per_api: stats.averageDependencies,
      dependency_cycles_detected: stats.cycles.length,
      dependency_critical_apis: stats.criticalApis.length,
      dependency_healthy_apis: stats.healthStatus.healthy,
      dependency_degraded_apis: stats.healthStatus.degraded,
      dependency_down_apis: stats.healthStatus.down,
      dependency_impact_events: this.impactHistory.length
    };
  }

  /**
   * Genera visualización del grafo (formato DOT para Graphviz)
   */
  generateGraphViz() {
    let dot = 'digraph Dependencies {\n';
    dot += '  rankdir=LR;\n';
    dot += '  node [shape=box];\n\n';

    // Nodos con colores según estado
    for (const [apiId, status] of this.apiStatus.entries()) {
      const color = status.status === 'healthy' ? 'green' :
                    status.status === 'degraded' ? 'yellow' : 'red';
      dot += `  "${apiId}" [color=${color}, style=filled, fillcolor=light${color}];\n`;
    }

    dot += '\n';

    // Edges (dependencias)
    for (const [apiId, deps] of this.dependencyGraph.entries()) {
      for (const [depId, meta] of deps.entries()) {
        const style = meta.criticality === 'critical' ? 'bold' : 'solid';
        const color = meta.type === 'auth' ? 'blue' :
                     meta.type === 'data' ? 'purple' : 'black';
        dot += `  "${apiId}" -> "${depId}" [style=${style}, color=${color}];\n`;
      }
    }

    dot += '}\n';
    return dot;
  }

  /**
   * Genera reporte de dependencias
   */
  generateReport() {
    const stats = this.getStats();

    return {
      title: 'Dependency Monitor Report',
      generatedAt: new Date().toISOString(),
      summary: {
        totalApis: stats.totalApis,
        totalDependencies: stats.totalDependencies,
        averagePerApi: stats.averageDependencies.toFixed(2),
        cyclesDetected: stats.cycles.length
      },
      criticalApis: stats.criticalApis,
      mostDependent: stats.mostDependent,
      healthStatus: stats.healthStatus,
      cycles: stats.cycles,
      recentImpacts: this.impactHistory.slice(-10),
      graphViz: this.generateGraphViz()
    };
  }
}

export default DependencyMonitor;
