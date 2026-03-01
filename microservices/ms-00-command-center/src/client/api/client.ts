// ============================================================
// MS-00: API Client (fetch wrapper)
// Todas las llamadas van a /api/* (proxy en dev, Express en prod)
// ============================================================

const BASE = '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Dashboard (BFF directo a MS-12)
  getDashboardOverview: () => request<any>('/api/dashboard/overview'),
  getTraceability: () => request<any[]>('/api/dashboard/traceability'),
  getGaps: () => request<any[]>('/api/dashboard/gaps'),
  getTechDebt: () => request<any[]>('/api/dashboard/debt'),
  getPassRate: () => request<any[]>('/api/dashboard/pass-rate'),

  // Pipeline (proxy a MS-08)
  runPipeline: (body: { type: string; triggerType?: string; triggeredBy?: string; targetUrl?: string; objective?: string; importedCode?: string }) =>
    request<any>('/api/proxy/pipeline/run', { method: 'POST', body: JSON.stringify(body) }),
  getPipelineStatus: (id: string) => request<any>(`/api/proxy/pipeline/status/${id}`),
  getPipelineHistory: (limit = 20) => request<any>(`/api/proxy/pipeline/history?limit=${limit}`),
  getHealth: () => request<any>('/api/proxy/pipeline/health'),

  // LLM (proxy a MS-09)
  processLLM: (body: any) =>
    request<any>('/api/proxy/llm/process', { method: 'POST', body: JSON.stringify(body) }),
  getLLMHealth: () => request<any>('/api/proxy/llm/health'),
  getLLMRules: () => request<any>('/api/proxy/llm/rules'),

  // MCP (proxy a MS-10)
  createBug: (body: any) =>
    request<any>('/api/proxy/mcp/bug/create', { method: 'POST', body: JSON.stringify(body) }),
  getConnectorsStatus: () => request<any>('/api/proxy/mcp/connectors/status'),

  // Reportador (proxy a MS-11)
  generateReport: (body?: any) =>
    request<any>('/api/proxy/report/executive', { method: 'POST', body: JSON.stringify(body || {}) }),
  generatePipelinePDF: (pipelineId: string) =>
    request<any>('/api/proxy/report/pipeline-pdf', { method: 'POST', body: JSON.stringify({ pipelineId }) }),
  resendNotification: (pipelineId: string) =>
    request<any>('/api/proxy/report/resend-notification', { method: 'POST', body: JSON.stringify({ pipelineId }) }),
  getReportSummary: () => request<any>('/api/proxy/report/summary'),

  // Clean results (proxy a MS-08)
  cleanResults: () =>
    request<any>('/api/proxy/pipeline/clean-results', { method: 'DELETE' }),
};
