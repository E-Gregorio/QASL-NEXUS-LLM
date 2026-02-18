// ============================================================
// MS-09: Decision Engine - Reglas de seleccion de LLM
// Que LLM usar segun el tipo de tarea
// ============================================================

import { DecisionRule, TaskType } from '../types';

export const LLM_DECISION_RULES: Record<TaskType, DecisionRule> = {
  // Claude: Mejor razonamiento logico y analisis de codigo
  gap_analysis: {
    taskType: 'gap_analysis',
    provider: 'claude',
    model: 'claude-sonnet-4-5-20250929',
    reason: 'Claude tiene mejor razonamiento para detectar gaps logicos en requisitos'
  },

  vcr_calculation: {
    taskType: 'vcr_calculation',
    provider: 'claude',
    model: 'claude-sonnet-4-5-20250929',
    reason: 'Claude evalua mejor el riesgo y valor de negocio'
  },

  template_fill: {
    taskType: 'template_fill',
    provider: 'claude',
    model: 'claude-sonnet-4-5-20250929',
    reason: 'Claude genera mejor formato estructurado para templates'
  },

  bug_description: {
    taskType: 'bug_description',
    provider: 'claude',
    model: 'claude-sonnet-4-5-20250929',
    reason: 'Claude genera descripciones tecnicas precisas'
  },

  // OpenAI: Mejor creatividad y generacion de datos
  test_generation: {
    taskType: 'test_generation',
    provider: 'openai',
    model: 'gpt-4o',
    reason: 'GPT genera edge cases creativos y variaciones de test data'
  },

  test_data_gen: {
    taskType: 'test_data_gen',
    provider: 'openai',
    model: 'gpt-4o',
    reason: 'GPT genera datos de prueba realistas y variados'
  },

  field_mapping: {
    taskType: 'field_mapping',
    provider: 'openai',
    model: 'gpt-4o-mini',
    reason: 'Tarea simple de mapeo, modelo economico suficiente'
  },

  // Gemini: Capacidad multimodal (imagenes, screenshots)
  screenshot_analysis: {
    taskType: 'screenshot_analysis',
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    reason: 'Gemini tiene capacidades multimodales para analizar screenshots'
  }
};

export function getDecisionRule(taskType: TaskType): DecisionRule {
  return LLM_DECISION_RULES[taskType];
}
