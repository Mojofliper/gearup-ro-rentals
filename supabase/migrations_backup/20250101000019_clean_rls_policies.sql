-- Clean RLS policies migration
-- This migration properly handles existing policies and recreates them cleanly

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

DROP POLICY IF EXISTS "Anyone can view public reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can view their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;

DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Gear owners can view their gear bookings" ON public.bookings;

DROP POLICY IF EXISTS "Users can view their own gear" ON public.gear;
DROP POLICY IF EXISTS "Users can create gear" ON public.gear;
DROP POLICY IF EXISTS "Users can update their own gear" ON public.gear;
DROP POLICY IF EXISTS "Anyone can view public gear" ON public.gear;

-- Recreate user policies with proper permissions
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Allow user creation for auth trigger and self-insertion
CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (
        auth.uid() = id OR 
        auth.role() = 'service_role'
    );

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all users" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Recreate reviews policies
CREATE POLICY "Anyone can view public reviews" ON public.reviews
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own reviews" ON public.reviews
    FOR SELECT USING (reviewer_id = auth.uid() OR reviewed_id = auth.uid());

CREATE POLICY "Users can create reviews" ON public.reviews
    FOR INSERT WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "Users can update their own reviews" ON public.reviews
    FOR UPDATE USING (reviewer_id = auth.uid());

-- Recreate messages policies
CREATE POLICY "Users can view their messages" ON public.messages
    FOR SELECT USING (
        sender_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.bookings 
            WHERE id = booking_id AND (renter_id = auth.uid() OR owner_id = auth.uid())
        )
    );

CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Recreate bookings policies
CREATE POLICY "Users can view their own bookings" ON public.bookings
    FOR SELECT USING (renter_id = auth.uid() OR owner_id = auth.uid());

CREATE POLICY "Users can create bookings" ON public.bookings
    FOR INSERT WITH CHECK (renter_id = auth.uid());

CREATE POLICY "Users can update their own bookings" ON public.bookings
    FOR UPDATE USING (renter_id = auth.uid() OR owner_id = auth.uid());

CREATE POLICY "Gear owners can view their gear bookings" ON public.bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.gear 
            WHERE id = gear_id AND owner_id = auth.uid()
        )
    );

-- Recreate gear policies
CREATE POLICY "Users can view their own gear" ON public.gear
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create gear" ON public.gear
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own gear" ON public.gear
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Anyone can view public gear" ON public.gear
    FOR SELECT USING (status = 'available');

-- Ensure all tables have RLS enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.reviews TO authenticated;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.bookings TO authenticated;
GRANT ALL ON public.gear TO authenticated;
GRANT ALL ON public.gear_photos TO authenticated;
GRANT ALL ON public.categories TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated; 