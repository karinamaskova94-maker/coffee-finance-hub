import { Camera, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickActionsProps {
  onScanReceipt: () => void;
  onViewProfit: () => void;
}

export function QuickActions({ onScanReceipt, onViewProfit }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <Button
        onClick={onScanReceipt}
        className="h-32 flex flex-col items-center justify-center gap-3 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-lg"
        size="lg"
      >
        <Camera className="w-10 h-10" />
        <span>Scan Receipt</span>
      </Button>
      
      <Button
        onClick={onViewProfit}
        className="h-32 flex flex-col items-center justify-center gap-3 text-lg font-semibold bg-success hover:bg-success/90 text-success-foreground shadow-lg"
        size="lg"
      >
        <BarChart3 className="w-10 h-10" />
        <span>View Profit</span>
      </Button>
    </div>
  );
}
