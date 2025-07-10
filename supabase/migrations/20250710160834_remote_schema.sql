create extension if not exists "pg_net" with schema "public" version '0.14.0';

revoke delete on table "public"."cleanup_logs" from "anon";

revoke insert on table "public"."cleanup_logs" from "anon";

revoke references on table "public"."cleanup_logs" from "anon";

revoke select on table "public"."cleanup_logs" from "anon";

revoke trigger on table "public"."cleanup_logs" from "anon";

revoke truncate on table "public"."cleanup_logs" from "anon";

revoke update on table "public"."cleanup_logs" from "anon";

revoke delete on table "public"."cleanup_logs" from "authenticated";

revoke insert on table "public"."cleanup_logs" from "authenticated";

revoke references on table "public"."cleanup_logs" from "authenticated";

revoke select on table "public"."cleanup_logs" from "authenticated";

revoke trigger on table "public"."cleanup_logs" from "authenticated";

revoke truncate on table "public"."cleanup_logs" from "authenticated";

revoke update on table "public"."cleanup_logs" from "authenticated";

revoke delete on table "public"."cleanup_logs" from "service_role";

revoke insert on table "public"."cleanup_logs" from "service_role";

revoke references on table "public"."cleanup_logs" from "service_role";

revoke select on table "public"."cleanup_logs" from "service_role";

revoke trigger on table "public"."cleanup_logs" from "service_role";

revoke truncate on table "public"."cleanup_logs" from "service_role";

revoke update on table "public"."cleanup_logs" from "service_role";

alter table "public"."notifications" add column "body" text;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_dual_confirmation_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update status to 'active' when both parties confirm pickup
  IF NEW.pickup_confirmed_by_owner AND NEW.pickup_confirmed_by_renter 
     AND NOT OLD.pickup_confirmed_by_owner AND NOT OLD.pickup_confirmed_by_renter 
     AND NEW.status = 'confirmed' THEN
    NEW.status = 'active';
    NEW.pickup_confirmed_at = now();
  END IF;

  -- Update status to 'completed' when both parties confirm return
  IF NEW.return_confirmed_by_owner AND NEW.return_confirmed_by_renter 
     AND NOT OLD.return_confirmed_by_owner AND NOT OLD.return_confirmed_by_renter 
     AND NEW.status = 'returned' THEN
    NEW.status = 'completed';
    NEW.return_confirmed_at = now();
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_escrow_release()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_escrow_release(booking_id uuid, release_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  PERFORM http_post(
    'https://wnrbxwzeshgblkfidayb.supabase.co/functions/v1/escrow-release',
    'application/json',
    json_build_object(
      'booking_id', booking_id,
      'release_type', release_type
    )::text
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_booking_total(p_daily_rate numeric, p_start_date date, p_end_date date, p_platform_fee_percentage integer DEFAULT 13)
 RETURNS TABLE(total_days integer, total_amount numeric, platform_fee numeric, owner_amount numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        (p_end_date - p_start_date + 1)::INTEGER as total_days,
        (p_daily_rate * (p_end_date - p_start_date + 1))::DECIMAL(10,2) as total_amount,
        ((p_daily_rate * (p_end_date - p_start_date + 1)) * p_platform_fee_percentage / 100)::DECIMAL(10,2) as platform_fee,
        (p_daily_rate * (p_end_date - p_start_date + 1))::DECIMAL(10,2) as owner_amount; -- Owner gets full rental amount
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_dual_confirmation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
      
      -- Update status to completed
      NEW.status = 'completed';
      NEW.completed_at = now();
      
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_booking_payment_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

create policy "Allow user to cancel their own booking"
on "public"."bookings"
as permissive
for update
to public
using (((auth.uid() = renter_id) OR (auth.uid() = owner_id)));


create policy "Renter and owner can read their bookings"
on "public"."bookings"
as permissive
for select
to public
using (((renter_id = auth.uid()) OR (owner_id = auth.uid())));


create policy "Renter and owner can update their bookings"
on "public"."bookings"
as permissive
for update
to public
using (((renter_id = auth.uid()) OR (owner_id = auth.uid())));


create policy "Renter can create booking"
on "public"."bookings"
as permissive
for insert
to public
with check ((auth.uid() = renter_id));


create policy "Users can delete their own bookings"
on "public"."bookings"
as permissive
for delete
to public
using (((auth.uid() = renter_id) OR (auth.uid() = owner_id)));


create policy "Users can read their own bookings"
on "public"."bookings"
as permissive
for select
to public
using (((auth.uid() = renter_id) OR (auth.uid() = owner_id)));


CREATE TRIGGER handle_dual_confirmation_status_trigger BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION handle_dual_confirmation_status();

CREATE TRIGGER trigger_escrow_release AFTER UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION trigger_escrow_release();


