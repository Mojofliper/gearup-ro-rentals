-- Add completed_at field to bookings table for completion timestamp
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add comment for clarity
COMMENT ON COLUMN public.bookings.completed_at IS 'Timestamp when the booking was completed (both parties confirmed return)'; 