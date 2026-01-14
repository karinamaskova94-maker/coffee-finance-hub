import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Package, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  type PurchaseUnit,
  PURCHASE_UNIT_LABELS,
  getPriceBreakdown,
  getCompatibleUnits,
} from '@/lib/unitConversions';

interface InventoryItem {
  id: string;
  name: string;
  unit_type: PurchaseUnit;
  current_unit_price: number;
  last_updated: string;
}

const UNIT_TYPES: { value: PurchaseUnit; label: string }[] = [
  { value: 'gallon', label: 'Gallon' },
  { value: 'oz', label: 'OZ' },
  { value: 'lb', label: 'LB' },
  { value: 'each', label: 'Each' },
  { value: 'case', label: 'Case' },
  { value: 'bag', label: 'Bag' },
  { value: 'box', label: 'Box' },
  { value: 'pack', label: 'Pack' },
];

export function InventoryList() {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showSmallUnits, setShowSmallUnits] = useState(false);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formUnitType, setFormUnitType] = useState<PurchaseUnit>('each');
  const [formPrice, setFormPrice] = useState('');

  const fetchItems = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (error) {
      toast.error('Failed to load inventory');
      console.error(error);
    } else {
      setItems(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [user?.id]);

  const resetForm = () => {
    setFormName('');
    setFormUnitType('each');
    setFormPrice('');
    setEditingItem(null);
  };

  const handleSave = async () => {
    if (!user || !formName.trim()) {
      toast.error('Please enter an item name');
      return;
    }

    const itemData = {
      name: formName.trim(),
      unit_type: formUnitType,
      current_unit_price: parseFloat(formPrice) || 0,
      user_id: user.id,
      last_updated: new Date().toISOString(),
    };

    if (editingItem) {
      const { error } = await supabase
        .from('inventory_items')
        .update(itemData)
        .eq('id', editingItem.id);

      if (error) {
        toast.error('Failed to update item');
        console.error(error);
      } else {
        toast.success('Item updated');
        fetchItems();
      }
    } else {
      const { error } = await supabase
        .from('inventory_items')
        .insert(itemData);

      if (error) {
        if (error.code === '23505') {
          toast.error('An item with this name already exists');
        } else {
          toast.error('Failed to add item');
        }
        console.error(error);
      } else {
        toast.success('Item added to inventory');
        fetchItems();
      }
    }

    resetForm();
    setIsAddDialogOpen(false);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormUnitType(item.unit_type);
    setFormPrice(item.current_unit_price.toString());
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete item');
      console.error(error);
    } else {
      toast.success('Item deleted');
      fetchItems();
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatPrice = (item: InventoryItem) => {
    if (!showSmallUnits) {
      return {
        price: `$${item.current_unit_price.toFixed(2)}`,
        unit: PURCHASE_UNIT_LABELS[item.unit_type],
      };
    }

    // Get price breakdown in smaller units
    const breakdown = getPriceBreakdown(item.current_unit_price, item.unit_type);
    const compatibleUnits = getCompatibleUnits(item.unit_type);
    
    // Show the smallest unit price
    if (breakdown.length > 0 && compatibleUnits[0] !== 'each') {
      const smallestUnit = breakdown[0];
      return {
        price: `$${smallestUnit.price.toFixed(4)}`,
        unit: smallestUnit.unit,
      };
    }

    return {
      price: `$${item.current_unit_price.toFixed(2)}`,
      unit: PURCHASE_UNIT_LABELS[item.unit_type],
    };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Master Inventory</h2>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Whole Milk"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Purchase Unit</Label>
                  <Select value={formUnitType} onValueChange={(v) => setFormUnitType(v as PurchaseUnit)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_TYPES.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Unit Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Price breakdown preview */}
              {formPrice && parseFloat(formPrice) > 0 && (formUnitType === 'gallon' || formUnitType === 'lb') && (
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p className="font-medium mb-2">Price Breakdown:</p>
                  <div className="space-y-1 text-muted-foreground">
                    {getPriceBreakdown(parseFloat(formPrice) || 0, formUnitType).map(({ unit, price }) => (
                      <p key={unit}>
                        ${price.toFixed(4)} per {unit}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              
              <Button onClick={handleSave} className="w-full">
                {editingItem ? 'Update Item' : 'Add to Inventory'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
          <Label htmlFor="unit-toggle" className="text-sm text-muted-foreground whitespace-nowrap">
            Show price per oz/ml
          </Label>
          <Switch
            id="unit-toggle"
            checked={showSmallUnits}
            onCheckedChange={setShowSmallUnits}
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {searchQuery ? 'No items found' : 'No inventory items yet'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Add items to track ingredient costs
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Updated</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const { price, unit } = formatPrice(item);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {PURCHASE_UNIT_LABELS[item.unit_type] || item.unit_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-mono">{price}</div>
                      <div className="text-xs text-muted-foreground">per {unit}</div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {format(new Date(item.last_updated), 'MMM d')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
