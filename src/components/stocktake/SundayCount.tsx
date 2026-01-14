import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardCheck, TrendingUp, TrendingDown, Minus, Save, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { PURCHASE_UNIT_LABELS, type PurchaseUnit } from '@/lib/unitConversions';

interface InventoryItem {
  id: string;
  name: string;
  unit_type: PurchaseUnit;
  current_unit_price: number;
}

interface StocktakeItem {
  inventoryId: string;
  expectedQty: number;
  physicalCount: string;
}

export function SundayCount() {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [stocktakeItems, setStocktakeItems] = useState<Record<string, StocktakeItem>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) fetchInventory();
  }, [user?.id]);

  const fetchInventory = async () => {
    if (!user) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from('inventory_items')
      .select('id, name, unit_type, current_unit_price')
      .eq('user_id', user.id)
      .order('name');

    if (error) {
      console.error(error);
      toast.error('Failed to load inventory');
    } else {
      setInventoryItems(data || []);
      // Initialize stocktake items with 0 expected (real expected would come from sales data)
      const initial: Record<string, StocktakeItem> = {};
      (data || []).forEach(item => {
        initial[item.id] = {
          inventoryId: item.id,
          expectedQty: 0, // Placeholder - would come from POS integration
          physicalCount: '',
        };
      });
      setStocktakeItems(initial);
    }
    setIsLoading(false);
  };

  const updateCount = (itemId: string, count: string) => {
    setStocktakeItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], physicalCount: count },
    }));
  };

  const getVariance = (itemId: string): number | null => {
    const item = stocktakeItems[itemId];
    if (!item || item.physicalCount === '') return null;
    const physical = parseFloat(item.physicalCount) || 0;
    return physical - item.expectedQty;
  };

  const getVarianceValue = (itemId: string): number | null => {
    const variance = getVariance(itemId);
    if (variance === null) return null;
    const invItem = inventoryItems.find(i => i.id === itemId);
    if (!invItem) return null;
    return variance * invItem.current_unit_price;
  };

  const handleSave = async () => {
    if (!user || !currentStore) {
      toast.error('Please ensure you are logged in with a store selected');
      return;
    }

    setIsSaving(true);

    try {
      // Create stocktake record
      const { data: stocktake, error: stocktakeError } = await supabase
        .from('stocktakes')
        .insert({
          user_id: user.id,
          store_id: currentStore.id,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (stocktakeError) throw stocktakeError;

      // Create stocktake items
      const items = Object.values(stocktakeItems)
        .filter(item => item.physicalCount !== '')
        .map(item => ({
          stocktake_id: stocktake.id,
          inventory_item_id: item.inventoryId,
          expected_quantity: item.expectedQty,
          physical_count: parseFloat(item.physicalCount) || 0,
        }));

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('stocktake_items')
          .insert(items);

        if (itemsError) throw itemsError;
      }

      toast.success('Stocktake saved successfully!');
      
      // Reset counts
      const reset: Record<string, StocktakeItem> = {};
      inventoryItems.forEach(item => {
        reset[item.id] = {
          inventoryId: item.id,
          expectedQty: 0,
          physicalCount: '',
        };
      });
      setStocktakeItems(reset);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save stocktake');
    } finally {
      setIsSaving(false);
    }
  };

  const totalVarianceValue = Object.keys(stocktakeItems).reduce((sum, id) => {
    const val = getVarianceValue(id);
    return sum + (val || 0);
  }, 0);

  const countedItems = Object.values(stocktakeItems).filter(i => i.physicalCount !== '').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading inventory...</div>
      </div>
    );
  }

  if (inventoryItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg mb-2">No Inventory Items</h3>
          <p className="text-muted-foreground">
            Add items to your inventory first to start counting.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-primary" />
              Sunday Count
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Items Counted</span>
              <p className="text-2xl font-bold">{countedItems} / {inventoryItems.length}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Variance Value</span>
              <p className={`text-2xl font-bold ${totalVarianceValue >= 0 ? 'text-success' : 'text-destructive'}`}>
                {totalVarianceValue >= 0 ? '+' : ''}${totalVarianceValue.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Item List */}
      <div className="space-y-2">
        {inventoryItems.map(item => {
          const variance = getVariance(item.id);
          const varianceValue = getVarianceValue(item.id);
          const hasCount = stocktakeItems[item.id]?.physicalCount !== '';

          return (
            <Card key={item.id} className={hasCount ? 'border-primary/30' : ''}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  {/* Item Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Expected: {stocktakeItems[item.id]?.expectedQty || 0} {PURCHASE_UNIT_LABELS[item.unit_type]}
                    </p>
                  </div>

                  {/* Count Input */}
                  <div className="w-24">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Count"
                      value={stocktakeItems[item.id]?.physicalCount || ''}
                      onChange={(e) => updateCount(item.id, e.target.value)}
                      className="h-10 text-center text-lg font-mono"
                    />
                  </div>

                  {/* Variance Badge */}
                  <div className="w-20 text-right">
                    {variance !== null && (
                      <div className="flex flex-col items-end gap-0.5">
                        <Badge
                          variant={variance > 0 ? 'default' : variance < 0 ? 'destructive' : 'secondary'}
                          className="gap-1"
                        >
                          {variance > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : variance < 0 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : (
                            <Minus className="w-3 h-3" />
                          )}
                          {variance > 0 ? '+' : ''}{variance.toFixed(1)}
                        </Badge>
                        {varianceValue !== null && varianceValue !== 0 && (
                          <span className={`text-xs font-mono ${varianceValue >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {varianceValue >= 0 ? '+' : ''}${varianceValue.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={isSaving || countedItems === 0}
        className="w-full h-12 gap-2"
        size="lg"
      >
        {isSaving ? (
          <>
            <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            Complete Stocktake
          </>
        )}
      </Button>
    </div>
  );
}
