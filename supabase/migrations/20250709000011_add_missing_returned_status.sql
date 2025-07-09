-- Add missing "returned" status to booking_status enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'booking_status' AND enumlabel = 'returned') THEN
    ALTER TYPE booking_status ADD VALUE 'returned';
  END IF;
END $$;

-- Add comment
COMMENT ON TYPE booking_status IS 'Booking status enum: pending, confirmed, active, returned, completed, cancelled, disputed, pickup_confirmed, return_confirmed'; 