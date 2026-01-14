const RevenueChart = () => {
  const data = [
    { label: 'Gross', value: 45800, percentage: 100 },
    { label: 'Net', value: 38200, percentage: 83 },
  ];

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium text-foreground">${item.value.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${
                item.label === 'Gross' ? 'bg-muted-foreground/30' : 'bg-primary'
              }`}
              style={{ width: `${item.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default RevenueChart;
