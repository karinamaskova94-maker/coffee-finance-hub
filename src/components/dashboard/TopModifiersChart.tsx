import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Mock data for top selling modifiers (in a real app, this would come from sales data)
const MODIFIER_DATA = [
  { name: 'Oat Milk', sales: 234, revenue: 163.80, cost: 93.60, profit: 70.20 },
  { name: 'Extra Shot', sales: 189, revenue: 141.75, cost: 37.80, profit: 103.95 },
  { name: 'Vanilla Syrup', sales: 156, revenue: 78.00, cost: 23.40, profit: 54.60 },
  { name: 'Large Size', sales: 145, revenue: 72.50, cost: 21.75, profit: 50.75 },
  { name: 'Almond Milk', sales: 98, revenue: 68.60, cost: 49.00, profit: 19.60 },
  { name: 'Caramel Syrup', sales: 87, revenue: 43.50, cost: 13.05, profit: 30.45 },
];

export function TopModifiersChart() {
  const totalProfit = MODIFIER_DATA.reduce((sum, m) => sum + m.profit, 0);
  const totalRevenue = MODIFIER_DATA.reduce((sum, m) => sum + m.revenue, 0);

  const chartData = MODIFIER_DATA.map(m => ({
    ...m,
    profitMargin: ((m.profit / m.revenue) * 100).toFixed(0),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Top Selling Modifiers</CardTitle>
            <CardDescription>This week's modifier performance</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-success">${totalProfit.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">modifier profit</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={80} 
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Profit']}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.profit > 50 ? 'hsl(var(--success))' : entry.profit > 30 ? 'hsl(var(--primary))' : 'hsl(var(--warning))'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          {MODIFIER_DATA.slice(0, 3).map((mod, i) => {
            const margin = (mod.profit / mod.revenue) * 100;
            const isGood = margin >= 50;
            
            return (
              <div key={mod.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-muted-foreground">{i + 1}</span>
                  <div>
                    <p className="font-medium text-sm">{mod.name}</p>
                    <p className="text-xs text-muted-foreground">{mod.sales} sold</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    {isGood ? (
                      <TrendingUp className="h-3 w-3 text-success" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-warning" />
                    )}
                    <span className={`font-mono font-medium ${isGood ? 'text-success' : 'text-warning'}`}>
                      ${mod.profit.toFixed(0)}
                    </span>
                  </div>
                  <Badge variant={isGood ? 'default' : 'secondary'} className="text-xs">
                    {margin.toFixed(0)}% margin
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
