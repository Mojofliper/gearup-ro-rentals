-- =============================================================================
-- GEARUP RO RENTALS - ONE TRUE SCHEMA
-- =============================================================================
-- This file contains the complete, canonical database schema for the GearUp
-- platform. It is self-contained and can be used to initialize a fresh database
-- or reset an existing one.
-- 
-- Last Updated: 2025-01-09
-- Version: 1.0.0
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- =============================================================================
-- 1. CUSTOM TYPES
-- =============================================================================

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');
CREATE TYPE gear_status AS ENUM ('available', 'rented', 'maintenance', 'inactive');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'disputed');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE escrow_status AS ENUM ('pending', 'held', 'released', 'refunded');
CREATE TYPE claim_status AS ENUM ('pending', 'under_review', 'approved', 'rejected', 'resolved');
CREATE TYPE notification_type AS ENUM ('booking_request', 'booking_confirmed', 'payment_received', 'pickup_reminder', 'return_reminder', 'dispute_opened', 'claim_submitted', 'admin_message');
CREATE TYPE message_type AS ENUM ('text', 'image', 'system');

-- =============================================================================
-- 2. USER MANAGEMENT TABLES
-- =============================================================================

-- User profiles (links to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  total_rentals INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0.00,
  role user_role DEFAULT 'user',
  is_verified BOOLEAN DEFAULT false,
  is_suspended BOOLEAN DEFAULT false,
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  stripe_customer_id TEXT,
  stripe_account_id TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 3. CONTENT MANAGEMENT TABLES
-- =============================================================================

-- Equipment categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_name TEXT,
  parent_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  gear_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Equipment listings
CREATE TABLE IF NOT EXISTS public.gear (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  category_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  model TEXT,
  condition TEXT CHECK (condition IN ('Nou', 'Ca nou', 'Foarte bună', 'Bună', 'Acceptabilă')),
  price_per_day INTEGER NOT NULL, -- in RON cents
  weekly_rate INTEGER,
  monthly_rate INTEGER,
  deposit_amount INTEGER DEFAULT 0, -- in RON cents
  pickup_location TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  specifications JSONB DEFAULT '[]',
  included_items JSONB DEFAULT '[]',
  gear_photos JSONB DEFAULT '[]',
  status gear_status DEFAULT 'available',
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  last_rented_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Gear photos table
CREATE TABLE IF NOT EXISTS public.gear_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gear_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  description TEXT,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Gear specifications table
CREATE TABLE IF NOT EXISTS public.gear_specifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gear_id UUID NOT NULL,
  spec_key TEXT NOT NULL,
  spec_value TEXT NOT NULL,
  spec_type TEXT DEFAULT 'text',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(gear_id, spec_key)
);

-- =============================================================================
-- 4. BOOKING SYSTEM TABLES
-- =============================================================================

-- Rental bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gear_id UUID NOT NULL,
  renter_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  daily_rate INTEGER NOT NULL, -- in RON cents
  total_amount INTEGER NOT NULL, -- in RON cents
  platform_fee INTEGER NOT NULL, -- in RON cents
  owner_amount INTEGER NOT NULL, -- in RON cents
  deposit_amount INTEGER NOT NULL, -- in RON cents
  status booking_status DEFAULT 'pending',
  payment_status payment_status DEFAULT 'pending',
  pickup_location TEXT,
  pickup_instructions TEXT,
  return_location TEXT,
  return_instructions TEXT,
  pickup_lat NUMERIC,
  pickup_lng NUMERIC,
  pickup_date TIMESTAMPTZ,
  return_date TIMESTAMPTZ,
  notes TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 5. PAYMENT SYSTEM TABLES
-- =============================================================================

-- Payment transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  amount INTEGER NOT NULL, -- total amount in RON cents
  platform_fee INTEGER NOT NULL, -- 13% platform fee in RON cents
  deposit_amount INTEGER NOT NULL, -- deposit amount in RON cents
  rental_amount INTEGER NOT NULL, -- rental amount in RON cents
  status payment_status DEFAULT 'pending',
  payment_method TEXT,
  stripe_charge_id TEXT,
  stripe_transfer_id TEXT,
  refund_amount INTEGER DEFAULT 0, -- amount refunded in RON cents
  refund_reason TEXT,
  failure_reason TEXT,
  currency TEXT DEFAULT 'RON',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stripe Connect accounts (for escrow system)
CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_status TEXT DEFAULT 'pending' CHECK (account_status IN ('pending', 'active', 'restricted')),
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  verification_status TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Escrow transactions (for secure payments)
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID,
  stripe_payment_intent_id TEXT,
  rental_amount INTEGER NOT NULL,
  deposit_amount INTEGER NOT NULL,
  escrow_status escrow_status DEFAULT 'pending',
  held_until TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  released_to UUID,
  release_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 6. COMMUNICATION SYSTEM TABLES
-- =============================================================================

-- In-app messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  message_type message_type DEFAULT 'text',
  content TEXT NOT NULL,
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Message threads
CREATE TABLE IF NOT EXISTS public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID,
  participant1_id UUID NOT NULL,
  participant2_id UUID NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  unread_count_participant1 INTEGER DEFAULT 0,
  unread_count_participant2 INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(participant1_id, participant2_id, booking_id)
);

