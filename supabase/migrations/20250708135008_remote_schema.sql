SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;




ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "cube" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "earthdistance" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."booking_status" AS ENUM (
    'pending',
    'confirmed',
    'active',
    'completed',
    'cancelled',
    'disputed'
);


ALTER TYPE "public"."booking_status" OWNER TO "postgres";


CREATE TYPE "public"."claim_status" AS ENUM (
    'pending',
    'under_review',
    'approved',
    'rejected',
    'resolved'
);


ALTER TYPE "public"."claim_status" OWNER TO "postgres";


CREATE TYPE "public"."escrow_status" AS ENUM (
    'pending',
    'held',
    'released',
    'refunded',
    'auto_refunded'
);


ALTER TYPE "public"."escrow_status" OWNER TO "postgres";


CREATE TYPE "public"."gear_status" AS ENUM (
    'available',
    'rented',
    'maintenance',
    'inactive'
);


ALTER TYPE "public"."gear_status" OWNER TO "postgres";


CREATE TYPE "public"."message_type" AS ENUM (
    'text',
    'image',
    'system'
);


ALTER TYPE "public"."message_type" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'booking_request',
    'booking_confirmed',
    'payment_received',
    'pickup_reminder',
    'return_reminder',
    'dispute_opened',
    'claim_submitted',
    'admin_message'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'user',
    'admin',
    'moderator'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_booking_total"("p_daily_rate" numeric, "p_start_date" "date", "p_end_date" "date", "p_platform_fee_percentage" integer DEFAULT 13) RETURNS TABLE("total_days" integer, "total_amount" numeric, "platform_fee" numeric, "owner_amount" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (p_end_date - p_start_date + 1)::INTEGER as total_days,
        (p_daily_rate * (p_end_date - p_start_date + 1))::DECIMAL(10,2) as total_amount,
        ((p_daily_rate * (p_end_date - p_start_date + 1)) * p_platform_fee_percentage / 100)::DECIMAL(10,2) as platform_fee,
        ((p_daily_rate * (p_end_date - p_start_date + 1)) * (100 - p_platform_fee_percentage) / 100)::DECIMAL(10,2) as owner_amount;
END;
$$;


