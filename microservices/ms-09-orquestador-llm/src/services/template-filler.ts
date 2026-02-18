// ============================================================
// MS-09: Template Filler
// Llena plantillas de MS-01 con contenido generado por IA
// Usado por MS-10 (MCP) para crear bugs en Jira
// ============================================================

import { TemplateFillInput } from '../types';
import { DecisionEngine } from './decision-engine';

const engine = new DecisionEngine();

export class TemplateFiller {

  /**
   * Llena una plantilla de bug report con contexto del fallo
   */
  async fillBugReport(context: {
    tc_id: string;
    titulo_tc: string;
    resultado_esperado: string;
    resultado_real: string;
    pasos: string[];
    us_id: string;
    modulo: string;
    ambiente: string;
  }): Promise<string> {
    const prompt = `Genera un informe de defecto completo en formato JSON con estos campos:
{
  "titulo": "<titulo descriptivo del bug>",
  "resumen": "<descripcion breve>",
  "modulo_afectado": "${context.modulo}",
  "pasos_reproducir": "<pasos numerados>",
  "resultado_esperado": "${context.resultado_esperado}",
  "resultado_real": "${context.resultado_real}",
  "severidad": "<Bloqueante/Alta/Media/Baja>",
  "prioridad": "<P1/P2/P3/P4>",
  "clasificacion": "<Funcional/Interfaz/Rendimiento/Seguridad/Datos>",
  "accion_correctiva": "<sugerencia de fix>"
}

Basado en este contexto:
- Test Case: ${context.tc_id} - ${context.titulo_tc}
- User Story: ${context.us_id}
- Pasos ejecutados: ${context.pasos.join(' | ')}
- Ambiente: ${context.ambiente}`;

    const response = await engine.process({
      taskType: 'bug_description',
      prompt,
      temperature: 0.2,
    });

    return response.content;
  }

  /**
   * Llena una plantilla generica con contexto
   */
  async fillTemplate(input: TemplateFillInput): Promise<string> {
    const contextStr = Object.entries(input.context)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const prompt = `Completa la siguiente plantilla de ${input.taskType} con la informacion proporcionada.
Mantiene el formato exacto de la plantilla, solo llena los campos vacios.

PLANTILLA:
${input.templateHtml}

DATOS DISPONIBLES:
${contextStr}

Retorna la plantilla completada.`;

    const response = await engine.process({
      taskType: 'template_fill',
      prompt,
      temperature: 0.1,
    });

    return response.content;
  }
}
