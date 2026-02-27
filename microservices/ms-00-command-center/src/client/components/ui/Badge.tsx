interface BadgeProps {
  variant: 'success' | 'running' | 'failed' | 'pending' | 'info' | 'warning';
  children: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  running: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 animate-pulse',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  pending: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  warning: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]}`}>
      {children}
    </span>
  );
}
