-- Fix transactions table RLS policies
-- This ensures users can only access transactions for their own bookings

-- Enable RLS on transactions table if not already enabled
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view transactions for their bookings" ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions for their bookings" ON public.transactions;
DROP POLICY IF EXISTS "System can update transaction status" ON public.transactions;

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