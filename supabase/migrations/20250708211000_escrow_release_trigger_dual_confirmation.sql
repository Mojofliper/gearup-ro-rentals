-- Function to call edge function for escrow release
CREATE OR REPLACE FUNCTION public.trigger_escrow_release()
RETURNS TRIGGER AS $$
DECLARE
  booking RECORD;
  url TEXT;
  payload JSONB;
  response JSONB;
BEGIN
  SELECT * INTO booking FROM public.bookings WHERE id = NEW.id;

  -- Release rental amount after both pickup confirmations
  IF NEW.pickup_confirmed_by_owner AND NEW.pickup_confirmed_by_renter AND NOT OLD.pickup_confirmed_by_owner AND NOT OLD.pickup_confirmed_by_renter THEN
    -- Call edge function for rental release
    PERFORM net_http_post(
      'https://wnrbxwzeshgblkfidayb.supabase.co/functions/v1/escrow-release',
      '{"booking_id": "' || NEW.id || '", "release_type": "pickup_confirmed"}',
      'application/json',
      NULL
    );
  END IF;

  -- Release deposit after both return confirmations
  IF NEW.return_confirmed_by_owner AND NEW.return_confirmed_by_renter AND NOT OLD.return_confirmed_by_owner AND NOT OLD.return_confirmed_by_renter THEN
    -- Call edge function for deposit release
    PERFORM net_http_post(
      'https://wnrbxwzeshgblkfidayb.supabase.co/functions/v1/escrow-release',
      '{"booking_id": "' || NEW.id || '", "release_type": "completed"}',
      'application/json',
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to bookings table
DROP TRIGGER IF EXISTS trigger_escrow_release ON public.bookings;
CREATE TRIGGER trigger_escrow_release
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.trigger_escrow_release(); 