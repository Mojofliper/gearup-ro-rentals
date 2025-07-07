-- Fix data type mismatch between transactions and bookings tables
-- Change integer columns to numeric to match bookings table

-- Alter transactions table to use numeric for amount columns
ALTER TABLE public.transactions 
  ALTER COLUMN amount TYPE numeric,
  ALTER COLUMN platform_fee TYPE numeric,
  ALTER COLUMN deposit_amount TYPE numeric,
  ALTER COLUMN rental_amount TYPE numeric,
  ALTER COLUMN refund_amount TYPE numeric;

-- Set default values for numeric columns
ALTER TABLE public.transactions 
  ALTER COLUMN refund_amount SET DEFAULT 0.00;

-- Tell PostgREST to reload cached schema
NOTIFY pgrst, 'reload schema'; 