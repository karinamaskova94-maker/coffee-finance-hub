-- Create modifiers table for recipes
CREATE TABLE public.recipe_modifiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  modifier_type TEXT NOT NULL DEFAULT 'add', -- 'add', 'replace', 'size'
  price_adjustment NUMERIC NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create modifier ingredients table
CREATE TABLE public.modifier_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modifier_id UUID NOT NULL REFERENCES public.recipe_modifiers(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  usage_unit TEXT NOT NULL DEFAULT 'oz',
  action TEXT NOT NULL DEFAULT 'add', -- 'add', 'replace', 'multiply'
  replaces_ingredient_id UUID REFERENCES public.menu_item_ingredients(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recipe_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifier_ingredients ENABLE ROW LEVEL SECURITY;

-- RLS policies for recipe_modifiers (access via menu_items ownership)
CREATE POLICY "Users can view their recipe modifiers"
ON public.recipe_modifiers FOR SELECT
USING (EXISTS (
  SELECT 1 FROM menu_items WHERE menu_items.id = recipe_modifiers.menu_item_id AND menu_items.user_id = auth.uid()
));

CREATE POLICY "Users can create recipe modifiers"
ON public.recipe_modifiers FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM menu_items WHERE menu_items.id = recipe_modifiers.menu_item_id AND menu_items.user_id = auth.uid()
));

CREATE POLICY "Users can update their recipe modifiers"
ON public.recipe_modifiers FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM menu_items WHERE menu_items.id = recipe_modifiers.menu_item_id AND menu_items.user_id = auth.uid()
));

CREATE POLICY "Users can delete their recipe modifiers"
ON public.recipe_modifiers FOR DELETE
USING (EXISTS (
  SELECT 1 FROM menu_items WHERE menu_items.id = recipe_modifiers.menu_item_id AND menu_items.user_id = auth.uid()
));

-- RLS policies for modifier_ingredients (access via recipe_modifiers -> menu_items ownership)
CREATE POLICY "Users can view their modifier ingredients"
ON public.modifier_ingredients FOR SELECT
USING (EXISTS (
  SELECT 1 FROM recipe_modifiers rm
  JOIN menu_items mi ON mi.id = rm.menu_item_id
  WHERE rm.id = modifier_ingredients.modifier_id AND mi.user_id = auth.uid()
));

CREATE POLICY "Users can create modifier ingredients"
ON public.modifier_ingredients FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM recipe_modifiers rm
  JOIN menu_items mi ON mi.id = rm.menu_item_id
  WHERE rm.id = modifier_ingredients.modifier_id AND mi.user_id = auth.uid()
));

CREATE POLICY "Users can update their modifier ingredients"
ON public.modifier_ingredients FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM recipe_modifiers rm
  JOIN menu_items mi ON mi.id = rm.menu_item_id
  WHERE rm.id = modifier_ingredients.modifier_id AND mi.user_id = auth.uid()
));

CREATE POLICY "Users can delete their modifier ingredients"
ON public.modifier_ingredients FOR DELETE
USING (EXISTS (
  SELECT 1 FROM recipe_modifiers rm
  JOIN menu_items mi ON mi.id = rm.menu_item_id
  WHERE rm.id = modifier_ingredients.modifier_id AND mi.user_id = auth.uid()
));