-- Fix 406 errors on connected_accounts and escrow_transactions
-- This migration ensures proper RLS policies and permissions

-- Drop and recreate connected_accounts policies to be more permissive
DROP POLICY IF EXISTS "Users can view connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can create own connected account" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can update own connected account" ON public.connected_accounts;
DROP POLICY IF EXISTS "Service role can manage connected accounts" ON public.connected_accounts;

-- Create more permissive policies for connected_accounts
CREATE POLICY "Users can view any connected account" ON public.connected_accounts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create own connected account" ON public.connected_accounts
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own connected account" ON public.connected_accounts
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Service role can manage connected accounts" ON public.connected_accounts
  FOR ALL USING (auth.role() = 'service_role');

-- Drop and recreate escrow_transactions policies
DROP POLICY IF EXISTS "Users can view escrow transactions for their bookings" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Service role can manage escrow transactions" ON public.escrow_transactions;

-- Create more permissive policies for escrow_transactions
CREATE POLICY "Users can view any escrow transaction" ON public.escrow_transactions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage escrow transactions" ON public.escrow_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- Ensure proper grants
GRANT SELECT, INSERT, UPDATE ON public.connected_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.escrow_transactions TO authenticated;
GRANT ALL ON public.connected_accounts TO service_role;
GRANT ALL ON public.escrow_transactions TO service_role;

-- Add explicit grants for anon role (for debugging)
GRANT SELECT ON public.connected_accounts TO anon;
GRANT SELECT ON public.escrow_transactions TO anon; 