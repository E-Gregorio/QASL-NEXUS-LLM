// ============================================================
// MS-09: Orquestador LLM - Tipos
// ============================================================

export type LLMProvider = 'claude' | 'openai' | 'gemini';

export type TaskType =
  | 'gap_analysis'        // MS-02: Analizar gaps en HUs
  | 'vcr_calculation'     // VCR: Calcular Valor + Costo + Riesgo
  | 'template_fill'       // MS-10: Llenar templates con IA
  | 'test_generation'     // MS-05: Generar test cases
  | 'screenshot_analysis' // MS-04: Analizar screenshots (Vision)
  | 'field_mapping'       // MS-10: Mapear campos TC -> Jira
  | 'bug_description'     // MS-10: Generar descripcion de bug
  | 'test_data_gen';      // Generar datos de prueba

export interface LLMRequest {
  taskType: TaskType;
  prompt: string;
  context?: string;
  preferredProvider?: LLMProvider;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  provider: LLMProvider;
  model: string;
  content: string;
  tokensUsed: number;
  durationMs: number;
  taskType: TaskType;
}

export interface VCRInput {
  us_id: string;
  tc_id?: string;
  nombre_hu: string;
  criterios_aceptacion: string;
  reglas_negocio: string;
  prioridad: string;
}

export interface VCRResult {
  us_id: string;
  tc_id?: string;
  vcr_valor: number;
  vcr_costo: number;
  vcr_probabilidad: number;
  vcr_impacto: number;
  vcr_riesgo: number;
  vcr_total: number;
  decision: 'AUTOMATIZAR' | 'MANUAL';
  justificacion: string;
  calculado_por: LLMProvider;
}

export interface TemplateFillInput {
  templateHtml: string;
  context: Record<string, string>;
  taskType: 'bug_report' | 'test_plan' | 'test_case';
}

export interface DecisionRule {
  taskType: TaskType;
  provider: LLMProvider;
  model: string;
  reason: string;
}
