-- Create email_notifications table
CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'booking_confirmed', 
    'booking_cancelled', 
    'pickup_reminder', 
    'return_reminder', 
    'payment_received', 
    'claim_submitted', 
    'claim_updated'
  )),
  recipients TEXT[] NOT NULL,
  subject TEXT NOT NULL,
  template TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_notifications_booking_id ON email_notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_event_type ON email_notifications(event_type);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_created_at ON email_notifications(created_at);

-- Enable RLS
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own email notifications (as owner or renter of the booking)
CREATE POLICY "Users can view their own email notifications" ON email_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = email_notifications.booking_id 
      AND (bookings.owner_id = auth.uid() OR bookings.renter_id = auth.uid())
    )
  );

-- Service role can insert email notifications
CREATE POLICY "Service role can insert email notifications" ON email_notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Service role can update email notifications
CREATE POLICY "Service role can update email notifications" ON email_notifications
  FOR UPDATE USING (auth.role() = 'service_role');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_email_notifications_updated_at
  BEFORE UPDATE ON email_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_email_notifications_updated_at(); 