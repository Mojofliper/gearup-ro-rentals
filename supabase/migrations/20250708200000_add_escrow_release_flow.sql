-- Add missing booking statuses for escrow release flow
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'booking_status' AND enumlabel = 'pickup_confirmed') THEN
    ALTER TYPE booking_status ADD VALUE 'pickup_confirmed';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'booking_status' AND enumlabel = 'return_confirmed') THEN
    ALTER TYPE booking_status ADD VALUE 'return_confirmed';
  END IF;
END $$;

-- Add escrow release tracking fields to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS pickup_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS return_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escrow_release_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rental_amount_released BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deposit_returned BOOLEAN DEFAULT FALSE;

-- Add escrow release tracking fields to escrow_transactions
ALTER TABLE public.escrow_transactions 
ADD COLUMN IF NOT EXISTS rental_released_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deposit_returned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rental_transfer_id TEXT,
ADD COLUMN IF NOT EXISTS deposit_refund_id TEXT; 