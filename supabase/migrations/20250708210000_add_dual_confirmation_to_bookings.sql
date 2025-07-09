-- Add dual confirmation columns for pickup and return
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pickup_confirmed_by_owner BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pickup_confirmed_by_owner_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_confirmed_by_renter BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pickup_confirmed_by_renter_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_confirmed_by_renter BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS return_confirmed_by_renter_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_confirmed_by_owner BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS return_confirmed_by_owner_at TIMESTAMPTZ; 