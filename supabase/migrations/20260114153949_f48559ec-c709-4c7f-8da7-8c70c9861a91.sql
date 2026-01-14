-- Create receipts table
CREATE TABLE public.receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vendor_name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  category TEXT,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'flagged')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own receipts" 
ON public.receipts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own receipts" 
ON public.receipts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receipts" 
ON public.receipts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receipts" 
ON public.receipts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_receipts_updated_at
BEFORE UPDATE ON public.receipts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for receipt images
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

-- Storage policies for receipts bucket
CREATE POLICY "Users can view their own receipt images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own receipt images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own receipt images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);