-- Update default tax rate to 9.5% (California average)
ALTER TABLE public.stores 
ALTER COLUMN state_tax_rate SET DEFAULT 9.5;

-- Update existing stores that still have the old default
UPDATE public.stores 
SET state_tax_rate = 9.5 
WHERE state_tax_rate = 8.87;
