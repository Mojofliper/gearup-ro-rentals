-- Add storage buckets for file uploads
-- This migration sets up the necessary storage infrastructure

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('gear-photos', 'gear-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('claim-photos', 'claim-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('handover-photos', 'handover-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Note: Storage policies need to be configured manually in the Supabase dashboard
-- or through the Supabase CLI with proper permissions
-- The following policies should be set up:
-- 1. avatars bucket: Users can upload/update/delete their own avatars, anyone can view
-- 2. gear-photos bucket: Gear owners can upload/delete photos, anyone can view
-- 3. claim-photos bucket: Claim participants can upload/view photos
-- 4. handover-photos bucket: Booking participants can upload/view photos

-- Tell PostgREST to reload cached schema
NOTIFY pgrst, 'reload schema'; 