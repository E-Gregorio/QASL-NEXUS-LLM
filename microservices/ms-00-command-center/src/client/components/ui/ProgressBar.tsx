interface ProgressBarProps {
  value: number; // 0-100
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  size?: 'sm' | 'md';
  animated?: boolean;
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
};

export function ProgressBar({ value, color = 'blue', size = 'sm', animated = false }: ProgressBarProps) {
  const height = size === 'sm' ? 'h-1.5' : 'h-3';

  // Animacion indeterminada para estado "running"
  if (animated && value > 0 && value < 100) {
    return (
      <div className={`w-full bg-gray-800 rounded-full ${height} overflow-hidden relative`}>
        <div
          className={`${colorMap[color]} ${height} rounded-full absolute`}
          style={{
            width: '40%',
            animation: 'progress-slide 1.5s ease-in-out infinite',
          }}
        />
      </div>
    );
  }

  return (
    <div className={`w-full bg-gray-800 rounded-full ${height} overflow-hidden`}>
      <div
        className={`${colorMap[color]} ${height} rounded-full transition-all duration-700 ease-out`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}
