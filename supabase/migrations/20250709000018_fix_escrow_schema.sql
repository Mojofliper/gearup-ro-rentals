-- Fix escrow schema by adding missing fields
-- This migration adds fields that are referenced in the escrow-release function but missing from the schema

-- Add missing fields to escrow_transactions table
ALTER TABLE IF EXISTS public.escrow_transactions 
ADD COLUMN IF NOT EXISTS rental_released_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rental_transfer_id TEXT,
ADD COLUMN IF NOT EXISTS deposit_returned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deposit_refund_id TEXT;

-- Add missing fields to bookings table
ALTER TABLE IF EXISTS public.bookings 
ADD COLUMN IF NOT EXISTS rental_amount_released BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deposit_returned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS escrow_release_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_rental_released_at ON public.escrow_transactions(rental_released_at);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_deposit_returned_at ON public.escrow_transactions(deposit_returned_at);
CREATE INDEX IF NOT EXISTS idx_bookings_rental_amount_released ON public.bookings(rental_amount_released);
CREATE INDEX IF NOT EXISTS idx_bookings_deposit_returned ON public.bookings(deposit_returned);
CREATE INDEX IF NOT EXISTS idx_bookings_escrow_release_date ON public.bookings(escrow_release_date);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_intent_id ON public.bookings(payment_intent_id);

-- Add comments for documentation
COMMENT ON COLUMN public.escrow_transactions.rental_released_at IS 'Timestamp when rental amount was released to owner';
COMMENT ON COLUMN public.escrow_transactions.rental_transfer_id IS 'Stripe transfer ID for rental amount';
COMMENT ON COLUMN public.escrow_transactions.deposit_returned_at IS 'Timestamp when deposit was returned to renter';
COMMENT ON COLUMN public.escrow_transactions.deposit_refund_id IS 'Stripe refund ID for deposit return';
COMMENT ON COLUMN public.bookings.rental_amount_released IS 'Whether rental amount has been released to owner';
COMMENT ON COLUMN public.bookings.deposit_returned IS 'Whether deposit has been returned to renter';
COMMENT ON COLUMN public.bookings.escrow_release_date IS 'Date when escrow was released';
COMMENT ON COLUMN public.bookings.payment_intent_id IS 'Stripe payment intent ID for this booking'; 