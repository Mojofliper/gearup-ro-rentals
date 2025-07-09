-- Fix rate limit function grants and policies

-- Create or replace the get_rate_limit_status function
CREATE OR REPLACE FUNCTION "public"."get_rate_limit_status"(
  "action_type" "text", 
  "max_actions" integer DEFAULT 10, 
  "window_minutes" integer DEFAULT 60
) RETURNS TABLE(
  "is_limited" boolean, 
  "remaining" integer, 
  "limit" integer, 
  "reset_time" timestamptz, 
  "window_start" timestamptz
)
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMPTZ;
  reset_time TIMESTAMPTZ;
BEGIN
  -- Get current window start
  window_start := now() - (window_minutes || ' minutes')::INTERVAL;
  
  -- Count actions in current window
  SELECT COALESCE(SUM(action_count), 0) INTO current_count
  FROM public.rate_limits
  WHERE user_id = auth.uid()
    AND action_type = get_rate_limit_status.action_type
    AND created_at > window_start;
  
  -- Calculate reset time
  reset_time := now() + (window_minutes || ' minutes')::INTERVAL;
  
  -- Return status
  RETURN QUERY SELECT
    current_count >= max_actions as is_limited,
    GREATEST(0, max_actions - current_count) as remaining,
    max_actions as limit,
    reset_time,
    window_start;
END;
$$;

-- Grant permissions for the get_rate_limit_status function
GRANT ALL ON FUNCTION "public"."get_rate_limit_status"("action_type" "text", "max_actions" integer, "window_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_rate_limit_status"("action_type" "text", "max_actions" integer, "window_minutes" integer) TO "service_role";

-- Add unique constraint for upsert operations if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'rate_limits_user_action_unique'
    ) THEN
        ALTER TABLE "public"."rate_limits" 
        ADD CONSTRAINT "rate_limits_user_action_unique" UNIQUE ("user_id", "action_type");
    END IF;
END $$;

-- Add policy to allow service role full access to rate_limits if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'rate_limits' 
        AND policyname = 'Service role can manage all rate limits'
    ) THEN
        CREATE POLICY "Service role can manage all rate limits" ON "public"."rate_limits" 
        FOR ALL USING (("auth"."role"() = 'service_role'));
    END IF;
END $$;

-- Add policy to allow users to view rate limits by action_type for their own records if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'rate_limits' 
        AND policyname = 'Users can view rate limits by action type'
    ) THEN
        CREATE POLICY "Users can view rate limits by action type" ON "public"."rate_limits" 
        FOR SELECT USING (("auth"."uid"() = "user_id"));
    END IF;
END $$;
