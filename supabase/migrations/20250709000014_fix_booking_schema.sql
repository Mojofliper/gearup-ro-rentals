-- Fix booking schema to ensure all required fields are present
-- This migration ensures the bookings table has all necessary fields for the application

-- Add missing rental_amount column if it doesn't exist
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS rental_amount INTEGER NOT NULL DEFAULT 0;

-- Add missing dual confirmation fields if they don't exist
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS pickup_confirmed_by_renter BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pickup_confirmed_by_renter_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pickup_confirmed_by_owner BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pickup_confirmed_by_owner_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS return_confirmed_by_renter BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS return_confirmed_by_renter_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS return_confirmed_by_owner BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS return_confirmed_by_owner_at TIMESTAMPTZ;

-- Add missing cancellation fields if they don't exist
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add missing escrow tracking fields if they don't exist
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS escrow_release_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rental_amount_released BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deposit_returned BOOLEAN DEFAULT FALSE;

-- Add missing payment intent field if it doesn't exist
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;

-- Update existing bookings to calculate rental_amount if it's 0
UPDATE public.bookings 
SET rental_amount = total_amount - deposit_amount - platform_fee 
WHERE rental_amount = 0 AND total_amount > 0;

-- Add constraint to ensure rental_amount is positive
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS check_rental_amount_positive;
ALTER TABLE public.bookings 
ADD CONSTRAINT check_rental_amount_positive 
CHECK (rental_amount >= 0);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_rental_amount ON public.bookings(rental_amount);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at);

-- Ensure foreign key constraints exist
DO $$ 
BEGIN
    -- Check if bookings_gear_id_fkey exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookings_gear_id_fkey' 
        AND table_name = 'bookings'
    ) THEN
        ALTER TABLE public.bookings ADD CONSTRAINT bookings_gear_id_fkey 
        FOREIGN KEY (gear_id) REFERENCES public.gear(id) ON DELETE CASCADE;
    END IF;

    -- Check if bookings_renter_id_fkey exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookings_renter_id_fkey' 
        AND table_name = 'bookings'
    ) THEN
        ALTER TABLE public.bookings ADD CONSTRAINT bookings_renter_id_fkey 
        FOREIGN KEY (renter_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    -- Check if bookings_owner_id_fkey exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookings_owner_id_fkey' 
        AND table_name = 'bookings'
    ) THEN
        ALTER TABLE public.bookings ADD CONSTRAINT bookings_owner_id_fkey 
        FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN public.bookings.rental_amount IS 'The actual rental cost in RON cents (without deposit and platform fees)';
COMMENT ON COLUMN public.bookings.pickup_confirmed_by_renter IS 'Whether the renter has confirmed pickup';
COMMENT ON COLUMN public.bookings.pickup_confirmed_by_owner IS 'Whether the owner has confirmed pickup';
COMMENT ON COLUMN public.bookings.return_confirmed_by_renter IS 'Whether the renter has confirmed return';
COMMENT ON COLUMN public.bookings.return_confirmed_by_owner IS 'Whether the owner has confirmed return'; 