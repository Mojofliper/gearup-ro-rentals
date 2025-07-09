-- Fix permissions for gear availability functions
-- These functions should be accessible by anonymous users since gear availability is public information

-- Grant execute permission to anonymous users for gear availability functions
GRANT EXECUTE ON FUNCTION public.get_gear_unavailable_dates(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.check_gear_availability(uuid, date, date) TO anon;

-- Also ensure authenticated users still have access
GRANT EXECUTE ON FUNCTION public.get_gear_unavailable_dates(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_gear_availability(uuid, date, date) TO authenticated;

-- Add comment explaining the change
COMMENT ON FUNCTION public.get_gear_unavailable_dates(uuid) IS 'Returns unavailable dates for a gear item. Public function accessible by all users.';
COMMENT ON FUNCTION public.check_gear_availability(uuid, date, date) IS 'Checks if a date range is available for booking. Public function accessible by all users.'; 