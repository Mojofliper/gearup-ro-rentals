-- Comprehensive RLS policies migration
-- This migration adds RLS policies for all tables that were missing from the previous migration

-- Drop existing policies for tables that might have them
DROP POLICY IF EXISTS "Users can view their own connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can create connected accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can update their own connected accounts" ON public.connected_accounts;

DROP POLICY IF EXISTS "Users can view their own escrow transactions" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Users can create escrow transactions" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Users can update their own escrow transactions" ON public.escrow_transactions;

DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can create payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;

DROP POLICY IF EXISTS "Users can view their own claims" ON public.claims;
DROP POLICY IF EXISTS "Users can create claims" ON public.claims;
DROP POLICY IF EXISTS "Users can update their own claims" ON public.claims;
DROP POLICY IF EXISTS "Admins can view all claims" ON public.claims;
DROP POLICY IF EXISTS "Admins can update all claims" ON public.claims;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

DROP POLICY IF EXISTS "Users can view their own escrow" ON public.escrow;
DROP POLICY IF EXISTS "Users can create escrow" ON public.escrow;
DROP POLICY IF EXISTS "Users can update their own escrow" ON public.escrow;

DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

DROP POLICY IF EXISTS "Users can view gear photos" ON public.gear_photos;
DROP POLICY IF EXISTS "Users can create gear photos" ON public.gear_photos;
DROP POLICY IF EXISTS "Users can update their own gear photos" ON public.gear_photos;
DROP POLICY IF EXISTS "Users can delete their own gear photos" ON public.gear_photos;

-- Connected accounts policies
CREATE POLICY "Users can view their own connected accounts" ON public.connected_accounts
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create connected accounts" ON public.connected_accounts
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own connected accounts" ON public.connected_accounts
    FOR UPDATE USING (owner_id = auth.uid());

-- Escrow transactions policies
CREATE POLICY "Users can view their own escrow transactions" ON public.escrow_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings 
            WHERE id = booking_id AND (renter_id = auth.uid() OR owner_id = auth.uid())
        )
    );

CREATE POLICY "Users can create escrow transactions" ON public.escrow_transactions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bookings 
            WHERE id = booking_id AND (renter_id = auth.uid() OR owner_id = auth.uid())
        )
    );

CREATE POLICY "Users can update their own escrow transactions" ON public.escrow_transactions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.bookings 
            WHERE id = booking_id AND (renter_id = auth.uid() OR owner_id = auth.uid())
        )
    );

-- Payments policies
CREATE POLICY "Users can view their own payments" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings 
            WHERE id = booking_id AND (renter_id = auth.uid() OR owner_id = auth.uid())
        )
    );

CREATE POLICY "Users can create payments" ON public.payments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bookings 
            WHERE id = booking_id AND renter_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own payments" ON public.payments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.bookings 
            WHERE id = booking_id AND (renter_id = auth.uid() OR owner_id = auth.uid())
        )
    );

-- Claims policies
CREATE POLICY "Users can view their own claims" ON public.claims
    FOR SELECT USING (claimant_id = auth.uid());

CREATE POLICY "Users can create claims" ON public.claims
    FOR INSERT WITH CHECK (claimant_id = auth.uid());

CREATE POLICY "Users can update their own claims" ON public.claims
    FOR UPDATE USING (claimant_id = auth.uid());

CREATE POLICY "Admins can view all claims" ON public.claims
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all claims" ON public.claims
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'moderator')
        )
    );

-- Escrow policies
CREATE POLICY "Users can view their own escrow" ON public.escrow
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings 
            WHERE id = booking_id AND (renter_id = auth.uid() OR owner_id = auth.uid())
        )
    );

CREATE POLICY "Users can create escrow" ON public.escrow
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bookings 
            WHERE id = booking_id AND (renter_id = auth.uid() OR owner_id = auth.uid())
        )
    );

CREATE POLICY "Users can update their own escrow" ON public.escrow
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.bookings 
            WHERE id = booking_id AND (renter_id = auth.uid() OR owner_id = auth.uid())
        )
    );

-- Categories policies (public read, admin write)
CREATE POLICY "Anyone can view categories" ON public.categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Gear photos policies
CREATE POLICY "Users can view gear photos" ON public.gear_photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.gear 
            WHERE id = gear_id AND (owner_id = auth.uid() OR status = 'available')
        )
    );

CREATE POLICY "Users can create gear photos" ON public.gear_photos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.gear 
            WHERE id = gear_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own gear photos" ON public.gear_photos
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.gear 
            WHERE id = gear_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own gear photos" ON public.gear_photos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.gear 
            WHERE id = gear_id AND owner_id = auth.uid()
        )
    );

-- Enable RLS on all tables
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_photos ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users for all tables
GRANT ALL ON public.connected_accounts TO authenticated;
GRANT ALL ON public.escrow_transactions TO authenticated;
GRANT ALL ON public.payments TO authenticated;
GRANT ALL ON public.claims TO authenticated;
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.escrow TO authenticated;
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.gear_photos TO authenticated;
GRANT ALL ON public.gear_specifications TO authenticated;
GRANT ALL ON public.claim_photos TO authenticated;
GRANT ALL ON public.admin_actions TO authenticated;
GRANT ALL ON public.analytics TO authenticated;
GRANT ALL ON public.platform_settings TO authenticated;

-- Grant permissions to service role for system operations
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.analytics TO service_role;
GRANT ALL ON public.platform_settings TO service_role; 