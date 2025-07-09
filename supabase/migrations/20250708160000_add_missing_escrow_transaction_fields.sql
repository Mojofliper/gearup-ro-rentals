-- Add missing fields to escrow_transactions for full payment tracking
ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS platform_fee INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owner_stripe_account_id TEXT; 