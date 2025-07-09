-- Ensure bookings.gear_id foreign key constraint exists
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_gear_id_fkey;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_gear_id_fkey FOREIGN KEY (gear_id) REFERENCES public.gear(id) ON DELETE CASCADE;
-- Add comment
COMMENT ON CONSTRAINT bookings_gear_id_fkey ON public.bookings IS 'Ensures gear_id in bookings references gear.id for PostgREST joins'; 