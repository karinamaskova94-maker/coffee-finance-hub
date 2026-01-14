-- Create stores/locations table for multi-tenant support
CREATE TABLE public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  state_tax_rate DECIMAL(5,2) DEFAULT 8.87,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Policies for stores
CREATE POLICY "Users can view their own stores" 
ON public.stores FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stores" 
ON public.stores FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stores" 
ON public.stores FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stores" 
ON public.stores FOR DELETE USING (auth.uid() = user_id);

-- Add store_id to receipts table
ALTER TABLE public.receipts ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;

-- Add is_food_item flag for tax calculations
ALTER TABLE public.receipts ADD COLUMN is_food_item BOOLEAN DEFAULT false;

-- Create trigger for stores updated_at
CREATE TRIGGER update_stores_updated_at
BEFORE UPDATE ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();