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
  package_size: number;
  package_price: number;
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
  const [formPackageSize, setFormPackageSize] = useState('1');
  const [formPackagePrice, setFormPackagePrice] = useState('');

  // Auto-calculate unit price
  const calculatedUnitPrice = (parseFloat(formPackagePrice) || 0) / (parseFloat(formPackageSize) || 1);

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
    setFormPackageSize('1');
    setFormPackagePrice('');
    setEditingItem(null);
  };

  const handleSave = async () => {
    if (!user || !formName.trim()) {
      toast.error('Please enter an item name');
      return;
    }

    const packageSize = parseFloat(formPackageSize) || 1;
    const packagePrice = parseFloat(formPackagePrice) || 0;
    const unitPrice = packagePrice / packageSize;

    const itemData = {
      name: formName.trim(),
      unit_type: formUnitType,
      package_size: packageSize,
      package_price: packagePrice,
      current_unit_price: unitPrice,
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
    setFormPackageSize(item.package_size.toString());
    setFormPackagePrice(item.package_price.toString());
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
                  placeholder="e.g., Coffee Beans"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              
              {/* Package Purchase Section */}
              <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
                <p className="text-sm font-medium">Package Purchase</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="packagePrice" className="text-xs">Total Price ($)</Label>
                    <Input
                      id="packagePrice"
                      type="number"
                      step="0.01"
                      placeholder="45.00"
                      value={formPackagePrice}
                      onChange={(e) => setFormPackagePrice(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="packageSize" className="text-xs">Package Size</Label>
                    <Input
                      id="packageSize"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="3"
                      value={formPackageSize}
                      onChange={(e) => setFormPackageSize(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Unit</Label>
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
                </div>
                <p className="text-xs text-muted-foreground">
                  Example: $45 for 3 LBs of coffee
                </p>
              </div>

              {/* Auto-calculated Unit Price */}
              {formPackagePrice && parseFloat(formPackagePrice) > 0 && (
                <div className="p-3 rounded-lg border-2 border-primary/30 bg-primary/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Calculated Unit Price</span>
                    <span className="font-mono text-lg font-bold text-primary">
                      ${calculatedUnitPrice.toFixed(2)}/{PURCHASE_UNIT_LABELS[formUnitType]}
                    </span>
                  </div>
                  
                  {/* Price breakdown for smaller units */}
                  {(formUnitType === 'gallon' || formUnitType === 'lb') && (
                    <div className="pt-2 border-t space-y-1">
                      <p className="text-xs text-muted-foreground">Price per smaller unit:</p>
                      {getPriceBreakdown(calculatedUnitPrice, formUnitType).map(({ unit, price }) => (
                        <p key={unit} className="text-sm font-mono">
                          ${price.toFixed(4)} per {unit}
                        </p>
                      ))}
                    </div>
                  )}
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
                <TableHead className="text-right">Package</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
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
                      <div className="font-mono text-sm">${item.package_price.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        for {item.package_size} {PURCHASE_UNIT_LABELS[item.unit_type]}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-mono font-medium">{price}</div>
                      <div className="text-xs text-muted-foreground">per {unit}</div>
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
