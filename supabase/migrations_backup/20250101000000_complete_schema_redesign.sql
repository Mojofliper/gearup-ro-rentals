-- Complete Database Schema Redesign for GearUp RO Rentals
-- This migration creates the full platform schema with all features

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');
CREATE TYPE gear_status AS ENUM ('available', 'rented', 'maintenance', 'inactive');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'disputed');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE escrow_status AS ENUM ('pending', 'held', 'released', 'refunded');
CREATE TYPE claim_status AS ENUM ('pending', 'under_review', 'approved', 'rejected', 'resolved');
CREATE TYPE notification_type AS ENUM ('booking_request', 'booking_confirmed', 'payment_received', 'pickup_reminder', 'return_reminder', 'dispute_opened', 'claim_submitted', 'admin_message');
CREATE TYPE message_type AS ENUM ('text', 'image', 'system');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    full_name TEXT NOT NULL,
    first_name TEXT GENERATED ALWAYS AS (split_part(full_name, ' ', 1)) STORED,
    last_name  TEXT GENERATED ALWAYS AS (
        CASE
            WHEN strpos(full_name, ' ') > 0 THEN substr(full_name, strpos(full_name, ' ') + 1)
            ELSE ''
        END
    ) STORED,
    avatar_url TEXT,
    bio TEXT,
    location TEXT,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    total_rentals INTEGER DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    role user_role DEFAULT 'user',
    is_verified BOOLEAN DEFAULT FALSE,
    is_suspended BOOLEAN DEFAULT FALSE,
    stripe_customer_id TEXT,
    stripe_account_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    parent_id UUID REFERENCES public.categories(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gear table
CREATE TABLE public.gear (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id),
    title TEXT NOT NULL,
    description TEXT,
    daily_rate DECIMAL(10,2) NOT NULL,
    weekly_rate DECIMAL(10,2),
    monthly_rate DECIMAL(10,2),
    deposit_amount DECIMAL(10,2) DEFAULT 0.00,
    status gear_status DEFAULT 'available',
    location TEXT NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gear photos table
CREATE TABLE public.gear_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gear_id UUID NOT NULL REFERENCES public.gear(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    description TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gear specifications table
CREATE TABLE public.gear_specifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gear_id UUID NOT NULL REFERENCES public.gear(id) ON DELETE CASCADE,
    spec_key TEXT NOT NULL,
    spec_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(gear_id, spec_key)
);

-- Bookings table
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gear_id UUID NOT NULL REFERENCES public.gear(id) ON DELETE CASCADE,
    renter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    daily_rate DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    owner_amount DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2) DEFAULT 0.00,
    status booking_status DEFAULT 'pending',
    pickup_location TEXT,
    pickup_instructions TEXT,
    return_location TEXT,
    return_instructions TEXT,
    pickup_date TIMESTAMP WITH TIME ZONE,
    return_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'RON',
    stripe_payment_intent_id TEXT,
    stripe_transfer_id TEXT,
    status payment_status DEFAULT 'pending',
    payment_method TEXT,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Escrow table
