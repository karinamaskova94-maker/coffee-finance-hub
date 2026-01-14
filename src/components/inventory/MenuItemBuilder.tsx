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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Plus, ChefHat, Trash2, DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from 'sonner';

type UnitType = 'gallon' | 'oz' | 'lb' | 'each' | 'case' | 'bag' | 'box' | 'pack';

interface InventoryItem {
  id: string;
  name: string;
  unit_type: UnitType;
  current_unit_price: number;
}

interface MenuItem {
  id: string;
  name: string;
  retail_price: number;
  category: string | null;
  ingredients: MenuItemIngredient[];
}

interface MenuItemIngredient {
  id: string;
  inventory_item_id: string;
  quantity: number;
  inventory_item?: InventoryItem;
}

const UNIT_LABELS: Record<UnitType, string> = {
  gallon: 'Gallon',
  oz: 'OZ',
  lb: 'LB',
  each: 'Each',
  case: 'Case',
  bag: 'Bag',
  box: 'Box',
  pack: 'Pack',
};

export function MenuItemBuilder() {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formRetailPrice, setFormRetailPrice] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formIngredients, setFormIngredients] = useState<{ inventoryId: string; quantity: string }[]>([]);

  const fetchData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    // Fetch inventory items
    const { data: invData } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    
    setInventoryItems(invData || []);

    // Fetch menu items with ingredients
    const { data: menuData, error } = await supabase
      .from('menu_items')
      .select('id, name, retail_price, category')
      .eq('user_id', user.id)
      .order('name');

    if (error) {
      console.error(error);
      setIsLoading(false);
      return;
    }

    // Fetch ingredients for each menu item
    const menuItemsWithIngredients: MenuItem[] = [];
    for (const menu of menuData || []) {
      const { data: ingredients } = await supabase
        .from('menu_item_ingredients')
        .select('id, inventory_item_id, quantity')
        .eq('menu_item_id', menu.id);

      menuItemsWithIngredients.push({
        ...menu,
        ingredients: (ingredients || []).map(ing => ({
          ...ing,
          inventory_item: invData?.find(inv => inv.id === ing.inventory_item_id),
        })),
      });
    }

    setMenuItems(menuItemsWithIngredients);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const resetForm = () => {
    setFormName('');
    setFormRetailPrice('');
    setFormCategory('');
    setFormIngredients([]);
  };

  const addIngredientRow = () => {
    setFormIngredients([...formIngredients, { inventoryId: '', quantity: '' }]);
  };

  const removeIngredientRow = (index: number) => {
    setFormIngredients(formIngredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: 'inventoryId' | 'quantity', value: string) => {
    const updated = [...formIngredients];
    updated[index][field] = value;
    setFormIngredients(updated);
  };

  const calculateCost = (ingredients: MenuItemIngredient[]): number => {
    return ingredients.reduce((sum, ing) => {
      const price = ing.inventory_item?.current_unit_price || 0;
      return sum + (price * ing.quantity);
    }, 0);
  };

  const handleSave = async () => {
    if (!user || !formName.trim()) {
      toast.error('Please enter a menu item name');
      return;
    }

    // Create menu item
    const { data: menuItem, error: menuError } = await supabase
      .from('menu_items')
      .insert({
        name: formName.trim(),
        retail_price: parseFloat(formRetailPrice) || 0,
        category: formCategory || null,
        user_id: user.id,
      })
      .select()
      .single();

    if (menuError) {
      if (menuError.code === '23505') {
        toast.error('A menu item with this name already exists');
      } else {
        toast.error('Failed to create menu item');
      }
      console.error(menuError);
      return;
    }

    // Add ingredients
    const validIngredients = formIngredients.filter(ing => ing.inventoryId && ing.quantity);
    if (validIngredients.length > 0) {
      const { error: ingError } = await supabase
        .from('menu_item_ingredients')
        .insert(
          validIngredients.map(ing => ({
            menu_item_id: menuItem.id,
            inventory_item_id: ing.inventoryId,
            quantity: parseFloat(ing.quantity) || 0,
          }))
        );

      if (ingError) {
        console.error(ingError);
        toast.error('Menu item created, but some ingredients failed to add');
      }
    }

    toast.success('Menu item created');
    resetForm();
    setIsDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete menu item');
      console.error(error);
    } else {
      toast.success('Menu item deleted');
      fetchData();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Recipe Builder</h2>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              New Recipe
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Menu Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="menuName">Menu Item Name</Label>
                <Input
                  id="menuName"
                  placeholder="e.g., Cappuccino 12oz"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="retailPrice">Retail Price ($)</Label>
                  <Input
                    id="retailPrice"
                    type="number"
                    step="0.01"
                    placeholder="5.50"
                    value={formRetailPrice}
                    onChange={(e) => setFormRetailPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    placeholder="e.g., Beverages"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  />
                </div>
              </div>

              {/* Ingredients */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Ingredients</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addIngredientRow}
                    disabled={inventoryItems.length === 0}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                
                {inventoryItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Add inventory items first to create recipes
                  </p>
                ) : formIngredients.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Click "Add" to include ingredients
                  </p>
                ) : (
                  <div className="space-y-2">
                    {formIngredients.map((ing, index) => {
                      const selectedItem = inventoryItems.find(i => i.id === ing.inventoryId);
                      return (
                        <div key={index} className="flex gap-2 items-center">
                          <Select
                            value={ing.inventoryId}
                            onValueChange={(v) => updateIngredient(index, 'inventoryId', v)}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {inventoryItems.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Qty"
                            value={ing.quantity}
                            onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                            className="w-20"
                          />
                          <span className="text-xs text-muted-foreground w-12">
                            {selectedItem ? UNIT_LABELS[selectedItem.unit_type] : ''}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeIngredientRow(index)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Button onClick={handleSave} className="w-full">
                Create Menu Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Menu Items Grid */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : menuItems.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No menu items yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Build recipes to track profitability
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {menuItems.map((item) => {
            const cost = calculateCost(item.ingredients);
            const profit = item.retail_price - cost;
            const margin = item.retail_price > 0 ? (profit / item.retail_price) * 100 : 0;
            const isProfit = profit >= 0;

            return (
              <Card key={item.id} className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base pr-8">{item.name}</CardTitle>
                  {item.category && (
                    <CardDescription>{item.category}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Ingredients */}
                  {item.ingredients.length > 0 && (
                    <div className="text-xs space-y-1 text-muted-foreground">
                      {item.ingredients.map((ing) => (
                        <div key={ing.id} className="flex justify-between">
                          <span>
                            {ing.inventory_item?.name || 'Unknown'} × {ing.quantity}
                          </span>
                          <span className="font-mono">
                            ${((ing.inventory_item?.current_unit_price || 0) * ing.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Profitability */}
                  <div className="border-t pt-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cost</span>
                      <span className="font-mono">${cost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Retail</span>
                      <span className="font-mono">${item.retail_price.toFixed(2)}</span>
                    </div>
                    <div className={`flex justify-between text-sm font-semibold ${isProfit ? 'text-green-600' : 'text-destructive'}`}>
                      <span className="flex items-center gap-1">
                        {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        Profit
                      </span>
                      <span className="font-mono">
                        ${profit.toFixed(2)} ({margin.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
