-- Add usage_unit column to store the unit used in recipes
ALTER TABLE public.menu_item_ingredients 
ADD COLUMN usage_unit text NOT NULL DEFAULT 'oz';

-- Add a comment to explain the column
COMMENT ON COLUMN public.menu_item_ingredients.usage_unit IS 'The unit used for this ingredient in the recipe (oz, ml, g, each)';