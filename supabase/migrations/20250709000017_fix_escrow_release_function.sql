-- Fix trigger_escrow_release to use http_post with valid double-quoted JSON
-- Test: This should output valid JSON with double quotes
-- SELECT json_build_object('booking_id', 'test', 'release_type', 'return_confirmed')::text;
-- Expected: {"booking_id": "test", "release_type": "return_confirmed"}

CREATE OR REPLACE FUNCTION public.trigger_escrow_release(booking_id UUID, release_type TEXT)
RETURNS VOID AS $$
BEGIN
  -- Call the escrow release edge function using http_post
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

-- Add comment for clarity
COMMENT ON FUNCTION public.trigger_escrow_release(UUID, TEXT) IS 'Triggers escrow release edge function when dual confirmation is complete'; 