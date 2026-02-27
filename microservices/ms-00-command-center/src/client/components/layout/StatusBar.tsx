import { useMicroserviceHealth } from '../../hooks/useMicroserviceHealth';

const MS_LABELS: Record<string, string> = {
  'ms-08': '08',
  'ms-09': '09',
  'ms-10': '10',
  'ms-11': '11',
  'ms-12': '12',
};

export function StatusBar() {
  const { health, loading } = useMicroserviceHealth();

  return (
    <div className="p-4 border-t border-surface-border">
      <div className="text-xs text-gray-600 uppercase tracking-wider mb-2">Microservicios</div>
      <div className="flex gap-2">
        {Object.entries(MS_LABELS).map(([key, label]) => {
          const status = health[key];
          const color = loading
            ? 'bg-gray-700'
            : status === 'ok'
              ? 'bg-green-500'
              : 'bg-red-500';

          return (
            <div
              key={key}
              className={`${color} text-white text-xs font-mono px-2 py-1 rounded transition-colors`}
              title={`${key}: ${status || 'checking...'}`}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
