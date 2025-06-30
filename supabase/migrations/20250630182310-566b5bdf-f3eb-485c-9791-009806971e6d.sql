
-- Add RLS policies for categories table (Critical Security Fix)
CREATE POLICY "Categories are viewable by everyone" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "Only authenticated users can insert categories" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only authenticated users can update categories" ON public.categories
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only authenticated users can delete categories" ON public.categories
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Add function for input validation
CREATE OR REPLACE FUNCTION public.validate_gear_input(
  gear_name TEXT,
  gear_description TEXT,
  price_per_day INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  -- Validate name length and content
  IF gear_name IS NULL OR LENGTH(gear_name) < 3 OR LENGTH(gear_name) > 100 THEN
    RETURN FALSE;
  END IF;
  
  -- Check for suspicious content patterns
  IF gear_name ~* '(script|javascript|<|>|onclick|onerror)' THEN
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

-- Add trigger for gear validation
CREATE OR REPLACE FUNCTION public.validate_gear_before_insert_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.validate_gear_input(NEW.name, NEW.description, NEW.price_per_day) THEN
    RAISE EXCEPTION 'Invalid gear data provided';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_gear_trigger
  BEFORE INSERT OR UPDATE ON public.gear
  FOR EACH ROW EXECUTE FUNCTION public.validate_gear_before_insert_update();

-- Add rate limiting table
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limits" ON public.rate_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rate limits" ON public.rate_limits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  action_type TEXT,
  max_actions INTEGER DEFAULT 10,
  window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMPTZ;
BEGIN
  -- Get current window start
  window_start := now() - (window_minutes || ' minutes')::INTERVAL;
  
  -- Count actions in current window
  SELECT COALESCE(SUM(action_count), 0) INTO current_count
  FROM public.rate_limits
  WHERE user_id = auth.uid()
    AND action_type = check_rate_limit.action_type
    AND created_at > window_start;
  
  -- Check if limit exceeded
  IF current_count >= max_actions THEN
    RETURN FALSE;
  END IF;
  
  -- Record this action
  INSERT INTO public.rate_limits (user_id, action_type)
  VALUES (auth.uid(), check_rate_limit.action_type);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
