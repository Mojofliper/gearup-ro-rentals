# Database Schema Documentation

## 📊 Overview

The GearUp platform uses **PostgreSQL** as the primary database, hosted on **Supabase**. The schema is designed for a peer-to-peer rental platform with comprehensive security, payment processing, and user management features.

---

## 🏗 Database Architecture

### Core Principles
- **Row Level Security (RLS)**: All tables have RLS enabled for data protection
- **UUID Primary Keys**: All tables use UUIDs for security and scalability
- **Audit Trails**: Created/updated timestamps on all tables
- **Foreign Key Constraints**: Proper referential integrity
- **Check Constraints**: Data validation at database level

---

## 📋 Table Definitions

### 1. User Management

#### `auth.users` (Supabase Auth)
```sql
-- Managed by Supabase Auth
auth.users {
  id: UUID (primary key)
  email: TEXT (unique)
  encrypted_password: TEXT
  email_confirmed_at: TIMESTAMPTZ
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
  raw_user_meta_data: JSONB
}
```

#### `public.profiles`
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  location TEXT,
  phone TEXT,
  is_verified BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'renter' CHECK (role IN ('renter', 'lender', 'both')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Purpose**: User profile information and role management
**Key Features**:
- Links to Supabase Auth users
- Role-based access control
- Verification status tracking
- Profile completion tracking

### 2. Content Management

#### `public.categories`
```sql
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Purpose**: Equipment categories for organization
**Default Categories**:
- Camere foto (Cameras)
- Obiective (Lenses)
- Drone
- Iluminat (Lighting)
- Audio
- Video
- Trepiere (Tripods)
- Accesorii (Accessories)

#### `public.gear`
```sql
CREATE TABLE public.gear (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  brand TEXT,
  model TEXT,
  condition TEXT CHECK (condition IN ('Nou', 'Ca nou', 'Foarte bună', 'Bună', 'Acceptabilă')),
  price_per_day INTEGER NOT NULL, -- in RON cents
  deposit_amount INTEGER DEFAULT 0, -- in RON cents
  pickup_location TEXT,
  specifications JSONB DEFAULT '[]',
  included_items JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  is_available BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Purpose**: Equipment listings for rental
**Key Features**:
- Comprehensive equipment details
- Pricing in RON cents (Romanian currency)
- Deposit system
- Image management
- Availability tracking
- View count analytics

### 3. Booking System

#### `public.bookings`
```sql
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gear_id UUID NOT NULL REFERENCES public.gear(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  total_amount INTEGER NOT NULL, -- in RON cents
  deposit_amount INTEGER NOT NULL, -- in RON cents
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Purpose**: Rental bookings and status management
**Status Flow**:
1. `pending` - Booking created, awaiting owner confirmation
2. `confirmed` - Owner accepted booking
3. `active` - Rental period active (equipment handed over)
4. `completed` - Rental completed successfully
5. `cancelled` - Booking cancelled

### 4. Payment System

#### `public.transactions`
```sql
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  amount INTEGER NOT NULL, -- total amount in RON cents
  platform_fee INTEGER NOT NULL, -- 13% platform fee in RON cents
  deposit_amount INTEGER NOT NULL, -- deposit amount in RON cents
  rental_amount INTEGER NOT NULL, -- rental amount in RON cents
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  stripe_charge_id TEXT,
  refund_amount INTEGER DEFAULT 0, -- amount refunded in RON cents
  refund_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Purpose**: Payment transaction tracking
**Key Features**:
- Stripe integration
- Platform fee calculation (13%)
- Refund tracking
- Payment method recording

#### `public.connected_accounts` (Future - Stripe Connect)
```sql
CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) UNIQUE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_status TEXT DEFAULT 'pending' CHECK (account_status IN ('pending', 'active', 'restricted')),
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Purpose**: Stripe Connect accounts for escrow system
**Status**: Not yet implemented

#### `public.escrow_transactions` (Future - Escrow System)
```sql
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id),
  stripe_payment_intent_id TEXT,
  rental_amount INTEGER NOT NULL,
  deposit_amount INTEGER NOT NULL,
  escrow_status TEXT DEFAULT 'pending' CHECK (escrow_status IN ('pending', 'held', 'released', 'disputed')),
  release_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Purpose**: Escrow system for secure payments
**Status**: Not yet implemented

### 5. Communication System

#### `public.messages`
```sql
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Purpose**: In-app messaging between users
**Key Features**:
- Booking-specific conversations
- Read status tracking
- Real-time notifications

#### `public.message_threads`
```sql
CREATE TABLE public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  participant1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(participant1_id, participant2_id, booking_id)
);
```

**Purpose**: Message thread management
**Key Features**:
- Unique conversation threads
- Participant tracking
- Booking association

### 6. Review System

#### `public.reviews`
```sql
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewed_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gear_id UUID NOT NULL REFERENCES public.gear(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Purpose**: User and equipment reviews
**Key Features**:
- 5-star rating system
- Comment support
- Booking verification
- User reputation tracking

### 7. Dispute Resolution

#### `public.claims`
```sql
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  claimant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('damage', 'late_return', 'missing_item', 'other')),
  description TEXT NOT NULL,
  evidence_photos JSONB, -- Array of photo URLs
  admin_notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
  resolution TEXT,
  deposit_penalty INTEGER DEFAULT 0, -- Amount withheld from deposit in RON cents
  admin_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
```

**Purpose**: Dispute and claim management
**Key Features**:
- Multiple claim types
- Photo evidence support
- Admin resolution system
- Deposit penalty tracking

#### `public.photo_uploads`
```sql
CREATE TABLE public.photo_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('pickup_renter', 'pickup_owner', 'return_renter', 'return_owner', 'claim_evidence')),
  photo_url TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  metadata JSONB -- Additional photo metadata (camera info, location, etc.)
);
```

**Purpose**: Photo documentation for handovers and claims
**Key Features**:
- Handover documentation
- Claim evidence
- Metadata tracking
- Timestamp verification

### 8. Security & Rate Limiting

#### `public.rate_limits`
```sql
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Purpose**: API rate limiting and abuse prevention
**Key Features**:
- Action-based rate limiting
- Time window tracking
- User-specific limits
- Abuse prevention

### 9. Storage System

#### `storage.buckets`
```sql
-- Avatar storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 
  'avatars', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);
