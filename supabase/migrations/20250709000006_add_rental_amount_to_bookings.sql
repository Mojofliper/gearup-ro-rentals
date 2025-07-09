-- Add missing rental_amount column to bookings table
-- This column represents the actual rental cost (without deposit and fees)

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS rental_amount INTEGER NOT NULL DEFAULT 0;

-- Add comment explaining the column
COMMENT ON COLUMN public.bookings.rental_amount IS 'The actual rental cost in RON cents (without deposit and platform fees)';

-- Update existing bookings to calculate rental_amount if it's 0
UPDATE public.bookings 
SET rental_amount = total_amount - deposit_amount - platform_fee 
WHERE rental_amount = 0 AND total_amount > 0;

-- Add constraint to ensure rental_amount is positive
ALTER TABLE public.bookings 
ADD CONSTRAINT check_rental_amount_positive 
CHECK (rental_amount >= 0);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_rental_amount ON public.bookings(rental_amount); 