-- Add all missing columns to gear table to match frontend and schema
-- This migration ensures all required columns exist for gear publishing

-- Add missing columns that the frontend expects
ALTER TABLE gear ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE gear ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE gear ADD COLUMN IF NOT EXISTS condition TEXT CHECK (condition IN ('Nou', 'Ca nou', 'Foarte bună', 'Bună', 'Acceptabilă'));
ALTER TABLE gear ADD COLUMN IF NOT EXISTS pickup_location TEXT;
ALTER TABLE gear ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '[]';
ALTER TABLE gear ADD COLUMN IF NOT EXISTS included_items JSONB DEFAULT '[]';
ALTER TABLE gear ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- Ensure price_per_day column exists (frontend sends this)
ALTER TABLE gear ADD COLUMN IF NOT EXISTS price_per_day INTEGER;

-- Ensure deposit_amount column exists (frontend sends this)
ALTER TABLE gear ADD COLUMN IF NOT EXISTS deposit_amount INTEGER DEFAULT 0;

-- Add any other missing columns that might be needed
ALTER TABLE gear ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE gear ADD COLUMN IF NOT EXISTS gear_photos JSONB DEFAULT '[]';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gear_owner_id ON gear(owner_id);
CREATE INDEX IF NOT EXISTS idx_gear_category_id ON gear(category_id);
CREATE INDEX IF NOT EXISTS idx_gear_status ON gear(status);
CREATE INDEX IF NOT EXISTS idx_gear_price_per_day ON gear(price_per_day);
CREATE INDEX IF NOT EXISTS idx_gear_created_at ON gear(created_at); 