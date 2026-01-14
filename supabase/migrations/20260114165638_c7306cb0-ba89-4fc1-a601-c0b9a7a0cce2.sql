-- Add package_size and package_price columns to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN package_size numeric NOT NULL DEFAULT 1,
ADD COLUMN package_price numeric NOT NULL DEFAULT 0;

-- Update existing rows: set package_price = current_unit_price (assuming they were single units)
UPDATE public.inventory_items 
SET package_price = current_unit_price 
WHERE package_price = 0;