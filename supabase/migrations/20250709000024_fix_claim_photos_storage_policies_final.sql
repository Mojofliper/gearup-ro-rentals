-- Final fix for claim-photos storage policies
-- This migration sets up the correct RLS policies for the claim-photos bucket

-- Create the claim-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('claim-photos', 'claim-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Note: The following storage policies need to be created manually in the Supabase dashboard
-- Go to Storage → Policies → claim-photos bucket and create these policies:

-- 1. INSERT Policy: "Users can upload claim photos"
--    Policy Definition: bucket_id = 'claim-photos' AND auth.uid()::text = (storage.foldername(name))[1]
--    This allows users to upload files to their own folder: claim-photos/{user_id}/{filename}

-- 2. SELECT Policy: "Users can view claim photos"  
--    Policy Definition: bucket_id = 'claim-photos' AND auth.uid()::text = (storage.foldername(name))[1]
--    This allows users to view files in their own folder

-- 3. UPDATE Policy: "Users can update claim photos"
--    Policy Definition: bucket_id = 'claim-photos' AND auth.uid()::text = (storage.foldername(name))[1]
--    This allows users to update files in their own folder

-- 4. DELETE Policy: "Users can delete claim photos"
--    Policy Definition: bucket_id = 'claim-photos' AND auth.uid()::text = (storage.foldername(name))[1]
--    This allows users to delete files in their own folder

-- Folder Structure: claim-photos/{user_id}/{filename}
-- Security: Users can only access files in their own user_id folder 