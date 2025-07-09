-- Add function to check if gear can be deleted
CREATE OR REPLACE FUNCTION "public"."can_delete_gear"("p_gear_id" "uuid") RETURNS TABLE("can_delete" boolean, "reason" "text")
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  gear_owner_id UUID;
  active_bookings_count INTEGER;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, 'User not authenticated'::text;
    RETURN;
  END IF;

  -- Get gear owner
  SELECT owner_id INTO gear_owner_id
  FROM public.gear
  WHERE id = can_delete_gear.p_gear_id;

  -- Check if gear exists
  IF gear_owner_id IS NULL THEN
    RETURN QUERY SELECT false, 'Gear not found'::text;
    RETURN;
  END IF;

  -- Check if user owns the gear
  IF gear_owner_id != auth.uid() THEN
    RETURN QUERY SELECT false, 'Not authorized to delete this gear'::text;
    RETURN;
  END IF;

  -- Check for active bookings
  SELECT COUNT(*) INTO active_bookings_count
  FROM public.bookings
  WHERE gear_id = can_delete_gear.p_gear_id
    AND status IN ('pending', 'confirmed', 'active');

  IF active_bookings_count > 0 THEN
    RETURN QUERY SELECT false, 'Cannot delete gear with active bookings'::text;
    RETURN;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT true, 'OK'::text;
END;
$$;

-- Grant permissions for the function
GRANT ALL ON FUNCTION "public"."can_delete_gear"("p_gear_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_delete_gear"("p_gear_id" "uuid") TO "service_role";

-- Add function to safely delete gear
CREATE OR REPLACE FUNCTION "public"."safe_delete_gear"("p_gear_id" "uuid") RETURNS TABLE("success" boolean, "message" "text")
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  can_delete_result RECORD;
BEGIN
  -- Check if gear can be deleted
  SELECT * INTO can_delete_result
  FROM can_delete_gear(safe_delete_gear.p_gear_id);

  IF NOT can_delete_result.can_delete THEN
    RETURN QUERY SELECT false, can_delete_result.reason;
    RETURN;
  END IF;

  -- Delete the gear (cascade will handle related records)
  DELETE FROM public.gear WHERE id = safe_delete_gear.p_gear_id;

  -- Check if deletion was successful
  IF FOUND THEN
    RETURN QUERY SELECT true, 'Gear deleted successfully'::text;
  ELSE
    RETURN QUERY SELECT false, 'Failed to delete gear'::text;
  END IF;
END;
$$;

-- Grant permissions for the function
GRANT ALL ON FUNCTION "public"."safe_delete_gear"("p_gear_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_delete_gear"("p_gear_id" "uuid") TO "service_role";
