import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePipelinePolling } from '../hooks/usePipelinePolling';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';

// Pipeline phases with their microservices
const PHASES = [
  {
    name: 'Fase 1: Analisis',
    services: [
      { key: 'ms02', label: 'MS-02 Static Analyzer', desc: 'Parsing HU + Gap Detection' },
      { key: 'ms09_vcr', label: 'MS-09 VCR Calculator', desc: 'Value + Cost + Risk' },
    ],
  },
  {
    name: 'Fase 2: Ejecucion (Paralelo)',
    services: [
      { key: 'ms03', label: 'MS-03 QASL Framework', desc: 'Playwright + Newman + K6 + ZAP' },
      { key: 'ms04', label: 'MS-04 QASL Mobile', desc: 'Maestro + MobSF Security' },
      { key: 'ms05', label: 'MS-05 INGRID AI', desc: 'AI Test Generation (OWASP LLM)' },
      { key: 'ms06', label: 'MS-06 Garak Security', desc: 'NVIDIA LLM Vulnerability Scan' },
    ],
  },
  {
    name: 'Fase 3: Reportes',
    services: [
      { key: 'ms10', label: 'MS-10 MCP Interfaz', desc: 'Jira Bug Creation' },
      { key: 'ms11', label: 'MS-11 Reportador', desc: 'PDF + Slack + Teams + Email' },
      { key: 'ms07', label: 'MS-07 Sentinel', desc: 'Grafana Dashboards' },
    ],
  },
];

function getServiceStatus(fases: Record<string, string> | undefined, key: string): string {
  if (!fases) return 'pending';
  return fases[key] || 'pending';
}

function statusToVariant(status: string): 'success' | 'running' | 'failed' | 'pending' {
  if (status === 'ok' || status === 'complete' || status === 'done') return 'success';
  if (status === 'running' || status === 'in_progress') return 'running';
  if (status === 'error' || status === 'failed') return 'failed';
  return 'pending';
}

function statusToProgress(status: string): number {
  if (status === 'ok' || status === 'complete' || status === 'done') return 100;
  if (status === 'running' || status === 'in_progress') return 60;
  if (status === 'error' || status === 'failed') return 100;
  return 0;
}

function statusToColor(status: string): 'green' | 'yellow' | 'red' | 'blue' {
  if (status === 'ok' || status === 'complete' || status === 'done') return 'green';
  if (status === 'running' || status === 'in_progress') return 'yellow';
  if (status === 'error' || status === 'failed') return 'red';
  return 'blue';
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
                  <div className="w-24 text-right">
                    <Badge variant={statusToVariant(status)}>
                      {status === 'ok' ? 'DONE' : status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      {/* Results action */}
      {isComplete && (
        <div className="flex justify-center">
          <button
            onClick={() => navigate(`/results?id=${pipelineId}`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Ver Resultados
          </button>
        </div>
      )}
    </div>
  );
}
