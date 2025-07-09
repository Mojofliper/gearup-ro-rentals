-- Fix payment status trigger to use correct enum values
-- The enum has 'completed' but the trigger was setting 'paid'

CREATE OR REPLACE FUNCTION public.update_booking_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update booking payment status based on transaction status
  IF NEW.status = 'completed' THEN
    UPDATE public.bookings 
    SET payment_status = 'completed'
    WHERE id = NEW.booking_id;
  ELSIF NEW.status = 'failed' THEN
    UPDATE public.bookings 
    SET payment_status = 'failed'
    WHERE id = NEW.booking_id;
  ELSIF NEW.status = 'refunded' THEN
    UPDATE public.bookings 
    SET payment_status = 'refunded'
    WHERE id = NEW.booking_id;
  ELSIF NEW.status = 'processing' THEN
    UPDATE public.bookings 
    SET payment_status = 'processing'
    WHERE id = NEW.booking_id;
  ELSIF NEW.status = 'pending' THEN
    UPDATE public.bookings 
    SET payment_status = 'pending'
    WHERE id = NEW.booking_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql; 