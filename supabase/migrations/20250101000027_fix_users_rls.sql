-- Fix users table RLS policy to allow authenticated users to view any user profile
-- This is needed for user lookup functionality in the app

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "System can manage user profiles" ON public.users;

-- Create new policies that allow authenticated users to view any profile
CREATE POLICY "Users can view any profile" ON public.users
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "System can manage user profiles" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

-- Also fix connected_accounts policy to be more permissive for debugging
DROP POLICY IF EXISTS "Users can view own connected account" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can create own connected account" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can update own connected account" ON public.connected_accounts;

CREATE POLICY "Users can view any connected account" ON public.connected_accounts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create own connected account" ON public.connected_accounts
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own connected account" ON public.connected_accounts
  FOR UPDATE USING (auth.uid() = owner_id); 