ALTER FUNCTION "public"."calculate_booking_total"("p_daily_rate" numeric, "p_start_date" "date", "p_end_date" "date", "p_platform_fee_percentage" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_platform_fee"("rental_amount" integer) RETURNS integer
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  RETURN ROUND(rental_amount * 0.13);
END;
$$;


ALTER FUNCTION "public"."calculate_platform_fee"("rental_amount" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_auth_rate_limit"("action_type" "text" DEFAULT 'auth_attempt'::"text", "max_attempts" integer DEFAULT 5, "window_minutes" integer DEFAULT 15, "lockout_minutes" integer DEFAULT 30) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMPTZ;
  lockout_start TIMESTAMPTZ;
  last_attempt TIMESTAMPTZ;
BEGIN
  -- Get current window start
  window_start := now() - (window_minutes || ' minutes')::INTERVAL;
  lockout_start := now() - (lockout_minutes || ' minutes')::INTERVAL;
  
  -- Get last attempt time
  SELECT MAX(created_at) INTO last_attempt
  FROM public.rate_limits
  WHERE user_id = auth.uid()
    AND action_type = check_auth_rate_limit.action_type;
  
  -- Count attempts in current window
  SELECT COALESCE(SUM(action_count), 0) INTO current_count
  FROM public.rate_limits
  WHERE user_id = auth.uid()
    AND action_type = check_auth_rate_limit.action_type
    AND created_at > window_start;
  
  -- Check if still in lockout period
  IF current_count >= max_attempts AND last_attempt > lockout_start THEN
    RETURN FALSE;
  END IF;
  
  -- Reset if lockout period has passed
  IF last_attempt IS NOT NULL AND last_attempt <= lockout_start THEN
    DELETE FROM public.rate_limits
    WHERE user_id = auth.uid()
      AND action_type = check_auth_rate_limit.action_type;
    current_count := 0;
  END IF;
  
  -- Record this attempt
  INSERT INTO public.rate_limits (user_id, action_type)
  VALUES (auth.uid(), check_auth_rate_limit.action_type);
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."check_auth_rate_limit"("action_type" "text", "max_attempts" integer, "window_minutes" integer, "lockout_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_rate_limit"("action_type" "text", "max_actions" integer DEFAULT 10, "window_minutes" integer DEFAULT 60) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."check_rate_limit"("action_type" "text", "max_actions" integer, "window_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_trigger_debug"() RETURNS TABLE("event_type" "text", "user_id" "uuid", "message" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT td.event_type, td.user_id, td.message, td.created_at
  FROM public.trigger_debug td
  ORDER BY td.created_at DESC
  LIMIT 20;
END;
$$;


ALTER FUNCTION "public"."check_trigger_debug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_data" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (p_user_id, p_type, p_title, p_message, p_data)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;


ALTER FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_avatar_url"("avatar_path" "text") RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT CASE 
    WHEN avatar_path IS NULL OR avatar_path = '' THEN NULL
    WHEN avatar_path LIKE 'http%' THEN avatar_path
    ELSE 'https://wnrbxwzeshgblkfidayb.supabase.co/storage/v1/object/public/avatars/' || avatar_path
  END;
$$;


ALTER FUNCTION "public"."get_avatar_url"("avatar_path" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_overdue_pickups"("cutoff_date" timestamp with time zone) RETURNS TABLE("id" "uuid", "renter_id" "uuid", "owner_id" "uuid", "gear_title" "text")
    LANGUAGE "sql" STABLE
    AS $$
SELECT b.id, b.renter_id, b.owner_id, g.title
FROM public.bookings b
JOIN public.gear g ON g.id = b.gear_id
WHERE b.status = 'confirmed'
  AND (b.pickup_lat IS NULL OR b.pickup_lng IS NULL)
  AND b.start_date < cutoff_date::date;
$$;


ALTER FUNCTION "public"."get_overdue_pickups"("cutoff_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_email TEXT;
  user_metadata JSONB;
  first_name TEXT;
  last_name TEXT;
  full_name TEXT;
  location TEXT;
  phone TEXT;
  avatar_url TEXT;
BEGIN
  -- Log to debug table
  INSERT INTO public.trigger_debug (event_type, user_id, message) 
  VALUES ('TRIGGER_STARTED', NEW.id, 'Auth trigger called for user: ' || NEW.id);
  
  -- Extract user data safely
  user_email := COALESCE(NEW.email, '');
  user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  
  -- Extract metadata fields with better fallback handling
  first_name := COALESCE(user_metadata->>'first_name', '');
  last_name := COALESCE(user_metadata->>'last_name', '');
  full_name := COALESCE(user_metadata->>'full_name', '');
  location := COALESCE(user_metadata->>'location', '');
  phone := COALESCE(user_metadata->>'phone', '');
  avatar_url := COALESCE(user_metadata->>'avatar_url', '');
  
  -- If full_name is empty but we have first_name and last_name, construct it
  IF full_name = '' AND (first_name != '' OR last_name != '') THEN
    full_name := TRIM(first_name || ' ' || last_name);
  END IF;
  
  -- If first_name is empty but we have full_name, extract it
  IF first_name = '' AND full_name != '' THEN
    first_name := SPLIT_PART(full_name, ' ', 1);
    last_name := TRIM(SUBSTRING(full_name FROM LENGTH(first_name) + 1));
  END IF;
  
  -- Log extracted data
  INSERT INTO public.trigger_debug (event_type, user_id, message) 
  VALUES ('DATA_EXTRACTED', NEW.id, 'Email: ' || user_email || ', Full name: ' || full_name || ', Location: ' || location);
  
  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    INSERT INTO public.trigger_debug (event_type, user_id, message) 
    VALUES ('USER_EXISTS', NEW.id, 'User profile already exists');
    RETURN NEW;
  END IF;
  
  -- Insert user profile
  INSERT INTO public.users (
    id, 
    email, 
    first_name, 
    last_name, 
    full_name,
    avatar_url, 
    location, 
    phone,
    role, 
    is_verified, 
    is_suspended, 
    rating, 
    total_reviews, 
    total_rentals, 
    total_earnings
  )
  VALUES (
    NEW.id,
    user_email,
    first_name,
    last_name,
    full_name,
    avatar_url,
    location,
    phone,
    'user',
    false,
    false,
    0.00,
    0,
    0,
    0.00
  );
  
  INSERT INTO public.trigger_debug (event_type, user_id, message) 
  VALUES ('PROFILE_CREATED', NEW.id, 'User profile created successfully');
  
  RETURN NEW;
  
EXCEPTION
  WHEN unique_violation THEN
    INSERT INTO public.trigger_debug (event_type, user_id, message) 
    VALUES ('UNIQUE_VIOLATION', NEW.id, 'User profile already exists (unique_violation)');
    RETURN NEW;
  WHEN OTHERS THEN
    INSERT INTO public.trigger_debug (event_type, user_id, message) 
    VALUES ('ERROR', NEW.id, 'Error: ' || SQLERRM || ' (SQLSTATE: ' || SQLSTATE || ')');
    RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_account_locked"("user_email" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  lockout_start TIMESTAMPTZ;
  attempt_count INTEGER;
BEGIN
  -- Check for failed login attempts in last 30 minutes
  lockout_start := now() - INTERVAL '30 minutes';
  
  SELECT COALESCE(SUM(action_count), 0) INTO attempt_count
  FROM public.rate_limits rl
  JOIN public.users u ON u.id = rl.user_id
  WHERE u.email = is_account_locked.user_email
    AND rl.action_type = 'auth_attempt'
    AND rl.created_at > lockout_start;
  
  RETURN attempt_count >= 5;
END;
$$;


ALTER FUNCTION "public"."is_account_locked"("user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_auth_event"("event_type" "text", "user_id" "uuid" DEFAULT NULL::"uuid", "details" "jsonb" DEFAULT '{}'::"jsonb", "ip_address" "inet" DEFAULT NULL::"inet", "user_agent" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.analytics (
    event_type,
    user_id,
    data,
    ip_address,
    user_agent
  ) VALUES (
    'auth_' || event_type,
    COALESCE(user_id, auth.uid()),
    details,
    ip_address,
    user_agent
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;


ALTER FUNCTION "public"."log_auth_event"("event_type" "text", "user_id" "uuid", "details" "jsonb", "ip_address" "inet", "user_agent" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_gear_availability"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'available' THEN
    NEW.is_available := true;
  ELSE
    NEW.is_available := false;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_gear_availability"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_user_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."trigger_update_user_rating"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_booking_payment_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_booking_payment_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_rating"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_user_rating"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_gear_before_insert_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NOT public.validate_gear_input(NEW.title, NEW.description, NEW.price_per_day) THEN
    RAISE EXCEPTION 'Invalid gear data provided';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_gear_before_insert_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_gear_input"("gear_name" "text", "gear_description" "text", "price_per_day" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."validate_gear_input"("gear_name" "text", "gear_description" "text", "price_per_day" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_payment_amounts"("rental_amount" integer, "deposit_amount" integer, "platform_fee" integer) RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
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
$$;


ALTER FUNCTION "public"."validate_payment_amounts"("rental_amount" integer, "deposit_amount" integer, "platform_fee" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_transaction_amounts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."validate_transaction_amounts"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "details" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "session_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "user_id" "uuid",
    "gear_id" "uuid",
    "booking_id" "uuid",
    "data" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "session_id" "text",
    "referrer" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gear_id" "uuid" NOT NULL,
    "renter_id" "uuid" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "total_days" integer NOT NULL,
    "daily_rate" integer NOT NULL,
    "total_amount" integer NOT NULL,
    "platform_fee" integer NOT NULL,
    "owner_amount" integer NOT NULL,
    "deposit_amount" integer NOT NULL,
    "status" "public"."booking_status" DEFAULT 'pending'::"public"."booking_status",
    "payment_status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status",
    "pickup_location" "text",
    "pickup_instructions" "text",
    "return_location" "text",
    "return_instructions" "text",
    "pickup_lat" numeric,
    "pickup_lng" numeric,
    "pickup_date" timestamp with time zone,
    "return_date" timestamp with time zone,
    "notes" "text",
    "cancellation_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "icon_name" "text",
    "parent_id" "uuid",
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "gear_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."claim_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "claim_id" "uuid" NOT NULL,
    "photo_url" "text" NOT NULL,
    "description" "text",
    "file_size" integer,
    "mime_type" "text",
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."claim_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."claims" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "claimant_id" "uuid" NOT NULL,
    "owner_id" "uuid",
    "renter_id" "uuid",
    "claim_type" "text" NOT NULL,
    "claim_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "description" "text" NOT NULL,
    "amount_requested" integer,
    "evidence_photos" "jsonb",
    "evidence_urls" "text"[],
    "admin_notes" "text",
    "resolution" "text",
    "deposit_penalty" integer DEFAULT 0,
    "admin_id" "uuid",
    "resolved_by" "uuid",
    "priority" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone,
    CONSTRAINT "claims_claim_status_check" CHECK (("claim_status" = ANY (ARRAY['pending'::"text", 'under_review'::"text", 'approved'::"text", 'rejected'::"text", 'resolved'::"text"]))),
    CONSTRAINT "claims_claim_type_check" CHECK (("claim_type" = ANY (ARRAY['damage'::"text", 'late_return'::"text", 'missing_item'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."claims" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."connected_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid",
    "stripe_account_id" "text" NOT NULL,
    "account_status" "text" DEFAULT 'pending'::"text",
    "charges_enabled" boolean DEFAULT false,
    "payouts_enabled" boolean DEFAULT false,
    "verification_status" "text",
    "country" "text",
    "business_type" "text",
    "capabilities" "jsonb",
    "requirements" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "details_submitted" boolean DEFAULT false,
    "business_profile" "jsonb" DEFAULT '{}'::"jsonb",
    "company" "jsonb" DEFAULT '{}'::"jsonb",
    "individual" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "connected_accounts_account_status_check" CHECK (("account_status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'restricted'::"text", 'connect_required'::"text", 'charges_only'::"text", 'verification_required'::"text", 'invalid'::"text"])))
);


ALTER TABLE "public"."connected_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid",
    "participant1_id" "uuid" NOT NULL,
    "participant2_id" "uuid" NOT NULL,
    "last_message_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "unread_count_participant1" integer DEFAULT 0,
    "unread_count_participant2" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "recipients" "text"[] NOT NULL,
    "subject" "text" NOT NULL,
    "template" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "sent_at" timestamp with time zone,
    "error_message" "text",
    "retry_count" integer DEFAULT 0,
    "next_retry_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "email_notifications_event_type_check" CHECK (("event_type" = ANY (ARRAY['booking_confirmed'::"text", 'booking_cancelled'::"text", 'pickup_reminder'::"text", 'return_reminder'::"text", 'payment_received'::"text", 'claim_submitted'::"text", 'claim_updated'::"text"]))),
    CONSTRAINT "email_notifications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."email_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."escrow_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid",
    "stripe_payment_intent_id" "text",
    "rental_amount" integer NOT NULL,
    "deposit_amount" integer NOT NULL,
    "escrow_status" "public"."escrow_status" DEFAULT 'pending'::"public"."escrow_status",
    "held_until" timestamp with time zone,
    "released_at" timestamp with time zone,
    "released_to" "uuid",
    "release_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "owner_stripe_account_id" "text",
    "platform_fee" integer DEFAULT 0,
    "refund_amount" integer DEFAULT 0,
    "refund_reason" "text",
    "refund_id" "text"
);


ALTER TABLE "public"."escrow_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gear" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "category_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "brand" "text",
    "model" "text",
    "condition" "text",
    "price_per_day" integer NOT NULL,
    "weekly_rate" integer,
    "monthly_rate" integer,
    "deposit_amount" integer DEFAULT 0,
    "pickup_location" "text",
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "specifications" "jsonb" DEFAULT '[]'::"jsonb",
    "included_items" "jsonb" DEFAULT '[]'::"jsonb",
    "gear_photos" "jsonb" DEFAULT '[]'::"jsonb",
    "status" "public"."gear_status" DEFAULT 'available'::"public"."gear_status",
    "is_available" boolean DEFAULT true,
    "is_featured" boolean DEFAULT false,
    "view_count" integer DEFAULT 0,
    "moderation_status" "text" DEFAULT 'approved'::"text",
    "last_rented_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "gear_condition_check" CHECK (("condition" = ANY (ARRAY['Nou'::"text", 'Ca nou'::"text", 'Foarte bună'::"text", 'Bună'::"text", 'Acceptabilă'::"text"]))),
    CONSTRAINT "gear_moderation_status_check" CHECK (("moderation_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."gear" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gear_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gear_id" "uuid" NOT NULL,
    "photo_url" "text" NOT NULL,
    "is_primary" boolean DEFAULT false,
    "description" "text",
    "file_size" integer,
    "mime_type" "text",
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."gear_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gear_specifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gear_id" "uuid" NOT NULL,
    "spec_key" "text" NOT NULL,
    "spec_value" "text" NOT NULL,
    "spec_type" "text" DEFAULT 'text'::"text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."gear_specifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."handover_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "photo_type" "text" NOT NULL,
    "photo_url" "text" NOT NULL,
    "description" "text",
    "file_size" integer,
    "mime_type" "text",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    CONSTRAINT "handover_photos_photo_type_check" CHECK (("photo_type" = ANY (ARRAY['pickup'::"text", 'return'::"text"])))
);


ALTER TABLE "public"."handover_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid",
    "participant1_id" "uuid" NOT NULL,
    "participant2_id" "uuid" NOT NULL,
    "last_message_at" timestamp with time zone DEFAULT "now"(),
    "unread_count_participant1" integer DEFAULT 0,
    "unread_count_participant2" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_threads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "message_type" "public"."message_type" DEFAULT 'text'::"public"."message_type",
    "content" "text" NOT NULL,
    "attachment_url" "text",
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "moderation_status" "text" DEFAULT 'approved'::"text",
    "edited_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "messages_moderation_status_check" CHECK (("moderation_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."moderation_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reason" "text",
    "reported_by" "uuid",
    "moderated_by" "uuid",
    "moderated_at" timestamp with time zone,
    "rejection_reason" "text",
    "priority" integer DEFAULT 1,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "assigned_to" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "moderation_queue_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "moderation_queue_type_check" CHECK (("type" = ANY (ARRAY['gear'::"text", 'review'::"text", 'message'::"text", 'user'::"text"])))
);


ALTER TABLE "public"."moderation_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "data" "jsonb",
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."photo_uploads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "photo_type" "text" NOT NULL,
    "photo_url" "text" NOT NULL,
    "description" "text",
    "file_size" integer,
    "mime_type" "text",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    CONSTRAINT "photo_uploads_photo_type_check" CHECK (("photo_type" = ANY (ARRAY['pickup_renter'::"text", 'pickup_owner'::"text", 'return_renter'::"text", 'return_owner'::"text", 'claim_evidence'::"text"])))
);


ALTER TABLE "public"."photo_uploads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "setting_key" "text" NOT NULL,
    "setting_value" "text" NOT NULL,
    "description" "text",
    "is_public" boolean DEFAULT false,
    "category" "text" DEFAULT 'general'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."platform_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action_type" "text" NOT NULL,
    "action_count" integer DEFAULT 1,
    "window_start" timestamp with time zone DEFAULT "now"(),
    "window_end" timestamp with time zone DEFAULT ("now"() + '01:00:00'::interval),
    "ip_address" "inet",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "reviewer_id" "uuid" NOT NULL,
    "reviewed_id" "uuid" NOT NULL,
    "gear_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "is_public" boolean DEFAULT true,
    "moderation_status" "text" DEFAULT 'approved'::"text",
    "helpful_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reviews_moderation_status_check" CHECK (("moderation_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "stripe_payment_intent_id" "text",
    "amount" integer NOT NULL,
    "platform_fee" integer NOT NULL,
    "deposit_amount" integer NOT NULL,
    "rental_amount" integer NOT NULL,
    "status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status",
    "payment_method" "text",
    "stripe_charge_id" "text",
    "stripe_transfer_id" "text",
    "refund_amount" integer DEFAULT 0,
    "refund_reason" "text",
    "failure_reason" "text",
    "currency" "text" DEFAULT 'RON'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trigger_debug" (
    "id" integer NOT NULL,
    "event_type" "text" NOT NULL,
    "user_id" "uuid",
    "message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trigger_debug" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."trigger_debug_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."trigger_debug_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."trigger_debug_id_seq" OWNED BY "public"."trigger_debug"."id";



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "full_name" "text",
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text",
    "bio" "text",
    "location" "text",
    "rating" numeric(3,2) DEFAULT 0.00,
    "total_reviews" integer DEFAULT 0,
    "total_rentals" integer DEFAULT 0,
    "total_earnings" numeric(10,2) DEFAULT 0.00,
    "role" "public"."user_role" DEFAULT 'user'::"public"."user_role",
    "is_verified" boolean DEFAULT false,
    "is_suspended" boolean DEFAULT false,
    "moderation_status" "text" DEFAULT 'approved'::"text",
    "stripe_customer_id" "text",
    "stripe_account_id" "text",
    "last_login_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "users_moderation_status_check" CHECK (("moderation_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."trigger_debug" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."trigger_debug_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."admin_actions"
    ADD CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics"
    ADD CONSTRAINT "analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."claim_photos"
    ADD CONSTRAINT "claim_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."connected_accounts"
    ADD CONSTRAINT "connected_accounts_owner_id_key" UNIQUE ("owner_id");



ALTER TABLE ONLY "public"."connected_accounts"
    ADD CONSTRAINT "connected_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."connected_accounts"
    ADD CONSTRAINT "connected_accounts_stripe_account_id_key" UNIQUE ("stripe_account_id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_participant1_id_participant2_id_booking_id_key" UNIQUE ("participant1_id", "participant2_id", "booking_id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_notifications"
    ADD CONSTRAINT "email_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."escrow_transactions"
    ADD CONSTRAINT "escrow_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gear_photos"
    ADD CONSTRAINT "gear_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gear"
    ADD CONSTRAINT "gear_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gear_specifications"
    ADD CONSTRAINT "gear_specifications_gear_id_spec_key_key" UNIQUE ("gear_id", "spec_key");



ALTER TABLE ONLY "public"."gear_specifications"
    ADD CONSTRAINT "gear_specifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."handover_photos"
    ADD CONSTRAINT "handover_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_participant1_id_participant2_id_booking_id_key" UNIQUE ("participant1_id", "participant2_id", "booking_id");



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."moderation_queue"
    ADD CONSTRAINT "moderation_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."photo_uploads"
    ADD CONSTRAINT "photo_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_setting_key_key" UNIQUE ("setting_key");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_stripe_payment_intent_id_key" UNIQUE ("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."trigger_debug"
    ADD CONSTRAINT "trigger_debug_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_admin_actions_action_type" ON "public"."admin_actions" USING "btree" ("action_type");



CREATE INDEX "idx_admin_actions_admin_id" ON "public"."admin_actions" USING "btree" ("admin_id");



CREATE INDEX "idx_admin_actions_created_at" ON "public"."admin_actions" USING "btree" ("created_at");



CREATE INDEX "idx_analytics_created_at" ON "public"."analytics" USING "btree" ("created_at");



CREATE INDEX "idx_analytics_event_type" ON "public"."analytics" USING "btree" ("event_type");



CREATE INDEX "idx_analytics_user_id" ON "public"."analytics" USING "btree" ("user_id");



CREATE INDEX "idx_bookings_dates" ON "public"."bookings" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_bookings_dates_status" ON "public"."bookings" USING "btree" ("start_date", "end_date", "status");



CREATE INDEX "idx_bookings_gear_id" ON "public"."bookings" USING "btree" ("gear_id");



CREATE INDEX "idx_bookings_owner_id" ON "public"."bookings" USING "btree" ("owner_id");



CREATE INDEX "idx_bookings_payment_status" ON "public"."bookings" USING "btree" ("payment_status");



CREATE INDEX "idx_bookings_pickup_date" ON "public"."bookings" USING "btree" ("pickup_date");



CREATE INDEX "idx_bookings_renter_id" ON "public"."bookings" USING "btree" ("renter_id");



CREATE INDEX "idx_bookings_return_date" ON "public"."bookings" USING "btree" ("return_date");



CREATE INDEX "idx_bookings_status" ON "public"."bookings" USING "btree" ("status");



CREATE INDEX "idx_claims_booking_id" ON "public"."claims" USING "btree" ("booking_id");



CREATE INDEX "idx_claims_claimant_id" ON "public"."claims" USING "btree" ("claimant_id");



CREATE INDEX "idx_claims_status" ON "public"."claims" USING "btree" ("claim_status");



CREATE INDEX "idx_connected_accounts_owner_id" ON "public"."connected_accounts" USING "btree" ("owner_id");



CREATE INDEX "idx_connected_accounts_stripe_account_id" ON "public"."connected_accounts" USING "btree" ("stripe_account_id");



CREATE INDEX "idx_conversations_booking_id" ON "public"."conversations" USING "btree" ("booking_id");



CREATE INDEX "idx_conversations_last_message" ON "public"."conversations" USING "btree" ("last_message_at");



CREATE INDEX "idx_conversations_participants" ON "public"."conversations" USING "btree" ("participant1_id", "participant2_id");



CREATE INDEX "idx_email_notifications_booking_id" ON "public"."email_notifications" USING "btree" ("booking_id");



CREATE INDEX "idx_email_notifications_created_at" ON "public"."email_notifications" USING "btree" ("created_at");



CREATE INDEX "idx_email_notifications_event_type" ON "public"."email_notifications" USING "btree" ("event_type");



CREATE INDEX "idx_email_notifications_status" ON "public"."email_notifications" USING "btree" ("status");



CREATE INDEX "idx_escrow_transactions_owner_stripe_account_id" ON "public"."escrow_transactions" USING "btree" ("owner_stripe_account_id");



CREATE INDEX "idx_gear_category_id" ON "public"."gear" USING "btree" ("category_id");



CREATE INDEX "idx_gear_condition" ON "public"."gear" USING "btree" ("condition");



CREATE INDEX "idx_gear_created_at" ON "public"."gear" USING "btree" ("created_at");



CREATE INDEX "idx_gear_is_available" ON "public"."gear" USING "btree" ("is_available");



CREATE INDEX "idx_gear_is_featured" ON "public"."gear" USING "btree" ("is_featured");



CREATE INDEX "idx_gear_moderation_status" ON "public"."gear" USING "btree" ("moderation_status");



CREATE INDEX "idx_gear_owner_id" ON "public"."gear" USING "btree" ("owner_id");



CREATE INDEX "idx_gear_photos_gear_id" ON "public"."gear_photos" USING "btree" ("gear_id");



CREATE INDEX "idx_gear_specifications_gear_id" ON "public"."gear_specifications" USING "btree" ("gear_id");



CREATE INDEX "idx_gear_status" ON "public"."gear" USING "btree" ("status");



CREATE INDEX "idx_handover_photos_booking_id" ON "public"."handover_photos" USING "btree" ("booking_id");



CREATE INDEX "idx_handover_photos_uploaded_by" ON "public"."handover_photos" USING "btree" ("uploaded_by");



CREATE INDEX "idx_messages_booking_id" ON "public"."messages" USING "btree" ("booking_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at");



CREATE INDEX "idx_messages_moderation_status" ON "public"."messages" USING "btree" ("moderation_status");



CREATE INDEX "idx_messages_read_at" ON "public"."messages" USING "btree" ("read_at");



CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_moderation_queue_created_at" ON "public"."moderation_queue" USING "btree" ("created_at");



CREATE INDEX "idx_moderation_queue_reported_by" ON "public"."moderation_queue" USING "btree" ("reported_by");



CREATE INDEX "idx_moderation_queue_status" ON "public"."moderation_queue" USING "btree" ("status");



CREATE INDEX "idx_moderation_queue_type" ON "public"."moderation_queue" USING "btree" ("type");



CREATE INDEX "idx_notifications_read_at" ON "public"."notifications" USING "btree" ("read_at");



CREATE INDEX "idx_platform_settings_key" ON "public"."platform_settings" USING "btree" ("setting_key");



CREATE INDEX "idx_rate_limits_created_at" ON "public"."rate_limits" USING "btree" ("created_at");



CREATE INDEX "idx_rate_limits_user_action" ON "public"."rate_limits" USING "btree" ("user_id", "action_type");



CREATE INDEX "idx_reviews_gear_id" ON "public"."reviews" USING "btree" ("gear_id");



CREATE INDEX "idx_reviews_gear_rating" ON "public"."reviews" USING "btree" ("gear_id", "rating", "created_at");



CREATE INDEX "idx_reviews_moderation_status" ON "public"."reviews" USING "btree" ("moderation_status");



CREATE INDEX "idx_reviews_reviewed_id" ON "public"."reviews" USING "btree" ("reviewed_id");



CREATE INDEX "idx_reviews_reviewer_id" ON "public"."reviews" USING "btree" ("reviewer_id");



CREATE INDEX "idx_transactions_booking_id" ON "public"."transactions" USING "btree" ("booking_id");



CREATE INDEX "idx_transactions_status" ON "public"."transactions" USING "btree" ("status");



CREATE INDEX "idx_transactions_stripe_payment_intent_id" ON "public"."transactions" USING "btree" ("stripe_payment_intent_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_is_suspended" ON "public"."users" USING "btree" ("is_suspended");



CREATE INDEX "idx_users_is_verified" ON "public"."users" USING "btree" ("is_verified");



CREATE INDEX "idx_users_moderation_status" ON "public"."users" USING "btree" ("moderation_status");



CREATE INDEX "idx_users_phone" ON "public"."users" USING "btree" ("phone");



CREATE INDEX "idx_users_rating" ON "public"."users" USING "btree" ("rating");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."claims" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."connected_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."email_notifications" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."escrow_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."gear" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."message_threads" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."moderation_queue" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "sync_gear_availability_trigger" BEFORE INSERT OR UPDATE ON "public"."gear" FOR EACH ROW EXECUTE FUNCTION "public"."sync_gear_availability"();



CREATE OR REPLACE TRIGGER "update_booking_payment_status_trigger" AFTER UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_booking_payment_status"();



CREATE OR REPLACE TRIGGER "update_user_rating_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_user_rating"();



CREATE OR REPLACE TRIGGER "validate_gear_trigger" BEFORE INSERT OR UPDATE ON "public"."gear" FOR EACH ROW EXECUTE FUNCTION "public"."validate_gear_before_insert_update"();



CREATE OR REPLACE TRIGGER "validate_transaction_amounts_trigger" BEFORE INSERT OR UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."validate_transaction_amounts"();



ALTER TABLE ONLY "public"."admin_actions"
    ADD CONSTRAINT "admin_actions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analytics"
    ADD CONSTRAINT "analytics_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."analytics"
    ADD CONSTRAINT "analytics_gear_id_fkey" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."analytics"
    ADD CONSTRAINT "analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_gear_id_fkey" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_renter_id_fkey" FOREIGN KEY ("renter_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claim_photos"
    ADD CONSTRAINT "claim_photos_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_claimant_id_fkey" FOREIGN KEY ("claimant_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_renter_id_fkey" FOREIGN KEY ("renter_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."connected_accounts"
    ADD CONSTRAINT "connected_accounts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_participant1_id_fkey" FOREIGN KEY ("participant1_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_participant2_id_fkey" FOREIGN KEY ("participant2_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_notifications"
    ADD CONSTRAINT "email_notifications_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."escrow_transactions"
    ADD CONSTRAINT "escrow_transactions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."escrow_transactions"
    ADD CONSTRAINT "escrow_transactions_released_to_fkey" FOREIGN KEY ("released_to") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gear"
    ADD CONSTRAINT "gear_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gear"
    ADD CONSTRAINT "gear_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gear_photos"
    ADD CONSTRAINT "gear_photos_gear_id_fkey" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gear_specifications"
    ADD CONSTRAINT "gear_specifications_gear_id_fkey" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."handover_photos"
    ADD CONSTRAINT "handover_photos_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."handover_photos"
    ADD CONSTRAINT "handover_photos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_participant1_id_fkey" FOREIGN KEY ("participant1_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_participant2_id_fkey" FOREIGN KEY ("participant2_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."moderation_queue"
    ADD CONSTRAINT "moderation_queue_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."moderation_queue"
    ADD CONSTRAINT "moderation_queue_moderated_by_fkey" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."moderation_queue"
    ADD CONSTRAINT "moderation_queue_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."photo_uploads"
    ADD CONSTRAINT "photo_uploads_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."photo_uploads"
    ADD CONSTRAINT "photo_uploads_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_gear_id_fkey" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_reviewed_id_fkey" FOREIGN KEY ("reviewed_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can insert into moderation queue" ON "public"."moderation_queue" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can update moderation queue" ON "public"."moderation_queue" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can view all claim photos" ON "public"."claim_photos" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"]))))));



CREATE POLICY "Admins can view moderation queue" ON "public"."moderation_queue" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Anyone can create analytics events" ON "public"."analytics" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can view gear photos" ON "public"."gear_photos" FOR SELECT USING (true);



CREATE POLICY "Anyone can view gear specifications" ON "public"."gear_specifications" FOR SELECT USING (true);



CREATE POLICY "Anyone can view platform settings" ON "public"."platform_settings" FOR SELECT USING (true);



CREATE POLICY "Gear owners can manage photos" ON "public"."gear_photos" USING ((EXISTS ( SELECT 1
   FROM "public"."gear"
  WHERE (("gear"."id" = "gear_photos"."gear_id") AND ("gear"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Gear owners can manage specifications" ON "public"."gear_specifications" USING ((EXISTS ( SELECT 1
   FROM "public"."gear"
  WHERE (("gear"."id" = "gear_specifications"."gear_id") AND ("gear"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Only admins can create admin actions" ON "public"."admin_actions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"]))))));



CREATE POLICY "Only admins can manage platform settings" ON "public"."platform_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"]))))));



CREATE POLICY "Only admins can view admin actions" ON "public"."admin_actions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"]))))));



CREATE POLICY "Only admins can view analytics" ON "public"."analytics" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"]))))));



CREATE POLICY "Public can view user profiles for gear" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Service role can insert email notifications" ON "public"."email_notifications" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage bookings" ON "public"."bookings" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage connected accounts" ON "public"."connected_accounts" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage escrow transactions" ON "public"."escrow_transactions" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can update email notifications" ON "public"."email_notifications" FOR UPDATE USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "System can create notifications" ON "public"."notifications" FOR INSERT WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"])))))));



CREATE POLICY "System can manage user profiles" ON "public"."users" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "System can update transaction status" ON "public"."transactions" FOR UPDATE USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can create bookings" ON "public"."bookings" FOR INSERT WITH CHECK (("auth"."uid"() = "renter_id"));



CREATE POLICY "Users can create claims for their bookings" ON "public"."claims" FOR INSERT WITH CHECK ((("auth"."uid"() = "claimant_id") AND (EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "claims"."booking_id") AND (("bookings"."renter_id" = "auth"."uid"()) OR ("bookings"."owner_id" = "auth"."uid"())))))));



CREATE POLICY "Users can create conversations for their bookings" ON "public"."conversations" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "conversations"."booking_id") AND (("bookings"."renter_id" = "auth"."uid"()) OR ("bookings"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "Users can create message threads for their bookings" ON "public"."message_threads" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "message_threads"."booking_id") AND (("bookings"."renter_id" = "auth"."uid"()) OR ("bookings"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "Users can create own connected account" ON "public"."connected_accounts" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can create reviews" ON "public"."reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "reviewer_id"));



CREATE POLICY "Users can create transactions for their bookings" ON "public"."transactions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "transactions"."booking_id") AND ("bookings"."renter_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert handover photos for their bookings" ON "public"."handover_photos" FOR INSERT WITH CHECK ((("auth"."uid"() = "uploaded_by") AND (EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "handover_photos"."booking_id") AND (("bookings"."renter_id" = "auth"."uid"()) OR ("bookings"."owner_id" = "auth"."uid"())))))));



CREATE POLICY "Users can insert own profile" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert photo uploads for their bookings" ON "public"."photo_uploads" FOR INSERT WITH CHECK ((("auth"."uid"() = "uploaded_by") AND (EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "photo_uploads"."booking_id") AND (("bookings"."renter_id" = "auth"."uid"()) OR ("bookings"."owner_id" = "auth"."uid"())))))));



CREATE POLICY "Users can insert their own rate limits" ON "public"."rate_limits" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can report items" ON "public"."moderation_queue" FOR INSERT WITH CHECK (("auth"."uid"() = "reported_by"));



CREATE POLICY "Users can send messages for their bookings" ON "public"."messages" FOR INSERT WITH CHECK ((("auth"."uid"() = "sender_id") AND (EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "messages"."booking_id") AND (("bookings"."renter_id" = "auth"."uid"()) OR ("bookings"."owner_id" = "auth"."uid"())))))));



