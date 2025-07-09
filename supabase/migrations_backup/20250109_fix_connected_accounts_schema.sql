-- Fix connected_accounts table schema to support Stripe sync
-- Add missing columns and update constraints

-- Add missing columns
ALTER TABLE public.connected_accounts 
ADD COLUMN IF NOT EXISTS details_submitted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS business_profile JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS company JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS individual JSONB DEFAULT '{}';

-- Update the account_status CHECK constraint to include new statuses
ALTER TABLE public.connected_accounts 
DROP CONSTRAINT IF EXISTS connected_accounts_account_status_check;

ALTER TABLE public.connected_accounts 
ADD CONSTRAINT connected_accounts_account_status_check 
CHECK (account_status IN ('pending', 'active', 'restricted', 'connect_required', 'charges_only', 'verification_required', 'invalid')); 