-- Conversations (alternative messaging system)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID,
  participant1_id UUID NOT NULL,
  participant2_id UUID NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  unread_count_participant1 INTEGER DEFAULT 0,
  unread_count_participant2 INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(participant1_id, participant2_id, booking_id)
);

-- =============================================================================
-- 7. REVIEW SYSTEM TABLES
-- =============================================================================

-- User and equipment reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  reviewer_id UUID NOT NULL,
  reviewed_id UUID NOT NULL,
  gear_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 8. DISPUTE RESOLUTION TABLES
-- =============================================================================

-- Dispute and claim management
CREATE TABLE IF NOT EXISTS public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  claimant_id UUID NOT NULL,
  owner_id UUID,
  renter_id UUID,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('damage', 'late_return', 'missing_item', 'other')),
  claim_status TEXT NOT NULL DEFAULT 'pending' CHECK (claim_status IN ('pending', 'approved', 'rejected')),
  description TEXT NOT NULL,
  amount_requested INTEGER, -- Amount requested in RON cents
  evidence_photos JSONB, -- Array of photo URLs
  evidence_urls TEXT[],
  admin_notes TEXT,
  status claim_status DEFAULT 'pending',
  resolution TEXT,
  deposit_penalty INTEGER DEFAULT 0, -- Amount withheld from deposit in RON cents
  admin_id UUID,
  resolved_by UUID,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Photo documentation for handovers and claims
CREATE TABLE IF NOT EXISTS public.photo_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  uploaded_by UUID NOT NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('pickup_renter', 'pickup_owner', 'return_renter', 'return_owner', 'claim_evidence')),
  photo_url TEXT NOT NULL,
  description TEXT,
  file_size INTEGER,
  mime_type TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  metadata JSONB -- Additional photo metadata (camera info, location, etc.)
);

-- Handover photos (specific to equipment handover)
CREATE TABLE IF NOT EXISTS public.handover_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  uploaded_by UUID NOT NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('pickup', 'return')),
  photo_url TEXT NOT NULL,
  description TEXT,
  file_size INTEGER,
  mime_type TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

-- Claim photos table
CREATE TABLE IF NOT EXISTS public.claim_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  description TEXT,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 9. SECURITY & RATE LIMITING TABLES
-- =============================================================================

-- API rate limiting and abuse prevention
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action_type TEXT NOT NULL,
  action_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  window_end TIMESTAMPTZ DEFAULT now() + INTERVAL '1 hour',
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 10. NOTIFICATIONS TABLES
-- =============================================================================

-- User notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Email notifications
CREATE TABLE IF NOT EXISTS public.email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'booking_confirmed', 
    'booking_cancelled', 
    'pickup_reminder', 
    'return_reminder', 
    'payment_received', 
    'claim_submitted', 
    'claim_updated'
  )),
  recipients TEXT[] NOT NULL,
  subject TEXT NOT NULL,
  template TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 11. MODERATION TABLES
-- =============================================================================

-- Moderation queue
CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('gear', 'review', 'message', 'user')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  reported_by UUID,
  moderated_by UUID,
  moderated_at TIMESTAMPTZ,
  rejection_reason TEXT,
  priority INTEGER DEFAULT 1,
  data JSONB NOT NULL DEFAULT '{}',
  assigned_to UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 12. ADMINISTRATION TABLES
-- =============================================================================

-- Admin actions table
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Analytics table
CREATE TABLE IF NOT EXISTS public.analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID,
  gear_id UUID,
  booking_id UUID,
  data JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Platform settings table
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  category TEXT DEFAULT 'general',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 13. ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 14. FOREIGN KEY CONSTRAINTS
-- =============================================================================

