-- Add new enum labels for auto refund
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'escrow_status' AND enumlabel = 'auto_refunded') THEN
    ALTER TYPE escrow_status ADD VALUE 'auto_refunded';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'booking_status' AND enumlabel = 'cancelled') THEN
    ALTER TYPE booking_status ADD VALUE 'cancelled';
  END IF;
END $$; 