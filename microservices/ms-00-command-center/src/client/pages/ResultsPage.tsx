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
  const [sending, setSending] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [traceData, setTraceData] = useState<any[]>([]);
  const [traceLoading, setTraceLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: string; message: string } | null>(null);

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

  // Mostrar notificacion temporal
  const showNotif = (type: string, message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Descargar PDF del pipeline
  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      if (pipelineId) {
        // PDF especifico del pipeline
        const result = await api.generatePipelinePDF(pipelineId);
        if (result.filename) {
          window.open(`/api/proxy/report/download/${result.filename}`, '_blank');
          showNotif('success', 'PDF del pipeline generado y descargado');
        }
      } else {
        // PDF ejecutivo general
        const result = await api.generateReport({});
        if (result.filename) {
          window.open(`/api/proxy/report/download/${result.filename}`, '_blank');
          showNotif('success', 'PDF ejecutivo generado y descargado');
        }
      }
    } catch (err: any) {
      showNotif('error', `Error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Re-enviar notificacion email
  const handleResendNotification = async () => {
    if (!pipelineId) {
      showNotif('error', 'Selecciona un pipeline para enviar notificacion');
      return;
    }
    setSending(true);
    try {
      const result = await api.resendNotification(pipelineId);
      showNotif('success', `Email enviado a ${result.sentTo}`);
    } catch (err: any) {
      showNotif('error', `Error: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  // Cargar y mostrar trazabilidad
  const handleShowTraceability = async () => {
    setShowTrace(true);
    setTraceLoading(true);
    try {
      const data = await api.getTraceability();
      setTraceData(data);
    } catch {
      setTraceData([]);
    } finally {
      setTraceLoading(false);
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

  // Agrupar trazabilidad en arbol: epic → us → suite → tc
  const traceTree = buildTraceTree(traceData);

  return (
    <div className="space-y-8">
      {/* Notificacion flotante */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          notification.type === 'success'
            ? 'bg-green-500/20 border border-green-500/50 text-green-400'
            : 'bg-red-500/20 border border-red-500/50 text-red-400'
        }`}>
          {notification.message}
        </div>
      )}

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

      {/* Actions — 5 botones funcionales */}
      <div className="grid grid-cols-5 gap-4">
        {/* 1. Descargar PDF */}
        <button
          onClick={handleGeneratePDF}
          disabled={generating}
          className="bg-surface-card border border-surface-border rounded-xl p-4 text-center hover:border-blue-500/50 hover:bg-surface-hover transition disabled:opacity-50"
        >
          <div className="text-blue-400 font-semibold">{generating ? 'Generando...' : 'Descargar PDF'}</div>
          <div className="text-xs text-gray-500 mt-1">
            {pipelineId ? 'Reporte del pipeline' : 'Reporte ejecutivo 5 paginas'}
          </div>
        </button>

        {/* 2. Allure Report */}
        <button
          onClick={() => window.open('http://localhost:6001/api/report/allure/index.html', '_blank')}
          className="bg-surface-card border border-surface-border rounded-xl p-4 text-center hover:border-orange-500/50 hover:bg-surface-hover transition"
        >
          <div className="text-orange-400 font-semibold">Allure Report</div>
          <div className="text-xs text-gray-500 mt-1">Resultados detallados E2E</div>
        </button>

        {/* 3. Grafana */}
        <button
          onClick={() => window.open('http://localhost:3003', '_blank')}
          className="bg-surface-card border border-surface-border rounded-xl p-4 text-center hover:border-green-500/50 hover:bg-surface-hover transition"
        >
          <div className="text-green-400 font-semibold">Grafana</div>
          <div className="text-xs text-gray-500 mt-1">Dashboards en tiempo real</div>
        </button>

        {/* 4. Trazabilidad */}
        <button
          onClick={handleShowTraceability}
          className="bg-surface-card border border-surface-border rounded-xl p-4 text-center hover:border-purple-500/50 hover:bg-surface-hover transition"
        >
          <div className="text-purple-400 font-semibold">Trazabilidad</div>
          <div className="text-xs text-gray-500 mt-1">Epic &rarr; US &rarr; Suite &rarr; TC</div>
        </button>

        {/* 5. Notificaciones */}
        <button
          onClick={handleResendNotification}
          disabled={sending || !pipelineId}
          className="bg-surface-card border border-surface-border rounded-xl p-4 text-center hover:border-yellow-500/50 hover:bg-surface-hover transition disabled:opacity-50"
        >
          <div className="text-yellow-400 font-semibold">{sending ? 'Enviando...' : 'Notificaciones'}</div>
          <div className="text-xs text-gray-500 mt-1">
            {pipelineId ? 'Re-enviar email' : 'Requiere pipeline'}
          </div>
        </button>
      </div>

      {/* Modal Trazabilidad */}
      {showTrace && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowTrace(false)}>
          <div
            className="bg-surface-card border border-surface-border rounded-2xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Trazabilidad Completa</h2>
              <button onClick={() => setShowTrace(false)} className="text-gray-500 hover:text-white text-2xl">&times;</button>
            </div>

            {traceLoading ? (
              <div className="text-center py-8 text-gray-500 animate-pulse">Cargando trazabilidad...</div>
            ) : traceTree.length > 0 ? (
              <div className="space-y-4">
                {traceTree.map((epic, ei) => (
                  <div key={ei} className="border border-surface-border rounded-xl p-4">
                    <div className="text-blue-400 font-bold text-sm">{epic.id} — {epic.name}</div>
                    {epic.stories.map((us: any, ui: number) => (
                      <div key={ui} className="ml-4 mt-3">
                        <div className="text-green-400 font-semibold text-sm">{us.id} — {us.name}</div>
                        {us.suites.map((suite: any, si: number) => (
                          <div key={si} className="ml-4 mt-2">
                            <div className="text-purple-400 text-sm">{suite.name}</div>
                            {suite.tcs.map((tc: any, ti: number) => (
                              <div key={ti} className="ml-4 mt-1 flex items-center gap-2">
                                <span className="text-gray-500 text-xs font-mono">{tc.id}</span>
                                <span className="text-gray-400 text-xs">{tc.name}</span>
                                <Badge variant={
                                  tc.priority === 'Alta' ? 'warning' :
                                  tc.priority === 'Critica' ? 'failed' : 'info'
                                }>
                                  {tc.priority}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600">Sin datos de trazabilidad</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Construir arbol de trazabilidad desde la view v_traceability
function buildTraceTree(rows: any[]): any[] {
  const epicsMap: Record<string, any> = {};

  rows.forEach((row) => {
    const epicId = row.epic_id || row.id_epic || 'EPIC-???';
    const epicName = row.epic_nombre || row.epic_name || row.nombre_epic || 'Epic';
    const usId = row.us_id || row.id_hu || 'US-???';
    const usName = row.us_nombre || row.us_name || row.nombre_us || 'User Story';
    const suiteName = row.suite_nombre || row.suite_name || row.nombre_suite || 'Suite';
    const tcId = row.tc_id || 'TC-???';
    const tcName = row.tc_nombre || row.tc_name || row.nombre_tc || 'Test Case';
    const tcPriority = row.prioridad || row.priority || 'Media';

    if (!epicsMap[epicId]) {
      epicsMap[epicId] = { id: epicId, name: epicName, stories: {} };
    }
    if (!epicsMap[epicId].stories[usId]) {
      epicsMap[epicId].stories[usId] = { id: usId, name: usName, suites: {} };
    }
    if (!epicsMap[epicId].stories[usId].suites[suiteName]) {
      epicsMap[epicId].stories[usId].suites[suiteName] = { name: suiteName, tcs: [] };
    }
    epicsMap[epicId].stories[usId].suites[suiteName].tcs.push({
      id: tcId, name: tcName, priority: tcPriority,
    });
  });

  // Convertir maps a arrays
  return Object.values(epicsMap).map((epic) => ({
    ...epic,
    stories: Object.values(epic.stories).map((us: any) => ({
      ...us,
      suites: Object.values(us.suites),
    })),
  }));
}
