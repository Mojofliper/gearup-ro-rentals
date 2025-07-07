-- Force fix transactions table RLS policies
-- This ensures the transactions table has proper RLS policies

-- First, make sure the transactions table exists and has RLS enabled
DO $$
BEGIN
    -- Check if transactions table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') THEN
        -- Enable RLS
        ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on transactions table';
    ELSE
        RAISE NOTICE 'transactions table does not exist';
    END IF;
END $$;

-- Drop all existing policies on transactions table
DROP POLICY IF EXISTS "Users can view transactions for their bookings" ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions for their bookings" ON public.transactions;
DROP POLICY IF EXISTS "System can update transaction status" ON public.transactions;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.transactions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.transactions;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.transactions;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.transactions;

-- Create proper RLS policies for transactions table
-- Users can view transactions for their bookings (as renter or owner)
CREATE POLICY "Users can view transactions for their bookings" ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = transactions.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

-- Users can create transactions for their bookings (only as renter)
CREATE POLICY "Users can create transactions for their bookings" ON public.transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = transactions.booking_id 
      AND bookings.renter_id = auth.uid()
    )
  );

-- System can update transaction status (for webhook processing)
CREATE POLICY "System can update transaction status" ON public.transactions
  FOR UPDATE USING (true);

-- Tell PostgREST to reload cached schema
NOTIFY pgrst, 'reload schema';

-- Log the current policies for verification
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'transactions'; 