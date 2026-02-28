import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePipelinePolling } from '../hooks/usePipelinePolling';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';

// Pipeline phases with their microservices
// Incluye tanto flujo estatico (ms02/ms09_vcr) como exploratorio (ms09_generate)
const PHASES = [
  {
    name: 'Fase 1: Analisis',
    services: [
      { key: 'ms03_explore', label: 'MS-03 DOM Scanner', desc: 'Playwright escanea DOM completo de la URL' },
      { key: 'ms09_generate', label: 'MS-09 AI Test Generator', desc: 'Opus genera tests con selectores reales del DOM' },
      { key: 'ms02', label: 'MS-02 Static Analyzer', desc: 'Parsing HU + Gap Detection' },
      { key: 'ms09_vcr', label: 'MS-09 VCR Calculator', desc: 'Value + Cost + Risk' },
    ],
  },
  {
    name: 'Fase 2: Ejecucion',
    services: [
      { key: 'ms03_e2e', label: 'MS-03 E2E Tests', desc: 'Playwright + Allure Report' },
      { key: 'ms03_api', label: 'MS-03 API Tests', desc: 'Newman Collection Runner' },
      { key: 'ms03_k6', label: 'MS-03 Performance', desc: 'K6 Load Testing' },
      { key: 'ms03_zap', label: 'MS-03 Security', desc: 'OWASP ZAP Scanner' },
      { key: 'ms04', label: 'MS-04 QASL Mobile', desc: 'Maestro + MobSF Security' },
      { key: 'ms06', label: 'MS-06 Garak Security', desc: 'NVIDIA LLM Vulnerability Scan' },
    ],
  },
  {
    name: 'Fase 3: Reportes',
    services: [
      { key: 'ms11', label: 'MS-11 Reportador', desc: 'PDF + Slack + Teams + Email' },
      { key: 'ms10', label: 'MS-10 MCP Interfaz', desc: 'Jira Bug Creation' },
    ],
  },
];

function getServiceStatus(fases: Record<string, string> | undefined, key: string): string {
  if (!fases) return 'pending';
  return fases[key] || 'pending';
}

function statusToVariant(status: string): 'success' | 'running' | 'failed' | 'pending' {
  if (['ok', 'complete', 'completed', 'done', 'generated', 'pass', 'skip'].includes(status)) return 'success';
  if (['running', 'in_progress', 'generating'].includes(status)) return 'running';
  if (['error', 'failed', 'fail'].includes(status)) return 'failed';
  if (status === 'unreachable') return 'failed';
  return 'pending';
}

function statusToProgress(status: string): number {
  if (['ok', 'complete', 'completed', 'done', 'generated', 'pass'].includes(status)) return 100;
  if (['running', 'in_progress', 'generating'].includes(status)) return 60;
  if (['error', 'failed', 'fail', 'unreachable'].includes(status)) return 100;
  if (status === 'skip') return 100;
  return 0;
}

function statusToColor(status: string): 'green' | 'yellow' | 'red' | 'blue' {
  if (['ok', 'complete', 'completed', 'done', 'generated', 'pass'].includes(status)) return 'green';
  if (['running', 'in_progress', 'generating'].includes(status)) return 'yellow';
  if (['error', 'failed', 'fail'].includes(status)) return 'red';
  if (status === 'unreachable') return 'red';
  if (status === 'skip') return 'blue';
  return 'blue';
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    ok: 'DONE', complete: 'DONE', completed: 'DONE', done: 'DONE',
    generated: 'GENERATED', pass: 'PASS',
    running: 'RUNNING', in_progress: 'RUNNING', generating: 'GENERATING',
    error: 'ERROR', failed: 'FAILED', fail: 'FAILED',
    unreachable: 'OFFLINE', skip: 'SKIP', pending: 'PENDING',
  };
  return labels[status] || status.toUpperCase();
}

