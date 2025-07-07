-- Check current RLS policies and status
-- This will help us understand why the temporary fix didn't work

-- 1. Check if RLS is enabled on transactions table
SELECT 
  'RLS status on transactions:' as info,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'transactions' AND schemaname = 'public';

-- 2. Check all current policies on transactions table
SELECT 
  'Current policies on transactions:' as info,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'transactions';

-- 3. Check if there are any other policies that might interfere
SELECT 
  'All policies in public schema:' as info,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. Test if the simple policy is working by checking auth.role()
SELECT 
  'Auth role test:' as info,
  current_setting('role') as current_role,
  session_user as session_user; 