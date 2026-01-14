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
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
  };

  return (
    <div className="metric-card">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground font-medium mb-1">{title}</p>
          {value && (
            <p className={`text-2xl sm:text-3xl font-bold ${variantStyles[variant]}`}>{value}</p>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 ml-3">
            {icon}
          </div>
        )}
      </div>

      {trend && (
        <div className="flex items-center gap-2 flex-wrap">
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