-- Fix users table RLS to allow service_role and correct insert policy

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Allow users to insert their own profile and service_role to insert any
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO authenticated; 