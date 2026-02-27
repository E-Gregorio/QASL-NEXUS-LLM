// ============================================================
// MS-00: Tipos compartidos del frontend
// ============================================================

// Dashboard overview
export interface ExecutiveSummary {
  total_epics: number;
  total_user_stories: number;
  total_suites: number;
  total_test_cases: number;
  tcs_automatizados: number;
  total_defectos: number;
  defectos_abiertos: number;
  bloqueantes_activos: number;
  gaps_pendientes: number;
  vcr_promedio: number;
  pipelines_exitosos: number;
  pipelines_fallidos: number;
}

export interface PipelineMetric {
  pipeline_id: string;
  tipo: string;
  trigger_type: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  duracion_seg: number | null;
  total_tc_ejecutados: number;
  total_passed: number;
  total_failed: number;
  pass_rate: number;
  bugs_creados: number;
  fases_ejecutadas: Record<string, string>;
}

export interface DefectRow {
  source_ms: string;
  type: string;
  severidad: string;
  estado: string;
  total: number;
}

export interface CoverageRow {
  epic_id: string;
  id_hu: string;
  nombre_hu: string;
  prioridad: string;
  total_tcs: number;
  tcs_automatizados: number;
  total_suites: number;
  pct_automatizado: number;
}

export interface DashboardOverview {
  summary: ExecutiveSummary;
  recentPipelines: PipelineMetric[];
  defects: DefectRow[];
  coverage: CoverageRow[];
}

// Pipeline status
export interface PipelineStatus {
  pipeline_id: string;
  status: string;
  tipo: string;
  estado: string;
  inicio: string;
  fin: string | null;
  pass_rate: number | null;
  fases: Record<string, string>;
}

// Health check
export interface HealthStatus {
  service: string;
  status: string;
  microservices: Record<string, string>;
  timestamp: string;
}

// Traceability
export interface TraceabilityRow {
  epic_id: string;
  epic_nombre: string;
  id_hu: string;
  nombre_hu: string;
  us_vcr: number;
  ts_id: string;
  nombre_suite: string;
  suite_categoria: string;
  tc_id: string;
  titulo_tc: string;
  tipo_prueba: string;
  automated: boolean;
  cobertura_br: string;
  cobertura_escenario: string;
}

// Gap
export interface GapRow {
  us_id: string;
  nombre_hu: string;
  gap_tipo: string;
  descripcion: string;
  severidad: string;
  br_afectada: string;
  escenario_afectado: string;
  sugerencia: string;
  detectado_por: string;
  created_at: string;
}

// Tech debt
export interface TechDebtRow {
  us_id: string;
  nombre_hu: string;
  tc_id: string;
  titulo_tc: string;
  vcr_total: number;
  decision: string;
  automated: boolean;
  estado: string;
}
