-- Add stocktake table for Sunday counts
CREATE TABLE public.stocktakes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  stocktake_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Stocktake line items
CREATE TABLE public.stocktake_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stocktake_id UUID NOT NULL REFERENCES public.stocktakes(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  expected_quantity NUMERIC NOT NULL DEFAULT 0,
  physical_count NUMERIC NOT NULL DEFAULT 0,
  variance NUMERIC GENERATED ALWAYS AS (physical_count - expected_quantity) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stocktakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocktake_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for stocktakes
CREATE POLICY "Users can view their own stocktakes" ON public.stocktakes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stocktakes" ON public.stocktakes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stocktakes" ON public.stocktakes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stocktakes" ON public.stocktakes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for stocktake_items (via stocktake ownership)
CREATE POLICY "Users can view stocktake items" ON public.stocktake_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.stocktakes WHERE id = stocktake_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create stocktake items" ON public.stocktake_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.stocktakes WHERE id = stocktake_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update stocktake items" ON public.stocktake_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.stocktakes WHERE id = stocktake_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete stocktake items" ON public.stocktake_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.stocktakes WHERE id = stocktake_id AND user_id = auth.uid())
  );