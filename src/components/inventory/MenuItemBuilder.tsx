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
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ChefHat, Trash2, TrendingUp, TrendingDown, Minus, Percent, Pencil, RefreshCw, Layers } from 'lucide-react';
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
  package_size: number;
  package_price: number;
}

interface MenuItem {
  id: string;
  name: string;
  retail_price: number;
  category: string | null;
  ingredients: MenuItemIngredient[];
  modifiers?: RecipeModifier[];
}

interface MenuItemIngredient {
  id: string;
  inventory_item_id: string;
  quantity: number;
  usage_unit: UsageUnit;
  inventory_item?: InventoryItem;
}

interface RecipeModifier {
  id: string;
  name: string;
  modifier_type: 'add' | 'replace' | 'size';
  price_adjustment: number;
  is_default: boolean;
  ingredients: ModifierIngredient[];
}

interface ModifierIngredient {
  id: string;
  inventory_item_id: string;
  quantity: number;
  usage_unit: UsageUnit;
  action: 'add' | 'replace' | 'multiply';
  replaces_ingredient_id?: string;
  inventory_item?: InventoryItem;
}

interface FormIngredient {
  inventoryId: string;
  quantity: string;
  usageUnit: UsageUnit;
}

interface FormModifier {
  name: string;
  type: 'add' | 'replace' | 'size';
  priceAdjustment: string;
  ingredients: FormModifierIngredient[];
}

interface FormModifierIngredient {
  inventoryId: string;
  quantity: string;
  usageUnit: UsageUnit;
  action: 'add' | 'replace' | 'multiply';
  replacesIngredientId?: string;
}

// Size presets for coffee shops
const SIZE_PRESETS = [
  { name: 'Small (10oz)', multiplier: 0.7 },
  { name: 'Medium (14oz)', multiplier: 1.0 },
  { name: 'Large (16oz)', multiplier: 1.15 },
];

