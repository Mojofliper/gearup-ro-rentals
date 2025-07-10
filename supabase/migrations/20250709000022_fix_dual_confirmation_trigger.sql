-- Fix the dual confirmation trigger to restore the old escrow release flow
CREATE EXTENSION IF NOT EXISTS http;

DROP TRIGGER IF EXISTS trigger_dual_confirmation ON public.bookings;
DROP FUNCTION IF EXISTS public.handle_dual_confirmation();

CREATE OR REPLACE FUNCTION public.handle_dual_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- On both pickup confirmations, release rental amount to owner
  IF (NEW.pickup_confirmed_by_owner IS DISTINCT FROM OLD.pickup_confirmed_by_owner OR 
      NEW.pickup_confirmed_by_renter IS DISTINCT FROM OLD.pickup_confirmed_by_renter) THEN
    IF NEW.pickup_confirmed_by_owner AND NEW.pickup_confirmed_by_renter AND 
       (NOT OLD.pickup_confirmed_by_owner OR NOT OLD.pickup_confirmed_by_renter) THEN
      NEW.status = 'active';
      -- Release rental amount to owner
      PERFORM http_post(
        'https://wnrbxwzeshgblkfidayb.supabase.co/functions/v1/escrow-release',
        'application/json',
        json_build_object(
          'booking_id', NEW.id,
          'release_type', 'pickup_confirmed'
        )::text
      );
    END IF;
  END IF;

  -- On both return confirmations, refund deposit to renter
  IF (NEW.return_confirmed_by_owner IS DISTINCT FROM OLD.return_confirmed_by_owner OR 
      NEW.return_confirmed_by_renter IS DISTINCT FROM OLD.return_confirmed_by_renter) THEN
    IF NEW.return_confirmed_by_owner AND NEW.return_confirmed_by_renter AND 
       (NOT OLD.return_confirmed_by_owner OR NOT OLD.return_confirmed_by_renter) THEN
      NEW.status = 'completed';
      NEW.completed_at = now();
      -- Refund deposit to renter
      PERFORM http_post(
        'https://wnrbxwzeshgblkfidayb.supabase.co/functions/v1/escrow-release',
        'application/json',
        json_build_object(
          'booking_id', NEW.id,
          'release_type', 'return_confirmed'
        )::text
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_dual_confirmation
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_dual_confirmation(); 