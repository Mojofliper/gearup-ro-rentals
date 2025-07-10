-- Create cleanup_logs table to track automatic cleanup operations
CREATE TABLE IF NOT EXISTS cleanup_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deleted_count INTEGER NOT NULL DEFAULT 0,
  cutoff_time TIMESTAMPTZ NOT NULL,
  deleted_booking_ids UUID[],
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for cleanup_logs
ALTER TABLE cleanup_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read cleanup logs
CREATE POLICY "Admins can read cleanup logs" ON cleanup_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Only service role can insert cleanup logs
CREATE POLICY "Service role can insert cleanup logs" ON cleanup_logs
  FOR INSERT WITH CHECK (true);

-- Only service role can update cleanup logs
CREATE POLICY "Service role can update cleanup logs" ON cleanup_logs
  FOR UPDATE USING (true);

-- Create function to log cleanup operations
CREATE OR REPLACE FUNCTION log_cleanup_operation(
  p_deleted_count INTEGER,
  p_cutoff_time TIMESTAMPTZ,
  p_deleted_booking_ids UUID[] DEFAULT NULL,
  p_execution_time_ms INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO cleanup_logs (
    deleted_count,
    cutoff_time,
    deleted_booking_ids,
    execution_time_ms
  ) VALUES (
    p_deleted_count,
    p_cutoff_time,
    p_deleted_booking_ids,
    p_execution_time_ms
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (for admin access)
GRANT EXECUTE ON FUNCTION log_cleanup_operation TO authenticated;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_created_at ON cleanup_logs(created_at DESC); 