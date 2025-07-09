-- Add missing columns to escrow_transactions table
ALTER TABLE public.escrow_transactions 
ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
ADD COLUMN IF NOT EXISTS owner_stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS platform_fee INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_reason TEXT,
ADD COLUMN IF NOT EXISTS refund_id TEXT,
ADD COLUMN IF NOT EXISTS transfer_id TEXT,
ADD COLUMN IF NOT EXISTS transfer_failure_reason TEXT;

-- Add index for stripe_charge_id
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_stripe_charge_id 
ON public.escrow_transactions(stripe_charge_id);

-- Add index for owner_stripe_account_id
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_owner_stripe_account_id 
ON public.escrow_transactions(owner_stripe_account_id); 