-- Add 'error' to the notification_type enum if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_type' AND e.enumlabel = 'error'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'error';
  END IF;
END $$;

-- Add comment
COMMENT ON TYPE notification_type IS 'Enum for notification types, now includes error for system errors.'; 