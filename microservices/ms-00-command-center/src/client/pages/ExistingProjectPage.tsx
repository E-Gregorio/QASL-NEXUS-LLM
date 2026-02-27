import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { api } from '../api/client';

const TEST_OPTIONS = [
  { key: 'e2e', label: 'E2E (Playwright)', ms: 'MS-03', color: 'text-blue-400' },
  { key: 'api', label: 'API (Newman)', ms: 'MS-03', color: 'text-blue-400' },
  { key: 'performance', label: 'Performance (K6)', ms: 'MS-03', color: 'text-cyan-400' },
  { key: 'security_web', label: 'Web Security (ZAP)', ms: 'MS-03', color: 'text-orange-400' },
  { key: 'mobile', label: 'Mobile (Maestro)', ms: 'MS-04', color: 'text-green-400' },
  { key: 'mobile_security', label: 'Mobile Security (MobSF)', ms: 'MS-04', color: 'text-red-400' },
  { key: 'llm_security', label: 'LLM Security (NVIDIA Garak)', ms: 'MS-06', color: 'text-red-500' },
  { key: 'ai_testing', label: 'AI Testing (INGRID)', ms: 'MS-05', color: 'text-purple-400' },
];

export function ExistingProjectPage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [selectedTests, setSelectedTests] = useState<string[]>(['e2e', 'api']);
  const [running, setRunning] = useState(false);

  const toggleTest = (key: string) => {
    setSelectedTests((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  };

  const handleExecute = async () => {
    if (!url.trim()) {
      alert('Ingresa la URL del proyecto');
      return;
    }
    setRunning(true);
    try {
      const result = await api.runPipeline({
        type: 'full',
        triggerType: 'manual',
        triggeredBy: 'command-center',
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
        <h1 className="text-2xl font-bold text-white">Proyecto Existente</h1>
        <p className="text-gray-500 text-sm mt-1">Ejecutar tests en un proyecto ya desplegado</p>
      </div>

      {/* Project URL */}
      <Card>
        <h2 className="text-lg font-semibold text-white mb-4">Configuracion del Proyecto</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">URL del Proyecto</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://mi-app.example.com"
              className="w-full bg-surface-primary border border-surface-border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none transition"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Usuario (opcional)</label>
              <input
                type="text"
                placeholder="usuario@test.com"
                className="w-full bg-surface-primary border border-surface-border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Password (opcional)</label>
              <input
                type="password"
                placeholder="********"
                className="w-full bg-surface-primary border border-surface-border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none transition"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Test Selection */}
      <Card>
        <h2 className="text-lg font-semibold text-white mb-4">Tipos de Prueba</h2>
        <div className="grid grid-cols-2 gap-3">
          {TEST_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                selectedTests.includes(opt.key)
                  ? 'bg-blue-600/20 border border-blue-500/30'
                  : 'bg-surface-primary border border-surface-border hover:border-gray-600'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedTests.includes(opt.key)}
                onChange={() => toggleTest(opt.key)}
                className="rounded text-blue-500"
              />
              <div className="flex-1">
                <div className={`text-sm font-medium ${opt.color}`}>{opt.label}</div>
                <div className="text-xs text-gray-600">{opt.ms}</div>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Execute */}
      <div className="flex justify-center">
        <button
          onClick={handleExecute}
          disabled={running || selectedTests.length === 0}
          className="px-8 py-4 bg-green-600 text-white rounded-xl font-semibold text-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed glow-green"
        >
          {running ? 'Iniciando Pipeline...' : `EJECUTAR PIPELINE (${selectedTests.length} pruebas)`}
        </button>
      </div>
    </div>
  );
}
