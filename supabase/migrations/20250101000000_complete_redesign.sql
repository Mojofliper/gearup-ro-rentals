-- =====================================================
-- GEARUP COMPLETE DATABASE REDESIGN
-- =====================================================
-- This migration completely redesigns the database schema
-- to support all planned features from the roadmap
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =====================================================
-- 1. USER MANAGEMENT & AUTHENTICATION
-- =====================================================

-- Enhanced user profiles with better verification
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  phone_verified BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  location TEXT,
  county TEXT CHECK (county IN (
    'Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud', 'Botoșani', 'Brăila', 'Brașov', 'București',
    'Buzău', 'Călărași', 'Caraș-Severin', 'Cluj', 'Constanța', 'Covasna', 'Dâmbovița', 'Dolj', 'Galați', 'Giurgiu',
    'Gorj', 'Harghita', 'Hunedoara', 'Ialomița', 'Iași', 'Ilfov', 'Maramureș', 'Mehedinți', 'Mureș', 'Neamț',
    'Olt', 'Prahova', 'Sălaj', 'Satu Mare', 'Sibiu', 'Suceava', 'Teleorman', 'Timiș', 'Tulcea', 'Vâlcea', 'Vaslui', 'Vrancea'
  )),
  role TEXT DEFAULT 'renter' CHECK (role IN ('renter', 'lender', 'both', 'admin')),
  is_verified BOOLEAN DEFAULT false,
  verification_level TEXT DEFAULT 'basic' CHECK (verification_level IN ('basic', 'verified', 'premium')),
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  total_earnings INTEGER DEFAULT 0, -- in RON cents
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User verification documents
CREATE TABLE public.verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('id_card', 'passport', 'drivers_license', 'utility_bill')),
  document_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 2. CONTENT MANAGEMENT
-- =====================================================

-- Enhanced categories with better organization
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_name TEXT,
  parent_id UUID REFERENCES public.categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enhanced gear listings with better structure
CREATE TABLE public.gear (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  name TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  model TEXT,
  condition TEXT NOT NULL CHECK (condition IN ('Nou', 'Ca nou', 'Foarte bună', 'Bună', 'Acceptabilă')),
  price_per_day INTEGER NOT NULL CHECK (price_per_day > 0), -- in RON cents
  deposit_amount INTEGER DEFAULT 0 CHECK (deposit_amount >= 0), -- in RON cents
  pickup_location TEXT NOT NULL,
  pickup_coordinates POINT, -- for geolocation
  specifications JSONB DEFAULT '[]',
  included_items JSONB DEFAULT '[]',
  excluded_items JSONB DEFAULT '[]',
  requirements JSONB DEFAULT '[]', -- e.g., "Valid ID required", "Experience level"
  availability_schedule JSONB DEFAULT '{}', -- weekly availability
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Gear images with better organization
CREATE TABLE public.gear_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gear_id UUID NOT NULL REFERENCES public.gear(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type TEXT DEFAULT 'main' CHECK (image_type IN ('main', 'detail', 'setup', 'accessory')),
  sort_order INTEGER DEFAULT 0,
  alt_text TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 3. BOOKING SYSTEM
-- =====================================================

-- Enhanced booking system with better status tracking
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gear_id UUID NOT NULL REFERENCES public.gear(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL CHECK (total_days > 0),
  rental_amount INTEGER NOT NULL CHECK (rental_amount > 0), -- in RON cents
  platform_fee INTEGER NOT NULL CHECK (platform_fee > 0), -- in RON cents
  deposit_amount INTEGER NOT NULL CHECK (deposit_amount >= 0), -- in RON cents
  total_amount INTEGER NOT NULL CHECK (total_amount > 0), -- in RON cents
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'paid', 'active', 'pickup_confirmed', 
    'return_pending', 'returned', 'completed', 'cancelled', 'disputed'
  )),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  pickup_location TEXT,
  pickup_coordinates POINT,
  pickup_notes TEXT,
  return_notes TEXT,
  renter_notes TEXT,
  owner_notes TEXT,
  admin_notes TEXT,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES public.profiles(id),
  cancelled_at TIMESTAMPTZ,
  pickup_confirmed_at TIMESTAMPTZ,
  return_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 4. PAYMENT & ESCROW SYSTEM
-- =====================================================

-- Stripe Connect accounts for escrow
CREATE TABLE public.connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_status TEXT DEFAULT 'pending' CHECK (account_status IN ('pending', 'active', 'restricted', 'suspended')),
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  requirements_completed BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enhanced transactions with escrow support
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_transfer_id TEXT,
  amount INTEGER NOT NULL CHECK (amount > 0), -- total amount in RON cents
  platform_fee INTEGER NOT NULL CHECK (platform_fee > 0), -- platform fee in RON cents
  rental_amount INTEGER NOT NULL CHECK (rental_amount > 0), -- rental amount in RON cents
  deposit_amount INTEGER NOT NULL CHECK (deposit_amount >= 0), -- deposit amount in RON cents
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded')),
  payment_method TEXT,
  payment_method_details JSONB DEFAULT '{}',
  stripe_charge_id TEXT,
  refund_amount INTEGER DEFAULT 0 CHECK (refund_amount >= 0),
  refund_reason TEXT,
  refunded_at TIMESTAMPTZ,
  escrow_status TEXT DEFAULT 'pending' CHECK (escrow_status IN ('pending', 'held', 'released', 'disputed')),
  escrow_release_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Escrow fund releases
CREATE TABLE public.escrow_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  release_type TEXT NOT NULL CHECK (release_type IN ('automatic', 'manual', 'dispute_resolution')),
  rental_amount INTEGER NOT NULL CHECK (rental_amount > 0),
  deposit_amount INTEGER NOT NULL CHECK (deposit_amount >= 0),
  total_released INTEGER NOT NULL CHECK (total_released > 0),
  stripe_transfer_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 5. COMMUNICATION SYSTEM
-- =====================================================

-- Enhanced messaging with better organization
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  participant1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(participant1_id, participant2_id, booking_id)
);

