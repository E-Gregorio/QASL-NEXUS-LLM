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

  const handleExplore = async () => {
    if (!url.trim() || !objective.trim()) {
      alert('Ingresa la URL y el objetivo');
      return;
    }
    setRunning(true);
    try {
      const result = await api.runPipeline({
        type: 'full',
        triggerType: 'manual',
        triggeredBy: 'command-center-exploratory',
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Exploratory AI</h1>
        <p className="text-gray-500 text-sm mt-1">INGRID analiza tu aplicacion con inteligencia artificial</p>
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
            <div className="text-sm text-purple-300 font-semibold mb-1">Como funciona INGRID</div>
            <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
              <li>INGRID navega tu aplicacion como un usuario real</li>
              <li>Analiza cada pantalla con AI Vision (Gemini 2.5 Pro)</li>
              <li>Genera test cases automaticamente basados en lo que encuentra</li>
              <li>Ejecuta los tests generados con Playwright</li>
              <li>Reporta bugs con screenshots y pasos de reproduccion</li>
            </ol>
          </div>
        </div>
      </Card>

      {/* Execute */}
      <div className="flex justify-center">
        <button
          onClick={handleExplore}
          disabled={running || !url.trim() || !objective.trim()}
          className="px-8 py-4 bg-purple-600 text-white rounded-xl font-semibold text-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed glow-purple"
        >
          {running ? 'Iniciando Exploracion...' : 'EXPLORAR CON AI'}
        </button>
      </div>
    </div>
  );
}
