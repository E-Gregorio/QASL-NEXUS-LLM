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
  return (
    <div className={`w-full bg-gray-800 rounded-full ${height} overflow-hidden`}>
      <div
        className={`${colorMap[color]} ${height} rounded-full transition-all duration-700 ease-out ${animated ? 'animate-pulse' : ''}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}
