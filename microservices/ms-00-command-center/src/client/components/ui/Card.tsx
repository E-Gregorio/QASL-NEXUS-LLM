import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: 'blue' | 'green' | 'red' | 'purple';
}

export function Card({ children, className = '', glow }: CardProps) {
  const glowClass = glow ? `glow-${glow}` : '';
  return (
    <div className={`bg-surface-card border border-surface-border rounded-xl p-6 ${glowClass} ${className}`}>
      {children}
    </div>
  );
}
