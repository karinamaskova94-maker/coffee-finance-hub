import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Plus, Link2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { PURCHASE_UNIT_LABELS, type PurchaseUnit } from '@/lib/unitConversions';

interface ScannedItem {
  name: string;
  price: number;
  taxCode: string;
  isTaxable: boolean;
}

interface InventoryItem {
  id: string;
  name: string;
  unit_type: PurchaseUnit;
  current_unit_price: number;
}

interface IngredientMapperProps {
  scannedItems: ScannedItem[];
  receiptId: string;
  onComplete: () => void;
}

interface MappingState {
  scannedName: string;
  inventoryId: string | null;
  isNew: boolean;
  newName: string;
  newUnit: PurchaseUnit;
  aiSuggestion: string | null;
}

export function IngredientMapper({ scannedItems, receiptId, onComplete }: IngredientMapperProps) {
  const { user } = useAuth();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [mappings, setMappings] = useState<MappingState[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchInventory();
    }
  }, [user?.id]);

  useEffect(() => {
    if (scannedItems.length > 0 && inventoryItems.length >= 0) {
      initializeMappings();
    }
  }, [scannedItems, inventoryItems]);

  const fetchInventory = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('inventory_items')
      .select('id, name, unit_type, current_unit_price')
      .eq('user_id', user.id)
      .order('name');

    setInventoryItems(data || []);
  };

  const initializeMappings = () => {
    const newMappings: MappingState[] = scannedItems.map(item => {
      // Try to find a matching inventory item
      const normalizedScanned = item.name.toLowerCase();
      const match = inventoryItems.find(inv => {
        const normalizedInv = inv.name.toLowerCase();
        return normalizedScanned.includes(normalizedInv) || 
               normalizedInv.includes(normalizedScanned) ||
               // Common variations
               normalizedScanned.replace(/\s+/g, '').includes(normalizedInv.replace(/\s+/g, ''));
      });

      return {
        scannedName: item.name,
        inventoryId: match?.id || null,
        isNew: false,
        newName: item.name,
        newUnit: 'each' as PurchaseUnit,
        aiSuggestion: match?.name || null,
      };
    });

    setMappings(newMappings);
  };

  const updateMapping = (index: number, updates: Partial<MappingState>) => {
    setMappings(prev => prev.map((m, i) => i === index ? { ...m, ...updates } : m));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      for (const mapping of mappings) {
        let inventoryId = mapping.inventoryId;

        // Create new inventory item if needed
        if (mapping.isNew && mapping.newName.trim()) {
          const scannedItem = scannedItems.find(s => s.name === mapping.scannedName);
          
          const { data: newItem, error } = await supabase
            .from('inventory_items')
            .insert({
              user_id: user.id,
              name: mapping.newName.trim(),
              unit_type: mapping.newUnit,
              package_price: scannedItem?.price || 0,
              package_size: 1,
              current_unit_price: scannedItem?.price || 0,
            })
            .select()
            .single();

          if (error) {
            console.error('Failed to create inventory item:', error);
            continue;
          }

          inventoryId = newItem.id;
        }

        // Save the mapping
        if (inventoryId) {
          const scannedItem = scannedItems.find(s => s.name === mapping.scannedName);
          
          await supabase
            .from('receipt_item_mappings')
            .insert({
              receipt_id: receiptId,
              inventory_item_id: inventoryId,
              scanned_name: mapping.scannedName,
              scanned_price: scannedItem?.price || 0,
              quantity: 1,
            });
        }
      }

      toast.success('Items mapped to inventory!');
      onComplete();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save mappings');
    } finally {
      setIsSaving(false);
    }
  };

  if (scannedItems.length === 0) {
    return null;
  }

  const mappedCount = mappings.filter(m => m.inventoryId || m.isNew).length;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          AI Ingredient Mapping
        </h4>
        <Badge variant="outline">
          {mappedCount}/{scannedItems.length} mapped
        </Badge>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {mappings.map((mapping, index) => {
          const scannedItem = scannedItems.find(s => s.name === mapping.scannedName);
          
          return (
            <Card key={index} className={mapping.inventoryId || mapping.isNew ? 'border-success/30' : ''}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {/* Scanned Item Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{mapping.scannedName}</p>
                    <p className="text-xs text-muted-foreground">
                      ${scannedItem?.price?.toFixed(2) || '0.00'}
                    </p>
                  </div>

                  {/* Mapping Controls */}
                  <div className="flex items-center gap-2">
                    {mapping.aiSuggestion && !mapping.isNew && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Sparkles className="w-3 h-3" />
                        AI Match
                      </Badge>
                    )}

                    {!mapping.isNew ? (
                      <>
                        <Select
                          value={mapping.inventoryId || ''}
                          onValueChange={(v) => updateMapping(index, { inventoryId: v || null })}
                        >
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue placeholder="Link to..." />
                          </SelectTrigger>
                          <SelectContent>
                            {inventoryItems.map(item => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1"
                          onClick={() => updateMapping(index, { isNew: true, inventoryId: null })}
                        >
                          <Plus className="w-3 h-3" />
                          New
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          value={mapping.newName}
                          onChange={(e) => updateMapping(index, { newName: e.target.value })}
                          placeholder="Item name"
                          className="h-8 w-28 text-xs"
                        />
                        <Select
                          value={mapping.newUnit}
                          onValueChange={(v) => updateMapping(index, { newUnit: v as PurchaseUnit })}
                        >
                          <SelectTrigger className="w-20 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PURCHASE_UNIT_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => updateMapping(index, { isNew: false })}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button
        onClick={handleSave}
        disabled={isSaving || mappedCount === 0}
        className="w-full gap-2"
      >
        {isSaving ? (
          <>
            <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Link2 className="w-4 h-4" />
            Save {mappedCount} Mapping{mappedCount !== 1 ? 's' : ''}
          </>
        )}
      </Button>
    </div>
  );
}