CREATE TABLE public.escrow (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    status escrow_status DEFAULT 'pending',
    held_until TIMESTAMP WITH TIME ZONE,
    released_at TIMESTAMP WITH TIME ZONE,
    released_to UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews table
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reviewed_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Claims table
CREATE TABLE public.claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    claimant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    claim_type TEXT NOT NULL,
    description TEXT NOT NULL,
    amount_requested DECIMAL(10,2),
    status claim_status DEFAULT 'pending',
    admin_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Claim photos table
CREATE TABLE public.claim_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    description TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message_type message_type DEFAULT 'text',
    content TEXT NOT NULL,
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin actions table
CREATE TABLE public.admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics table
CREATE TABLE public.analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES public.users(id),
    gear_id UUID REFERENCES public.gear(id),
    booking_id UUID REFERENCES public.bookings(id),
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform settings table
CREATE TABLE public.platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_phone ON public.users(phone);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_gear_owner_id ON public.gear(owner_id);
CREATE INDEX idx_gear_category_id ON public.gear(category_id);
CREATE INDEX idx_gear_status ON public.gear(status);
CREATE INDEX idx_gear_location ON public.gear USING GIST (ll_to_earth(latitude, longitude));
CREATE INDEX idx_gear_photos_gear_id ON public.gear_photos(gear_id);
CREATE INDEX idx_bookings_gear_id ON public.bookings(gear_id);
CREATE INDEX idx_bookings_renter_id ON public.bookings(renter_id);
CREATE INDEX idx_bookings_owner_id ON public.bookings(owner_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_dates ON public.bookings(start_date, end_date);
CREATE INDEX idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_escrow_booking_id ON public.escrow(booking_id);
CREATE INDEX idx_escrow_status ON public.escrow(status);
CREATE INDEX idx_reviews_booking_id ON public.reviews(booking_id);
CREATE INDEX idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewed_id ON public.reviews(reviewed_id);
CREATE INDEX idx_claims_booking_id ON public.claims(booking_id);
CREATE INDEX idx_claims_claimant_id ON public.claims(claimant_id);
CREATE INDEX idx_claims_status ON public.claims(status);
CREATE INDEX idx_messages_booking_id ON public.messages(booking_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_analytics_event_type ON public.analytics(event_type);
CREATE INDEX idx_analytics_created_at ON public.analytics(created_at);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gear_updated_at BEFORE UPDATE ON public.gear FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_escrow_updated_at BEFORE UPDATE ON public.escrow FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON public.claims FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
-- First, drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view other users' public profiles" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Only admins can manage categories" ON public.categories;

DROP POLICY IF EXISTS "Anyone can view available gear" ON public.gear;
DROP POLICY IF EXISTS "Users can view their own gear" ON public.gear;
DROP POLICY IF EXISTS "Users can create gear" ON public.gear;
DROP POLICY IF EXISTS "Users can update their own gear" ON public.gear;
DROP POLICY IF EXISTS "Users can delete their own gear" ON public.gear;

DROP POLICY IF EXISTS "Anyone can view gear photos" ON public.gear_photos;
DROP POLICY IF EXISTS "Gear owners can manage photos" ON public.gear_photos;

DROP POLICY IF EXISTS "Anyone can view gear specifications" ON public.gear_specifications;
DROP POLICY IF EXISTS "Gear owners can manage specifications" ON public.gear_specifications;

DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;

DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can create payments" ON public.payments;

DROP POLICY IF EXISTS "Users can view their own escrow" ON public.escrow;

DROP POLICY IF EXISTS "Anyone can view public reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can view their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;

DROP POLICY IF EXISTS "Users can view their own claims" ON public.claims;
DROP POLICY IF EXISTS "Admins can view all claims" ON public.claims;
DROP POLICY IF EXISTS "Users can create claims" ON public.claims;
DROP POLICY IF EXISTS "Admins can update claims" ON public.claims;

DROP POLICY IF EXISTS "Users can view their own claim photos" ON public.claim_photos;
DROP POLICY IF EXISTS "Admins can view all claim photos" ON public.claim_photos;
DROP POLICY IF EXISTS "Users can upload claim photos" ON public.claim_photos;

DROP POLICY IF EXISTS "Users can view messages in their bookings" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in their bookings" ON public.messages;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

DROP POLICY IF EXISTS "Only admins can view admin actions" ON public.admin_actions;
DROP POLICY IF EXISTS "Only admins can create admin actions" ON public.admin_actions;

DROP POLICY IF EXISTS "Anyone can create analytics events" ON public.analytics;
DROP POLICY IF EXISTS "Only admins can view analytics" ON public.analytics;

DROP POLICY IF EXISTS "Anyone can view platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Only admins can manage platform settings" ON public.platform_settings;

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view other users' public profiles" ON public.users FOR SELECT USING (true);
-- Allow users to insert their own row (for signup/profile creation)
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Categories policies
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Only admins can manage categories" ON public.categories FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);

-- Gear policies
CREATE POLICY "Anyone can view available gear" ON public.gear FOR SELECT USING (status = 'available');
CREATE POLICY "Users can view their own gear" ON public.gear FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can create gear" ON public.gear FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own gear" ON public.gear FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own gear" ON public.gear FOR DELETE USING (auth.uid() = owner_id);

-- Gear photos policies
CREATE POLICY "Anyone can view gear photos" ON public.gear_photos FOR SELECT USING (true);
CREATE POLICY "Gear owners can manage photos" ON public.gear_photos FOR ALL USING (
    EXISTS (SELECT 1 FROM public.gear WHERE id = gear_id AND owner_id = auth.uid())
);

-- Gear specifications policies
CREATE POLICY "Anyone can view gear specifications" ON public.gear_specifications FOR SELECT USING (true);
CREATE POLICY "Gear owners can manage specifications" ON public.gear_specifications FOR ALL USING (
    EXISTS (SELECT 1 FROM public.gear WHERE id = gear_id AND owner_id = auth.uid())
);

-- Bookings policies
CREATE POLICY "Users can view their own bookings" ON public.bookings FOR SELECT USING (
    auth.uid() = renter_id OR auth.uid() = owner_id
);
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = renter_id);
CREATE POLICY "Users can update their own bookings" ON public.bookings FOR UPDATE USING (
    auth.uid() = renter_id OR auth.uid() = owner_id
);

-- Payments policies
CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bookings WHERE id = booking_id AND (renter_id = auth.uid() OR owner_id = auth.uid()))
);
CREATE POLICY "Users can create payments" ON public.payments FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.bookings WHERE id = booking_id AND renter_id = auth.uid())
);

-- Escrow policies
CREATE POLICY "Users can view their own escrow" ON public.escrow FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bookings WHERE id = booking_id AND (renter_id = auth.uid() OR owner_id = auth.uid()))
);

-- Reviews policies
CREATE POLICY "Anyone can view public reviews" ON public.reviews FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view their own reviews" ON public.reviews FOR SELECT USING (auth.uid() = reviewer_id);
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users can update their own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = reviewer_id);

