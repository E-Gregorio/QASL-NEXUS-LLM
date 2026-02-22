/**
 * QASL-INGRID - Query Engine v4
 * Consulta TODAS las métricas relevantes de Prometheus.
 * Para preguntas generales o reportes, trae TODO el dashboard.
 */

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9095';

// =============================================================================
// SALUDOS
// =============================================================================

const GREETINGS = ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'buen dia', 'hey', 'hi', 'hello', 'que tal', 'como estas', 'saludos', 'buenas'];

// =============================================================================
// TODAS LAS METRICAS CRITICAS DEL DASHBOARD
// Estas se consultan SIEMPRE en preguntas generales/reportes
// =============================================================================

const CORE_METRICS = [
  { expr: 'qasl_uptime_percentage', label: 'Disponibilidad global (%)' },
  { expr: 'qasl_latency_avg_ms', label: 'Latencia promedio global (ms)' },
  { expr: 'qasl_apis_total', label: 'Total APIs monitoreadas' },
  { expr: 'qasl_checks_total', label: 'Total checks realizados' },
  { expr: 'qasl_checks_success_total', label: 'Checks exitosos' },
  { expr: 'qasl_checks_failed_total', label: 'Checks fallidos' },
  { expr: 'qasl_api_status', label: 'Estado por API (codigo HTTP)' },
  { expr: 'qasl_api_latency_ms', label: 'Latencia por API (ms)' },
  { expr: 'qasl_api_uptime_percentage', label: 'Disponibilidad por API (%)' },
  { expr: 'qasl_security_score', label: 'Score de seguridad (0-100)' },
  { expr: 'qasl_connectivity_issues_total', label: 'Problemas de conectividad por tipo (cors/ssl/dns/auth/network)' },
  { expr: 'qasl_connectivity_ssl_days', label: 'Dias restantes certificado SSL' },
  { expr: 'qasl_compliance_score', label: 'Score de compliance por framework (SOC2/ISO27001/PCI-DSS/HIPAA)' },
  { expr: 'qasl_zap_vulnerabilities_total', label: 'Total vulnerabilidades OWASP ZAP' },
  { expr: 'qasl_zap_vulnerabilities', label: 'Vulnerabilidades ZAP por severidad' },
  { expr: 'qasl_zap_scan_status', label: 'Estado escaneo ZAP (1=sin criticos)' },
  { expr: 'qasl_zap_top_vulnerability', label: 'Top vulnerabilidades OWASP ZAP' },
  { expr: 'qasl_defcon_level', label: 'Nivel DEFCON (1=CRITICO, 5=OPTIMO)' },
];

// =============================================================================
// METRICAS ADICIONALES POR TEMA ESPECIFICO
// =============================================================================

const EXTRA_METRICS = {
  latencia: [
    { expr: 'qasl_api_latency_avg_ms', label: 'Latencia promedio historica por API (ms)' },
    { expr: 'qasl_rum_latency_percentile', label: 'Percentil de latencia RUM' },
  ],
  errores: [
    { expr: 'qasl_api_failure_total', label: 'Fallos por API' },
    { expr: 'qasl_api_success_total', label: 'Exitos por API' },
    { expr: 'qasl_rum_errors_total', label: 'Errores RUM totales' },
  ],
  apis: [
    { expr: 'qasl_api_healthy', label: 'Saludable por API (1=si, 0=no)' },
    { expr: 'qasl_api_checks_total', label: 'Checks por API' },
    { expr: 'qasl_api_latency_avg_ms', label: 'Latencia promedio por API (ms)' },
    { expr: 'qasl_api_failure_total', label: 'Fallos por API' },
    { expr: 'qasl_api_success_total', label: 'Exitos por API' },
  ],
  contratos: [
    { expr: 'qasl_contract_total', label: 'Total contratos monitoreados' },
    { expr: 'qasl_contract_healthy', label: 'Contratos saludables' },
    { expr: 'qasl_contract_breaking', label: 'Contratos rotos (breaking changes)' },
  ],
  dependencias: [
    { expr: 'qasl_dependency_total', label: 'Total dependencias' },
    { expr: 'qasl_dependency_health', label: 'Salud de dependencias' },
    { expr: 'qasl_dependency_cycles', label: 'Ciclos de dependencia' },
  ],
  prediccion: [
    { expr: 'qasl_prediction_confidence', label: 'Confianza de prediccion' },
    { expr: 'qasl_prediction_apis_at_risk', label: 'APIs en riesgo' },
  ],
  anomalias: [
    { expr: 'qasl_anomaly_detected_total', label: 'Anomalias detectadas' },
  ],
  rum: [
    { expr: 'qasl_rum_sessions_active', label: 'Sesiones activas' },
    { expr: 'qasl_rum_success_rate', label: 'Tasa de exito RUM' },
    { expr: 'qasl_rum_errors_total', label: 'Errores RUM' },
  ],
  garak: [
    { expr: 'garak_pass_rate', label: 'Tasa de resistencia IA' },
    { expr: 'garak_defcon_level', label: 'DEFCON Garak' },
    { expr: 'garak_probes_total', label: 'Total probes' },
    { expr: 'garak_probes_passed', label: 'Probes resistidos' },
    { expr: 'garak_probes_failed', label: 'Probes vulnerados' },
  ],
};

// =============================================================================
// DETECCION DE TEMAS
// =============================================================================

