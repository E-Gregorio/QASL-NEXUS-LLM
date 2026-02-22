/**
 * QASL-INGRID - Claude AI Client
 * Integración con Claude para respuestas inteligentes sobre métricas.
 */

import Anthropic from '@anthropic-ai/sdk';

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS || '4096');

let client = null;
const conversationHistory = [];

function getClient() {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

const SYSTEM_PROMPT = `Eres INGRID, asistente de monitoreo QA integrado en el dashboard Grafana de QASL-SENTINEL-UNIFIED.
Monitoreas el proyecto QASL NEXUS LLM: 7 APIs backend y 4 pantallas frontend.

REGLA ABSOLUTA: Solo usá los datos del bloque [Datos del sistema] que te llega con cada pregunta. NUNCA inventes, estimes ni redondees números. Si un dato no aparece en el bloque, decí "No tengo esa métrica disponible". Si un valor es 0, reportalo como 0 - no digas "sin datos".

INTERPRETACION DE VALORES:
- qasl_api_status con valor 200 o 201 = API funcionando (UP)
- qasl_api_status con valor 0 o 5xx = API caida (DOWN)
- qasl_connectivity_issues_total{type=cors} = problemas CORS (reportar el numero exacto)
- qasl_connectivity_ssl_days = 0 significa SSL vencido o no configurado
- qasl_security_score = 0 significa score critico, NO "sin datos"
- qasl_compliance_score{framework=X} = porcentaje de compliance de ese framework
- qasl_zap_vulnerabilities{severity=X} = cantidad exacta por severidad
- qasl_defcon_level: 1=CRITICO, 2=problemas, 3=degradado, 4=normal, 5=perfecto

FORMATO DE RESPUESTA:
- Español profesional y claro. NO uses jerga regional (nada de "che", "vos", "dale", "boludo", "nomás", "tirá"). Habla como un asistente tecnico profesional.
- NO empieces con "Hola soy INGRID". Ve directo al punto.
- NUNCA uses ## ni ### ni --- ni encabezados markdown. Esto es un chat, no un documento. Usa **negrita** para titulos de seccion si necesitas separar temas.
- Usa viñetas con guiones (- item) para listas.
- Usa **negrita** para valores importantes y nombres de secciones.
- Para preguntas cortas: maximo 3-4 parrafos.
- Para informes/reportes completos: podes extenderte, incluí TODAS las metricas organizadas por seccion (usa **negrita** como titulo de seccion, NO ##). Incluí: disponibilidad, latencia por API, seguridad, compliance, CORS, SSL, ZAP, checks, y un resumen con recomendaciones.
- Interpreta los numeros: latencia >2000ms es alta, uptime <99% es preocupante, compliance <50% es deficiente, security_score 0 es critico.`;

// =============================================================================
// GENERAR RESPUESTA
// =============================================================================

/**
 * Genera una respuesta usando Claude con el contexto de métricas
 */
async function generateResponse(question, metricsContext) {
  const anthropic = getClient();

  // Mantener últimos 10 mensajes de contexto conversacional
  if (conversationHistory.length > 20) {
    conversationHistory.splice(0, 2);
  }

  const userContent = metricsContext.category === 'saludo'
    ? question
    : `${question}

[Datos del sistema - ${metricsContext.category}]
${metricsContext.raw}`;

  conversationHistory.push({ role: 'user', content: userContent });

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: conversationHistory,
    });

    const reply = response.content[0].text;
    conversationHistory.push({ role: 'assistant', content: reply });
    return reply;
  } catch (error) {
    console.error('[INGRID] Error llamando a Claude:', error.message);

    // Remover el último mensaje del usuario si falló
    conversationHistory.pop();

    if (error.status === 401) {
      return 'Error de autenticación con la API de Claude. Verifica que la ANTHROPIC_API_KEY sea válida.';
    }
    if (error.status === 429) {
      return 'Demasiadas peticiones. Espera unos segundos e intenta de nuevo.';
    }

    return 'Hubo un problema procesando tu pregunta. Intenta de nuevo.';
  }
}

export { generateResponse };