-- Claims policies
CREATE POLICY "Users can view their own claims" ON public.claims FOR SELECT USING (auth.uid() = claimant_id);
CREATE POLICY "Admins can view all claims" ON public.claims FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);
CREATE POLICY "Users can create claims" ON public.claims FOR INSERT WITH CHECK (auth.uid() = claimant_id);
CREATE POLICY "Admins can update claims" ON public.claims FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);

-- Claim photos policies
CREATE POLICY "Users can view their own claim photos" ON public.claim_photos FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.claims WHERE id = claim_id AND claimant_id = auth.uid())
);
CREATE POLICY "Admins can view all claim photos" ON public.claim_photos FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);
CREATE POLICY "Users can upload claim photos" ON public.claim_photos FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.claims WHERE id = claim_id AND claimant_id = auth.uid())
);

-- Messages policies
CREATE POLICY "Users can view messages in their bookings" ON public.messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bookings WHERE id = booking_id AND (renter_id = auth.uid() OR owner_id = auth.uid()))
);
CREATE POLICY "Users can send messages in their bookings" ON public.messages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.bookings WHERE id = booking_id AND (renter_id = auth.uid() OR owner_id = auth.uid()))
);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Admin actions policies
CREATE POLICY "Only admins can view admin actions" ON public.admin_actions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);
CREATE POLICY "Only admins can create admin actions" ON public.admin_actions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);

-- Analytics policies
CREATE POLICY "Anyone can create analytics events" ON public.analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Only admins can view analytics" ON public.analytics FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);

-- Platform settings policies
CREATE POLICY "Anyone can view platform settings" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Only admins can manage platform settings" ON public.platform_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);

-- Insert default categories
INSERT INTO public.categories (name, description, icon) VALUES
('Cameras', 'DSLR, mirrorless, and point-and-shoot cameras', 'camera'),
('Lenses', 'Camera lenses for various purposes', 'lens'),
('Lighting', 'Studio lights, flashes, and modifiers', 'lightbulb'),
('Audio', 'Microphones, recorders, and audio equipment', 'microphone'),
('Tripods & Stabilization', 'Tripods, gimbals, and stabilizers', 'tripod'),
('Drones', 'Aerial photography and videography drones', 'drone'),
('Computers & Editing', 'Laptops, desktops, and editing equipment', 'computer'),
('Accessories', 'Camera bags, filters, and other accessories', 'bag');

-- Insert default platform settings
INSERT INTO public.platform_settings (setting_key, setting_value, description) VALUES
('platform_fee_percentage', '10', 'Platform fee as percentage of rental amount'),
('escrow_hold_days', '3', 'Number of days to hold escrow after rental completion'),
('max_rental_days', '30', 'Maximum number of days for a single rental'),
('min_deposit_percentage', '20', 'Minimum deposit as percentage of gear value'),
('auto_approval_threshold', '4.5', 'Minimum rating for auto-approval of bookings'),
('support_email', 'support@gearup.ro', 'Platform support email address');

-- Create functions for common operations
CREATE OR REPLACE FUNCTION calculate_booking_total(
    p_daily_rate DECIMAL,
    p_start_date DATE,
    p_end_date DATE,
    p_platform_fee_percentage INTEGER DEFAULT 10
)
RETURNS TABLE(
    total_days INTEGER,
    total_amount DECIMAL(10,2),
    platform_fee DECIMAL(10,2),
    owner_amount DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (p_end_date - p_start_date + 1)::INTEGER as total_days,
        (p_daily_rate * (p_end_date - p_start_date + 1))::DECIMAL(10,2) as total_amount,
        ((p_daily_rate * (p_end_date - p_start_date + 1)) * p_platform_fee_percentage / 100)::DECIMAL(10,2) as platform_fee,
        ((p_daily_rate * (p_end_date - p_start_date + 1)) * (100 - p_platform_fee_percentage) / 100)::DECIMAL(10,2) as owner_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to update user ratings
CREATE OR REPLACE FUNCTION update_user_rating(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.users 
    SET 
        rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM public.reviews 
            WHERE reviewed_id = p_user_id AND is_public = true
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM public.reviews 
            WHERE reviewed_id = p_user_id AND is_public = true
        )
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type notification_type,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (p_user_id, p_type, p_title, p_message, p_data)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user rating when review is created/updated
CREATE OR REPLACE FUNCTION trigger_update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM update_user_rating(NEW.reviewed_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_user_rating(OLD.reviewed_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_rating_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION trigger_update_user_rating();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Create auth trigger for new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', concat_ws(' ', new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name'))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix RLS policies for users table
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view other users' public profiles" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Create correct RLS policies
CREATE POLICY "Users can view their own profile" ON public.users 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users 
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view other users' public profiles" ON public.users 
FOR SELECT USING (true);

-- Critical policy for user creation
CREATE POLICY "Users can insert their own profile" ON public.users 
FOR INSERT WITH CHECK (auth.uid() = id);

-- Additional policy for auth trigger
CREATE POLICY "Enable insert for authenticated users only" ON public.users 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Storage policies will be configured separately in Supabase dashboard
-- or through the Supabase CLI with proper permissions 