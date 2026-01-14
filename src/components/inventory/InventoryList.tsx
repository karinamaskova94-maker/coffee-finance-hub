import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

type UnitType = 'gallon' | 'oz' | 'lb' | 'each' | 'case' | 'bag' | 'box' | 'pack';

interface InventoryItem {
  id: string;
  name: string;
  unit_type: UnitType;
  current_unit_price: number;
  last_updated: string;
}

const UNIT_TYPES: { value: UnitType; label: string }[] = [
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
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formUnitType, setFormUnitType] = useState<UnitType>('each');
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
                  <Label>Unit Type</Label>
                  <Select value={formUnitType} onValueChange={(v) => setFormUnitType(v as UnitType)}>
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
              <Button onClick={handleSave} className="w-full">
                {editingItem ? 'Update Item' : 'Add to Inventory'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search inventory..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
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
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <span className="text-xs bg-muted px-2 py-1 rounded">
                      {UNIT_TYPES.find(u => u.value === item.unit_type)?.label || item.unit_type}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ${item.current_unit_price.toFixed(2)}
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
