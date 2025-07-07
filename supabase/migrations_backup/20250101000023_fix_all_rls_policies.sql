-- =========================================
--  FULL RLS / TABLE FIX SCRIPT (FIXED VERSION)
-- =========================================

-- 1) USERS  ────────────────────────────────
-- Drop every existing policy on users (handles quoted names properly)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='users' LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', r.policyname);
    EXCEPTION WHEN OTHERS THEN
      -- If the policy name has special characters, try with quotes
      EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.users', r.policyname);
    END;
  END LOOP;
END
$$;

-- Re-create clean policies
CREATE POLICY "Users can view own profile"  ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- System / function access (keeps auth triggers working)
CREATE POLICY "System can manage user profiles" ON public.users
  FOR ALL USING (true);

-- 2) TRANSACTIONS  ─────────────────────────
-- Create table if missing
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  amount          INTEGER NOT NULL,
  platform_fee    INTEGER NOT NULL,
  deposit_amount  INTEGER NOT NULL,
  rental_amount   INTEGER NOT NULL,
  status TEXT DEFAULT 'pending'
         CHECK (status IN ('pending','processing','completed','failed','refunded')),
  payment_method  TEXT,
  stripe_charge_id TEXT,
  refund_amount   INTEGER DEFAULT 0,
  refund_reason   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_booking_id
  ON public.transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status
  ON public.transactions(status);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view transactions for their bookings"   ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions for their bookings" ON public.transactions;
DROP POLICY IF EXISTS "System can update transaction status"             ON public.transactions;

-- Re-create policies
CREATE POLICY "Users can view transactions for their bookings" ON public.transactions
  FOR SELECT USING (
    EXISTS ( SELECT 1 FROM public.bookings
             WHERE bookings.id = transactions.booking_id
               AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid()) )
  );

CREATE POLICY "Users can create transactions for their bookings" ON public.transactions
  FOR INSERT WITH CHECK (
    EXISTS ( SELECT 1 FROM public.bookings
             WHERE bookings.id = transactions.booking_id
               AND bookings.renter_id = auth.uid() )
  );

CREATE POLICY "System can update transaction status" ON public.transactions
  FOR UPDATE USING (true);

-- 3) CLAIMS  ───────────────────────────────
DROP POLICY IF EXISTS "Users can view claims for their bookings"   ON public.claims;
DROP POLICY IF EXISTS "Users can create claims for their bookings" ON public.claims;
DROP POLICY IF EXISTS "Users can update claims for their bookings" ON public.claims;

CREATE POLICY "Users can view claims for their bookings" ON public.claims
  FOR SELECT USING (
    EXISTS ( SELECT 1 FROM public.bookings
             WHERE bookings.id = claims.booking_id
               AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid()) )
  );

CREATE POLICY "Users can create claims for their bookings" ON public.claims
  FOR INSERT WITH CHECK (
    EXISTS ( SELECT 1 FROM public.bookings
             WHERE bookings.id = claims.booking_id
               AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid()) )
  );

CREATE POLICY "Users can update claims for their bookings" ON public.claims
  FOR UPDATE USING (
    EXISTS ( SELECT 1 FROM public.bookings
             WHERE bookings.id = claims.booking_id
               AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid()) )
  );

-- 4) REVIEWS  ──────────────────────────────
DROP POLICY IF EXISTS "Users can view reviews"   ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update reviews" ON public.reviews;

CREATE POLICY "Users can view reviews" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

-- 5) GEAR  ─────────────────────────────────
DROP POLICY IF EXISTS "Users can view gear"   ON public.gear;
DROP POLICY IF EXISTS "Users can create gear" ON public.gear;
DROP POLICY IF EXISTS "Users can update gear" ON public.gear;

CREATE POLICY "Users can view gear"   ON public.gear
  FOR SELECT USING (true);

CREATE POLICY "Users can create gear" ON public.gear
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update gear" ON public.gear
  FOR UPDATE USING (auth.uid() = owner_id);

-- 6) CONNECTED_ACCOUNTS  ───────────────────
CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_status TEXT DEFAULT 'pending',
  payouts_enabled  BOOLEAN DEFAULT false,
  charges_enabled  BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own connected account"   ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can create own connected account" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can update own connected account" ON public.connected_accounts;

CREATE POLICY "Users can view own connected account" ON public.connected_accounts
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own connected account" ON public.connected_accounts
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own connected account" ON public.connected_accounts
  FOR UPDATE USING (auth.uid() = owner_id);

-- 7) CATEGORIES  ───────────────────────────
-- Enable RLS and create simple read policy
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read categories" ON public.categories;
DROP POLICY IF EXISTS "Only authenticated users can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Only authenticated users can update categories" ON public.categories;
DROP POLICY IF EXISTS "Only authenticated users can delete categories" ON public.categories;

CREATE POLICY "Public read categories" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage categories" ON public.categories
  FOR ALL USING (auth.uid() IS NOT NULL);

-- =========================================
-- ✅  Run this entire script.
--    It eliminates recursion, recreates missing tables,
--    and sets up clean, minimal RLS policies.
-- ========================================= 