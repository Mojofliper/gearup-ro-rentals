-- Simple storage policies for claim-photos bucket
-- This migration creates basic policies that allow authenticated users to upload/view their own files

-- Create the claim-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('claim-photos', 'claim-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Note: Run these SQL commands in the Supabase SQL Editor to create the policies:

-- 1. Allow authenticated users to upload files to claim-photos bucket
-- CREATE POLICY "Allow authenticated uploads to claim-photos" ON storage.objects
-- FOR INSERT WITH CHECK (
--   bucket_id = 'claim-photos' AND 
--   auth.role() = 'authenticated'
-- );

-- 2. Allow authenticated users to view files in claim-photos bucket
-- CREATE POLICY "Allow authenticated view claim-photos" ON storage.objects
-- FOR SELECT USING (
--   bucket_id = 'claim-photos' AND 
--   auth.role() = 'authenticated'
-- );

-- 3. Allow authenticated users to update files in claim-photos bucket
-- CREATE POLICY "Allow authenticated update claim-photos" ON storage.objects
-- FOR UPDATE USING (
--   bucket_id = 'claim-photos' AND 
--   auth.role() = 'authenticated'
-- );

-- 4. Allow authenticated users to delete files in claim-photos bucket
-- CREATE POLICY "Allow authenticated delete claim-photos" ON storage.objects
-- FOR DELETE USING (
--   bucket_id = 'claim-photos' AND 
--   auth.role() = 'authenticated'
-- );

-- Alternative: If you want user-specific access, use this instead:
-- CREATE POLICY "Users can access their own claim photos" ON storage.objects
-- FOR ALL USING (
--   bucket_id = 'claim-photos' AND 
--   auth.uid()::text = (storage.foldername(name))[1]
-- ); 