-- Add gear_id column to public.reviews and backfill existing records
-- This solves frontend errors where gear_id is expected by API layer.

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS gear_id UUID REFERENCES public.gear(id) ON DELETE CASCADE;

-- Back-fill existing rows by borrowing the gear_id from the related booking
UPDATE public.reviews AS r
SET    gear_id = b.gear_id
FROM   public.bookings AS b
WHERE  r.booking_id = b.id
  AND  r.gear_id IS NULL;

-- Helpful index for look-ups by gear
CREATE INDEX IF NOT EXISTS idx_reviews_gear_id ON public.reviews(gear_id);

-- Tell PostgREST to reload cached schema so the new column is immediately usable
NOTIFY pgrst, 'reload schema'; 