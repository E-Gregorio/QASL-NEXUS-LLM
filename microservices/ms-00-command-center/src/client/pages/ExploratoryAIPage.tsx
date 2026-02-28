import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { api } from '../api/client';

export function ExploratoryAIPage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [objective, setObjective] = useState('');
  const [model, setModel] = useState('opus');
  const [running, setRunning] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const handleExplore = async (pipelineType: 'e2e' | 'full') => {
    if (!url.trim() || !objective.trim()) {
      alert('Ingresa la URL y el objetivo');
      return;
    }
    setRunning(true);
    try {
      const result = await api.runPipeline({
        type: pipelineType,
        triggerType: 'manual',
        triggeredBy: 'command-center-exploratory',
        targetUrl: url.trim(),
        objective: objective.trim(),
      });
      const id = result.pipeline_id || result.pipelineId;
      if (id) {
        navigate(`/pipeline?id=${id}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleClean = async () => {
    if (!window.confirm('Eliminar todos los resultados de corridas anteriores?')) return;
    setCleaning(true);
    try {
      const result = await api.cleanResults();
      alert(`Resultados eliminados: ${result.deleted?.pipeline_run || 0} pipelines, ${result.deleted?.test_execution || 0} ejecuciones`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Exploratory AI</h1>
        <p className="text-gray-500 text-sm mt-1">Analiza tu aplicacion con inteligencia artificial</p>
      </div>

      {/* Config */}
      <Card>
        <h2 className="text-lg font-semibold text-white mb-4">Configuracion</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">URL de la Aplicacion</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://mi-app.example.com"
              className="w-full bg-surface-primary border border-surface-border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none transition"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Objetivo de la Exploracion</label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Ej: Verificar el flujo completo de checkout, desde agregar producto hasta confirmar pago. Identificar problemas de usabilidad y seguridad."
              rows={4}
              className="w-full bg-surface-primary border border-surface-border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none transition resize-none"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Modelo AI</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                  model === 'opus' ? 'bg-purple-600/20 border border-purple-500/30' : 'bg-surface-primary border border-surface-border hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="model"
                  value="opus"
                  checked={model === 'opus'}
                  onChange={(e) => setModel(e.target.value)}
                />
                <div>
                  <div className="text-sm text-purple-400 font-medium">Claude Opus 4.6</div>
                  <div className="text-xs text-gray-500">Maximo razonamiento, analisis profundo</div>
                </div>
              </label>
              <label
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                  model === 'sonnet' ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-surface-primary border border-surface-border hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="model"
                  value="sonnet"
                  checked={model === 'sonnet'}
                  onChange={(e) => setModel(e.target.value)}
                />
                <div>
                  <div className="text-sm text-blue-400 font-medium">Claude Sonnet 4.5</div>
                  <div className="text-xs text-gray-500">Rapido y eficiente, buen balance</div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* Info Box */}
      <Card glow="purple">
        <div className="flex gap-4">
          <div className="text-purple-400 text-2xl">&#9889;</div>
          <div>
            <div className="text-sm text-purple-300 font-semibold mb-1">Como funciona el Exploratory AI</div>
            <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
              <li>MS-09 Opus analiza la URL y genera tests E2E con Playwright</li>
              <li><strong className="text-blue-400">EXPLORAR E2E</strong>: Solo Playwright + Allure (rapido)</li>
              <li><strong className="text-purple-400">PIPELINE COMPLETO</strong>: E2E + Newman API + K6 Performance + ZAP Security</li>
              <li>Los resultados se guardan en MS-12 (PostgreSQL)</li>
              <li>MS-11 genera reporte PDF | MS-10 crea bugs en Jira/Azure</li>
            </ol>
          </div>
        </div>
      </Card>

      {/* Execute */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-4">
          <button
            onClick={() => handleExplore('e2e')}
            disabled={running || !url.trim() || !objective.trim()}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? 'Ejecutando...' : 'EXPLORAR E2E'}
          </button>
          <button
            onClick={() => handleExplore('full')}
            disabled={running || !url.trim() || !objective.trim()}
            className="px-8 py-4 bg-purple-600 text-white rounded-xl font-semibold text-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed glow-purple"
          >
            {running ? 'Ejecutando...' : 'PIPELINE COMPLETO'}
          </button>
        </div>
        <button
          onClick={handleClean}
          disabled={cleaning || running}
          className="px-6 py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg text-sm hover:bg-red-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cleaning ? 'Limpiando...' : 'LIMPIAR RESULTADOS'}
        </button>
      </div>
    </div>
  );
}
