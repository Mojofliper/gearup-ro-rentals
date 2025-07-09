-- Fix gear validation function parameter name
-- The function was expecting 'gear_name' but the database column is 'title'

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.validate_gear_input(TEXT, TEXT, INTEGER);

-- Recreate the function with correct parameter names
CREATE OR REPLACE FUNCTION public.validate_gear_input(
  gear_title TEXT,
  gear_description TEXT,
  price_per_day INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  -- Validate title length and content
  IF gear_title IS NULL OR LENGTH(gear_title) < 3 OR LENGTH(gear_title) > 100 THEN
    RETURN FALSE;
  END IF;
  
  -- Check for suspicious content patterns
  IF gear_title ~* '(script|javascript|<|>|onclick|onerror)' THEN
    RETURN FALSE;
  END IF;
  
  -- Validate description length
  IF gear_description IS NOT NULL AND LENGTH(gear_description) > 2000 THEN
    RETURN FALSE;
  END IF;
  
  -- Validate price
  IF price_per_day IS NULL OR price_per_day < 0 OR price_per_day > 100000000 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 