import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { MetricCard } from '../components/ui/MetricCard';
import { api } from '../api/client';

export function ResultsPage() {
  const [searchParams] = useSearchParams();
  const pipelineId = searchParams.get('id');
  const [data, setData] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [pipelineData, reportSummary] = await Promise.all([
          pipelineId ? api.getPipelineStatus(pipelineId) : null,
          api.getDashboardOverview(),
        ]);
        setData(pipelineData);
        setSummary(reportSummary);
      } catch {
        // Fallback to dashboard data only
        try {
          const reportSummary = await api.getDashboardOverview();
          setSummary(reportSummary);
        } catch { /* silent */ }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [pipelineId]);

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      await api.generateReport({ pipelineId });
      alert('PDF generado exitosamente');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 text-lg animate-pulse">Cargando resultados...</div>
      </div>
    );
  }

  const totalTests = data?.total_tc_ejecutados ?? summary?.summary?.total_test_cases ?? 0;
  const passed = data?.total_passed ?? 0;
  const failed = data?.total_failed ?? 0;
  const skipped = totalTests - passed - failed;
  const passRate = totalTests > 0 ? ((passed / totalTests) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Resultados</h1>
        <p className="text-gray-500 text-sm mt-1">
          {pipelineId
            ? <span>Pipeline <span className="font-mono text-blue-400">{pipelineId}</span></span>
            : 'Resumen general del proyecto'
          }
        </p>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-5 gap-4">
        <MetricCard label="Total Tests" value={totalTests} color="blue" />
        <MetricCard label="Passed" value={passed} color="green" />
        <MetricCard label="Failed" value={failed} color="red" />
        <MetricCard label="Skipped" value={skipped} color="purple" />
        <MetricCard label="Pass Rate" value={`${passRate}%`} color={Number(passRate) >= 80 ? 'green' : 'red'} />
      </div>

      {/* Defects */}
      <Card>
        <h2 className="text-lg font-semibold text-white mb-4">Defectos Detectados</h2>
        {summary?.defects && summary.defects.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-left border-b border-surface-border">
                  <th className="pb-3 font-medium">Fuente</th>
                  <th className="pb-3 font-medium">Tipo</th>
                  <th className="pb-3 font-medium">Severidad</th>
                  <th className="pb-3 font-medium">Estado</th>
                  <th className="pb-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {summary.defects.map((d: any, i: number) => (
                  <tr key={i} className="border-b border-surface-border/50">
                    <td className="py-2 font-mono text-xs text-blue-400">{d.source_ms}</td>
                    <td className="py-2 text-gray-400">{d.type}</td>
                    <td className="py-2">
                      <Badge variant={
                        d.severidad === 'Bloqueante' ? 'failed' :
                        d.severidad === 'Alta' ? 'warning' : 'info'
                      }>
                        {d.severidad}
                      </Badge>
                    </td>
                    <td className="py-2">
                      <Badge variant={d.estado === 'Cerrado' ? 'success' : 'pending'}>
                        {d.estado}
                      </Badge>
                    </td>
                    <td className="py-2 text-gray-400 font-semibold">{d.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-600">No se encontraron defectos</div>
        )}
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-4 gap-4">
        <button
          onClick={handleGeneratePDF}
          disabled={generating}
          className="bg-surface-card border border-surface-border rounded-xl p-4 text-center hover:border-blue-500/50 hover:bg-surface-hover transition disabled:opacity-50"
        >
          <div className="text-blue-400 font-semibold">{generating ? 'Generando...' : 'Descargar PDF'}</div>
          <div className="text-xs text-gray-500 mt-1">Reporte ejecutivo 5 paginas</div>
        </button>
        <button className="bg-surface-card border border-surface-border rounded-xl p-4 text-center hover:border-green-500/50 hover:bg-surface-hover transition">
          <div className="text-green-400 font-semibold">Grafana</div>
          <div className="text-xs text-gray-500 mt-1">Dashboards en tiempo real</div>
        </button>
        <button className="bg-surface-card border border-surface-border rounded-xl p-4 text-center hover:border-purple-500/50 hover:bg-surface-hover transition">
          <div className="text-purple-400 font-semibold">Trazabilidad</div>
          <div className="text-xs text-gray-500 mt-1">Epic → US → Suite → TC</div>
        </button>
        <button className="bg-surface-card border border-surface-border rounded-xl p-4 text-center hover:border-yellow-500/50 hover:bg-surface-hover transition">
          <div className="text-yellow-400 font-semibold">Notificaciones</div>
          <div className="text-xs text-gray-500 mt-1">Slack + Teams + Email</div>
        </button>
      </div>
    </div>
  );
}
