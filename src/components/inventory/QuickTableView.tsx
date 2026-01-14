import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Save, RefreshCw, TableIcon, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  type PurchaseUnit,
  type UsageUnit,
  USAGE_UNIT_LABELS,
  calculateIngredientCost,
} from '@/lib/unitConversions';

interface InventoryItem {
  id: string;
  name: string;
  unit_type: PurchaseUnit;
  current_unit_price: number;
}

interface RecipeWithIngredients {
  id: string;
  name: string;
  retail_price: number;
  category: string | null;
  ingredients: {
    id: string;
    inventory_item_id: string;
    quantity: number;
    usage_unit: UsageUnit;
    inventory_item?: InventoryItem;
  }[];
}

// Recipe defaults based on drink type
const RECIPE_DEFAULTS: Record<string, { ingredients: { name: string; quantity: number; unit: UsageUnit }[] }> = {
  latte: {
    ingredients: [
      { name: 'Espresso', quantity: 2, unit: 'oz' },
      { name: 'Whole Milk', quantity: 10, unit: 'oz' },
    ],
  },
  cappuccino: {
    ingredients: [
      { name: 'Espresso', quantity: 2, unit: 'oz' },
      { name: 'Whole Milk', quantity: 6, unit: 'oz' },
    ],
  },
  americano: {
    ingredients: [
      { name: 'Espresso', quantity: 2, unit: 'oz' },
      { name: 'Hot Water', quantity: 10, unit: 'oz' },
    ],
  },
};

// Find best matching inventory item
function findInventoryMatch(ingredientName: string, inventoryItems: InventoryItem[]): InventoryItem | undefined {
  const normalizedName = ingredientName.toLowerCase();
  
  // Direct match
  const directMatch = inventoryItems.find(item => 
    item.name.toLowerCase() === normalizedName
  );
  if (directMatch) return directMatch;
  
  // Partial match
  const partialMatch = inventoryItems.find(item => 
    item.name.toLowerCase().includes(normalizedName) || 
    normalizedName.includes(item.name.toLowerCase())
  );
  if (partialMatch) return partialMatch;
  
  // Keyword match for common items
  const keywords: Record<string, string[]> = {
    'espresso': ['espresso', 'coffee', 'bean'],
    'milk': ['milk', 'whole milk', '2%', 'dairy'],
    'water': ['water', 'hot water'],
    'oat milk': ['oat'],
    'almond milk': ['almond'],
    'vanilla syrup': ['vanilla', 'syrup'],
  };
  
  for (const [key, terms] of Object.entries(keywords)) {
    if (terms.some(t => normalizedName.includes(t))) {
      const match = inventoryItems.find(item => 
        terms.some(t => item.name.toLowerCase().includes(t))
      );
      if (match) return match;
    }
  }
  
  return undefined;
}

// Determine recipe type from name
function getRecipeType(name: string): string | null {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('latte')) return 'latte';
  if (lowerName.includes('cappuccino')) return 'cappuccino';
  if (lowerName.includes('americano')) return 'americano';
  return null;
}

interface EditableIngredient {
  recipeId: string;
  ingredientId: string;
  inventoryItemId: string;
  quantity: number;
  usageUnit: UsageUnit;
  originalQuantity: number;
  isDirty: boolean;
}

