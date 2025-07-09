-- Fix RLS policies for user listings
-- This migration ensures users can view their own gear regardless of status

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can view available gear" ON public.gear;
DROP POLICY IF EXISTS "Users can view their own gear" ON public.gear;
DROP POLICY IF EXISTS "gear_select_policy" ON public.gear;
DROP POLICY IF EXISTS "gear_select_with_joins_policy" ON public.gear;

-- Create comprehensive gear policies
CREATE POLICY "gear_select_all" ON public.gear
  FOR SELECT USING (true);

CREATE POLICY "gear_select_own" ON public.gear
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "gear_insert_own" ON public.gear
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "gear_update_own" ON public.gear
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "gear_delete_own" ON public.gear
  FOR DELETE USING (auth.uid() = owner_id);

-- Ensure service role has full access
CREATE POLICY "service_role_full_access" ON public.gear
  FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT SELECT ON public.gear TO authenticated;
GRANT SELECT ON public.categories TO authenticated;
GRANT SELECT ON public.gear_photos TO authenticated;
GRANT SELECT ON public.users TO authenticated; 