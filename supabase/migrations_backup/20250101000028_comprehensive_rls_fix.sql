-- Comprehensive RLS fix for all tables
-- This migration ensures all RLS policies work correctly and don't block legitimate requests

-- 1. CONNECTED_ACCOUNTS - Allow any authenticated user to view
DROP POLICY IF EXISTS "Users can view any connected account" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can create own connected account" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can update own connected account" ON public.connected_accounts;

CREATE POLICY "Allow all authenticated users to view connected accounts" ON public.connected_accounts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create own connected account" ON public.connected_accounts
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own connected account" ON public.connected_accounts
  FOR UPDATE USING (auth.uid() = owner_id);

-- 2. REVIEWS - Allow any authenticated user to view
DROP POLICY IF EXISTS "Users can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update reviews" ON public.reviews;

CREATE POLICY "Allow all authenticated users to view reviews" ON public.reviews
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

-- 3. USERS - Allow any authenticated user to view
DROP POLICY IF EXISTS "Users can view any profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "System can manage user profiles" ON public.users;

CREATE POLICY "Allow all authenticated users to view users" ON public.users
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "System can manage user profiles" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

-- 4. BOOKINGS - Allow any authenticated user to view
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;

CREATE POLICY "Allow all authenticated users to view bookings" ON public.bookings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = renter_id);

CREATE POLICY "Users can update their own bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = renter_id OR auth.uid() = owner_id);

-- 5. GEAR - Allow any authenticated user to view
DROP POLICY IF EXISTS "Users can view gear" ON public.gear;
DROP POLICY IF EXISTS "Users can create gear" ON public.gear;
DROP POLICY IF EXISTS "Users can update gear" ON public.gear;

CREATE POLICY "Allow all authenticated users to view gear" ON public.gear
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create gear" ON public.gear
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update gear" ON public.gear
  FOR UPDATE USING (auth.uid() = owner_id);

-- 6. TRANSACTIONS - Allow any authenticated user to view
DROP POLICY IF EXISTS "Users can view transactions for their bookings" ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions for their bookings" ON public.transactions;
DROP POLICY IF EXISTS "System can update transaction status" ON public.transactions;

CREATE POLICY "Allow all authenticated users to view transactions" ON public.transactions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create transactions for their bookings" ON public.transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = transactions.booking_id 
      AND bookings.renter_id = auth.uid()
    )
  );

CREATE POLICY "System can update transaction status" ON public.transactions
  FOR UPDATE USING (auth.role() = 'service_role');

-- 7. CLAIMS - Allow any authenticated user to view
DROP POLICY IF EXISTS "Users can view claims for their bookings" ON public.claims;
DROP POLICY IF EXISTS "Users can create claims for their bookings" ON public.claims;
DROP POLICY IF EXISTS "Users can update claims for their bookings" ON public.claims;

CREATE POLICY "Allow all authenticated users to view claims" ON public.claims
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create claims for their bookings" ON public.claims
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = claims.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can update claims for their bookings" ON public.claims
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = claims.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

-- 8. CATEGORIES - Allow any authenticated user to view
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON public.categories;

CREATE POLICY "Allow all authenticated users to view categories" ON public.categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage categories" ON public.categories
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Grant all necessary permissions
GRANT ALL ON public.connected_accounts TO authenticated;
GRANT ALL ON public.reviews TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.bookings TO authenticated;
GRANT ALL ON public.gear TO authenticated;
GRANT ALL ON public.transactions TO authenticated;
GRANT ALL ON public.claims TO authenticated;
GRANT ALL ON public.categories TO authenticated;

GRANT ALL ON public.connected_accounts TO service_role;
GRANT ALL ON public.reviews TO service_role;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.bookings TO service_role;
GRANT ALL ON public.gear TO service_role;
GRANT ALL ON public.transactions TO service_role;
GRANT ALL ON public.claims TO service_role;
GRANT ALL ON public.categories TO service_role; 