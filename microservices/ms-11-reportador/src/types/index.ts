// ============================================================
// MS-11: Reportador Multi-Canal - Tipos
// ============================================================

export type ReportType = 'executive' | 'technical' | 'weekly' | 'pipeline' | 'ieee_29119';
export type ReportFormat = 'pdf' | 'html' | 'excel' | 'markdown';
export type NotificationChannel = 'email' | 'slack' | 'teams';

export interface ReportRequest {
  type: ReportType;
  format: ReportFormat;
  dateFrom?: string;
  dateTo?: string;
  pipelineId?: string;
  recipients?: string[];
  channels?: NotificationChannel[];
}

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

export interface TestExecutionMetrics {
  total_executed: number;
  passed: number;
  failed: number;
  skipped: number;
  blocked: number;
  pass_rate: number;
  by_source: Record<string, { passed: number; failed: number; total: number }>;
}

export interface DefectMetrics {
  total: number;
  by_severity: Record<string, number>;
  by_status: Record<string, number>;
  by_classification: Record<string, number>;
  by_source: Record<string, number>;
  mttr_hours: number;  // Mean Time To Resolve
}

export interface GeneratedReport {
  id: number;
  type: ReportType;
  format: ReportFormat;
  nombre: string;
  ruta_archivo: string;
  created_at: string;
}

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: any[];
}

export interface TeamsMessage {
  title: string;
  text: string;
  themeColor: string;
  sections: any[];
}
