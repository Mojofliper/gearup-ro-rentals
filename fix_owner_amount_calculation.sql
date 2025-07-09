-- Fix the calculate_booking_total function to give owners the full rental amount
-- The platform fee should NOT be deducted from the owner's payment

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
$function$;

-- Test the fixed function
SELECT * FROM calculate_booking_total(100, '2025-07-09', '2025-07-09', 13);

-- Expected result:
-- total_days: 1
-- total_amount: 100.00 (rental amount)
-- platform_fee: 13.00 (13% of rental)
-- owner_amount: 100.00 (full rental amount, NOT 87.00) 