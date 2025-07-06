
-- Add pickup location and phase tracking to bookings
ALTER TABLE public.bookings 
ADD COLUMN pickup_location TEXT,
ADD COLUMN pickup_confirmed_at TIMESTAMPTZ,
ADD COLUMN return_confirmed_at TIMESTAMPTZ,
ADD COLUMN completion_phase TEXT DEFAULT 'pending' CHECK (completion_phase IN ('pending', 'confirmed', 'paid', 'pickup_ready', 'active', 'return_pending', 'completed', 'disputed', 'cancelled'));

-- Update existing bookings to have proper completion_phase
UPDATE public.bookings 
SET completion_phase = CASE 
  WHEN payment_status = 'paid' AND status = 'confirmed' THEN 'paid'
  WHEN status = 'confirmed' THEN 'confirmed'
  WHEN status = 'pending' THEN 'pending'
  ELSE 'pending'
END;

-- Add notification preferences to profiles
ALTER TABLE public.profiles 
ADD COLUMN notification_preferences JSONB DEFAULT '{"email": true, "in_app": true}'::jsonb;

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('booking_request', 'booking_approved', 'booking_rejected', 'payment_due', 'pickup_ready', 'return_reminder', 'claim_filed')),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create notification policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Create function to automatically create notifications
CREATE OR REPLACE FUNCTION public.create_booking_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_booking_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, booking_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_booking_id)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function for booking status changes
CREATE OR REPLACE FUNCTION public.handle_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking is confirmed, notify renter
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    PERFORM public.create_booking_notification(
      NEW.renter_id,
      'Booking Approved!',
      'Your booking request has been approved. Please complete payment within 24 hours.',
      'booking_approved',
      NEW.id
    );
  END IF;
  
  -- When payment is completed, notify owner
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    PERFORM public.create_booking_notification(
      NEW.owner_id,
      'Payment Received',
      'Payment has been received for your gear rental. Please set pickup location.',
      'pickup_ready',
      NEW.id
    );
    
    -- Update completion phase
    NEW.completion_phase = 'paid';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking status changes
CREATE TRIGGER booking_status_change_trigger
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_booking_status_change();

-- Add indexes for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_bookings_completion_phase ON public.bookings(completion_phase);
