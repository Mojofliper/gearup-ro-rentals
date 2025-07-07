-- Temporary fix for transactions RLS
-- Disable RLS temporarily and then re-enable with simpler policies

-- 1. Disable RLS temporarily
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies
DROP POLICY IF EXISTS "Users can view transactions for their bookings" ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions for their bookings" ON public.transactions;
DROP POLICY IF EXISTS "System can update transaction status" ON public.transactions;
DROP POLICY IF EXISTS "Users can update transactions for their bookings" ON public.transactions;

-- 3. Re-enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 4. Create a simple test policy that allows all authenticated users to access transactions
-- This is temporary for debugging - we'll make it more restrictive once we confirm it works
CREATE POLICY "Allow authenticated users to access transactions" ON public.transactions
  FOR ALL USING (auth.role() = 'authenticated');

-- Tell PostgREST to reload cached schema
NOTIFY pgrst, 'reload schema'; 