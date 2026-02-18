// ============================================================
// MS-09: Decision Engine
// Decide que LLM usar segun el tipo de tarea
// ============================================================

import { LLMRequest, LLMResponse, TaskType, LLMProvider } from '../types';
import { getDecisionRule } from '../config/llm-rules';
import { callLLM } from './llm-providers';

export class DecisionEngine {

  /**
   * Procesa una solicitud de IA:
   * 1. Determina que LLM usar (segun reglas o preferencia)
   * 2. Construye el prompt con contexto
   * 3. Llama al LLM
   * 4. Retorna respuesta
   */
  async process(request: LLMRequest): Promise<LLMResponse> {
    // Determinar proveedor
    const rule = getDecisionRule(request.taskType);
    const provider = request.preferredProvider || rule.provider;
    const model = this.getModel(provider, request.taskType);

    console.log(`[Decision Engine] Tarea: ${request.taskType} → ${provider} (${model})`);
    console.log(`[Decision Engine] Razon: ${rule.reason}`);

    // Construir prompt con contexto
    const fullPrompt = this.buildPrompt(request);

    // Llamar al LLM
    const response = await callLLM(
      provider,
      model,
      fullPrompt,
      request.taskType,
      request.maxTokens,
      request.temperature
    );

    console.log(`[Decision Engine] Completado en ${response.durationMs}ms (${response.tokensUsed} tokens)`);

    return response;
  }

  /**
   * Obtiene el modelo correcto segun proveedor y tarea
   */
  private getModel(provider: LLMProvider, taskType: TaskType): string {
    const rule = getDecisionRule(taskType);

    // Si el proveedor preferido coincide con la regla, usar ese modelo
    if (provider === rule.provider) {
      return rule.model;
    }

    // Si el usuario forzo otro proveedor, usar modelo default de ese proveedor
    const defaults: Record<LLMProvider, string> = {
      claude: 'claude-sonnet-4-5-20250929',
      openai: 'gpt-4o',
      gemini: 'gemini-2.0-flash',
    };

    return defaults[provider];
  }

  /**
   * Construye el prompt completo con contexto del sistema
   */
  private buildPrompt(request: LLMRequest): string {
    const systemContext = this.getSystemContext(request.taskType);
    let prompt = systemContext + '\n\n';

    if (request.context) {
      prompt += `CONTEXTO:\n${request.context}\n\n`;
    }

    prompt += `TAREA:\n${request.prompt}`;
    return prompt;
  }

  /**
   * Contexto del sistema segun tipo de tarea
   */
  private getSystemContext(taskType: TaskType): string {
    const contexts: Record<TaskType, string> = {
      gap_analysis:
        'Eres un analista QA senior especializado en revision de requisitos. ' +
        'Sigues ISTQB v4.0 e IEEE 829. Detectas gaps en historias de usuario: ' +
        'escenarios faltantes, casos negativos ausentes, ambiguedades e incongruencias.',

      vcr_calculation:
        'Eres un experto en priorizacion de pruebas usando la metodologia VCR. ' +
        'Calculas: Valor (1-3), Costo (1-3), Probabilidad (1-4), Impacto (1-4). ' +
        'Riesgo = Probabilidad x Impacto. VCR Total = Valor + Costo + Riesgo. ' +
        'Si VCR >= 9: AUTOMATIZAR. Si VCR < 9: MANUAL.',

      template_fill:
        'Eres un asistente QA que completa plantillas de documentacion. ' +
        'Llenas campos con informacion precisa basada en el contexto proporcionado. ' +
        'Respetas el formato IEEE 829 y ISTQB v4.0.',

      test_generation:
        'Eres un disenador de test cases experto. Generas casos de prueba ' +
        'con cobertura 100% de reglas de negocio y escenarios. ' +
        'Cada BR tiene minimo 1 TC positivo y 1 TC negativo.',

      screenshot_analysis:
        'Eres un analista UX/QA que evalua screenshots de aplicaciones. ' +
        'Detectas problemas de usabilidad, alineacion, consistencia visual, ' +
        'accesibilidad y cumplimiento de design system.',

      field_mapping:
        'Eres un integrador que mapea campos entre sistemas. ' +
        'Transformas datos de test cases a formato compatible con Jira, X-Ray, TestRail.',

      bug_description:
        'Eres un QA senior que redacta informes de defecto. ' +
        'Sigues la plantilla ISTQB/IEEE 829: pasos de reproduccion, ' +
        'resultado esperado vs real, severidad, prioridad, trazabilidad.',

      test_data_gen:
        'Eres un generador de datos de prueba. Creas datos realistas, ' +
        'variados y que cubren: valores positivos, negativos, limites, nulos y especiales.',
    };

    return contexts[taskType];
  }
}
