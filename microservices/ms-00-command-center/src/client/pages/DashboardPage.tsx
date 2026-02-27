import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { MetricCard } from '../components/ui/MetricCard';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export function DashboardPage() {
  const { data, loading, error } = useDashboardData();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 text-lg animate-pulse">Cargando dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card>
          <div className="text-red-400 text-center">
            <div className="text-lg font-semibold mb-2">Error de conexion</div>
            <div className="text-sm text-gray-500">{error}</div>
            <div className="text-xs text-gray-600 mt-2">Verifica que MS-12 (PostgreSQL) este corriendo</div>
          </div>
        </Card>
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Vista general de QASL NEXUS LLM</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-6">
        <MetricCard
          label="Pipelines"
          value={`${s?.pipelines_exitosos ?? 0}`}
          subtitle={`${s?.pipelines_fallidos ?? 0} fallidos`}
          color="blue"
        />
        <MetricCard
          label="Test Cases"
          value={s?.total_test_cases ?? 0}
          subtitle={`${s?.tcs_automatizados ?? 0} automatizados`}
          color="green"
        />
        <MetricCard
          label="Defectos Abiertos"
          value={s?.defectos_abiertos ?? 0}
          subtitle={`${s?.bloqueantes_activos ?? 0} bloqueantes`}
          color="red"
        />
        <MetricCard
          label="VCR Promedio"
          value={s?.vcr_promedio != null ? Number(s.vcr_promedio).toFixed(1) : '0'}
          subtitle={`${s?.gaps_pendientes ?? 0} gaps pendientes`}
          color="purple"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/new-hu')}
          className="bg-surface-card border border-surface-border rounded-xl p-6 text-left hover:border-blue-500/50 hover:bg-surface-hover transition-all group"
        >
          <div className="text-blue-400 text-lg font-semibold group-hover:text-blue-300">Nueva Historia de Usuario</div>
          <div className="text-gray-500 text-sm mt-1">Subir .docx para analisis shift-left</div>
        </button>
        <button
          onClick={() => navigate('/existing')}
          className="bg-surface-card border border-surface-border rounded-xl p-6 text-left hover:border-green-500/50 hover:bg-surface-hover transition-all group"
        >
          <div className="text-green-400 text-lg font-semibold group-hover:text-green-300">Proyecto Existente</div>
          <div className="text-gray-500 text-sm mt-1">Regression, smoke, security, mobile</div>
        </button>
        <button
          onClick={() => navigate('/exploratory')}
          className="bg-surface-card border border-surface-border rounded-xl p-6 text-left hover:border-purple-500/50 hover:bg-surface-hover transition-all group"
        >
          <div className="text-purple-400 text-lg font-semibold group-hover:text-purple-300">Exploratory AI</div>
          <div className="text-gray-500 text-sm mt-1">INGRID analiza tu app con IA</div>
        </button>
      </div>

      {/* Recent Pipelines */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Pipelines Recientes</h2>
          <button
            onClick={() => navigate('/pipeline')}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Ver todos
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-left border-b border-surface-border">
                <th className="pb-3 font-medium">Pipeline ID</th>
                <th className="pb-3 font-medium">Tipo</th>
                <th className="pb-3 font-medium">Estado</th>
                <th className="pb-3 font-medium">Tests</th>
                <th className="pb-3 font-medium">Pass Rate</th>
                <th className="pb-3 font-medium">Bugs</th>
                <th className="pb-3 font-medium">Duracion</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentPipelines && data.recentPipelines.length > 0 ? (
                data.recentPipelines.map((p) => (
                  <tr key={p.pipeline_id} className="border-b border-surface-border/50 hover:bg-surface-hover/50">
                    <td className="py-3 font-mono text-blue-400 text-xs">{p.pipeline_id}</td>
                    <td className="py-3">
                      <Badge variant="info">{(p.tipo || '').toUpperCase()}</Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant={
                        p.estado === 'Success' ? 'success' :
                        p.estado === 'Failed' ? 'failed' :
                        p.estado === 'Running' ? 'running' : 'pending'
                      }>
                        {p.estado}
                      </Badge>
                    </td>
                    <td className="py-3 text-gray-400">{p.total_tc_ejecutados}</td>
                    <td className="py-3">
                      <span className={p.pass_rate >= 80 ? 'text-green-400' : p.pass_rate >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                        {p.pass_rate != null ? `${Number(p.pass_rate).toFixed(1)}%` : '-'}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400">{p.bugs_creados}</td>
                    <td className="py-3 text-gray-500">
                      {p.duracion_seg != null ? `${Math.round(p.duracion_seg)}s` : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-600">
                    No hay pipelines ejecutados. Inicia uno desde "Nueva HU" o "Proyecto Existente".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
