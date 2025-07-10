-- Fix the dual confirmation trigger with better error handling and logging
-- This version will be more reliable and provide better debugging information

-- First, enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

-- Drop the existing trigger and functions
DROP TRIGGER IF EXISTS trigger_dual_confirmation ON public.bookings;
DROP FUNCTION IF EXISTS public.handle_dual_confirmation();

-- Create improved function to handle dual confirmation logic
CREATE OR REPLACE FUNCTION public.handle_dual_confirmation()
RETURNS TRIGGER AS $$
DECLARE
  response_status INTEGER;
  response_content TEXT;
  request_body TEXT;
  booking_id_text TEXT;
BEGIN
  -- Convert UUID to text for logging
  booking_id_text := NEW.id::text;
  
  -- Log the trigger execution
  RAISE LOG 'Dual confirmation trigger fired for booking %: pickup_owner=%, pickup_renter=%, return_owner=%, return_renter=%', 
    booking_id_text, 
    NEW.pickup_confirmed_by_owner, 
    NEW.pickup_confirmed_by_renter, 
    NEW.return_confirmed_by_owner, 
    NEW.return_confirmed_by_renter;

  -- Handle pickup dual confirmation (no escrow release, just status update)
  IF (NEW.pickup_confirmed_by_owner IS DISTINCT FROM OLD.pickup_confirmed_by_owner OR 
      NEW.pickup_confirmed_by_renter IS DISTINCT FROM OLD.pickup_confirmed_by_renter) THEN
    
    -- If both parties have confirmed pickup, update status to active
    IF NEW.pickup_confirmed_by_owner AND NEW.pickup_confirmed_by_renter AND 
       (NOT OLD.pickup_confirmed_by_owner OR NOT OLD.pickup_confirmed_by_renter) THEN
      
      -- Update status to active (equipment is now with renter)
      NEW.status = 'active';
      
      -- Log the pickup confirmation
      RAISE LOG 'Dual confirmation: Both parties confirmed pickup for booking %', booking_id_text;
    END IF;
  END IF;

  -- Handle return dual confirmation (this is where escrow gets released)
  IF (NEW.return_confirmed_by_owner IS DISTINCT FROM OLD.return_confirmed_by_owner OR 
      NEW.return_confirmed_by_renter IS DISTINCT FROM OLD.return_confirmed_by_renter) THEN
    
    -- If both parties have confirmed return, update status and trigger escrow release
    IF NEW.return_confirmed_by_owner AND NEW.return_confirmed_by_renter AND 
       (NOT OLD.return_confirmed_by_owner OR NOT OLD.return_confirmed_by_renter) THEN
      
      -- Update status to returned (gear is back with owner, but escrow not yet released)
      NEW.status = 'returned';
      NEW.returned_at = now();
      
      -- Log the return confirmation
      RAISE LOG 'Dual confirmation: Both parties confirmed return for booking %. Triggering escrow release...', booking_id_text;
      
      -- Prepare the request body
      request_body := json_build_object(
        'booking_id', booking_id_text,
        'release_type', 'return_confirmed'
      )::text;
      
      -- Log the request being sent
      RAISE LOG 'Sending escrow release request: %', request_body;
      
      -- Call the escrow release edge function directly
      BEGIN
        SELECT status, content INTO response_status, response_content
        FROM http((
          'POST',
          'https://wnrbxwzeshgblkfidayb.supabase.co/functions/v1/escrow-release',
          ARRAY[
            http_header('Content-Type', 'application/json'),
            http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true))
          ],
          'application/json',
          request_body
        ));
        
        -- Log the response
        RAISE LOG 'Escrow release response: status=%, content=%', response_status, response_content;
        
        -- If the call failed, log the error but don't fail the transaction
        IF response_status != 200 THEN
          RAISE LOG 'Warning: Escrow release failed with status % for booking %. Response: %', response_status, booking_id_text, response_content;
          
          -- Insert a notification about the failure
          INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            data,
            is_read,
            created_at
          ) VALUES (
            NEW.owner_id,
            'Eroare eliberare escrow',
            'Eliberarea fondurilor din escrow a eșuat pentru rezervarea ' || booking_id_text,
            'error',
            jsonb_build_object(
              'bookingId', booking_id_text,
              'error', 'Escrow release failed',
              'status', response_status,
              'response', response_content
            ),
            false,
            NOW()
          );
        ELSE
          -- Log success
          RAISE LOG 'Escrow release successful for booking %', booking_id_text;
        END IF;
        
      EXCEPTION WHEN OTHERS THEN
        -- Log any exceptions that occur during the HTTP call
        RAISE LOG 'Exception during escrow release for booking %: %', booking_id_text, SQLERRM;
        
        -- Insert a notification about the exception
        INSERT INTO notifications (
          user_id,
          title,
          message,
          type,
          data,
          is_read,
          created_at
        ) VALUES (
          NEW.owner_id,
          'Eroare eliberare escrow',
          'Eroare la eliberarea fondurilor din escrow pentru rezervarea ' || booking_id_text,
          'error',
          jsonb_build_object(
            'bookingId', booking_id_text,
            'error', 'Exception during escrow release',
            'exception', SQLERRM
          ),
          false,
          NOW()
        );
      END;
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

-- Test the trigger by checking if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_dual_confirmation' 
    AND tgrelid = 'public.bookings'::regclass
  ) THEN
    RAISE LOG 'Dual confirmation trigger created successfully';
  ELSE
    RAISE LOG 'Warning: Dual confirmation trigger was not created';
  END IF;
END $$;