const TOPIC_KEYWORDS = {
  latencia: ['latencia', 'lento', 'lenta', 'demora', 'velocidad', 'rapido', 'milisegundos', 'performance', 'rendimiento', 'tiempo de respuesta'],
  seguridad: ['seguridad', 'vulnerabilidad', 'vulnerabilidades', 'ssl', 'certificado', 'headers', 'security', 'owasp', 'zap', 'escaneo', 'scan', 'cors', 'csp', 'permissions', 'spectre', 'penetracion', 'score de seguridad'],
  compliance: ['compliance', 'cumplimiento', 'soc2', 'soc', 'iso', 'pci', 'hipaa', 'norma', 'regulacion', 'auditoria', 'framework'],
  apis: ['api', 'apis', 'endpoint', 'endpoints', 'token', 'expedient', 'inconsistencies', 'inspection', 'caratulacion', 'selections', 'sade', 'servicio', 'servicios'],
  errores: ['error', 'errores', 'fallo', 'fallos', 'falla', 'fallas', '500', '404', 'roto', 'problema', 'fallido'],
  disponibilidad: ['disponibilidad', 'uptime', 'caida', 'caidas', 'disponible', 'online', 'offline', 'down', 'operativo'],
  contratos: ['contrato', 'contratos', 'contract', 'schema', 'breaking'],
  dependencias: ['dependencia', 'dependencias', 'dependency', 'cascada', 'ciclo'],
  prediccion: ['prediccion', 'predicciones', 'prediction', 'futuro', 'pronostico', 'tendencia'],
  anomalias: ['anomalia', 'anomalias', 'anomaly', 'raro', 'inusual'],
  rum: ['rum', 'sesion', 'sesiones', 'experiencia', 'real user'],
  garak: ['garak', 'llm', 'inteligencia artificial', 'probe', 'jailbreak', 'prompt injection', 'modelo ia'],
};

// =============================================================================
// CONSULTA PROMETHEUS
// =============================================================================

async function queryPrometheus(expr) {
  try {
    const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(expr)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'success' && data.data?.result?.length > 0) {
      return data.data.result.map(r => ({
        metric: r.metric,
        value: parseFloat(r.value[1]),
      }));
    }
    return [];
  } catch (e) {
    console.error(`[INGRID] Prometheus error: ${expr}`, e.message);
    return [];
  }
}

// =============================================================================
// DETECCION
// =============================================================================

function isGreeting(q) {
  const n = q.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n.length > 30) return false;
  const words = n.split(/\s+/);
  if (words.length > 4) return false;
  return GREETINGS.some(g => n.includes(g.normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
}

function detectTopics(question) {
  const n = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const matched = [];

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    for (const kw of keywords) {
      if (n.includes(kw.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) {
        matched.push(topic);
        break;
      }
    }
  }

  return matched;
}

function isGeneralQuestion(question) {
  const n = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const generalWords = ['estado', 'general', 'resumen', 'sistema', 'salud', 'health', 'panorama', 'overview', 'qasl', 'revisa', 'como esta', 'como va', 'que pasa', 'todo bien', 'reporte', 'informe', 'completo', 'dashboard', 'metricas', 'todo', 'analisis', 'analiza', 'analizar'];
  return generalWords.some(w => n.includes(w.normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
}

// =============================================================================
// FORMATEAR RESULTADO
// =============================================================================

function formatMetricResult(label, data) {
  const lines = data.map(d => {
    const tags = Object.entries(d.metric || {})
      .filter(([k]) => !['__name__', 'instance', 'job', 'environment', 'project'].includes(k))
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    return `  ${tags || 'global'}: ${d.value}`;
  }).join('\n');
  return `${label}:\n${lines}`;
}

// =============================================================================
// CONTEXTO - SIEMPRE trae CORE_METRICS + extras por tema
// =============================================================================

async function getMetricsContext(question) {
  if (isGreeting(question)) {
    return { category: 'saludo', data: [], raw: '' };
  }

  const topics = detectTopics(question);
  const general = isGeneralQuestion(question);
  const parts = [];
  const queried = new Set();

  // SIEMPRE consultar CORE_METRICS (tiene todo lo importante del dashboard)
  console.log(`[INGRID] Consultando métricas core para: "${question}" (topics: ${topics.join(', ') || 'general'})`);
  const startTime = Date.now();

  for (const q of CORE_METRICS) {
    if (queried.has(q.expr)) continue;
    queried.add(q.expr);
    const data = await queryPrometheus(q.expr);
    if (data.length > 0) {
      parts.push(formatMetricResult(q.label, data));
    }
  }

  // Si hay temas específicos O es pregunta general, agregar extras relevantes
  const topicsToQuery = general ? Object.keys(EXTRA_METRICS) : topics;
  for (const topic of topicsToQuery) {
    const extras = EXTRA_METRICS[topic] || [];
    for (const q of extras) {
      if (queried.has(q.expr)) continue;
      queried.add(q.expr);
      const data = await queryPrometheus(q.expr);
      if (data.length > 0) {
        parts.push(formatMetricResult(q.label, data));
      }
    }
  }

  const elapsed = Date.now() - startTime;
  console.log(`[INGRID] ${parts.length} métricas obtenidas en ${elapsed}ms (${queried.size} queries)`);

  if (parts.length === 0) {
    parts.push('No se encontraron datos en Prometheus.');
  }

  return {
    category: topics.length > 0 ? topics[0] : 'general',
    data: [],
    raw: parts.join('\n\n'),
  };
}

export { getMetricsContext, detectTopics, queryPrometheus };
