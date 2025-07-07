-- Recreate transactions table from scratch
-- This will ensure the table is properly created with correct permissions

-- 1. Drop the existing transactions table if it exists
DROP TABLE IF EXISTS public.transactions CASCADE;

-- 2. Recreate the transactions table with proper structure
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  amount NUMERIC NOT NULL, -- total amount in RON
  platform_fee NUMERIC NOT NULL, -- 13% platform fee in RON
  deposit_amount NUMERIC NOT NULL, -- deposit amount in RON
  rental_amount NUMERIC NOT NULL, -- rental amount in RON
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  stripe_charge_id TEXT,
  refund_amount NUMERIC DEFAULT 0, -- amount refunded in RON
  refund_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create indexes for performance
CREATE INDEX idx_transactions_booking_id ON public.transactions(booking_id);
CREATE INDEX idx_transactions_stripe_payment_intent_id ON public.transactions(stripe_payment_intent_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);

-- 4. Grant permissions to authenticated users
GRANT ALL ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO anon;

-- 5. Enable RLS (but don't create policies yet - we'll test without them first)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 6. Create a simple permissive policy for testing
CREATE POLICY "Allow all authenticated users" ON public.transactions
  FOR ALL USING (auth.role() = 'authenticated');

-- 7. Tell PostgREST to reload cached schema
NOTIFY pgrst, 'reload schema';

-- 8. Test insert to make sure it works
INSERT INTO public.transactions (
  booking_id, 
  amount, 
  platform_fee, 
  deposit_amount, 
  rental_amount, 
  status
) VALUES (
  '20b2ac05-3719-4fbb-98d7-e8e29ff88795',
  170,
  20,
  0,
  150,
  'pending'
) RETURNING id; 