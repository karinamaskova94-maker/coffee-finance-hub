import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Check, Link2, Coffee, Milk, Cookie, Wand2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { type PurchaseUnit, type UsageUnit } from '@/lib/unitConversions';

interface InventoryItem {
  id: string;
  name: string;
  unit_type: PurchaseUnit;
  current_unit_price: number;
}

interface CloverMenuItem {
  id: string;
  name: string;
  price: number;
  modifiers: CloverModifier[];
}

interface CloverModifier {
  id: string;
  name: string;
  price: number;
  suggestedInventory?: string;
  autoLinkKeyword?: string;
}

// Auto-link rules for modifiers
const MODIFIER_AUTO_LINK: Record<string, { inventoryMatch: string; quantity: number; unit: UsageUnit }> = {
  'oat': { inventoryMatch: 'oat milk', quantity: 8, unit: 'oz' },
  'almond': { inventoryMatch: 'almond milk', quantity: 8, unit: 'oz' },
  'syrup': { inventoryMatch: 'vanilla syrup', quantity: 1, unit: 'oz' },
  'shot': { inventoryMatch: 'espresso', quantity: 1, unit: 'oz' },
  'vanilla': { inventoryMatch: 'vanilla syrup', quantity: 1, unit: 'oz' },
  'caramel': { inventoryMatch: 'caramel syrup', quantity: 1, unit: 'oz' },
  'hazelnut': { inventoryMatch: 'hazelnut syrup', quantity: 1, unit: 'oz' },
  'mocha': { inventoryMatch: 'chocolate syrup', quantity: 1, unit: 'oz' },
};

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
  drip: {
    ingredients: [
      { name: 'Drip Coffee', quantity: 12, unit: 'oz' },
    ],
  },
  mocha: {
    ingredients: [
      { name: 'Espresso', quantity: 2, unit: 'oz' },
      { name: 'Whole Milk', quantity: 8, unit: 'oz' },
      { name: 'Chocolate Syrup', quantity: 1, unit: 'oz' },
    ],
  },
};

// Simulated Clover menu data
const MOCK_CLOVER_MENU: CloverMenuItem[] = [
  {
    id: 'clv_1',
    name: 'Latte',
    price: 5.50,
    modifiers: [
      { id: 'mod_1', name: 'Extra Shot', price: 0.75, suggestedInventory: 'Espresso', autoLinkKeyword: 'shot' },
      { id: 'mod_2', name: 'Oat Milk', price: 0.70, suggestedInventory: 'Oat Milk', autoLinkKeyword: 'oat' },
      { id: 'mod_3', name: 'Almond Milk', price: 0.70, suggestedInventory: 'Almond Milk', autoLinkKeyword: 'almond' },
      { id: 'mod_4', name: 'Vanilla Syrup', price: 0.50, suggestedInventory: 'Vanilla Syrup', autoLinkKeyword: 'syrup' },
    ],
  },
  {
    id: 'clv_2',
    name: 'Cappuccino',
    price: 5.00,
    modifiers: [
      { id: 'mod_5', name: 'Extra Shot', price: 0.75, suggestedInventory: 'Espresso', autoLinkKeyword: 'shot' },
      { id: 'mod_6', name: 'Large Size', price: 0.50 },
    ],
  },
  {
    id: 'clv_3',
    name: 'Americano',
    price: 4.00,
    modifiers: [
      { id: 'mod_9', name: 'Extra Shot', price: 0.75, suggestedInventory: 'Espresso', autoLinkKeyword: 'shot' },
    ],
  },
  {
    id: 'clv_4',
    name: 'Drip Coffee',
    price: 3.00,
    modifiers: [
      { id: 'mod_7', name: 'Large', price: 0.50 },
      { id: 'mod_8', name: 'Add Cream', price: 0.00, suggestedInventory: 'Half & Half' },
    ],
  },
  {
    id: 'clv_5',
    name: 'Mocha',
    price: 6.00,
    modifiers: [
      { id: 'mod_10', name: 'Extra Shot', price: 0.75, autoLinkKeyword: 'shot' },
      { id: 'mod_11', name: 'Oat Milk', price: 0.70, autoLinkKeyword: 'oat' },
    ],
  },
];

