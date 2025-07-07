-- Fix RLS policies for service role access to connected_accounts
-- This allows edge functions to insert/update connected_accounts records

-- Drop existing policies for connected_accounts
DROP POLICY IF EXISTS "Users can view own connected account" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can create own connected account" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can update own connected account" ON public.connected_accounts;

-- Create new policies that allow service role access
CREATE POLICY "Users can view own connected account" ON public.connected_accounts
  FOR SELECT USING (auth.uid() = owner_id OR auth.role() = 'service_role');

CREATE POLICY "Users can create own connected account" ON public.connected_accounts
  FOR INSERT WITH CHECK (auth.uid() = owner_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update own connected account" ON public.connected_accounts
  FOR UPDATE USING (auth.uid() = owner_id OR auth.role() = 'service_role');

-- Grant permissions to service role
GRANT ALL ON public.connected_accounts TO service_role;

-- Also fix reviews table RLS policies that were causing 400 errors
DROP POLICY IF EXISTS "Users can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update reviews" ON public.reviews;

CREATE POLICY "Users can view reviews" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

-- Grant permissions to authenticated users for reviews
GRANT ALL ON public.reviews TO authenticated; 