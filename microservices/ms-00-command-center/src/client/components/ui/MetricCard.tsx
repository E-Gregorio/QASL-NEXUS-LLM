import { Card } from './Card';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  color: 'blue' | 'green' | 'red' | 'purple';
}

const colorMap: Record<string, string> = {
  blue: 'text-blue-400',
  green: 'text-green-400',
  red: 'text-red-400',
  purple: 'text-purple-400',
};

export function MetricCard({ label, value, subtitle, color }: MetricCardProps) {
  return (
    <Card glow={color}>
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-3xl font-bold ${colorMap[color]}`}>{value}</div>
      {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
    </Card>
  );
}
