-- Fix the foreign key reference in connected_accounts table
-- The table should reference users(id)

-- Drop the existing table and recreate it with correct reference
DROP TABLE IF EXISTS public.connected_accounts CASCADE;

CREATE TABLE public.connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_status TEXT DEFAULT 'pending',
  payouts_enabled  BOOLEAN DEFAULT false,
  charges_enabled  BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_connected_accounts_owner_id ON public.connected_accounts(owner_id);
CREATE INDEX idx_connected_accounts_stripe_account_id ON public.connected_accounts(stripe_account_id);

-- Enable RLS
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own connected account" ON public.connected_accounts
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own connected account" ON public.connected_accounts
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own connected account" ON public.connected_accounts
  FOR UPDATE USING (auth.uid() = owner_id);

-- Grant permissions
GRANT ALL ON public.connected_accounts TO authenticated;
GRANT ALL ON public.connected_accounts TO service_role; 