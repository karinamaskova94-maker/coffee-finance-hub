import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: { value: number; label: string };
  icon?: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  children?: ReactNode;
}

const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  trend, 
  icon, 
  variant = 'default',
  children 
}: MetricCardProps) => {
  const variantStyles = {
    default: 'text-foreground',
    success: 'text-gradient-success',
    warning: 'text-gradient-warning',
    danger: 'text-gradient-danger',
  };

  const glowStyles = {
    default: '',
    success: 'shadow-[var(--shadow-glow-success)]',
    warning: 'shadow-[var(--shadow-glow-warning)]',
    danger: 'shadow-[var(--shadow-glow-danger)]',
  };

  return (
    <div className={`metric-card ${glowStyles[variant]}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-1">{title}</p>
          <p className={`text-3xl font-bold ${variantStyles[variant]}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>

      {trend && (
        <div className="flex items-center gap-2">
          {trend.value >= 0 ? (
            <TrendingUp className="w-4 h-4 text-success" />
          ) : (
            <TrendingDown className="w-4 h-4 text-destructive" />
          )}
          <span className={`text-sm font-medium ${trend.value >= 0 ? 'text-success' : 'text-destructive'}`}>
            {trend.value >= 0 ? '+' : ''}{trend.value}%
          </span>
          <span className="text-sm text-muted-foreground">{trend.label}</span>
        </div>
      )}

      {children}
    </div>
  );
};

export default MetricCard;
