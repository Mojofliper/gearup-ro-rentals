-- Add cancelled_at field to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at ON bookings(cancelled_at);

-- Add comment for documentation
COMMENT ON COLUMN bookings.cancelled_at IS 'Timestamp when the booking was cancelled/rejected'; 