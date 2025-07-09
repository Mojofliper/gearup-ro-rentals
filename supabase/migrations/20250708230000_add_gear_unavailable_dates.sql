-- Function to get unavailable dates for a gear item
-- This considers bookings that are pending, confirmed, or active as "locking" the dates
-- Cancelled and completed bookings don't lock dates
CREATE OR REPLACE FUNCTION public.get_gear_unavailable_dates(gear_id uuid)
RETURNS TABLE(
  unavailable_date date,
  booking_id uuid,
  status text,
  reason text
) LANGUAGE sql STABLE AS $$
  SELECT DISTINCT
    generate_series(
      b.start_date::date,
      b.end_date::date,
      '1 day'::interval
    )::date as unavailable_date,
    b.id as booking_id,
    b.status::text,
    CASE 
      WHEN b.status = 'pending' THEN 'Cerere în așteptare'
      WHEN b.status = 'confirmed' THEN 'Rezervare confirmată'
      WHEN b.status = 'active' THEN 'Închiriere activă'
      WHEN b.status = 'pickup_confirmed' THEN 'Ridicat confirmat'
      WHEN b.status = 'return_confirmed' THEN 'Returnat confirmat'
      ELSE 'Indisponibil'
    END as reason
  FROM public.bookings b
  WHERE b.gear_id = get_gear_unavailable_dates.gear_id
    AND b.status IN ('pending', 'confirmed', 'active', 'pickup_confirmed', 'return_confirmed')
    AND b.start_date >= CURRENT_DATE
  ORDER BY unavailable_date;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_gear_unavailable_dates(uuid) TO authenticated;

-- Function to check if a date range is available for booking
CREATE OR REPLACE FUNCTION public.check_gear_availability(
  gear_id uuid,
  start_date date,
  end_date date
)
RETURNS TABLE(
  is_available boolean,
  conflicting_bookings jsonb,
  reason text
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  conflicting_count integer;
  conflicting_data jsonb;
BEGIN
  -- Check for conflicting bookings
  SELECT 
    COUNT(*),
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'booking_id', b.id,
        'start_date', b.start_date,
        'end_date', b.end_date,
        'status', b.status,
        'renter_name', u.full_name
      )
    ), '[]'::jsonb)
  INTO conflicting_count, conflicting_data
  FROM public.bookings b
  LEFT JOIN public.users u ON u.id = b.renter_id
  WHERE b.gear_id = check_gear_availability.gear_id
    AND b.status IN ('pending', 'confirmed', 'active', 'pickup_confirmed', 'return_confirmed')
    AND (
      (b.start_date <= end_date AND b.end_date >= start_date) -- Date ranges overlap
    );

  -- Return result
  RETURN QUERY SELECT 
    conflicting_count = 0 as is_available,
    conflicting_data as conflicting_bookings,
    CASE 
      WHEN conflicting_count = 0 THEN 'Disponibil'
      ELSE conflicting_count || ' rezervări conflictuale'
    END as reason;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_gear_availability(uuid, date, date) TO authenticated; 