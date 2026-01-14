interface BenchmarkGaugeProps {
  label: string;
  current: number;
  target: string;
  hint: string;
  variant: 'success' | 'warning' | 'danger';
}

const BenchmarkGauge = ({ label, current, target, hint, variant }: BenchmarkGaugeProps) => {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (current / 100) * circumference;

  const colorMap = {
    success: {
      stroke: 'stroke-success',
      bg: 'bg-success/10',
      text: 'text-success',
      border: 'border-success/20',
    },
    warning: {
      stroke: 'stroke-warning',
      bg: 'bg-warning/10',
      text: 'text-warning',
      border: 'border-warning/20',
    },
    danger: {
      stroke: 'stroke-destructive',
      bg: 'bg-destructive/10',
      text: 'text-destructive',
      border: 'border-destructive/20',
    },
  };

  const colors = colorMap[variant];

  return (
    <div className={`glass-card p-6 border ${colors.border}`}>
      <div className="flex items-center gap-6">
        {/* Gauge */}
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={`gauge-ring ${colors.stroke}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xl font-bold ${colors.text}`}>{current}%</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground mb-1">{label}</h3>
          <p className="text-sm text-muted-foreground mb-2">Target: {target}</p>
          <p className={`text-sm ${colors.text} ${colors.bg} px-3 py-1.5 rounded-lg inline-block`}>
            {hint}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BenchmarkGauge;
