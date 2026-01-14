-- Create unit type enum
CREATE TYPE public.unit_type AS ENUM ('gallon', 'oz', 'lb', 'each', 'case', 'bag', 'box', 'pack');

-- Global Inventory Items table
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  unit_type unit_type NOT NULL DEFAULT 'each',
  current_unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Menu Items (recipes) table
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  retail_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Menu Item Ingredients (junction table)
CREATE TABLE public.menu_item_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity NUMERIC(10,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(menu_item_id, inventory_item_id)
);

-- Receipt Item Mappings (link scanned items to inventory)
CREATE TABLE public.receipt_item_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id UUID REFERENCES public.receipts(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  scanned_name TEXT NOT NULL,
  scanned_price NUMERIC(10,2),
  quantity NUMERIC(10,2) DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_item_mappings ENABLE ROW LEVEL SECURITY;

-- Inventory Items policies
CREATE POLICY "Users can view their own inventory items"
ON public.inventory_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own inventory items"
ON public.inventory_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory items"
ON public.inventory_items FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory items"
ON public.inventory_items FOR DELETE
USING (auth.uid() = user_id);

-- Menu Items policies
CREATE POLICY "Users can view their own menu items"
ON public.menu_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own menu items"
ON public.menu_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own menu items"
ON public.menu_items FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own menu items"
ON public.menu_items FOR DELETE
USING (auth.uid() = user_id);

-- Menu Item Ingredients policies (access through menu_items ownership)
CREATE POLICY "Users can view ingredients of their menu items"
ON public.menu_item_ingredients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.menu_items 
    WHERE id = menu_item_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can add ingredients to their menu items"
ON public.menu_item_ingredients FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.menu_items 
    WHERE id = menu_item_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update ingredients of their menu items"
ON public.menu_item_ingredients FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.menu_items 
    WHERE id = menu_item_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete ingredients from their menu items"
ON public.menu_item_ingredients FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.menu_items 
    WHERE id = menu_item_id AND user_id = auth.uid()
  )
);

-- Receipt Item Mappings policies
CREATE POLICY "Users can view their receipt mappings"
ON public.receipt_item_mappings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.receipts 
    WHERE id = receipt_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create receipt mappings"
ON public.receipt_item_mappings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.receipts 
    WHERE id = receipt_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their receipt mappings"
ON public.receipt_item_mappings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.receipts 
    WHERE id = receipt_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their receipt mappings"
ON public.receipt_item_mappings FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.receipts 
    WHERE id = receipt_id AND user_id = auth.uid()
  )
);

-- Trigger for menu_items updated_at
CREATE TRIGGER update_menu_items_updated_at
BEFORE UPDATE ON public.menu_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();