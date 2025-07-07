-- Fix RLS policies for connected_accounts and reviews tables
-- This addresses the 406 and 400 errors in the API calls

-- 1. CONNECTED_ACCOUNTS - Fix the 406 errors
-- Drop all existing policies
DROP POLICY IF EXISTS "Allow all authenticated users to view connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can view any connected account" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can view own connected account" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can create own connected account" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can update own connected account" ON public.connected_accounts;

-- Create simple, permissive policies for debugging
CREATE POLICY "Allow all authenticated users to view connected accounts" ON public.connected_accounts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create own connected account" ON public.connected_accounts
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own connected account" ON public.connected_accounts
  FOR UPDATE USING (auth.uid() = owner_id);

-- 2. REVIEWS - Fix the 400 errors
-- Drop all existing policies
DROP POLICY IF EXISTS "Allow all authenticated users to view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update reviews" ON public.reviews;

-- Create simple, permissive policies for debugging
CREATE POLICY "Allow all authenticated users to view reviews" ON public.reviews
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

-- 3. Ensure tables exist with correct structure
-- Connected accounts table
CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_status TEXT DEFAULT 'pending',
  payouts_enabled BOOLEAN DEFAULT false,
  charges_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reviewed_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_connected_accounts_owner_id ON public.connected_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_stripe_account_id ON public.connected_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_id ON public.reviews(reviewed_id);

-- 5. Enable RLS on both tables
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 6. Grant all necessary permissions
GRANT ALL ON public.connected_accounts TO authenticated;
GRANT ALL ON public.reviews TO authenticated;
GRANT ALL ON public.connected_accounts TO service_role;
GRANT ALL ON public.reviews TO service_role; 