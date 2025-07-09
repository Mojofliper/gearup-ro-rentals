-- Fix notification insert policy to allow users to create notifications for themselves
-- This is needed for the booking notification trigger to work properly

-- Drop the restrictive policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create a new policy that allows users to create notifications for themselves
CREATE POLICY "Users can create notifications for themselves" ON public.notifications
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    auth.role() = 'service_role' OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'moderator')
    )
  );

-- Also ensure the service role can create notifications for any user
DROP POLICY IF EXISTS "Service role can create notifications for any user" ON public.notifications;
CREATE POLICY "Service role can create notifications for any user" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Add comment explaining the change
COMMENT ON POLICY "Users can create notifications for themselves" ON public.notifications IS 'Allows users to create notifications for themselves, needed for booking triggers'; 