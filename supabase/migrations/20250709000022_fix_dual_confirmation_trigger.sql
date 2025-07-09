-- Fix the dual confirmation trigger to properly call the escrow release function
-- The issue is that http_post might not be working properly in the database

-- First, enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

-- Drop the existing trigger and functions
DROP TRIGGER IF EXISTS trigger_dual_confirmation ON public.bookings;
DROP FUNCTION IF EXISTS public.trigger_escrow_release(UUID, TEXT);
DROP FUNCTION IF EXISTS public.handle_dual_confirmation();

-- Create improved function to handle dual confirmation logic
CREATE OR REPLACE FUNCTION public.handle_dual_confirmation()
RETURNS TRIGGER AS $$
DECLARE
  response_status INTEGER;
  response_content TEXT;
BEGIN
  -- Handle pickup dual confirmation (no escrow release, just status update)
  IF (NEW.pickup_confirmed_by_owner IS DISTINCT FROM OLD.pickup_confirmed_by_owner OR 
      NEW.pickup_confirmed_by_renter IS DISTINCT FROM OLD.pickup_confirmed_by_renter) THEN
    
    -- If both parties have confirmed pickup, update status to active
    IF NEW.pickup_confirmed_by_owner AND NEW.pickup_confirmed_by_renter AND 
       (NOT OLD.pickup_confirmed_by_owner OR NOT OLD.pickup_confirmed_by_renter) THEN
      
      -- Update status to active (equipment is now with renter)
      NEW.status = 'active';
      
      -- Log the pickup confirmation
      RAISE LOG 'Dual confirmation: Both parties confirmed pickup for booking %', NEW.id;
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
      
      -- Log the return confirmation
      RAISE LOG 'Dual confirmation: Both parties confirmed return for booking %', NEW.id;
      
      -- Call the escrow release edge function directly
      SELECT status, content INTO response_status, response_content
      FROM http((
        'POST',
        'https://wnrbxwzeshgblkfidayb.supabase.co/functions/v1/escrow-release',
        ARRAY[http_header('Content-Type', 'application/json')],
        'application/json',
        json_build_object(
          'booking_id', NEW.id,
          'release_type', 'return_confirmed'
        )::text
      ));
      
      -- Log the response
      RAISE LOG 'Escrow release response: status=%, content=%', response_status, response_content;
      
      -- If the call failed, log the error but don't fail the transaction
      IF response_status != 200 THEN
        RAISE LOG 'Warning: Escrow release failed with status % for booking %', response_status, NEW.id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for dual confirmation
CREATE TRIGGER trigger_dual_confirmation
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_dual_confirmation();

-- Add comments
COMMENT ON FUNCTION public.handle_dual_confirmation() IS 'Handles dual confirmation logic for pickup and return, ensuring escrow is only released when both parties confirm return'; 