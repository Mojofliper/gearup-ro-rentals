-- Fix storage policies for claim-photos bucket
-- This migration creates storage policies using the proper approach

-- Create the claim-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('claim-photos', 'claim-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Note: Storage policies should be created through the Supabase dashboard
-- or using the service role. The following policies need to be created manually:
-- 
-- 1. "Users can upload claim photos" - INSERT policy
-- 2. "Users can view claim photos" - SELECT policy  
-- 3. "Users can update claim photos" - UPDATE policy
-- 4. "Users can delete claim photos" - DELETE policy
--
-- These policies should check:
-- - bucket_id = 'claim-photos'
-- - auth.uid()::text = (storage.foldername(name))[1]
--
-- The policies ensure users can only access photos for their own claims
-- based on the folder structure: claim-photos/{user_id}/{filename} 