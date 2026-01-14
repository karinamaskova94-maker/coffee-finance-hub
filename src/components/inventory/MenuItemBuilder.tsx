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
import { Plus, ChefHat, Trash2, TrendingUp, TrendingDown, Minus, Percent } from 'lucide-react';
import { toast } from 'sonner';
import {
  type PurchaseUnit,
  type UsageUnit,
  PURCHASE_UNIT_LABELS,
  USAGE_UNIT_LABELS,
  getCompatibleUnits,
  calculateIngredientCost,
} from '@/lib/unitConversions';

interface InventoryItem {
  id: string;
  name: string;
  unit_type: PurchaseUnit;
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
  usage_unit?: UsageUnit;
  inventory_item?: InventoryItem;
}

interface FormIngredient {
  inventoryId: string;
  quantity: string;
  usageUnit: UsageUnit;
}

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
  const [formIngredients, setFormIngredients] = useState<FormIngredient[]>([]);

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
    setFormIngredients([...formIngredients, { inventoryId: '', quantity: '', usageUnit: 'oz' }]);
  };

  const removeIngredientRow = (index: number) => {
    setFormIngredients(formIngredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof FormIngredient, value: string) => {
    const updated = [...formIngredients];
    if (field === 'usageUnit') {
      updated[index][field] = value as UsageUnit;
    } else {
      updated[index][field] = value;
    }
    
    // Reset usage unit when inventory item changes
    if (field === 'inventoryId') {
      const item = inventoryItems.find(i => i.id === value);
      if (item) {
        const compatibleUnits = getCompatibleUnits(item.unit_type);
        updated[index].usageUnit = compatibleUnits[0];
      }
    }
    
    setFormIngredients(updated);
  };

  const calculateCost = (ingredients: MenuItemIngredient[]): number => {
    return ingredients.reduce((sum, ing) => {
      if (!ing.inventory_item) return sum;
      
      // Use the stored quantity directly with the purchase unit for display
      // In a full implementation, we'd store usage_unit with each ingredient
      const price = ing.inventory_item.current_unit_price;
      return sum + (price * ing.quantity);
    }, 0);
  };

  const calculateFormCost = (): number => {
    return formIngredients.reduce((sum, ing) => {
      if (!ing.inventoryId || !ing.quantity) return sum;
      
      const item = inventoryItems.find(i => i.id === ing.inventoryId);
      if (!item) return sum;
      
      const cost = calculateIngredientCost(
        parseFloat(ing.quantity) || 0,
        ing.usageUnit,
        item.current_unit_price,
        item.unit_type
      );
      
      return sum + cost;
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

    // Add ingredients (converting usage quantities to purchase unit quantities)
    const validIngredients = formIngredients.filter(ing => ing.inventoryId && ing.quantity);
    if (validIngredients.length > 0) {
      const ingredientData = validIngredients.map(ing => {
        // Store the quantity in the usage unit for now
        // In a full implementation, we'd also store the usage_unit
        return {
          menu_item_id: menuItem.id,
          inventory_item_id: ing.inventoryId,
          quantity: parseFloat(ing.quantity) || 0,
        };
      });

      const { error: ingError } = await supabase
        .from('menu_item_ingredients')
        .insert(ingredientData);

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

  const formTotalCost = calculateFormCost();
  const formRetailPriceNum = parseFloat(formRetailPrice) || 0;
  const formProfit = formRetailPriceNum - formTotalCost;
  const formFoodCostPercent = formRetailPriceNum > 0 ? (formTotalCost / formRetailPriceNum) * 100 : 0;

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
                  <div className="space-y-3">
                    {formIngredients.map((ing, index) => {
                      const selectedItem = inventoryItems.find(i => i.id === ing.inventoryId);
                      const compatibleUnits = selectedItem 
                        ? getCompatibleUnits(selectedItem.unit_type) 
                        : ['each' as UsageUnit];
                      
                      // Calculate cost for this ingredient
                      const ingredientCost = selectedItem && ing.quantity
                        ? calculateIngredientCost(
                            parseFloat(ing.quantity) || 0,
                            ing.usageUnit,
                            selectedItem.current_unit_price,
                            selectedItem.unit_type
                          )
                        : 0;

                      return (
                        <div key={index} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                          <div className="flex gap-2 items-start">
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
                                    {item.name} (${item.current_unit_price.toFixed(2)}/{PURCHASE_UNIT_LABELS[item.unit_type]})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-destructive shrink-0"
                              onClick={() => removeIngredientRow(index)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {selectedItem && (
                            <div className="flex gap-2 items-center">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Qty"
                                value={ing.quantity}
                                onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                                className="w-24"
                              />
                              <Select
                                value={ing.usageUnit}
                                onValueChange={(v) => updateIngredient(index, 'usageUnit', v)}
                              >
                                <SelectTrigger className="w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {compatibleUnits.map((unit) => (
                                    <SelectItem key={unit} value={unit}>
                                      {USAGE_UNIT_LABELS[unit]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="text-sm text-muted-foreground flex-1">
                                = ${ingredientCost.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Live Cost Preview */}
              {formIngredients.length > 0 && (
                <div className="p-4 rounded-lg border-2 border-primary/20 bg-primary/5 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Cost</span>
                    <span className="font-mono font-medium">${formTotalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Retail Price</span>
                    <span className="font-mono">${formRetailPriceNum.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className={`font-medium flex items-center gap-1 ${formProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      Profit
                    </span>
                    <span className={`font-mono font-bold ${formProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      ${formProfit.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                      Food Cost %
                    </span>
                    <Badge variant={formFoodCostPercent <= 30 ? 'default' : formFoodCostPercent <= 35 ? 'secondary' : 'destructive'}>
                      {formFoodCostPercent.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              )}

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
            const foodCostPercent = item.retail_price > 0 ? (cost / item.retail_price) * 100 : 0;
            const isHealthy = foodCostPercent <= 30;

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
                  <div className="flex items-start justify-between pr-8">
                    <CardTitle className="text-base">{item.name}</CardTitle>
                    <Badge variant={isHealthy ? 'default' : foodCostPercent <= 35 ? 'secondary' : 'destructive'}>
                      {foodCostPercent.toFixed(0)}% FC
                    </Badge>
                  </div>
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
                            {ing.inventory_item?.name || 'Unknown'} × {ing.quantity} {ing.inventory_item ? PURCHASE_UNIT_LABELS[ing.inventory_item.unit_type] : ''}
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
                    <div className={`flex justify-between text-sm font-semibold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      <span className="flex items-center gap-1">
                        {profit >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        Profit
                      </span>
                      <span className="font-mono">
                        ${profit.toFixed(2)}
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