```

**Purpose**: File storage for user avatars and equipment photos
**Key Features**:
- Public access for avatars
- File size limits
- MIME type restrictions
- User-specific folders

---

## 🔧 Database Functions

### 1. User Management Functions

#### `handle_new_user()`
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, location)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'location'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Purpose**: Automatically create profile when user registers

#### `get_avatar_url(avatar_path text)`
```sql
CREATE OR REPLACE FUNCTION get_avatar_url(avatar_path text)
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
```

**Purpose**: Generate full avatar URL from storage path

### 2. Payment Functions

#### `calculate_platform_fee(rental_amount INTEGER)`
```sql
CREATE OR REPLACE FUNCTION public.calculate_platform_fee(rental_amount INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN ROUND(rental_amount * 0.13);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Purpose**: Calculate 13% platform fee

#### `validate_payment_amounts(rental_amount, deposit_amount, platform_fee)`
```sql
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
```

**Purpose**: Validate payment amount integrity

### 3. Security Functions

#### `check_rate_limit(action_type, max_actions, window_minutes)`
```sql
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
```

**Purpose**: Rate limiting for API actions

### 4. Validation Functions

#### `validate_gear_input(gear_name, gear_description, price_per_day)`
```sql
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
```

**Purpose**: Validate gear listing data

---

## 🔒 Row Level Security (RLS)

### 1. Profiles Policies
```sql
-- Public profiles are viewable by everyone
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
```

### 2. Gear Policies
```sql
-- Gear is viewable by everyone
CREATE POLICY "Gear is viewable by everyone" ON public.gear
  FOR SELECT USING (true);

-- Users can insert their own gear
CREATE POLICY "Users can insert their own gear" ON public.gear
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Users can update their own gear
CREATE POLICY "Users can update their own gear" ON public.gear
  FOR UPDATE USING (auth.uid() = owner_id);

-- Users can delete their own gear
CREATE POLICY "Users can delete their own gear" ON public.gear
  FOR DELETE USING (auth.uid() = owner_id);
```

### 3. Bookings Policies
```sql
-- Users can view their own bookings
CREATE POLICY "Users can view their own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = renter_id OR auth.uid() = owner_id);

-- Users can create bookings
CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = renter_id);

-- Owners can update booking status
CREATE POLICY "Owners can update booking status" ON public.bookings
  FOR UPDATE USING (auth.uid() = owner_id OR auth.uid() = renter_id);
```

### 4. Messages Policies
```sql
-- Users can view messages for their bookings
CREATE POLICY "Users can view messages for their bookings" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = messages.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

-- Users can send messages for their bookings
CREATE POLICY "Users can send messages for their bookings" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = messages.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );
```

### 5. Reviews Policies
```sql
-- Reviews are viewable by everyone
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews
  FOR SELECT USING (true);

-- Users can create reviews for completed bookings
CREATE POLICY "Users can create reviews for completed bookings" ON public.reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = reviews.booking_id 
      AND bookings.status = 'completed'
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );
```

### 6. Transactions Policies
```sql
-- Users can view transactions for their bookings
CREATE POLICY "Users can view transactions for their bookings" ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = transactions.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

-- Users can create transactions for their bookings
CREATE POLICY "Users can create transactions for their bookings" ON public.transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = transactions.booking_id 
      AND bookings.renter_id = auth.uid()
    )
  );

-- System can update transaction status
CREATE POLICY "System can update transaction status" ON public.transactions
  FOR UPDATE USING (true);
```

### 7. Claims Policies
```sql
-- Users can view claims for their bookings
CREATE POLICY "Users can view claims for their bookings" ON public.claims
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = claims.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

-- Users can create claims for their bookings
CREATE POLICY "Users can create claims for their bookings" ON public.claims
  FOR INSERT WITH CHECK (
    auth.uid() = claimant_id AND
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = claims.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );
```

### 8. Rate Limits Policies
```sql
-- Users can view their own rate limits
CREATE POLICY "Users can view their own rate limits" ON public.rate_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own rate limits
CREATE POLICY "Users can insert their own rate limits" ON public.rate_limits
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## 📊 Indexes

### 1. Performance Indexes
```sql
-- Gear indexes
CREATE INDEX idx_gear_owner_id ON public.gear(owner_id);
CREATE INDEX idx_gear_category_id ON public.gear(category_id);
CREATE INDEX idx_gear_location ON public.gear(location);
CREATE INDEX idx_gear_created_at ON public.gear(created_at);

-- Booking indexes
CREATE INDEX idx_bookings_gear_id ON public.bookings(gear_id);
CREATE INDEX idx_bookings_renter_id ON public.bookings(renter_id);
CREATE INDEX idx_bookings_owner_id ON public.bookings(owner_id);
CREATE INDEX idx_bookings_dates ON public.bookings(start_date, end_date);
CREATE INDEX idx_bookings_status ON public.bookings(status);

-- Transaction indexes
CREATE INDEX idx_transactions_booking_id ON public.transactions(booking_id);
CREATE INDEX idx_transactions_stripe_payment_intent_id ON public.transactions(stripe_payment_intent_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);

-- Message indexes
CREATE INDEX idx_messages_booking_id ON public.messages(booking_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Review indexes
CREATE INDEX idx_reviews_gear_id ON public.reviews(gear_id);
CREATE INDEX idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewed_id ON public.reviews(reviewed_id);

-- Claim indexes
CREATE INDEX idx_claims_booking_id ON public.claims(booking_id);
CREATE INDEX idx_claims_claimant_id ON public.claims(claimant_id);
CREATE INDEX idx_claims_status ON public.claims(status);

-- Rate limit indexes
CREATE INDEX idx_rate_limits_user_action ON public.rate_limits(user_id, action_type);
CREATE INDEX idx_rate_limits_created_at ON public.rate_limits(created_at);
```

### 2. Composite Indexes
```sql
-- Search optimization
CREATE INDEX idx_gear_search ON public.gear(category_id, location, is_available, price_per_day);

-- Booking optimization
CREATE INDEX idx_bookings_dates_status ON public.bookings(start_date, end_date, status);

-- Review optimization
CREATE INDEX idx_reviews_gear_rating ON public.reviews(gear_id, rating, created_at);
```

---

## 🔄 Triggers

### 1. Updated At Triggers
```sql
-- Function to update timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.gear
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

### 2. Validation Triggers
```sql
-- Gear validation trigger
CREATE OR REPLACE FUNCTION public.validate_gear_before_insert_update()
RETURNS trigger AS $$
BEGIN
  IF NOT public.validate_gear_input(NEW.name, NEW.description, NEW.price_per_day) THEN
    RAISE EXCEPTION 'Invalid gear data provided';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_gear_trigger
  BEFORE INSERT OR UPDATE ON public.gear
  FOR EACH ROW EXECUTE FUNCTION public.validate_gear_before_insert_update();

-- Transaction validation trigger
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

CREATE TRIGGER validate_transaction_amounts_trigger
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_transaction_amounts();
```

### 3. Business Logic Triggers
```sql
-- Update booking payment status when transaction status changes
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

CREATE TRIGGER update_booking_payment_status_trigger
  AFTER UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_booking_payment_status();
```

---

## 📈 Data Relationships

### Entity Relationship Diagram
```
auth.users (1) ←→ (1) public.profiles
public.profiles (1) ←→ (N) public.gear
public.profiles (1) ←→ (N) public.bookings (as renter)
public.profiles (1) ←→ (N) public.bookings (as owner)
public.gear (1) ←→ (N) public.bookings
public.bookings (1) ←→ (N) public.messages
public.bookings (1) ←→ (N) public.reviews
public.bookings (1) ←→ (N) public.transactions
public.bookings (1) ←→ (N) public.claims
public.bookings (1) ←→ (N) public.photo_uploads
public.categories (1) ←→ (N) public.gear
```

### Key Relationships
- **Users** can have multiple gear listings
- **Users** can be both renters and owners
- **Bookings** connect renters, owners, and gear
- **Messages** are tied to specific bookings
- **Reviews** are tied to completed bookings
- **Transactions** track payment for bookings
- **Claims** handle disputes for bookings
- **Photos** document handovers and claims

---

This comprehensive database schema provides a solid foundation for the GearUp platform with proper security, performance optimization, and business logic enforcement. 