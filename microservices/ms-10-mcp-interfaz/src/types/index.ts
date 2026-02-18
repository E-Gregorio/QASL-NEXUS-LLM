// ============================================================
// MS-10: MCP Interfaz - Tipos
// ============================================================

export type ExternalTool = 'jira' | 'xray' | 'testrail' | 'azure_devops' | 'qtest';

export interface ConnectorConfig {
  tool: ExternalTool;
  baseUrl: string;
  auth: {
    type: 'basic' | 'bearer' | 'pat';
    credentials: string;
  };
  projectKey: string;
  enabled: boolean;
}

// Evento que dispara creacion de bug
export interface TestFailureEvent {
  tc_id: string;
  ts_id: string;
  us_id: string;
  titulo_tc: string;
  resultado_esperado: string;
  resultado_real: string;
  pasos: string[];
  modulo: string;
  ambiente: string;
  source_ms: string;      // ms-03, ms-04, ms-06
  evidencia?: string;
  pipeline_id?: string;
}

// Issue creado en herramienta externa
export interface ExternalIssue {
  tool: ExternalTool;
  key: string;             // AGIP-1234
  url: string;             // https://jira.company.com/browse/AGIP-1234
  status: string;
}

// Trazabilidad de MS-12
export interface TraceabilityData {
  epic_id: string;
  epic_nombre: string;
  us_id: string;
  nombre_hu: string;
  ts_id: string;
  nombre_suite: string;
  tc_id: string;
  titulo_tc: string;
}

// Bug listo para enviar a herramienta externa
export interface BugPayload {
  titulo: string;
  resumen: string;
  modulo_afectado: string;
  pasos_reproducir: string;
  resultado_esperado: string;
  resultado_real: string;
  severidad: string;
  prioridad: string;
  clasificacion: string;
  trazabilidad: TraceabilityData;
  evidencia?: string;
  accion_correctiva?: string;
}

// Formato Jira
export interface JiraIssuePayload {
  fields: {
    project: { key: string };
    summary: string;
    description: string;
    issuetype: { name: string };
    priority: { name: string };
    labels: string[];
    [key: string]: any;
  };
}

// Formato X-Ray Test Execution
export interface XRayExecutionPayload {
  testExecKey: string;
  tests: {
    testKey: string;
    status: 'PASS' | 'FAIL' | 'TODO' | 'EXECUTING';
    comment?: string;
    defects?: string[];
  }[];
}

// Formato TestRail
export interface TestRailResultPayload {
  status_id: number;       // 1=Passed, 5=Failed
  comment: string;
  defects?: string;
  elapsed?: string;
}

// Formato Azure DevOps Work Item
export interface AzureDevOpsPayload {
  op: string;
  path: string;
  value: string;
}
