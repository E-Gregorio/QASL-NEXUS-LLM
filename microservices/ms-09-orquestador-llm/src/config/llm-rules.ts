// ============================================================
// MS-09: Decision Engine - Reglas de seleccion de LLM
// Que LLM usar segun el tipo de tarea
// ============================================================

import { DecisionRule, TaskType } from '../types';

export const LLM_DECISION_RULES: Record<TaskType, DecisionRule> = {
  // ── OPUS: Tareas criticas que requieren razonamiento profundo ──
  gap_analysis: {
    taskType: 'gap_analysis',
    provider: 'claude',
    model: 'claude-opus-4-6',
    reason: 'Opus: razonamiento profundo para detectar gaps que otros modelos no ven'
  },

  vcr_calculation: {
    taskType: 'vcr_calculation',
    provider: 'claude',
    model: 'claude-opus-4-6',
    reason: 'Opus: evaluacion precisa de riesgo/valor de negocio, un VCR mal calculado es costoso'
  },

  test_generation: {
    taskType: 'test_generation',
    provider: 'claude',
    model: 'claude-opus-4-6',
    reason: 'Opus: cobertura exhaustiva de edge cases y escenarios criticos'
  },

  // ── SONNET: Tareas estructuradas donde velocidad > profundidad ──
  bug_description: {
    taskType: 'bug_description',
    provider: 'claude',
    model: 'claude-sonnet-4-5-20250929',
    reason: 'Sonnet: redaccion tecnica precisa, no requiere razonamiento profundo'
  },

  template_fill: {
    taskType: 'template_fill',
    provider: 'claude',
    model: 'claude-sonnet-4-5-20250929',
    reason: 'Sonnet: tarea mecanica de llenar campos estructurados'
  },

  test_data_gen: {
    taskType: 'test_data_gen',
    provider: 'claude',
    model: 'claude-sonnet-4-5-20250929',
    reason: 'Sonnet: generacion de datos variados, no necesita razonamiento complejo'
  },

  field_mapping: {
    taskType: 'field_mapping',
    provider: 'claude',
    model: 'claude-sonnet-4-5-20250929',
    reason: 'Sonnet: mapeo simple de campos entre sistemas'
  },

  // ── GEMINI: Vision multimodal (screenshots, UI) ──
  screenshot_analysis: {
    taskType: 'screenshot_analysis',
    provider: 'gemini',
    model: 'gemini-2.5-pro-preview-05-06',
    reason: 'Gemini 2.5 Pro: mejor vision multimodal para analisis de UI/screenshots'
  }
};

export function getDecisionRule(taskType: TaskType): DecisionRule {
  return LLM_DECISION_RULES[taskType];
}
