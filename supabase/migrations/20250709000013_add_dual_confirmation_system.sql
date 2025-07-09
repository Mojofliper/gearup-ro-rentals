-- Add missing dual confirmation fields for complete escrow release system
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS pickup_confirmed_by_owner BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pickup_confirmed_by_owner_at TIMESTAMPTZ;

-- Add missing booking statuses if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'booking_status' AND enumlabel = 'return_confirmed') THEN
    ALTER TYPE booking_status ADD VALUE 'return_confirmed';
  END IF;
END $$;

-- Create function to handle dual confirmation logic
CREATE OR REPLACE FUNCTION public.handle_dual_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle pickup dual confirmation (no escrow release, just status update)
  IF (NEW.pickup_confirmed_by_owner IS DISTINCT FROM OLD.pickup_confirmed_by_owner OR 
      NEW.pickup_confirmed_by_renter IS DISTINCT FROM OLD.pickup_confirmed_by_renter) THEN
    
    -- If both parties have confirmed pickup, update status to active
    IF NEW.pickup_confirmed_by_owner AND NEW.pickup_confirmed_by_renter AND 
       (NOT OLD.pickup_confirmed_by_owner OR NOT OLD.pickup_confirmed_by_renter) THEN
      
      -- Update status to active (equipment is now with renter)
      NEW.status = 'active';
    END IF;
  END IF;

  -- Handle return dual confirmation (this is where escrow gets released)
  IF (NEW.return_confirmed_by_owner IS DISTINCT FROM OLD.return_confirmed_by_owner OR 
      NEW.return_confirmed_by_renter IS DISTINCT FROM OLD.return_confirmed_by_renter) THEN
    
    -- If both parties have confirmed return, update status and trigger escrow release
    IF NEW.return_confirmed_by_owner AND NEW.return_confirmed_by_renter AND 
       (NOT OLD.return_confirmed_by_owner OR NOT OLD.return_confirmed_by_renter) THEN
      
      -- Update status to completed
      NEW.status = 'completed';
      NEW.completed_at = now();
      
      -- Trigger escrow release for both rental amount and deposit
      PERFORM public.trigger_escrow_release(NEW.id, 'return_confirmed');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to trigger escrow release
CREATE OR REPLACE FUNCTION public.trigger_escrow_release(booking_id UUID, release_type TEXT)
RETURNS VOID AS $$
BEGIN
  -- Call the escrow release edge function
  PERFORM http_post(
    'https://wnrbxwzeshgblkfidayb.supabase.co/functions/v1/escrow-release',
    'application/json',
    json_build_object(
      'booking_id', booking_id,
      'release_type', release_type
    )::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for dual confirmation
DROP TRIGGER IF EXISTS trigger_dual_confirmation ON public.bookings;
CREATE TRIGGER trigger_dual_confirmation
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_dual_confirmation();

-- Add comments
COMMENT ON FUNCTION public.handle_dual_confirmation() IS 'Handles dual confirmation logic for pickup and return, ensuring escrow is only released when both parties confirm return';
COMMENT ON FUNCTION public.trigger_escrow_release(UUID, TEXT) IS 'Triggers escrow release edge function when dual confirmation is complete'; 