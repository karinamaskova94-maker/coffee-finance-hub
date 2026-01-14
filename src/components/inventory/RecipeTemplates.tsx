import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Coffee, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { COFFEE_SHOP_TEMPLATES, type RecipeTemplate } from '@/lib/recipeTemplates';
import { type PurchaseUnit, type UsageUnit } from '@/lib/unitConversions';

interface InventoryItem {
  id: string;
  name: string;
  unit_type: PurchaseUnit;
  current_unit_price: number;
}

interface RecipeTemplatesProps {
  inventoryItems: InventoryItem[];
  onComplete: () => void;
}

export function RecipeTemplates({ inventoryItems, onComplete }: RecipeTemplatesProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  // Find matching inventory items for a template ingredient
  const findMatchingInventory = (matchTerms: string[]): InventoryItem | null => {
    const normalizedTerms = matchTerms.map(t => t.toLowerCase());
    
    for (const item of inventoryItems) {
      const itemName = item.name.toLowerCase();
      if (normalizedTerms.some(term => itemName.includes(term))) {
        return item;
      }
    }
    return null;
  };

  // Check how many ingredients can be matched for a template
  const getTemplateMatchInfo = (template: RecipeTemplate) => {
    let matched = 0;
    let total = template.ingredients.length;
    
    for (const ing of template.ingredients) {
      if (findMatchingInventory(ing.matchTerms)) {
        matched++;
      }
    }
    
    return { matched, total, complete: matched === total };
  };

  const toggleTemplate = (name: string) => {
    const newSelected = new Set(selectedTemplates);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelectedTemplates(newSelected);
  };

  const handleCreate = async () => {
    if (!user || selectedTemplates.size === 0) return;
    
    setIsCreating(true);

    try {
      const templatesToCreate = COFFEE_SHOP_TEMPLATES.filter(t => selectedTemplates.has(t.name));
      let created = 0;
      let skipped = 0;

      for (const template of templatesToCreate) {
        // Check if menu item already exists
        const { data: existing } = await supabase
          .from('menu_items')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', template.name)
          .single();

        if (existing) {
          skipped++;
          continue;
        }

        // Create menu item
        const { data: menuItem, error: menuError } = await supabase
          .from('menu_items')
          .insert({
            name: template.name,
            retail_price: template.retailPrice,
            category: template.category,
            user_id: user.id,
          })
          .select()
          .single();

        if (menuError) {
          console.error('Menu item error:', menuError);
          continue;
        }

        // Add ingredients that have matching inventory
        const ingredientsToAdd = [];
        for (const ing of template.ingredients) {
          const match = findMatchingInventory(ing.matchTerms);
          if (match) {
            ingredientsToAdd.push({
              menu_item_id: menuItem.id,
              inventory_item_id: match.id,
              quantity: ing.quantity,
              usage_unit: ing.usageUnit,
            });
          }
        }

        if (ingredientsToAdd.length > 0) {
          await supabase
            .from('menu_item_ingredients')
            .insert(ingredientsToAdd);
        }

        created++;
      }

      if (created > 0) {
        toast.success(`Created ${created} recipe${created > 1 ? 's' : ''}!`);
      }
      if (skipped > 0) {
        toast.info(`Skipped ${skipped} existing recipe${skipped > 1 ? 's' : ''}`);
      }

      setIsOpen(false);
      setSelectedTemplates(new Set());
      onComplete();
    } catch (error) {
      console.error(error);
      toast.error('Failed to create recipes');
    } finally {
      setIsCreating(false);
    }
  };

  // Group templates by category
  const templatesByCategory = COFFEE_SHOP_TEMPLATES.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, RecipeTemplate[]>);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Sparkles className="w-4 h-4" />
        Quick Start Templates
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coffee className="w-5 h-5 text-primary" />
              Coffee Shop Recipe Templates
            </DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-4">
              Select templates to add. Recipes will auto-link to matching inventory items.
            </p>

            {inventoryItems.length === 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 mb-4">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                  Add inventory items first (Espresso, Milk, etc.) for best results.
                </div>
              </div>
            )}

            <div className="space-y-4">
              {Object.entries(templatesByCategory).map(([category, templates]) => (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">{category}</h4>
                  <div className="space-y-2">
                    {templates.map(template => {
                      const matchInfo = getTemplateMatchInfo(template);
                      const isSelected = selectedTemplates.has(template.name);

                      return (
                        <Card
                          key={template.name}
                          className={`cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'}`}
                          onClick={() => toggleTemplate(template.name)}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              className="pointer-events-none"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{template.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  ${template.retailPrice.toFixed(2)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {template.ingredients.map(i => i.inventoryName).join(', ')}
                              </p>
                            </div>
                            <Badge
                              variant={matchInfo.complete ? 'default' : matchInfo.matched > 0 ? 'secondary' : 'outline'}
                              className="shrink-0"
                            >
                              {matchInfo.complete ? (
                                <Check className="w-3 h-3 mr-1" />
                              ) : null}
                              {matchInfo.matched}/{matchInfo.total}
                            </Badge>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || selectedTemplates.size === 0}
            >
              {isCreating ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  Create {selectedTemplates.size} Recipe{selectedTemplates.size !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
