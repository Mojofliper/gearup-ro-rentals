-- Debug transactions RLS issue
-- This will help us understand why the RLS policies are not working

-- 1. Check if there are any existing transactions for this booking
SELECT 
  'Existing transactions for booking 20b2ac05-3719-4fbb-98d7-e8e29ff88795:' as info,
  COUNT(*) as count
FROM public.transactions 
WHERE booking_id = '20b2ac05-3719-4fbb-98d7-e8e29ff88795';

-- 2. Check if the booking exists and has the correct data
SELECT 
  'Booking details:' as info,
  id,
  renter_id,
  owner_id,
  total_amount,
  deposit_amount
FROM public.bookings 
WHERE id = '20b2ac05-3719-4fbb-98d7-e8e29ff88795';

-- 3. Test the RLS policy logic manually
SELECT 
  'RLS test for user be3ef12f-ff6b-4992-9d5d-9412afd8f7ec:' as info,
  EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE bookings.id = '20b2ac05-3719-4fbb-98d7-e8e29ff88795'
    AND bookings.renter_id = 'be3ef12f-ff6b-4992-9d5d-9412afd8f7ec'
  ) as is_renter,
  EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE bookings.id = '20b2ac05-3719-4fbb-98d7-e8e29ff88795'
    AND bookings.owner_id = 'be3ef12f-ff6b-4992-9d5d-9412afd8f7ec'
  ) as is_owner;

-- 4. Check current RLS policies on transactions table
SELECT 
  'Current RLS policies on transactions:' as info,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'transactions';

-- 5. Check if RLS is enabled on transactions table
SELECT 
  'RLS status on transactions table:' as info,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'transactions' AND schemaname = 'public'; 