// Find best matching inventory item
function findInventoryMatch(searchTerm: string, inventoryItems: InventoryItem[]): InventoryItem | undefined {
  const normalizedSearch = searchTerm.toLowerCase();
  
  // Direct match
  const directMatch = inventoryItems.find(item => 
    item.name.toLowerCase() === normalizedSearch
  );
  if (directMatch) return directMatch;
  
  // Partial match
  const partialMatch = inventoryItems.find(item => 
    item.name.toLowerCase().includes(normalizedSearch) || 
    normalizedSearch.includes(item.name.toLowerCase())
  );
  if (partialMatch) return partialMatch;
  
  // Keyword match
  const keywords: Record<string, string[]> = {
    'espresso': ['espresso', 'coffee', 'bean'],
    'milk': ['milk', 'whole milk', '2%', 'dairy'],
    'water': ['water', 'hot water'],
    'oat milk': ['oat'],
    'almond milk': ['almond'],
    'vanilla syrup': ['vanilla', 'syrup'],
    'chocolate syrup': ['chocolate', 'mocha', 'cocoa'],
    'drip coffee': ['drip', 'brew'],
  };
  
  for (const [key, terms] of Object.entries(keywords)) {
    if (terms.some(t => normalizedSearch.includes(t))) {
      const match = inventoryItems.find(item => 
        terms.some(t => item.name.toLowerCase().includes(t)) ||
        item.name.toLowerCase().includes(key)
      );
      if (match) return match;
    }
  }
  
  return undefined;
}

// Determine recipe type from name
function getRecipeType(name: string): string | null {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('latte') && !lowerName.includes('chai')) return 'latte';
  if (lowerName.includes('cappuccino')) return 'cappuccino';
  if (lowerName.includes('americano')) return 'americano';
  if (lowerName.includes('drip') || lowerName.includes('brew')) return 'drip';
  if (lowerName.includes('mocha')) return 'mocha';
  return null;
}