-- Enhanced messages with better features
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'location', 'system')),
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 6. REVIEW & RATING SYSTEM
-- =====================================================

-- Enhanced reviews with better structure
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewed_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gear_id UUID NOT NULL REFERENCES public.gear(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  review_type TEXT DEFAULT 'user' CHECK (review_type IN ('user', 'gear', 'platform')),
  is_verified BOOLEAN DEFAULT false,
  is_helpful_count INTEGER DEFAULT 0,
  is_reported BOOLEAN DEFAULT false,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 7. DISPUTE RESOLUTION
-- =====================================================

-- Enhanced claims with better structure
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  claimant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('damage', 'late_return', 'missing_item', 'quality_issue', 'no_show', 'other')),
  severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  requested_amount INTEGER CHECK (requested_amount >= 0), -- in RON cents
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed', 'escalated')),
  resolution TEXT,
  deposit_penalty INTEGER DEFAULT 0 CHECK (deposit_penalty >= 0), -- in RON cents
  admin_id UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Claim evidence with better organization
CREATE TABLE public.claim_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('photo', 'video', 'document', 'message')),
  evidence_url TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 8. PHOTO DOCUMENTATION SYSTEM
-- =====================================================

-- Enhanced photo documentation
CREATE TABLE public.handover_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('pickup_renter', 'pickup_owner', 'return_renter', 'return_owner')),
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}', -- camera info, location, timestamp, etc.
  is_verified BOOLEAN DEFAULT false,
  verification_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 9. NOTIFICATION SYSTEM
-- =====================================================

-- Notification preferences
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  booking_updates BOOLEAN DEFAULT true,
  payment_updates BOOLEAN DEFAULT true,
  message_notifications BOOLEAN DEFAULT true,
  review_notifications BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Notification queue
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'booking_created', 'booking_confirmed', 'booking_cancelled', 'payment_received',
    'payment_failed', 'message_received', 'review_received', 'claim_created',
    'claim_updated', 'escrow_released', 'reminder', 'system'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  delivery_method TEXT DEFAULT 'email' CHECK (delivery_method IN ('email', 'push', 'sms')),
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 10. ADMIN & MODERATION SYSTEM
-- =====================================================