export function MenuItemBuilder() {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [dialogTab, setDialogTab] = useState<'recipe' | 'modifiers'>('recipe');
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formRetailPrice, setFormRetailPrice] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formIngredients, setFormIngredients] = useState<FormIngredient[]>([]);
  const [formModifiers, setFormModifiers] = useState<FormModifier[]>([]);

  const fetchData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    const { data: invData } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    
    setInventoryItems(invData || []);

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

    const menuItemsWithIngredients: MenuItem[] = [];
    for (const menu of menuData || []) {
      const { data: ingredients } = await supabase
        .from('menu_item_ingredients')
        .select('id, inventory_item_id, quantity, usage_unit')
        .eq('menu_item_id', menu.id);

      // Fetch modifiers
      const { data: modifiersData } = await supabase
        .from('recipe_modifiers')
        .select('id, name, modifier_type, price_adjustment, is_default')
        .eq('menu_item_id', menu.id);

      const modifiers: RecipeModifier[] = [];
      for (const mod of modifiersData || []) {
        const { data: modIngredients } = await supabase
          .from('modifier_ingredients')
          .select('id, inventory_item_id, quantity, usage_unit, action, replaces_ingredient_id')
          .eq('modifier_id', mod.id);

        modifiers.push({
          ...mod,
          modifier_type: mod.modifier_type as 'add' | 'replace' | 'size',
          ingredients: (modIngredients || []).map(ing => ({
            ...ing,
            usage_unit: ing.usage_unit as UsageUnit,
            action: ing.action as 'add' | 'replace' | 'multiply',
            inventory_item: invData?.find(inv => inv.id === ing.inventory_item_id),
          })),
        });
      }

      menuItemsWithIngredients.push({
        ...menu,
        ingredients: (ingredients || []).map(ing => ({
          ...ing,
          usage_unit: (ing.usage_unit as UsageUnit) || 'oz',
          inventory_item: invData?.find(inv => inv.id === ing.inventory_item_id),
        })),
        modifiers,
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
    setFormModifiers([]);
    setEditingItem(null);
    setDialogTab('recipe');
  };

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormRetailPrice(item.retail_price.toString());
    setFormCategory(item.category || '');
    setFormIngredients(item.ingredients.map(ing => ({
      inventoryId: ing.inventory_item_id,
      quantity: ing.quantity.toString(),
      usageUnit: ing.usage_unit,
    })));
    setFormModifiers((item.modifiers || []).map(mod => ({
      name: mod.name,
      type: mod.modifier_type,
      priceAdjustment: mod.price_adjustment.toString(),
      ingredients: mod.ingredients.map(ing => ({
        inventoryId: ing.inventory_item_id,
        quantity: ing.quantity.toString(),
        usageUnit: ing.usage_unit,
        action: ing.action,
        replacesIngredientId: ing.replaces_ingredient_id,
      })),
    })));
    setIsDialogOpen(true);
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
    
    if (field === 'inventoryId') {
      const item = inventoryItems.find(i => i.id === value);
      if (item) {
        const compatibleUnits = getCompatibleUnits(item.unit_type);
        updated[index].usageUnit = compatibleUnits[0];
      }
    }
    
    setFormIngredients(updated);
  };

  // Modifier management
  const addModifier = (type: 'add' | 'replace' | 'size') => {
    const defaultName = type === 'add' ? 'Extra Shot' : type === 'replace' ? 'Sub Oat Milk' : 'Large Size';
    setFormModifiers([...formModifiers, { 
      name: defaultName, 
      type, 
      priceAdjustment: type === 'size' ? '0.50' : '0.75',
      ingredients: []
    }]);
  };

  const removeModifier = (index: number) => {
    setFormModifiers(formModifiers.filter((_, i) => i !== index));
  };

  const updateModifier = (index: number, field: keyof Omit<FormModifier, 'ingredients'>, value: string) => {
    const updated = [...formModifiers];
    if (field === 'type') {
      updated[index][field] = value as 'add' | 'replace' | 'size';
    } else {
      updated[index][field] = value;
    }
    setFormModifiers(updated);
  };

  const addModifierIngredient = (modIndex: number) => {
    const updated = [...formModifiers];
    updated[modIndex].ingredients.push({
      inventoryId: '',
      quantity: '',
      usageUnit: 'oz',
      action: updated[modIndex].type === 'size' ? 'multiply' : 'add',
    });
    setFormModifiers(updated);
  };

  const removeModifierIngredient = (modIndex: number, ingIndex: number) => {
    const updated = [...formModifiers];
    updated[modIndex].ingredients = updated[modIndex].ingredients.filter((_, i) => i !== ingIndex);
    setFormModifiers(updated);
  };

  const updateModifierIngredient = (
    modIndex: number, 
    ingIndex: number, 
    field: keyof FormModifierIngredient, 
    value: string
  ) => {
    const updated = [...formModifiers];
    const ing = updated[modIndex].ingredients[ingIndex];
    if (field === 'usageUnit') {
      ing[field] = value as UsageUnit;
    } else if (field === 'action') {
      ing[field] = value as 'add' | 'replace' | 'multiply';
    } else {
      (ing as any)[field] = value;
    }
    setFormModifiers(updated);
  };

  const addSizeModifiers = () => {
    const newModifiers: FormModifier[] = SIZE_PRESETS.map(preset => ({
      name: preset.name,
      type: 'size' as const,
      priceAdjustment: preset.multiplier === 1 ? '0' : preset.multiplier > 1 ? '0.50' : '-0.50',
      ingredients: formIngredients
        .filter(ing => {
          const item = inventoryItems.find(i => i.id === ing.inventoryId);
          return item && (item.unit_type === 'gallon' || item.unit_type === 'lb');
        })
        .map(ing => ({
          inventoryId: ing.inventoryId,
          quantity: preset.multiplier.toString(),
          usageUnit: ing.usageUnit,
          action: 'multiply' as const,
        })),
    }));
    setFormModifiers([...formModifiers, ...newModifiers]);
    toast.success('Added 3 size modifiers (Small/Medium/Large)');
  };

  const calculateCost = (ingredients: MenuItemIngredient[]): number => {
    return ingredients.reduce((sum, ing) => {
      if (!ing.inventory_item) return sum;
      const cost = calculateIngredientCost(
        ing.quantity,
        ing.usage_unit,
        ing.inventory_item.current_unit_price,
        ing.inventory_item.unit_type
      );
      return sum + cost;
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

  const calculateModifierCost = (mod: FormModifier): number => {
    return mod.ingredients.reduce((sum, ing) => {
      if (!ing.inventoryId || !ing.quantity) return sum;
      const item = inventoryItems.find(i => i.id === ing.inventoryId);
      if (!item) return sum;
      
      if (ing.action === 'multiply') {
        // For size multipliers, calculate based on base recipe scaled
        const baseIngCost = calculateFormCost();
        return sum + (baseIngCost * (parseFloat(ing.quantity) - 1));
      }
      
      return sum + calculateIngredientCost(
        parseFloat(ing.quantity) || 0,
        ing.usageUnit,
        item.current_unit_price,
        item.unit_type
      );
    }, 0);
  };

  const handleSave = async () => {
    if (!user || !formName.trim()) {
      toast.error('Please enter a menu item name');
      return;
    }

    try {
      let menuItemId: string;

      if (editingItem) {
        // Update existing
        const { error: updateError } = await supabase
          .from('menu_items')
          .update({
            name: formName.trim(),
            retail_price: parseFloat(formRetailPrice) || 0,
            category: formCategory || null,
          })
          .eq('id', editingItem.id);

        if (updateError) throw updateError;
        menuItemId = editingItem.id;

        // Delete old ingredients and modifiers
        await supabase.from('menu_item_ingredients').delete().eq('menu_item_id', menuItemId);
        await supabase.from('recipe_modifiers').delete().eq('menu_item_id', menuItemId);
      } else {
        // Create new
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
          return;
        }
        menuItemId = menuItem.id;
      }

      // Add ingredients
      const validIngredients = formIngredients.filter(ing => ing.inventoryId && ing.quantity);
      if (validIngredients.length > 0) {
        await supabase.from('menu_item_ingredients').insert(
          validIngredients.map(ing => ({
            menu_item_id: menuItemId,
            inventory_item_id: ing.inventoryId,
            quantity: parseFloat(ing.quantity) || 0,
            usage_unit: ing.usageUnit,
          }))
        );
      }

      // Add modifiers
      for (const mod of formModifiers) {
        const { data: modifierData, error: modError } = await supabase
          .from('recipe_modifiers')
          .insert({
            menu_item_id: menuItemId,
            name: mod.name,
            modifier_type: mod.type,
            price_adjustment: parseFloat(mod.priceAdjustment) || 0,
          })
          .select()
          .single();

        if (modError) continue;

        const validModIngs = mod.ingredients.filter(ing => ing.inventoryId && ing.quantity);
        if (validModIngs.length > 0) {
          await supabase.from('modifier_ingredients').insert(
            validModIngs.map(ing => ({
              modifier_id: modifierData.id,
              inventory_item_id: ing.inventoryId,
              quantity: parseFloat(ing.quantity) || 0,
              usage_unit: ing.usageUnit,
              action: ing.action,
              replaces_ingredient_id: ing.replacesIngredientId || null,
            }))
          );
        }
      }

      toast.success(editingItem ? 'Menu item updated' : 'Menu item created');
      resetForm();
      setIsDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save menu item');
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete menu item');
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
        <Button size="sm" className="gap-1" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
          <Plus className="h-4 w-4" />
          New Recipe
        </Button>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Create Menu Item'}</DialogTitle>
          </DialogHeader>
          
          <Tabs value={dialogTab} onValueChange={(v) => setDialogTab(v as 'recipe' | 'modifiers')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recipe">Recipe</TabsTrigger>
              <TabsTrigger value="modifiers">Modifiers ({formModifiers.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="recipe" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="menuName">Menu Item Name</Label>
                <Input
                  id="menuName"
                  placeholder="e.g., Latte"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="retailPrice">Base Price ($)</Label>
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
                  <Label>Base Ingredients</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addIngredientRow} disabled={inventoryItems.length === 0}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                
                {inventoryItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Add inventory items first</p>
                ) : formIngredients.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Click "Add" to include ingredients</p>
                ) : (
                  <div className="space-y-3">
                    {formIngredients.map((ing, index) => {
                      const selectedItem = inventoryItems.find(i => i.id === ing.inventoryId);
                      const compatibleUnits = selectedItem ? getCompatibleUnits(selectedItem.unit_type) : ['each' as UsageUnit];
                      const ingredientCost = selectedItem && ing.quantity
                        ? calculateIngredientCost(parseFloat(ing.quantity) || 0, ing.usageUnit, selectedItem.current_unit_price, selectedItem.unit_type)
                        : 0;

                      return (
                        <div key={index} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                          <div className="flex gap-2 items-start">
                            <Select value={ing.inventoryId} onValueChange={(v) => updateIngredient(index, 'inventoryId', v)}>
                              <SelectTrigger className="flex-1"><SelectValue placeholder="Select item" /></SelectTrigger>
                              <SelectContent>
                                {inventoryItems.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.name} (${item.current_unit_price.toFixed(2)}/{PURCHASE_UNIT_LABELS[item.unit_type]})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0" onClick={() => removeIngredientRow(index)}>
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                          {selectedItem && (
                            <div className="flex gap-2 items-center">
                              <Input type="number" step="0.01" placeholder="Qty" value={ing.quantity} onChange={(e) => updateIngredient(index, 'quantity', e.target.value)} className="w-24" />
                              <Select value={ing.usageUnit} onValueChange={(v) => updateIngredient(index, 'usageUnit', v)}>
                                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {compatibleUnits.map((unit) => (<SelectItem key={unit} value={unit}>{USAGE_UNIT_LABELS[unit]}</SelectItem>))}
                                </SelectContent>
                              </Select>
                              <span className="text-sm text-muted-foreground flex-1">= ${ingredientCost.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cost Preview */}
              {formIngredients.length > 0 && (
                <div className="p-4 rounded-lg border-2 border-primary/20 bg-primary/5 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base Cost</span>
                    <span className="font-mono font-medium">${formTotalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base Price</span>
                    <span className="font-mono">${formRetailPriceNum.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className={`font-medium flex items-center gap-1 ${formProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />} Profit
                    </span>
                    <span className={`font-mono font-bold ${formProfit >= 0 ? 'text-success' : 'text-destructive'}`}>${formProfit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground flex items-center gap-1"><Percent className="h-3 w-3" /> Food Cost %</span>
                    <Badge variant={formFoodCostPercent <= 30 ? 'default' : formFoodCostPercent <= 35 ? 'secondary' : 'destructive'}>
                      {formFoodCostPercent.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="modifiers" className="space-y-4 pt-4">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => addModifier('add')}>
                  <Plus className="h-3 w-3 mr-1" /> Add Ingredient
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addModifier('replace')}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Substitute
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={addSizeModifiers} disabled={formIngredients.length === 0}>
                  <Layers className="h-3 w-3 mr-1" /> Add Sizes (S/M/L)
                </Button>
              </div>

              {formModifiers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No modifiers yet. Add modifiers to customize this menu item.</p>
              ) : (
                <div className="space-y-4">
                  {formModifiers.map((mod, modIndex) => {
                    const modCost = calculateModifierCost(mod);
                    return (
                      <Card key={modIndex} className="relative">
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-destructive" onClick={() => removeModifier(modIndex)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <CardHeader className="pb-2">
                          <div className="flex gap-2 items-center pr-8">
                            <Input value={mod.name} onChange={(e) => updateModifier(modIndex, 'name', e.target.value)} placeholder="Modifier name" className="flex-1" />
                            <Badge variant="outline">{mod.type}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Price Adjustment ($)</Label>
                              <Input type="number" step="0.01" value={mod.priceAdjustment} onChange={(e) => updateModifier(modIndex, 'priceAdjustment', e.target.value)} />
                            </div>
                            <div>
                              <Label className="text-xs">Added Cost</Label>
                              <div className="h-9 flex items-center text-sm font-mono">${modCost.toFixed(2)}</div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Ingredients</Label>
                              <Button type="button" variant="ghost" size="sm" onClick={() => addModifierIngredient(modIndex)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            {mod.ingredients.map((ing, ingIndex) => {
                              const item = inventoryItems.find(i => i.id === ing.inventoryId);
                              return (
                                <div key={ingIndex} className="flex gap-2 items-center p-2 bg-muted/30 rounded">
                                  <Select value={ing.inventoryId} onValueChange={(v) => updateModifierIngredient(modIndex, ingIndex, 'inventoryId', v)}>
                                    <SelectTrigger className="flex-1 h-8"><SelectValue placeholder="Item" /></SelectTrigger>
                                    <SelectContent>
                                      {inventoryItems.map((item) => (<SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>))}
                                    </SelectContent>
                                  </Select>
                                  <Input type="number" step="0.01" value={ing.quantity} onChange={(e) => updateModifierIngredient(modIndex, ingIndex, 'quantity', e.target.value)} className="w-16 h-8" placeholder={mod.type === 'size' ? 'x' : 'qty'} />
                                  {mod.type === 'size' && <span className="text-xs text-muted-foreground">×</span>}
                                  {mod.type !== 'size' && item && (
                                    <span className="text-xs">{USAGE_UNIT_LABELS[ing.usageUnit]}</span>
                                  )}
                                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeModifierIngredient(modIndex, ingIndex)}>
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <Button onClick={handleSave} className="w-full mt-4">
            {editingItem ? 'Update Menu Item' : 'Create Menu Item'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Menu Items Grid */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : menuItems.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No menu items yet</p>
          <p className="text-sm text-muted-foreground mt-1">Build recipes to track profitability</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {menuItems.map((item) => {
            const cost = calculateCost(item.ingredients);
            const profit = item.retail_price - cost;
            const foodCostPercent = item.retail_price > 0 ? (cost / item.retail_price) * 100 : 0;
            const isHealthy = foodCostPercent <= 30;

            return (
              <Card 
                key={item.id} 
                className="relative cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => openEditDialog(item)}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-10 h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={(e) => { e.stopPropagation(); openEditDialog(item); }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between pr-16">
                    <CardTitle className="text-base">{item.name}</CardTitle>
                    <Badge variant={isHealthy ? 'default' : foodCostPercent <= 35 ? 'secondary' : 'destructive'}>
                      {foodCostPercent.toFixed(0)}% FC
                    </Badge>
                  </div>
                  {item.category && <CardDescription>{item.category}</CardDescription>}
                  {(item.modifiers?.length || 0) > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.modifiers?.map(mod => (
                        <Badge key={mod.id} variant="outline" className="text-xs">
                          {mod.name} {mod.price_adjustment > 0 ? `+$${mod.price_adjustment.toFixed(2)}` : ''}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {item.ingredients.length > 0 && (
                    <div className="text-xs space-y-1 text-muted-foreground">
                      {item.ingredients.map((ing) => {
                        const ingredientCost = ing.inventory_item 
                          ? calculateIngredientCost(ing.quantity, ing.usage_unit, ing.inventory_item.current_unit_price, ing.inventory_item.unit_type)
                          : 0;
                        return (
                          <div key={ing.id} className="flex justify-between">
                            <span>{ing.inventory_item?.name || 'Unknown'} × {ing.quantity} {USAGE_UNIT_LABELS[ing.usage_unit]}</span>
                            <span className="font-mono">${ingredientCost.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                        {profit >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} Profit
                      </span>
                      <span className="font-mono">${profit.toFixed(2)}</span>
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