export function CloverSync() {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isApplyingDefaults, setIsApplyingDefaults] = useState(false);
  const [isAutoLinking, setIsAutoLinking] = useState(false);
  const [syncedItems, setSyncedItems] = useState<CloverMenuItem[]>([]);
  const [linkedModifiers, setLinkedModifiers] = useState<Record<string, boolean>>({});
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [createdRecipes, setCreatedRecipes] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchInventory();
    }
  }, [user?.id]);

  const fetchInventory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    setInventoryItems(data || []);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setSyncedItems(MOCK_CLOVER_MENU);
    setIsSyncing(false);
    toast.success(`Synced ${MOCK_CLOVER_MENU.length} menu items from Clover`);
  };

  const linkModifier = (modifierId: string) => {
    setLinkedModifiers(prev => ({ ...prev, [modifierId]: true }));
    toast.success('Modifier linked to inventory');
  };

  const autoLinkAllModifiers = async () => {
    setIsAutoLinking(true);
    const linked: Record<string, boolean> = {};
    let linkCount = 0;

    for (const item of syncedItems) {
      for (const mod of item.modifiers) {
        const modNameLower = mod.name.toLowerCase();
        
        // Check auto-link keywords
        for (const [keyword, linkInfo] of Object.entries(MODIFIER_AUTO_LINK)) {
          if (modNameLower.includes(keyword)) {
            const matchedItem = findInventoryMatch(linkInfo.inventoryMatch, inventoryItems);
            if (matchedItem) {
              linked[mod.id] = true;
              linkCount++;
              break;
            }
          }
        }
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    setLinkedModifiers(prev => ({ ...prev, ...linked }));
    setIsAutoLinking(false);
    
    if (linkCount > 0) {
      toast.success(`Auto-linked ${linkCount} modifier(s) to inventory`);
    } else {
      toast.info('No matching inventory items found. Add Oat Milk, Almond Milk, Vanilla Syrup to inventory first.');
    }
  };

  const applyGlobalDefaults = async () => {
    if (!user) return;
    
    setIsApplyingDefaults(true);
    const created: string[] = [];

    try {
      for (const cloverItem of syncedItems) {
        const recipeType = getRecipeType(cloverItem.name);
        if (!recipeType || !RECIPE_DEFAULTS[recipeType]) continue;

        const defaults = RECIPE_DEFAULTS[recipeType];

        // Check if menu item already exists
        const { data: existing } = await supabase
          .from('menu_items')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', cloverItem.name)
          .single();

        let menuItemId: string;

        if (existing) {
          menuItemId = existing.id;
          // Delete existing ingredients
          await supabase
            .from('menu_item_ingredients')
            .delete()
            .eq('menu_item_id', menuItemId);
        } else {
          // Create new menu item
          const { data: newItem, error } = await supabase
            .from('menu_items')
            .insert({
              name: cloverItem.name,
              retail_price: cloverItem.price,
              category: 'Espresso Drinks',
              user_id: user.id,
            })
            .select()
            .single();

          if (error || !newItem) continue;
          menuItemId = newItem.id;
        }

        // Add default ingredients
        const ingredients = [];
        for (const defaultIng of defaults.ingredients) {
          const matchedItem = findInventoryMatch(defaultIng.name, inventoryItems);
          if (matchedItem) {
            ingredients.push({
              menu_item_id: menuItemId,
              inventory_item_id: matchedItem.id,
              quantity: defaultIng.quantity,
              usage_unit: defaultIng.unit,
            });
          }
        }

        if (ingredients.length > 0) {
          await supabase.from('menu_item_ingredients').insert(ingredients);
          created.push(cloverItem.name);
        }
      }

      setCreatedRecipes(created);
      
      if (created.length > 0) {
        toast.success(`Applied defaults to ${created.length} recipe(s): ${created.join(', ')}`);
      } else {
        toast.info('Add inventory items (Espresso, Whole Milk, Hot Water) first to apply defaults.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to apply defaults');
    }
    
    setIsApplyingDefaults(false);
  };

  const getIcon = (name: string) => {
    if (name.toLowerCase().includes('coffee') || name.toLowerCase().includes('latte') || 
        name.toLowerCase().includes('cappuccino') || name.toLowerCase().includes('americano') ||
        name.toLowerCase().includes('mocha')) {
      return <Coffee className="h-4 w-4" />;
    }
    if (name.toLowerCase().includes('milk')) {
      return <Milk className="h-4 w-4" />;
    }
    if (name.toLowerCase().includes('cookie')) {
      return <Cookie className="h-4 w-4" />;
    }
    return <Coffee className="h-4 w-4" />;
  };

  const unlinkedCount = syncedItems.reduce((count, item) => 
    count + item.modifiers.filter(m => !linkedModifiers[m.id] && (m.suggestedInventory || m.autoLinkKeyword)).length, 0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">Clover POS Sync</h3>
          <p className="text-sm text-muted-foreground">Import menu items and auto-apply recipe defaults</p>
        </div>
        <Button onClick={handleSync} disabled={isSyncing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync with Clover'}
        </Button>
      </div>

      {syncedItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Link2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Click "Sync with Clover" to import your menu</p>
            <p className="text-xs text-muted-foreground mt-1">(This is a simulation for demo purposes)</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Bulk Actions */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">{syncedItems.length} items synced</span>
                  {unlinkedCount > 0 && (
                    <span className="text-muted-foreground"> • {unlinkedCount} modifiers to link</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={autoLinkAllModifiers}
                    disabled={isAutoLinking || unlinkedCount === 0}
                    className="gap-1"
                  >
                    <Link2 className={`h-4 w-4 ${isAutoLinking ? 'animate-pulse' : ''}`} />
                    Auto-Link Modifiers
                  </Button>
                  <Button
                    size="sm"
                    onClick={applyGlobalDefaults}
                    disabled={isApplyingDefaults}
                    className="gap-1"
                  >
                    <Wand2 className={`h-4 w-4 ${isApplyingDefaults ? 'animate-spin' : ''}`} />
                    Apply Recipe Defaults
                  </Button>
                </div>
              </div>
              {createdRecipes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {createdRecipes.map(name => (
                    <Badge key={name} variant="default" className="gap-1">
                      <Check className="h-3 w-3" /> {name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-3">
            {syncedItems.map(item => {
              const recipeType = getRecipeType(item.name);
              const hasDefaults = recipeType && RECIPE_DEFAULTS[recipeType];
              
              return (
                <Card key={item.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getIcon(item.name)}
                        <CardTitle className="text-base">{item.name}</CardTitle>
                        {hasDefaults && (
                          <Badge variant="outline" className="text-xs">
                            {RECIPE_DEFAULTS[recipeType!].ingredients.map(i => `${i.quantity}oz ${i.name}`).join(' + ')}
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline">${item.price.toFixed(2)}</Badge>
                    </div>
                    {item.modifiers.length > 0 && (
                      <CardDescription>{item.modifiers.length} modifier(s)</CardDescription>
                    )}
                  </CardHeader>
                  {item.modifiers.length > 0 && (
                    <CardContent>
                      <div className="space-y-2">
                        {item.modifiers.map(mod => {
                          const autoLinkInfo = mod.autoLinkKeyword ? MODIFIER_AUTO_LINK[mod.autoLinkKeyword] : null;
                          const matchedInventory = autoLinkInfo 
                            ? findInventoryMatch(autoLinkInfo.inventoryMatch, inventoryItems)
                            : mod.suggestedInventory 
                              ? findInventoryMatch(mod.suggestedInventory, inventoryItems)
                              : null;

                          return (
                            <div key={mod.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{mod.name}</span>
                                <span className="text-sm text-muted-foreground">+${mod.price.toFixed(2)}</span>
                                {autoLinkInfo && matchedInventory && !linkedModifiers[mod.id] && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <ArrowRight className="h-3 w-3" />
                                    +{autoLinkInfo.quantity}{autoLinkInfo.unit} {matchedInventory.name}
                                  </span>
                                )}
                              </div>
                              {linkedModifiers[mod.id] ? (
                                <Badge variant="default" className="gap-1">
                                  <Check className="h-3 w-3" /> Linked
                                </Badge>
                              ) : matchedInventory ? (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-7 text-xs"
                                  onClick={() => linkModifier(mod.id)}
                                >
                                  Match to "{matchedInventory.name}"
                                </Button>
                              ) : mod.suggestedInventory ? (
                                <Badge variant="secondary" className="text-xs">
                                  Add "{mod.suggestedInventory}" to inventory
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">No match</Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