-- Admin actions log
CREATE TABLE public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'user_suspended', 'user_verified', 'gear_approved', 'gear_suspended',
    'claim_resolved', 'refund_processed', 'escrow_released', 'system_config'
  )),
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'gear', 'booking', 'claim', 'transaction', 'system')),
  target_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Content moderation queue
CREATE TABLE public.moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('gear', 'review', 'message', 'photo')),
  content_id UUID NOT NULL,
  reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
  admin_id UUID REFERENCES public.profiles(id),
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 11. ANALYTICS & REPORTING
-- =====================================================

-- User activity tracking
CREATE TABLE public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'login', 'logout', 'gear_viewed', 'gear_created', 'booking_created',
    'payment_made', 'message_sent', 'review_posted', 'claim_created'
  )),
  target_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Platform analytics
CREATE TABLE public.platform_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, metric_name)
);

-- =====================================================
-- 12. SECURITY & RATE LIMITING
-- =====================================================

-- Enhanced rate limiting
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ip_address INET,
  action_type TEXT NOT NULL,
  action_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  window_end TIMESTAMPTZ DEFAULT now() + INTERVAL '1 hour',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Security events
CREATE TABLE public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'failed_login', 'suspicious_activity', 'rate_limit_exceeded', 'unauthorized_access',
    'payment_fraud', 'content_violation'
  )),
  severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 13. SYSTEM CONFIGURATION
-- =====================================================

-- System settings
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type TEXT DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_phone ON public.profiles(phone);
CREATE INDEX idx_profiles_location ON public.profiles(location);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_verification_level ON public.profiles(verification_level);

-- Gear indexes
CREATE INDEX idx_gear_owner_id ON public.gear(owner_id);
CREATE INDEX idx_gear_category_id ON public.gear(category_id);
CREATE INDEX idx_gear_location ON public.gear(pickup_location);
CREATE INDEX idx_gear_price ON public.gear(price_per_day);
CREATE INDEX idx_gear_availability ON public.gear(is_available, status);
CREATE INDEX idx_gear_search ON public.gear(category_id, is_available, price_per_day, created_at);
CREATE INDEX idx_gear_coordinates ON public.gear USING GIST(pickup_coordinates);

-- Booking indexes
CREATE INDEX idx_bookings_gear_id ON public.bookings(gear_id);
CREATE INDEX idx_bookings_renter_id ON public.bookings(renter_id);
CREATE INDEX idx_bookings_owner_id ON public.bookings(owner_id);
CREATE INDEX idx_bookings_dates ON public.bookings(start_date, end_date);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_payment_status ON public.bookings(payment_status);
CREATE INDEX idx_bookings_dates_status ON public.bookings(start_date, end_date, status);