-- Add all foreign key constraints after tables are created
DO $$
BEGIN
  -- Users table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  -- Gear table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE public.gear ADD CONSTRAINT gear_owner_id_fkey 
    FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') THEN
    ALTER TABLE public.gear ADD CONSTRAINT gear_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;
  
  -- Categories table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') THEN
    ALTER TABLE public.categories ADD CONSTRAINT categories_parent_id_fkey 
    FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;
  
  -- Gear photos table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gear') THEN
    ALTER TABLE public.gear_photos ADD CONSTRAINT gear_photos_gear_id_fkey 
    FOREIGN KEY (gear_id) REFERENCES public.gear(id) ON DELETE CASCADE;
  END IF;
  
  -- Gear specifications table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gear') THEN
    ALTER TABLE public.gear_specifications ADD CONSTRAINT gear_specifications_gear_id_fkey 
    FOREIGN KEY (gear_id) REFERENCES public.gear(id) ON DELETE CASCADE;
  END IF;
  
  -- Bookings table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gear') THEN
    ALTER TABLE public.bookings ADD CONSTRAINT bookings_gear_id_fkey 
    FOREIGN KEY (gear_id) REFERENCES public.gear(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE public.bookings ADD CONSTRAINT bookings_renter_id_fkey 
    FOREIGN KEY (renter_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
    ALTER TABLE public.bookings ADD CONSTRAINT bookings_owner_id_fkey 
    FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
  
  -- Transactions table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    ALTER TABLE public.transactions ADD CONSTRAINT transactions_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
  END IF;
  
  -- Connected accounts table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE public.connected_accounts ADD CONSTRAINT connected_accounts_owner_id_fkey 
    FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
  
  -- Escrow transactions table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    ALTER TABLE public.escrow_transactions ADD CONSTRAINT escrow_transactions_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE public.escrow_transactions ADD CONSTRAINT escrow_transactions_released_to_fkey 
    FOREIGN KEY (released_to) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
  
  -- Messages table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
  
  -- Message threads table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    ALTER TABLE public.message_threads ADD CONSTRAINT message_threads_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE public.message_threads ADD CONSTRAINT message_threads_participant1_id_fkey 
    FOREIGN KEY (participant1_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
    ALTER TABLE public.message_threads ADD CONSTRAINT message_threads_participant2_id_fkey 
    FOREIGN KEY (participant2_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
  
  -- Conversations table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    ALTER TABLE public.conversations ADD CONSTRAINT conversations_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE public.conversations ADD CONSTRAINT conversations_participant1_id_fkey 
    FOREIGN KEY (participant1_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
    ALTER TABLE public.conversations ADD CONSTRAINT conversations_participant2_id_fkey 
    FOREIGN KEY (participant2_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
  
  -- Reviews table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_reviewer_id_fkey 
    FOREIGN KEY (reviewer_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_reviewed_id_fkey 
    FOREIGN KEY (reviewed_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gear') THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_gear_id_fkey 
    FOREIGN KEY (gear_id) REFERENCES public.gear(id) ON DELETE CASCADE;
  END IF;
  
  -- Claims table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    ALTER TABLE public.claims ADD CONSTRAINT claims_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE public.claims ADD CONSTRAINT claims_claimant_id_fkey 
    FOREIGN KEY (claimant_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
    ALTER TABLE public.claims ADD CONSTRAINT claims_owner_id_fkey 
    FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;
    
    ALTER TABLE public.claims ADD CONSTRAINT claims_renter_id_fkey 
    FOREIGN KEY (renter_id) REFERENCES public.users(id) ON DELETE SET NULL;
    
    ALTER TABLE public.claims ADD CONSTRAINT claims_admin_id_fkey 
    FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL;
    
    ALTER TABLE public.claims ADD CONSTRAINT claims_resolved_by_fkey 
    FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
  
  -- Photo uploads table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    ALTER TABLE public.photo_uploads ADD CONSTRAINT photo_uploads_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE public.photo_uploads ADD CONSTRAINT photo_uploads_uploaded_by_fkey 
    FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
  
  -- Handover photos table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    ALTER TABLE public.handover_photos ADD CONSTRAINT handover_photos_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE public.handover_photos ADD CONSTRAINT handover_photos_uploaded_by_fkey 
    FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
  
  -- Claim photos table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'claims') THEN
    ALTER TABLE public.claim_photos ADD CONSTRAINT claim_photos_claim_id_fkey 
    FOREIGN KEY (claim_id) REFERENCES public.claims(id) ON DELETE CASCADE;
  END IF;
  
  -- Rate limits table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE public.rate_limits ADD CONSTRAINT rate_limits_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
  
  -- Notifications table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
  
  -- Email notifications table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    ALTER TABLE public.email_notifications ADD CONSTRAINT email_notifications_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
  END IF;
  
  -- Moderation queue table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE public.moderation_queue ADD CONSTRAINT moderation_queue_reported_by_fkey 
    FOREIGN KEY (reported_by) REFERENCES public.users(id) ON DELETE SET NULL;
    
    ALTER TABLE public.moderation_queue ADD CONSTRAINT moderation_queue_moderated_by_fkey 
    FOREIGN KEY (moderated_by) REFERENCES public.users(id) ON DELETE SET NULL;
    
    ALTER TABLE public.moderation_queue ADD CONSTRAINT moderation_queue_assigned_to_fkey 
    FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
  
  -- Admin actions table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE public.admin_actions ADD CONSTRAINT admin_actions_admin_id_fkey 
    FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
  
  -- Analytics table foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE public.analytics ADD CONSTRAINT analytics_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gear') THEN
    ALTER TABLE public.analytics ADD CONSTRAINT analytics_gear_id_fkey 
    FOREIGN KEY (gear_id) REFERENCES public.gear(id) ON DELETE SET NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    ALTER TABLE public.analytics ADD CONSTRAINT analytics_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- 15. DATABASE FUNCTIONS
-- =============================================================================

-- User profile creation function (replaces unreliable trigger)
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
  user_metadata JSONB;
BEGIN
  -- Get user email and metadata
  SELECT email, raw_user_meta_data INTO user_email, user_metadata
  FROM auth.users WHERE id = auth.uid();
  
  -- Insert user profile with fallback values
  INSERT INTO public.users (id, email, first_name, last_name, avatar_url, location)
  VALUES (
    auth.uid(),
    COALESCE(user_email, ''),
    COALESCE(user_metadata->>'first_name', user_metadata->>'full_name', ''),
    COALESCE(user_metadata->>'last_name', ''),
    COALESCE(user_metadata->>'avatar_url', ''),
    COALESCE(user_metadata->>'location', '')
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Alternative user profile creation function with email and full_name
CREATE OR REPLACE FUNCTION public.ensure_user_profile_with_email()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, avatar_url, location)
  SELECT
    auth.uid(),
    COALESCE((SELECT email FROM auth.users WHERE id = auth.uid()), ''),
    COALESCE(
      (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = auth.uid()),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      'Unknown'
    ),
    '',
    '',
    ''
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile_with_email() TO authenticated;

-- Avatar URL generation function
CREATE OR REPLACE FUNCTION public.get_avatar_url(avatar_path text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT CASE 
    WHEN avatar_path IS NULL OR avatar_path = '' THEN NULL
    WHEN avatar_path LIKE 'http%' THEN avatar_path
    ELSE 'https://wnrbxwzeshgblkfidayb.supabase.co/storage/v1/object/public/avatars/' || avatar_path
  END;
$$;

-- Platform fee calculation function
CREATE OR REPLACE FUNCTION public.calculate_platform_fee(rental_amount INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN ROUND(rental_amount * 0.13);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Payment amount validation function
CREATE OR REPLACE FUNCTION public.validate_payment_amounts(
  rental_amount INTEGER,
  deposit_amount INTEGER,
  platform_fee INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  -- Validate rental amount
  IF rental_amount IS NULL OR rental_amount <= 0 OR rental_amount > 100000000 THEN
    RETURN FALSE;
  END IF;
  
  -- Validate deposit amount (can be 0)
  IF deposit_amount IS NULL OR deposit_amount < 0 OR deposit_amount > 100000000 THEN
    RETURN FALSE;
  END IF;
  
  -- Validate platform fee
  IF platform_fee IS NULL OR platform_fee < 0 OR platform_fee > 100000000 THEN
    RETURN FALSE;
  END IF;
  
  -- Validate that platform fee is 13% of rental amount (with small tolerance for rounding)
  IF ABS(platform_fee - ROUND(rental_amount * 0.13)) > 1 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  action_type TEXT,
  max_actions INTEGER DEFAULT 10,
  window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMPTZ;
BEGIN
  -- Get current window start
  window_start := now() - (window_minutes || ' minutes')::INTERVAL;
  
  -- Count actions in current window
  SELECT COALESCE(SUM(action_count), 0) INTO current_count
  FROM public.rate_limits
  WHERE user_id = auth.uid()
    AND action_type = check_rate_limit.action_type
    AND created_at > window_start;
  
  -- Check if limit exceeded
  IF current_count >= max_actions THEN
    RETURN FALSE;
  END IF;
  
  -- Record this action
  INSERT INTO public.rate_limits (user_id, action_type)
  VALUES (auth.uid(), check_rate_limit.action_type);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gear input validation function
CREATE OR REPLACE FUNCTION public.validate_gear_input(
  gear_name TEXT,
  gear_description TEXT,
  price_per_day INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  -- Validate name length and content
  IF gear_name IS NULL OR LENGTH(gear_name) < 3 OR LENGTH(gear_name) > 100 THEN
    RETURN FALSE;
  END IF;
  
  -- Check for suspicious content patterns
  IF gear_name ~* '(script|javascript|<|>|onclick|onerror)' THEN
    RETURN FALSE;
  END IF;
  
  -- Validate description length
  IF gear_description IS NOT NULL AND LENGTH(gear_description) > 2000 THEN
    RETURN FALSE;
  END IF;
  
  -- Validate price
  IF price_per_day IS NULL OR price_per_day < 0 OR price_per_day > 100000000 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated timestamp function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gear validation trigger function
CREATE OR REPLACE FUNCTION public.validate_gear_before_insert_update()
RETURNS trigger AS $$
BEGIN
  IF NOT public.validate_gear_input(NEW.title, NEW.description, NEW.price_per_day) THEN
    RAISE EXCEPTION 'Invalid gear data provided';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Transaction validation trigger function
CREATE OR REPLACE FUNCTION public.validate_transaction_amounts()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.validate_payment_amounts(NEW.rental_amount, NEW.deposit_amount, NEW.platform_fee) THEN
    RAISE EXCEPTION 'Invalid payment amounts provided';
  END IF;
  
  -- Ensure total amount matches
  IF NEW.amount != (NEW.rental_amount + NEW.deposit_amount + NEW.platform_fee) THEN
    RAISE EXCEPTION 'Total amount does not match sum of components';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Booking payment status update function
CREATE OR REPLACE FUNCTION public.update_booking_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update booking payment status based on transaction status
  IF NEW.status = 'completed' THEN
    UPDATE public.bookings 
    SET payment_status = 'paid'
    WHERE id = NEW.booking_id;
  ELSIF NEW.status = 'failed' THEN
    UPDATE public.bookings 
    SET payment_status = 'failed'
    WHERE id = NEW.booking_id;
  ELSIF NEW.status = 'refunded' THEN
    UPDATE public.bookings 
    SET payment_status = 'refunded'
    WHERE id = NEW.booking_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to fetch overdue pickups
CREATE OR REPLACE FUNCTION public.get_overdue_pickups(cutoff_date timestamptz)
RETURNS TABLE (
  id uuid,
  renter_id uuid,
  owner_id uuid,
  gear_title text
) LANGUAGE sql STABLE AS $$
SELECT b.id, b.renter_id, b.owner_id, g.title
FROM public.bookings b
JOIN public.gear g ON g.id = b.gear_id
WHERE b.status = 'confirmed'
  AND (b.pickup_lat IS NULL OR b.pickup_lng IS NULL)
  AND b.start_date < cutoff_date::date;
$$;

-- Booking total calculation function
CREATE OR REPLACE FUNCTION public.calculate_booking_total(
    p_daily_rate DECIMAL,
    p_start_date DATE,
    p_end_date DATE,
    p_platform_fee_percentage INTEGER DEFAULT 13
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
CREATE OR REPLACE FUNCTION public.update_user_rating(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.users 
    SET 
        rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM public.reviews 
            WHERE reviewed_id = p_user_id AND moderation_status = 'approved'
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM public.reviews 
            WHERE reviewed_id = p_user_id AND moderation_status = 'approved'
        )
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_type TEXT,
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
CREATE OR REPLACE FUNCTION public.trigger_update_user_rating()
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

-- =============================================================================
-- 16. TRIGGERS
-- =============================================================================

-- Updated timestamp triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.gear
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.connected_accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.escrow_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.message_threads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.email_notifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.moderation_queue
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Validation triggers
CREATE TRIGGER validate_gear_trigger
  BEFORE INSERT OR UPDATE ON public.gear
  FOR EACH ROW EXECUTE FUNCTION public.validate_gear_before_insert_update();

CREATE TRIGGER validate_transaction_amounts_trigger
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_transaction_amounts();

-- Business logic triggers
CREATE TRIGGER update_booking_payment_status_trigger
  AFTER UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_booking_payment_status();

-- User rating update trigger
CREATE TRIGGER update_user_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.trigger_update_user_rating();

-- Keep gear status and is_available in sync
CREATE OR REPLACE FUNCTION public.sync_gear_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'available' THEN
    NEW.is_available := true;
  ELSE
    NEW.is_available := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_gear_availability_trigger
  BEFORE INSERT OR UPDATE ON public.gear
  FOR EACH ROW EXECUTE FUNCTION public.sync_gear_availability();

-- =============================================================================
-- 17. INDEXES
-- =============================================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_rating ON public.users(rating);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON public.users(is_verified);
CREATE INDEX IF NOT EXISTS idx_users_is_suspended ON public.users(is_suspended);

-- Gear indexes
CREATE INDEX IF NOT EXISTS idx_gear_owner_id ON public.gear(owner_id);
CREATE INDEX IF NOT EXISTS idx_gear_category_id ON public.gear(category_id);
CREATE INDEX IF NOT EXISTS idx_gear_created_at ON public.gear(created_at);
CREATE INDEX IF NOT EXISTS idx_gear_condition ON public.gear(condition);
CREATE INDEX IF NOT EXISTS idx_gear_is_featured ON public.gear(is_featured);
CREATE INDEX IF NOT EXISTS idx_gear_is_available ON public.gear(is_available);
CREATE INDEX IF NOT EXISTS idx_gear_status ON public.gear(status);
-- Location-based index (only create if coordinates exist)
CREATE INDEX IF NOT EXISTS idx_gear_location_coords ON public.gear USING GIST (ll_to_earth(latitude, longitude)) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Gear photos indexes
CREATE INDEX IF NOT EXISTS idx_gear_photos_gear_id ON public.gear_photos(gear_id);

-- Gear specifications indexes
CREATE INDEX IF NOT EXISTS idx_gear_specifications_gear_id ON public.gear_specifications(gear_id);

-- Booking indexes
CREATE INDEX IF NOT EXISTS idx_bookings_gear_id ON public.bookings(gear_id);
CREATE INDEX IF NOT EXISTS idx_bookings_renter_id ON public.bookings(renter_id);
CREATE INDEX IF NOT EXISTS idx_bookings_owner_id ON public.bookings(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON public.bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_pickup_date ON public.bookings(pickup_date);
CREATE INDEX IF NOT EXISTS idx_bookings_return_date ON public.bookings(return_date);

-- Transaction indexes
CREATE INDEX IF NOT EXISTS idx_transactions_booking_id ON public.transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_transactions_stripe_payment_intent_id ON public.transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);

-- Message indexes
CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON public.messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON public.messages(read_at);

-- Review indexes
CREATE INDEX IF NOT EXISTS idx_reviews_gear_id ON public.reviews(gear_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_id ON public.reviews(reviewed_id);

-- Claim indexes
CREATE INDEX IF NOT EXISTS idx_claims_booking_id ON public.claims(booking_id);
CREATE INDEX IF NOT EXISTS idx_claims_claimant_id ON public.claims(claimant_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(status);

-- Rate limit indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON public.rate_limits(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at ON public.rate_limits(created_at);

-- Connected accounts indexes
CREATE INDEX IF NOT EXISTS idx_connected_accounts_owner_id ON public.connected_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_stripe_account_id ON public.connected_accounts(stripe_account_id);

-- Conversation indexes
CREATE INDEX IF NOT EXISTS idx_conversations_booking_id ON public.conversations(booking_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations(participant1_id, participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at);

-- Handover photos indexes
CREATE INDEX IF NOT EXISTS idx_handover_photos_booking_id ON public.handover_photos(booking_id);
CREATE INDEX IF NOT EXISTS idx_handover_photos_uploaded_by ON public.handover_photos(uploaded_by);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at);

-- Email notification indexes
CREATE INDEX IF NOT EXISTS idx_email_notifications_booking_id ON public.email_notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_event_type ON public.email_notifications(event_type);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON public.email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_created_at ON public.email_notifications(created_at);

-- Moderation queue indexes
CREATE INDEX IF NOT EXISTS idx_moderation_queue_type ON public.moderation_queue(type);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON public.moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_reported_by ON public.moderation_queue(reported_by);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_created_at ON public.moderation_queue(created_at);

-- Admin actions indexes
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON public.admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action_type ON public.admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON public.admin_actions(created_at);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON public.analytics(user_id);

-- Platform settings indexes
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON public.platform_settings(setting_key);

-- Moderation status indexes
CREATE INDEX IF NOT EXISTS idx_gear_moderation_status ON public.gear(moderation_status);
CREATE INDEX IF NOT EXISTS idx_reviews_moderation_status ON public.reviews(moderation_status);
CREATE INDEX IF NOT EXISTS idx_messages_moderation_status ON public.messages(moderation_status);
CREATE INDEX IF NOT EXISTS idx_users_moderation_status ON public.users(moderation_status);

-- Composite indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_dates_status ON public.bookings(start_date, end_date, status);
CREATE INDEX IF NOT EXISTS idx_reviews_gear_rating ON public.reviews(gear_id, rating, created_at);

-- =============================================================================
-- 18. ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Users policies - Allow public read access for gear queries
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "System can manage user profiles" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

-- Allow public access to user profiles for gear queries (essential for gear browsing)
CREATE POLICY "Public can view user profiles for gear" ON public.users
  FOR SELECT USING (true);

-- Allow auth trigger to insert user profiles (SECURITY DEFINER function bypasses RLS)
-- No additional policy needed since SECURITY DEFINER functions bypass RLS

-- Categories policies - Allow public read access
CREATE POLICY "categories_select_policy" ON public.categories
  FOR SELECT USING (true);

-- Gear policies - Allow public read access for browsing
CREATE POLICY "gear_select_policy" ON public.gear
  FOR SELECT USING (true);

-- Add a more permissive policy for gear with joins
CREATE POLICY "gear_select_with_joins_policy" ON public.gear
  FOR SELECT USING (true);

CREATE POLICY "gear_insert_policy" ON public.gear
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "gear_update_policy" ON public.gear
  FOR UPDATE USING (auth.uid() = owner_id);

-- Gear photos policies
CREATE POLICY "Anyone can view gear photos" ON public.gear_photos
  FOR SELECT USING (true);

CREATE POLICY "Gear owners can manage photos" ON public.gear_photos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.gear WHERE id = gear_id AND owner_id = auth.uid())
  );

-- Gear specifications policies
CREATE POLICY "Anyone can view gear specifications" ON public.gear_specifications
  FOR SELECT USING (true);

CREATE POLICY "Gear owners can manage specifications" ON public.gear_specifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.gear WHERE id = gear_id AND owner_id = auth.uid())
  );

-- Bookings policies
CREATE POLICY "Users can view their own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = renter_id OR auth.uid() = owner_id);

CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = renter_id);

CREATE POLICY "Users can update their own bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = renter_id OR auth.uid() = owner_id);

-- Transactions policies
CREATE POLICY "Users can view transactions for their bookings" ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = transactions.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

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

-- Connected accounts policies
CREATE POLICY "Users can view own connected account" ON public.connected_accounts
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own connected account" ON public.connected_accounts
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own connected account" ON public.connected_accounts
  FOR UPDATE USING (auth.uid() = owner_id);

-- Allow service role to manage connected accounts
CREATE POLICY "Service role can manage connected accounts" ON public.connected_accounts
  FOR ALL USING (auth.role() = 'service_role');

-- Messages policies
CREATE POLICY "Users can view messages for their bookings" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = messages.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages for their bookings" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = messages.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

-- Reviews policies
CREATE POLICY "Users can view reviews" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

-- Claims policies
CREATE POLICY "Users can view claims for their bookings" ON public.claims
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = claims.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can create claims for their bookings" ON public.claims
  FOR INSERT WITH CHECK (
    auth.uid() = claimant_id AND
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

-- Photo uploads policies
CREATE POLICY "Users can view photo uploads for their bookings" ON public.photo_uploads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = photo_uploads.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert photo uploads for their bookings" ON public.photo_uploads
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = photo_uploads.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

-- Handover photos policies
CREATE POLICY "Users can view handover photos for their bookings" ON public.handover_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = handover_photos.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert handover photos for their bookings" ON public.handover_photos
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = handover_photos.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

-- Claim photos policies
CREATE POLICY "Users can view their own claim photos" ON public.claim_photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.claims WHERE id = claim_id AND claimant_id = auth.uid())
  );

CREATE POLICY "Admins can view all claim photos" ON public.claim_photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Users can upload claim photos" ON public.claim_photos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.claims WHERE id = claim_id AND claimant_id = auth.uid())
  );

-- Rate limits policies
CREATE POLICY "Users can view their own rate limits" ON public.rate_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rate limits" ON public.rate_limits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Email notifications policies
CREATE POLICY "Users can view their own email notifications" ON public.email_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = email_notifications.booking_id 
      AND (bookings.owner_id = auth.uid() OR bookings.renter_id = auth.uid())
    )
  );

CREATE POLICY "Service role can insert email notifications" ON public.email_notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update email notifications" ON public.email_notifications
  FOR UPDATE USING (auth.role() = 'service_role');

-- Moderation queue policies
CREATE POLICY "Admins can view moderation queue" ON public.moderation_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert into moderation queue" ON public.moderation_queue
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update moderation queue" ON public.moderation_queue
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can report items" ON public.moderation_queue
  FOR INSERT WITH CHECK (auth.uid() = reported_by);

-- Admin actions policies
CREATE POLICY "Only admins can view admin actions" ON public.admin_actions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "Only admins can create admin actions" ON public.admin_actions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Analytics policies
CREATE POLICY "Anyone can create analytics events" ON public.analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Only admins can view analytics" ON public.analytics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Platform settings policies
CREATE POLICY "Anyone can view platform settings" ON public.platform_settings
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage platform settings" ON public.platform_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Message threads policies
CREATE POLICY "Users can view message threads for their bookings" ON public.message_threads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = message_threads.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can create message threads for their bookings" ON public.message_threads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = message_threads.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

-- Conversations policies
CREATE POLICY "Users can view conversations for their bookings" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = conversations.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can create conversations for their bookings" ON public.conversations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = conversations.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

-- Escrow transactions policies
CREATE POLICY "Users can view escrow transactions for their bookings" ON public.escrow_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = escrow_transactions.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

CREATE POLICY "Service role can manage escrow transactions" ON public.escrow_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- 18. ENUM TYPES
-- =============================================================================

-- Add enum values for escrow status if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'escrow_status' AND enumlabel = 'auto_refunded') THEN
    ALTER TYPE escrow_status ADD VALUE 'auto_refunded';
  END IF;
END $$;

-- Add enum values for booking status if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'booking_status' AND enumlabel = 'cancelled') THEN
    ALTER TYPE booking_status ADD VALUE 'cancelled';
  END IF;
END $$;

-- =============================================================================
-- 19. GRANT PERMISSIONS
-- =============================================================================

-- Grant permissions to anon role (for public access)
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.gear TO anon;
GRANT SELECT ON public.gear_photos TO anon;
GRANT SELECT ON public.gear_specifications TO anon;
GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.platform_settings TO anon;
GRANT INSERT ON public.analytics TO anon;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.gear TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gear_photos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gear_specifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.connected_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.escrow_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.message_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.claims TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.photo_uploads TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.handover_photos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.claim_photos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.rate_limits TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT ON public.email_notifications TO authenticated;
GRANT SELECT, INSERT ON public.moderation_queue TO authenticated;
GRANT SELECT, INSERT ON public.analytics TO authenticated;
GRANT SELECT ON public.platform_settings TO authenticated;
GRANT SELECT, INSERT ON public.admin_actions TO authenticated;

-- Grant permissions to service role
GRANT ALL ON public.connected_accounts TO service_role;
GRANT ALL ON public.reviews TO service_role;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.bookings TO service_role;
GRANT ALL ON public.gear TO service_role;
GRANT ALL ON public.gear_photos TO service_role;
GRANT ALL ON public.gear_specifications TO service_role;
GRANT ALL ON public.transactions TO service_role;
GRANT ALL ON public.claims TO service_role;
GRANT ALL ON public.categories TO service_role;
GRANT ALL ON public.messages TO service_role;
GRANT ALL ON public.message_threads TO service_role;
GRANT ALL ON public.conversations TO service_role;
GRANT ALL ON public.photo_uploads TO service_role;
GRANT ALL ON public.handover_photos TO service_role;
GRANT ALL ON public.claim_photos TO service_role;
GRANT ALL ON public.rate_limits TO service_role;
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.email_notifications TO service_role;
GRANT ALL ON public.moderation_queue TO service_role;
GRANT ALL ON public.escrow_transactions TO service_role;
GRANT ALL ON public.admin_actions TO service_role;
GRANT ALL ON public.analytics TO service_role;
GRANT ALL ON public.platform_settings TO service_role;

-- =============================================================================
-- 20. STORAGE BUCKETS
-- =============================================================================

-- Avatar storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 
  'avatars', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 21. DEFAULT DATA
-- =============================================================================

-- Insert default categories
INSERT INTO public.categories (name, slug, description, icon_name) VALUES
  ('Camere foto', 'camere-foto', 'Camere foto profesionale și semi-profesionale', 'camera'),
  ('Obiective', 'obiective', 'Obiective pentru camere foto', 'lens'),
  ('Drone', 'drone', 'Drone pentru filmare și fotografii aeriene', 'drone'),
  ('Iluminat', 'iluminat', 'Echipamente de iluminat pentru filmare și fotografie', 'light'),
  ('Audio', 'audio', 'Echipamente audio profesionale', 'microphone'),
  ('Video', 'video', 'Camere video și echipamente de filmare', 'video'),
  ('Trepiere', 'trepiere', 'Trepiere și suporturi pentru echipamente', 'tripod'),
  ('Accesorii', 'accesorii', 'Accesorii diverse pentru echipamente foto/video', 'accessories')
ON CONFLICT (slug) DO NOTHING;

-- Insert default platform settings
INSERT INTO public.platform_settings (setting_key, setting_value, description) VALUES
  ('platform_fee_percentage', '13', 'Platform fee as percentage of rental amount'),
  ('escrow_hold_days', '3', 'Number of days to hold escrow after rental completion'),
  ('max_rental_days', '30', 'Maximum number of days for a single rental'),
  ('min_deposit_percentage', '20', 'Minimum deposit as percentage of gear value'),
  ('auto_approval_threshold', '4.5', 'Minimum rating for auto-approval of bookings'),
  ('support_email', 'support@gearup.ro', 'Platform support email address')
ON CONFLICT (setting_key) DO NOTHING;

-- =============================================================================
-- 22. AUTH TRIGGERS
-- =============================================================================

-- Simple auth trigger to create user profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the trigger execution
  RAISE LOG 'handle_new_user trigger called for user: %', NEW.id;
  
  INSERT INTO public.users (id, email, first_name, last_name, avatar_url, location, phone, role, is_verified, is_suspended, rating, total_reviews, total_rentals, total_earnings)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'location', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'user',
    false,
    false,
    0.00,
    0,
    0,
    0.00
  );
  
  RAISE LOG 'User profile created successfully for: %', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- User already exists, just return
    RAISE LOG 'User profile already exists for: %', NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE LOG 'Error creating user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 24. FINAL SETUP
-- =============================================================================

-- Grant execute permissions on all functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Ensure proper schema ownership
ALTER SCHEMA public OWNER TO postgres;

-- =============================================================================
-- 25. SCHEMA VERIFICATION
-- =============================================================================

-- Log schema completion
DO $$
BEGIN
  RAISE LOG 'GearUp schema setup completed successfully';
  RAISE LOG 'Tables created: users, categories, gear, gear_photos, gear_specifications, bookings, transactions, connected_accounts, escrow_transactions, messages, message_threads, conversations, reviews, claims, photo_uploads, handover_photos, claim_photos, rate_limits, notifications, email_notifications, moderation_queue, admin_actions, analytics, platform_settings';
  RAISE LOG 'RLS policies enabled for all tables';
  RAISE LOG 'Auth trigger created - profiles created automatically on signup';
  RAISE LOG 'Foreign key relationships established';
  RAISE LOG 'Indexes created for optimal performance';
  RAISE LOG 'Default data inserted (categories, platform settings)';
  RAISE LOG 'Storage bucket configured for avatars';
END $$;

-- =============================================================================
-- SCHEMA COMPLETE
-- ============================================================================= 