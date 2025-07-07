-- Completely disable RLS on transactions table for testing
-- This will help us determine if RLS is the root cause of the 403 errors

-- 1. Disable RLS completely
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL policies on transactions table
DROP POLICY IF EXISTS "Users can view transactions for their bookings" ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions for their bookings" ON public.transactions;
DROP POLICY IF EXISTS "System can update transaction status" ON public.transactions;
DROP POLICY IF EXISTS "Users can update transactions for their bookings" ON public.transactions;
DROP POLICY IF EXISTS "Allow authenticated users to access transactions" ON public.transactions;

-- 3. Verify RLS is disabled
SELECT 
  'RLS status after disabling:' as info,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'transactions' AND schemaname = 'public';

-- Tell PostgREST to reload cached schema
NOTIFY pgrst, 'reload schema'; 