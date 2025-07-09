-- Fix notification RLS policies to allow users to create their own notifications
-- This migration adds a policy that allows users to create notifications for themselves

-- Drop the restrictive policy that only allows service role and admins
DROP POLICY IF EXISTS "System can create notifications" ON "public"."notifications";

-- Create a new policy that allows users to create their own notifications
CREATE POLICY "Users can create their own notifications" ON "public"."notifications" 
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR 
  auth.role() = 'service_role' OR 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = ANY (ARRAY['admin'::public.user_role, 'moderator'::public.user_role])
  )
);

-- Also add a policy for the service role to create notifications for any user
CREATE POLICY "Service role can create notifications for any user" ON "public"."notifications" 
FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Ensure RLS is enabled on notifications table
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY; 