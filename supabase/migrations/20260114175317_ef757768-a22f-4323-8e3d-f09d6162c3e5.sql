-- Create integrations table to store user connections
CREATE TABLE public.integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  integration_type TEXT NOT NULL, -- 'clover', 'plaid', 'email'
  status TEXT NOT NULL DEFAULT 'disconnected', -- 'connected', 'disconnected', 'pending'
  config JSONB DEFAULT '{}',
  access_token TEXT, -- encrypted token storage
  refresh_token TEXT,
  external_id TEXT, -- merchant_id for Clover, item_id for Plaid
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint for user + integration type
CREATE UNIQUE INDEX idx_integrations_user_type ON public.integrations (user_id, integration_type);

-- Create email inbox table for forwarded receipts
CREATE TABLE public.email_inbox (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  unique_email TEXT NOT NULL UNIQUE, -- user_abc123@receipts.marginmind.ai
  is_active BOOLEAN NOT NULL DEFAULT true,
  emails_received INTEGER DEFAULT 0,
  last_email_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create webhooks log for incoming data from Clover
CREATE TABLE public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES public.integrations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'order.created', 'item.updated', etc.
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processed', 'failed'
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for webhook processing
CREATE INDEX idx_webhook_events_status ON public.webhook_events (status, created_at);

-- Enable RLS on all tables
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for integrations
CREATE POLICY "Users can view their own integrations"
ON public.integrations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own integrations"
ON public.integrations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations"
ON public.integrations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations"
ON public.integrations FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for email_inbox
CREATE POLICY "Users can view their own email inbox"
ON public.email_inbox FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email inbox"
ON public.email_inbox FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email inbox"
ON public.email_inbox FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for webhook_events (via integration ownership)
CREATE POLICY "Users can view webhook events for their integrations"
ON public.webhook_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.integrations 
    WHERE integrations.id = webhook_events.integration_id 
    AND integrations.user_id = auth.uid()
  )
);

-- Trigger for updated_at on integrations
CREATE TRIGGER update_integrations_updated_at
BEFORE UPDATE ON public.integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();