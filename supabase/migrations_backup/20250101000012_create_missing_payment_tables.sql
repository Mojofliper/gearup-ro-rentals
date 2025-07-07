-- Create missing payment-related tables
-- These tables are referenced in the code but don't exist in the current database

-- Connected accounts for Stripe Connect
CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.users(id) UNIQUE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_status TEXT DEFAULT 'pending' CHECK (account_status IN ('pending', 'active', 'restricted')),
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Escrow transactions for secure payment handling
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id),
  stripe_payment_intent_id TEXT,
  rental_amount INTEGER NOT NULL,
  deposit_amount INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL,
  escrow_status TEXT DEFAULT 'pending' CHECK (escrow_status IN ('pending', 'held', 'released', 'disputed', 'refunded', 'transfer_failed')),
  owner_stripe_account_id TEXT,
  transfer_id TEXT,
  release_date TIMESTAMPTZ,
  refund_amount INTEGER DEFAULT 0,
  refund_reason TEXT,
  refund_id TEXT,
  transfer_failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_connected_accounts_owner_id ON public.connected_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_stripe_account_id ON public.connected_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_booking_id ON public.escrow_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_stripe_payment_intent_id ON public.escrow_transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_escrow_status ON public.escrow_transactions(escrow_status);

-- Enable RLS
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for connected_accounts
CREATE POLICY "Users can view their own connected account" ON public.connected_accounts
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can insert their own connected account" ON public.connected_accounts
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own connected account" ON public.connected_accounts
  FOR UPDATE USING (owner_id = auth.uid());

-- Create RLS policies for escrow_transactions
CREATE POLICY "Users can view escrow transactions for their bookings" ON public.escrow_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = escrow_transactions.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert escrow transactions for their bookings" ON public.escrow_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = escrow_transactions.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can update escrow transactions for their bookings" ON public.escrow_transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = escrow_transactions.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_connected_accounts_updated_at
  BEFORE UPDATE ON public.connected_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_escrow_transactions_updated_at
  BEFORE UPDATE ON public.escrow_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at(); 