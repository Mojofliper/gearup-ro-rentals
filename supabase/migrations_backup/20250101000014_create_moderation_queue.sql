-- Create moderation_queue table
CREATE TABLE IF NOT EXISTS moderation_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('gear', 'review', 'message', 'user')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  moderated_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_moderation_queue_type ON moderation_queue(type);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_reported_by ON moderation_queue(reported_by);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_created_at ON moderation_queue(created_at);

-- Enable RLS
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only admins can view moderation queue
CREATE POLICY "Admins can view moderation queue" ON moderation_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Only admins can insert into moderation queue
CREATE POLICY "Admins can insert into moderation queue" ON moderation_queue
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Only admins can update moderation queue
CREATE POLICY "Admins can update moderation queue" ON moderation_queue
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Users can report items (insert only)
CREATE POLICY "Users can report items" ON moderation_queue
  FOR INSERT WITH CHECK (
    auth.uid() = reported_by
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_moderation_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_moderation_queue_updated_at
  BEFORE UPDATE ON moderation_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_moderation_queue_updated_at();

-- Add moderation_status columns to existing tables
ALTER TABLE gear ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected'));

-- Create indexes for moderation_status columns
CREATE INDEX IF NOT EXISTS idx_gear_moderation_status ON gear(moderation_status);
CREATE INDEX IF NOT EXISTS idx_reviews_moderation_status ON reviews(moderation_status);
CREATE INDEX IF NOT EXISTS idx_messages_moderation_status ON messages(moderation_status);
CREATE INDEX IF NOT EXISTS idx_users_moderation_status ON users(moderation_status); 