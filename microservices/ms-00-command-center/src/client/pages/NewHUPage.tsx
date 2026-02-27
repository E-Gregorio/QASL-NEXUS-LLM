import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { api } from '../api/client';

export function NewHUPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [pipelineType, setPipelineType] = useState('full');
  const [bugTracker, setBugTracker] = useState('jira');
  const [running, setRunning] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.docx') || droppedFile.name.endsWith('.doc'))) {
      setFile(droppedFile);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleExecute = async () => {
    setRunning(true);
    try {
      const result = await api.runPipeline({
        type: pipelineType,
        triggerType: 'manual',
        triggeredBy: 'command-center',
      });
      const id = result.pipeline_id || result.pipelineId;
      if (id) {
        navigate(`/pipeline?id=${id}`);
      }
    } catch (err: any) {
      alert(`Error al iniciar pipeline: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Nueva Historia de Usuario</h1>
        <p className="text-gray-500 text-sm mt-1">Shift-Left Testing: Analisis desde el documento de requisitos</p>
      </div>

      {/* File Upload */}
      <Card>
        <h2 className="text-lg font-semibold text-white mb-4">Subir Documento</h2>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
            dragOver
              ? 'border-blue-500 bg-blue-500/10'
              : file
                ? 'border-green-500/50 bg-green-500/5'
                : 'border-surface-border hover:border-gray-600'
          }`}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          {file ? (
            <div>
              <div className="text-green-400 text-lg font-semibold">{file.name}</div>
              <div className="text-gray-500 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB</div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="text-xs text-red-400 mt-2 hover:text-red-300"
              >
                Cambiar archivo
              </button>
            </div>
          ) : (
            <div>
              <div className="text-gray-400 text-lg mb-2">Arrastra tu archivo .docx aqui</div>
              <div className="text-gray-600 text-sm">o haz click para seleccionar</div>
            </div>
          )}
          <input
            id="file-input"
            type="file"
            accept=".docx,.doc"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      </Card>

      {/* Configuration */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Tipo de Pipeline</h3>
          <div className="space-y-2">
            {[
              { value: 'full', label: 'Full Pipeline', desc: 'Analisis + Ejecucion + Reportes' },
              { value: 'regression', label: 'Solo Analisis', desc: 'MS-02 + MS-09 unicamente' },
              { value: 'smoke', label: 'Analisis + Smoke', desc: 'Analisis + tests criticos' },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                  pipelineType === opt.value ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-surface-hover'
                }`}
              >
                <input
                  type="radio"
                  name="pipelineType"
                  value={opt.value}
                  checked={pipelineType === opt.value}
                  onChange={(e) => setPipelineType(e.target.value)}
                  className="text-blue-500"
                />
                <div>
                  <div className="text-sm text-white">{opt.label}</div>
                  <div className="text-xs text-gray-500">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Bug Tracker</h3>
          <div className="space-y-2">
            {[
              { value: 'jira', label: 'Jira', desc: 'Crear bugs automaticos en Jira' },
              { value: 'azure', label: 'Azure DevOps', desc: 'Work Items en Azure' },
              { value: 'testrail', label: 'TestRail', desc: 'Resultados en TestRail' },
              { value: 'none', label: 'Ninguno', desc: 'Solo base de datos local' },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                  bugTracker === opt.value ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-surface-hover'
                }`}
              >
                <input
                  type="radio"
                  name="bugTracker"
                  value={opt.value}
                  checked={bugTracker === opt.value}
                  onChange={(e) => setBugTracker(e.target.value)}
                  className="text-blue-500"
                />
                <div>
                  <div className="text-sm text-white">{opt.label}</div>
                  <div className="text-xs text-gray-500">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </Card>
      </div>

      {/* Execute Button */}
      <div className="flex justify-center">
        <button
          onClick={handleExecute}
          disabled={running}
          className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed glow-blue"
        >
          {running ? 'Iniciando Pipeline...' : 'ANALIZAR Y EJECUTAR'}
        </button>
      </div>
    </div>
  );
}
