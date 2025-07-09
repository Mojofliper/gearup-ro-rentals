-- Fix notification permissions to allow users to create notifications for themselves
-- This migration adds a policy that allows authenticated users to create notifications for themselves

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create notifications for themselves" ON public.notifications;
DROP POLICY IF EXISTS "Service role can create notifications for any user" ON public.notifications;

-- Create a more permissive policy that allows users to create notifications for themselves
CREATE POLICY "Users can create notifications for themselves" ON public.notifications
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    auth.role() = 'service_role' OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Also add a policy for service role to create notifications for any user
CREATE POLICY "Service role can create notifications for any user" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Ensure proper grants
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role; 