export function QuickTableView() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [editableIngredients, setEditableIngredients] = useState<Record<string, EditableIngredient>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isApplyingDefaults, setIsApplyingDefaults] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);

    const { data: invData } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    
    setInventoryItems(invData || []);

    const { data: menuData } = await supabase
      .from('menu_items')
      .select('id, name, retail_price, category')
      .eq('user_id', user.id)
      .order('name');

    const recipesWithIngredients: RecipeWithIngredients[] = [];
    for (const menu of menuData || []) {
      const { data: ingredients } = await supabase
        .from('menu_item_ingredients')
        .select('id, inventory_item_id, quantity, usage_unit')
        .eq('menu_item_id', menu.id);

      recipesWithIngredients.push({
        ...menu,
        ingredients: (ingredients || []).map(ing => ({
          ...ing,
          usage_unit: (ing.usage_unit as UsageUnit) || 'oz',
          inventory_item: invData?.find(inv => inv.id === ing.inventory_item_id),
        })),
      });
    }

    setRecipes(recipesWithIngredients);
    
    // Initialize editable state
    const editable: Record<string, EditableIngredient> = {};
    for (const recipe of recipesWithIngredients) {
      for (const ing of recipe.ingredients) {
        const key = `${recipe.id}-${ing.id}`;
        editable[key] = {
          recipeId: recipe.id,
          ingredientId: ing.id,
          inventoryItemId: ing.inventory_item_id,
          quantity: ing.quantity,
          usageUnit: ing.usage_unit,
          originalQuantity: ing.quantity,
          isDirty: false,
        };
      }
    }
    setEditableIngredients(editable);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const updateQuantity = (recipeId: string, ingredientId: string, newQuantity: number) => {
    const key = `${recipeId}-${ingredientId}`;
    setEditableIngredients(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        quantity: newQuantity,
        isDirty: newQuantity !== prev[key].originalQuantity,
      },
    }));
  };

  const getDirtyIngredients = () => {
    return Object.values(editableIngredients).filter(ing => ing.isDirty);
  };

  const handleSaveAll = async () => {
    const dirtyIngredients = getDirtyIngredients();
    if (dirtyIngredients.length === 0) {
      toast.info('No changes to save');
      return;
    }

    setIsSaving(true);
    try {
      for (const ing of dirtyIngredients) {
        await supabase
          .from('menu_item_ingredients')
          .update({ quantity: ing.quantity })
          .eq('id', ing.ingredientId);
      }
      toast.success(`Updated ${dirtyIngredients.length} ingredient(s)`);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save changes');
    }
    setIsSaving(false);
  };

  const applyGlobalDefaults = async () => {
    if (!user) return;
    
    setIsApplyingDefaults(true);
    let appliedCount = 0;

    try {
      for (const recipe of recipes) {
        const recipeType = getRecipeType(recipe.name);
        if (!recipeType || !RECIPE_DEFAULTS[recipeType]) continue;

        const defaults = RECIPE_DEFAULTS[recipeType];
        
        // Delete existing ingredients
        await supabase
          .from('menu_item_ingredients')
          .delete()
          .eq('menu_item_id', recipe.id);

        // Add default ingredients
        const newIngredients = [];
        for (const defaultIng of defaults.ingredients) {
          const matchedItem = findInventoryMatch(defaultIng.name, inventoryItems);
          if (matchedItem) {
            newIngredients.push({
              menu_item_id: recipe.id,
              inventory_item_id: matchedItem.id,
              quantity: defaultIng.quantity,
              usage_unit: defaultIng.unit,
            });
          }
        }

        if (newIngredients.length > 0) {
          await supabase.from('menu_item_ingredients').insert(newIngredients);
          appliedCount++;
        }
      }

      if (appliedCount > 0) {
        toast.success(`Applied defaults to ${appliedCount} recipe(s)`);
        fetchData();
      } else {
        toast.info('No matching recipes found. Add inventory items first.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to apply defaults');
    }
    setIsApplyingDefaults(false);
  };

  const calculateRecipeCost = (recipe: RecipeWithIngredients): number => {
    return recipe.ingredients.reduce((sum, ing) => {
      const key = `${recipe.id}-${ing.id}`;
      const editable = editableIngredients[key];
      const quantity = editable?.quantity ?? ing.quantity;
      
      if (!ing.inventory_item) return sum;
      return sum + calculateIngredientCost(
        quantity,
        ing.usage_unit,
        ing.inventory_item.current_unit_price,
        ing.inventory_item.unit_type
      );
    }, 0);
  };

  const dirtyCount = getDirtyIngredients().length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TableIcon className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Quick Table View</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={applyGlobalDefaults}
              disabled={isApplyingDefaults || recipes.length === 0}
              className="gap-1"
            >
              <Wand2 className={`h-4 w-4 ${isApplyingDefaults ? 'animate-spin' : ''}`} />
              Apply Defaults
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAll}
              disabled={isSaving || dirtyCount === 0}
              className="gap-1"
            >
              <Save className="h-4 w-4" />
              Save {dirtyCount > 0 && `(${dirtyCount})`}
            </Button>
          </div>
        </div>
        <CardDescription>
          Quickly adjust ingredient quantities across all recipes. "Apply Defaults" sets standard Latte/Cappuccino/Americano ingredients.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading recipes...
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No recipes found. Create recipes first.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6 min-w-[150px]">Recipe</TableHead>
                  <TableHead>Ingredient</TableHead>
                  <TableHead className="w-[100px]">Qty</TableHead>
                  <TableHead className="w-[60px]">Unit</TableHead>
                  <TableHead className="w-[80px] text-right">Cost</TableHead>
                  <TableHead className="w-[80px] text-right">Price</TableHead>
                  <TableHead className="w-[80px] text-right pr-6">FC %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipes.map((recipe) => {
                  const recipeCost = calculateRecipeCost(recipe);
                  const foodCostPercent = recipe.retail_price > 0 
                    ? (recipeCost / recipe.retail_price) * 100 
                    : 0;

                  if (recipe.ingredients.length === 0) {
                    return (
                      <TableRow key={recipe.id}>
                        <TableCell className="pl-6 font-medium">{recipe.name}</TableCell>
                        <TableCell colSpan={4} className="text-muted-foreground italic">
                          No ingredients
                        </TableCell>
                        <TableCell className="text-right">${recipe.retail_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge variant="secondary">-</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return recipe.ingredients.map((ing, ingIndex) => {
                    const key = `${recipe.id}-${ing.id}`;
                    const editable = editableIngredients[key];
                    const isFirst = ingIndex === 0;
                    const isLast = ingIndex === recipe.ingredients.length - 1;

                    return (
                      <TableRow key={key} className={editable?.isDirty ? 'bg-primary/5' : ''}>
                        {isFirst ? (
                          <TableCell 
                            className="pl-6 font-medium align-top"
                            rowSpan={recipe.ingredients.length}
                          >
                            {recipe.name}
                          </TableCell>
                        ) : null}
                        <TableCell>
                          {ing.inventory_item?.name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            value={editable?.quantity ?? ing.quantity}
                            onChange={(e) => updateQuantity(recipe.id, ing.id, parseFloat(e.target.value) || 0)}
                            className={`h-8 w-20 ${editable?.isDirty ? 'border-primary' : ''}`}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {USAGE_UNIT_LABELS[ing.usage_unit]}
                        </TableCell>
                        {isFirst ? (
                          <>
                            <TableCell 
                              className="text-right font-mono align-top"
                              rowSpan={recipe.ingredients.length}
                            >
                              ${recipeCost.toFixed(2)}
                            </TableCell>
                            <TableCell 
                              className="text-right font-mono align-top"
                              rowSpan={recipe.ingredients.length}
                            >
                              ${recipe.retail_price.toFixed(2)}
                            </TableCell>
                            <TableCell 
                              className="text-right pr-6 align-top"
                              rowSpan={recipe.ingredients.length}
                            >
                              <Badge variant={foodCostPercent <= 30 ? 'default' : foodCostPercent <= 35 ? 'secondary' : 'destructive'}>
                                {foodCostPercent.toFixed(0)}%
                              </Badge>
                            </TableCell>
                          </>
                        ) : null}
                      </TableRow>
                    );
                  });
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}