-- Transaction indexes
CREATE INDEX idx_transactions_booking_id ON public.transactions(booking_id);
CREATE INDEX idx_transactions_stripe_payment_intent_id ON public.transactions(stripe_payment_intent_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_escrow_status ON public.transactions(escrow_status);

-- Message indexes
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_messages_unread ON public.messages(conversation_id, is_read) WHERE is_read = false;

-- Review indexes
CREATE INDEX idx_reviews_gear_id ON public.reviews(gear_id);
CREATE INDEX idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewed_id ON public.reviews(reviewed_id);
CREATE INDEX idx_reviews_rating ON public.reviews(rating, created_at);

-- Claim indexes
CREATE INDEX idx_claims_booking_id ON public.claims(booking_id);
CREATE INDEX idx_claims_claimant_id ON public.claims(claimant_id);
CREATE INDEX idx_claims_status ON public.claims(status);
CREATE INDEX idx_claims_severity ON public.claims(severity, status);

-- Notification indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_status ON public.notifications(status);
CREATE INDEX idx_notifications_pending ON public.notifications(status, priority, created_at) WHERE status = 'pending';

-- Activity indexes
CREATE INDEX idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX idx_user_activity_type ON public.user_activity(activity_type, created_at);

-- Rate limit indexes
CREATE INDEX idx_rate_limits_user_action ON public.rate_limits(user_id, action_type);
CREATE INDEX idx_rate_limits_ip_action ON public.rate_limits(ip_address, action_type);
CREATE INDEX idx_rate_limits_window ON public.rate_limits(window_start, window_end);

-- Full-text search indexes
CREATE INDEX idx_gear_search_text ON public.gear USING gin(to_tsvector('romanian', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_profiles_search_text ON public.profiles USING gin(to_tsvector('romanian', full_name || ' ' || COALESCE(location, '')));

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Updated timestamp function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Booking conflict check function
CREATE OR REPLACE FUNCTION public.check_booking_conflicts(
  gear_id UUID,
  start_date DATE,
  end_date DATE,
  exclude_booking_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE bookings.gear_id = check_booking_conflicts.gear_id
      AND bookings.status IN ('confirmed', 'paid', 'active', 'pickup_confirmed')
      AND bookings.id != COALESCE(exclude_booking_id, '00000000-0000-0000-0000-000000000000')
      AND (
        (start_date BETWEEN bookings.start_date AND bookings.end_date) OR
        (end_date BETWEEN bookings.start_date AND bookings.end_date) OR
        (start_date <= bookings.start_date AND end_date >= bookings.end_date)
      )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate user rating function
CREATE OR REPLACE FUNCTION public.calculate_user_rating(user_id UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  avg_rating DECIMAL(3,2);
BEGIN
  SELECT COALESCE(AVG(rating), 0.00) INTO avg_rating
  FROM public.reviews
  WHERE reviewed_id = user_id;
  
  RETURN avg_rating;
END;
$$ LANGUAGE plpgsql;

-- Update user rating trigger
CREATE OR REPLACE FUNCTION public.update_user_rating()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    rating = public.calculate_user_rating(NEW.reviewed_id),
    total_reviews = (
      SELECT COUNT(*) FROM public.reviews 
      WHERE reviewed_id = NEW.reviewed_id
    )
  WHERE id = NEW.reviewed_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated timestamp triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.gear
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Rating update triggers
CREATE TRIGGER update_user_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_user_rating();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default categories
INSERT INTO public.categories (name, slug, description, icon_name, sort_order) VALUES
('Camere foto', 'camere-foto', 'Camere foto digitale DSLR și mirrorless', 'Camera', 1),
('Obiective', 'obiective', 'Obiective foto pentru diverse tipuri de fotografie', 'Lens', 2),
('Drone', 'drone', 'Drone pentru fotografie și videografie aeriană', 'Plane', 3),
('Iluminat', 'iluminat', 'Echipament de iluminat profesional', 'Lightbulb', 4),
('Audio', 'audio', 'Microfoane și echipament audio', 'Mic', 5),
('Video', 'video', 'Camere video și echipament de filmare', 'Video', 6),
('Trepiere', 'trepiere', 'Trepiere și stabilizatoare', 'Tripod', 7),
('Accesorii', 'accesorii', 'Diverse accesorii foto și video', 'Package', 8);

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('platform_fee_percentage', '13', 'number', 'Platform fee percentage', true),
('minimum_rental_days', '1', 'number', 'Minimum rental period in days', true),
('maximum_rental_days', '30', 'number', 'Maximum rental period in days', true),
('auto_escrow_release_days', '2', 'number', 'Days after return to auto-release escrow', false),
('max_images_per_gear', '10', 'number', 'Maximum images per gear listing', true),
('max_deposit_amount', '1000000', 'number', 'Maximum deposit amount in RON cents', true),
('min_deposit_amount', '0', 'number', 'Minimum deposit amount in RON cents', true),
('maintenance_mode', 'false', 'boolean', 'Platform maintenance mode', true);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON SCHEMA public IS 'GearUp - Complete Database Redesign for Peer-to-Peer Gear Rental Platform'; 