CREATE POLICY "Users can update claims for their bookings" ON "public"."claims" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "claims"."booking_id") AND (("bookings"."renter_id" = "auth"."uid"()) OR ("bookings"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update own connected account" ON "public"."connected_accounts" FOR UPDATE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update reviews" ON "public"."reviews" FOR UPDATE USING (("auth"."uid"() = "reviewer_id"));



CREATE POLICY "Users can update their own bookings" ON "public"."bookings" FOR UPDATE USING ((("auth"."uid"() = "renter_id") OR ("auth"."uid"() = "owner_id")));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can upload claim photos" ON "public"."claim_photos" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."claims"
  WHERE (("claims"."id" = "claim_photos"."claim_id") AND ("claims"."claimant_id" = "auth"."uid"())))));



CREATE POLICY "Users can view bookings" ON "public"."bookings" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can view claims" ON "public"."claims" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can view connected accounts" ON "public"."connected_accounts" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can view conversations for their bookings" ON "public"."conversations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "conversations"."booking_id") AND (("bookings"."renter_id" = "auth"."uid"()) OR ("bookings"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view escrow transactions for their bookings" ON "public"."escrow_transactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "escrow_transactions"."booking_id") AND (("bookings"."renter_id" = "auth"."uid"()) OR ("bookings"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view handover photos for their bookings" ON "public"."handover_photos" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "handover_photos"."booking_id") AND (("bookings"."renter_id" = "auth"."uid"()) OR ("bookings"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view message threads for their bookings" ON "public"."message_threads" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "message_threads"."booking_id") AND (("bookings"."renter_id" = "auth"."uid"()) OR ("bookings"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view messages" ON "public"."messages" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can view own profile" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view photo uploads for their bookings" ON "public"."photo_uploads" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "photo_uploads"."booking_id") AND (("bookings"."renter_id" = "auth"."uid"()) OR ("bookings"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view reviews" ON "public"."reviews" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can view their own bookings" ON "public"."bookings" FOR SELECT USING ((("auth"."uid"() = "renter_id") OR ("auth"."uid"() = "owner_id")));



CREATE POLICY "Users can view their own claim photos" ON "public"."claim_photos" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."claims"
  WHERE (("claims"."id" = "claim_photos"."claim_id") AND ("claims"."claimant_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own email notifications" ON "public"."email_notifications" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "email_notifications"."booking_id") AND (("bookings"."owner_id" = "auth"."uid"()) OR ("bookings"."renter_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own rate limits" ON "public"."rate_limits" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view transactions for their bookings" ON "public"."transactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."bookings"
  WHERE (("bookings"."id" = "transactions"."booking_id") AND (("bookings"."renter_id" = "auth"."uid"()) OR ("bookings"."owner_id" = "auth"."uid"()))))));



ALTER TABLE "public"."admin_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_select_policy" ON "public"."categories" FOR SELECT USING (true);



ALTER TABLE "public"."claim_photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."claims" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."connected_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."escrow_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gear" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gear_insert_policy" ON "public"."gear" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



ALTER TABLE "public"."gear_photos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gear_select_policy" ON "public"."gear" FOR SELECT USING (true);



CREATE POLICY "gear_select_with_joins_policy" ON "public"."gear" FOR SELECT USING (true);



ALTER TABLE "public"."gear_specifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gear_update_policy" ON "public"."gear" FOR UPDATE USING (("auth"."uid"() = "owner_id"));



ALTER TABLE "public"."handover_photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_threads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."moderation_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."photo_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";

























































































































































GRANT ALL ON FUNCTION "public"."calculate_booking_total"("p_daily_rate" numeric, "p_start_date" "date", "p_end_date" "date", "p_platform_fee_percentage" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_booking_total"("p_daily_rate" numeric, "p_start_date" "date", "p_end_date" "date", "p_platform_fee_percentage" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_platform_fee"("rental_amount" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_platform_fee"("rental_amount" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_auth_rate_limit"("action_type" "text", "max_attempts" integer, "window_minutes" integer, "lockout_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_auth_rate_limit"("action_type" "text", "max_attempts" integer, "window_minutes" integer, "lockout_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_rate_limit"("action_type" "text", "max_actions" integer, "window_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("action_type" "text", "max_actions" integer, "window_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_trigger_debug"() TO "service_role";
GRANT ALL ON FUNCTION "public"."check_trigger_debug"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_avatar_url"("avatar_path" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_avatar_url"("avatar_path" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_overdue_pickups"("cutoff_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_overdue_pickups"("cutoff_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_account_locked"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_account_locked"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_auth_event"("event_type" "text", "user_id" "uuid", "details" "jsonb", "ip_address" "inet", "user_agent" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_auth_event"("event_type" "text", "user_id" "uuid", "details" "jsonb", "ip_address" "inet", "user_agent" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_gear_availability"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_gear_availability"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_user_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_user_rating"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_booking_payment_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_booking_payment_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_rating"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_rating"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_gear_before_insert_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_gear_before_insert_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_gear_input"("gear_name" "text", "gear_description" "text", "price_per_day" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_gear_input"("gear_name" "text", "gear_description" "text", "price_per_day" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_payment_amounts"("rental_amount" integer, "deposit_amount" integer, "platform_fee" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_payment_amounts"("rental_amount" integer, "deposit_amount" integer, "platform_fee" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_transaction_amounts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_transaction_amounts"() TO "service_role";


















GRANT SELECT,INSERT ON TABLE "public"."admin_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_actions" TO "service_role";



GRANT INSERT ON TABLE "public"."analytics" TO "anon";
GRANT SELECT,INSERT ON TABLE "public"."analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics" TO "service_role";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT SELECT ON TABLE "public"."categories" TO "anon";
GRANT SELECT ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."claim_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."claim_photos" TO "service_role";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."claims" TO "authenticated";
GRANT ALL ON TABLE "public"."claims" TO "service_role";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."connected_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."connected_accounts" TO "service_role";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT SELECT ON TABLE "public"."email_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."email_notifications" TO "service_role";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."escrow_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."escrow_transactions" TO "service_role";



GRANT SELECT ON TABLE "public"."gear" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."gear" TO "authenticated";
GRANT ALL ON TABLE "public"."gear" TO "service_role";



GRANT SELECT ON TABLE "public"."gear_photos" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."gear_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."gear_photos" TO "service_role";



GRANT SELECT ON TABLE "public"."gear_specifications" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."gear_specifications" TO "authenticated";
GRANT ALL ON TABLE "public"."gear_specifications" TO "service_role";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."handover_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."handover_photos" TO "service_role";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."message_threads" TO "authenticated";
GRANT ALL ON TABLE "public"."message_threads" TO "service_role";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT SELECT,INSERT ON TABLE "public"."moderation_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."moderation_queue" TO "service_role";



GRANT SELECT,UPDATE ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."photo_uploads" TO "authenticated";
GRANT ALL ON TABLE "public"."photo_uploads" TO "service_role";



GRANT SELECT ON TABLE "public"."platform_settings" TO "anon";
GRANT SELECT ON TABLE "public"."platform_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_settings" TO "service_role";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limits" TO "service_role";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT SELECT,INSERT,UPDATE ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT SELECT ON TABLE "public"."users" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";

































RESET ALL;

-- Add policy to allow service role full access to rate_limits
CREATE POLICY "Service role can manage all rate limits" ON "public"."rate_limits" FOR ALL USING (("auth"."role"() = 'service_role'));

-- Add policy to allow users to view rate limits by action_type for their own records
CREATE POLICY "Users can view rate limits by action type" ON "public"."rate_limits" FOR SELECT USING (("auth"."uid"() = "user_id"));

-- Add unique constraint for upsert operations
ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_user_action_unique" UNIQUE ("user_id", "action_type");

-- Add function to get rate limit status
CREATE OR REPLACE FUNCTION "public"."get_rate_limit_status"("action_type" "text", "max_actions" integer DEFAULT 10, "window_minutes" integer DEFAULT 60) RETURNS TABLE("is_limited" boolean, "remaining" integer, "limit" integer, "reset_time" timestamptz, "window_start" timestamptz)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMPTZ;
  reset_time TIMESTAMPTZ;
BEGIN
  -- Get current window start
  window_start := now() - (window_minutes || ' minutes')::INTERVAL;
  
  -- Count actions in current window
  SELECT COALESCE(SUM(action_count), 0) INTO current_count
  FROM public.rate_limits
  WHERE user_id = auth.uid()
    AND action_type = get_rate_limit_status.action_type
    AND created_at > window_start;
  
  -- Calculate reset time
  reset_time := now() + (window_minutes || ' minutes')::INTERVAL;
  
  -- Return status
  RETURN QUERY SELECT
    current_count >= max_actions as is_limited,
    GREATEST(0, max_actions - current_count) as remaining,
    max_actions as limit,
    reset_time,
    window_start;
END;
$$;

-- Grant permissions for the new function
GRANT ALL ON FUNCTION "public"."get_rate_limit_status"("action_type" "text", "max_actions" integer, "window_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_rate_limit_status"("action_type" "text", "max_actions" integer, "window_minutes" integer) TO "service_role";
