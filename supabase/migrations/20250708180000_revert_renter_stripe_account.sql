-- Revert the renter_stripe_account_id column from escrow_transactions
ALTER TABLE public.escrow_transactions
  DROP COLUMN IF EXISTS renter_stripe_account_id;

-- Drop the index if it exists
DROP INDEX IF EXISTS idx_escrow_transactions_renter_account; 