export function PipelineLivePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pipelineId = searchParams.get('id');
  const { data, loading, error, isComplete } = usePipelinePolling(pipelineId);
  const [elapsed, setElapsed] = useState(0);

  // Timer
  useEffect(() => {
    if (!pipelineId || isComplete) return;
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [pipelineId, isComplete]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // No pipeline selected
  if (!pipelineId) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Pipeline Live</h1>
          <p className="text-gray-500 text-sm mt-1">Monitoreo en tiempo real de pipelines</p>
        </div>
        <Card>
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">&#9889;</div>
            <div className="text-lg mb-2">No hay pipeline activo</div>
            <div className="text-sm">Inicia un pipeline desde "Nueva HU" o "Proyecto Existente"</div>
            <div className="flex gap-4 justify-center mt-6">
              <button
                onClick={() => navigate('/new-hu')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
              >
                Nueva HU
              </button>
              <button
                onClick={() => navigate('/existing')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
              >
                Proyecto Existente
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pipeline Live</h1>
          <p className="text-gray-500 text-sm mt-1">
            <span className="font-mono text-blue-400">{pipelineId}</span>
            {data?.tipo && <span className="ml-2">({data.tipo})</span>}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-2xl font-mono text-gray-400">{formatTime(elapsed)}</div>
          {data && (
            <Badge variant={
              data.estado === 'Success' ? 'success' :
              data.estado === 'Failed' ? 'failed' :
              data.estado === 'Running' ? 'running' : 'pending'
            }>
              {data.estado || 'Iniciando...'}
            </Badge>
          )}
        </div>
      </div>

      {loading && !data && (
        <Card>
          <div className="text-center py-8 text-gray-500 animate-pulse">Conectando al pipeline...</div>
        </Card>
      )}

      {error && (
        <Card>
          <div className="text-red-400 text-center py-4">{error}</div>
        </Card>
      )}

      {/* 3 Phases */}
      {PHASES.map((phase, phaseIdx) => (
        <Card key={phaseIdx}>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">{phase.name}</h3>
          <div className="space-y-4">
            {phase.services.map((svc) => {
              const status = getServiceStatus(data?.fases_ejecutadas, svc.key);
              return (
                <div key={svc.key} className="flex items-center gap-4">
                  <div className="w-48">
                    <div className="text-sm text-white font-medium">{svc.label}</div>
                    <div className="text-xs text-gray-500">{svc.desc}</div>
                  </div>
                  <div className="flex-1">
                    <ProgressBar
                      value={statusToProgress(status)}
                      color={statusToColor(status)}
                      size="md"
                      animated={status === 'running' || status === 'in_progress'}
                    />
                  </div>
                  <div className="w-28 text-right">
                    <Badge variant={statusToVariant(status)}>
                      {statusLabel(status)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      {/* Report buttons + Results action */}
      {isComplete && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Reportes Generados</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {getServiceStatus(data?.fases_ejecutadas, 'ms03_e2e') === 'pass' || getServiceStatus(data?.fases_ejecutadas, 'ms03_e2e') === 'fail' ? (
              <button
                onClick={() => window.open('http://localhost:6001/api/report/allure/index.html', '_blank')}
                className="flex items-center gap-2 px-4 py-3 bg-purple-600/20 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-600/30 transition text-sm font-medium"
              >
                <span className="text-lg">&#128202;</span> Allure E2E
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/50 border border-gray-700 text-gray-600 rounded-lg text-sm">
                <span className="text-lg">&#128202;</span> Allure E2E
              </div>
            )}

            {getServiceStatus(data?.fases_ejecutadas, 'ms03_api') === 'pass' || getServiceStatus(data?.fases_ejecutadas, 'ms03_api') === 'fail' ? (
              <button
                onClick={() => window.open(`http://localhost:6001/api/report/newman-view/${pipelineId}`, '_blank')}
                className="flex items-center gap-2 px-4 py-3 bg-orange-600/20 border border-orange-500/30 text-orange-300 rounded-lg hover:bg-orange-600/30 transition text-sm font-medium"
              >
                <span className="text-lg">&#128225;</span> Newman API
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/50 border border-gray-700 text-gray-600 rounded-lg text-sm">
                <span className="text-lg">&#128225;</span> Newman API
              </div>
            )}

            {getServiceStatus(data?.fases_ejecutadas, 'ms03_k6') === 'pass' || getServiceStatus(data?.fases_ejecutadas, 'ms03_k6') === 'fail' ? (
              <button
                onClick={() => window.open(`http://localhost:6001/api/report/k6-view/${pipelineId}`, '_blank')}
                className="flex items-center gap-2 px-4 py-3 bg-green-600/20 border border-green-500/30 text-green-300 rounded-lg hover:bg-green-600/30 transition text-sm font-medium"
              >
                <span className="text-lg">&#9889;</span> K6 Performance
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/50 border border-gray-700 text-gray-600 rounded-lg text-sm">
                <span className="text-lg">&#9889;</span> K6 Performance
              </div>
            )}

            {getServiceStatus(data?.fases_ejecutadas, 'ms03_zap') === 'pass' || getServiceStatus(data?.fases_ejecutadas, 'ms03_zap') === 'fail' ? (
              <button
                onClick={() => window.open(`http://localhost:6001/api/report/zap/zap-${pipelineId}.html`, '_blank')}
                className="flex items-center gap-2 px-4 py-3 bg-red-600/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-600/30 transition text-sm font-medium"
              >
                <span className="text-lg">&#128737;</span> ZAP Security
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/50 border border-gray-700 text-gray-600 rounded-lg text-sm">
                <span className="text-lg">&#128737;</span> ZAP Security
              </div>
            )}
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => navigate(`/results?id=${pipelineId}`)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Ver Resultados Detallados
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
