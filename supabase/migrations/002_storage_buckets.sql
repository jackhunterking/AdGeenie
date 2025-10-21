-- Migration 002: Storage Buckets and Policies
-- AI SDK Backend Restructure - Phase 1.2
-- References:
--   - Supabase Storage: https://supabase.com/docs/guides/storage

-- Create campaign-assets bucket (public, CDN-enabled)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-assets',
  'campaign-assets',
  true,
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for campaign-assets bucket

-- Policy: Users can upload to their own campaigns
CREATE POLICY IF NOT EXISTS "Users can upload to their campaigns"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'campaign-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM campaigns WHERE user_id = auth.uid()
  )
);

-- Policy: Users can view their campaign assets
CREATE POLICY IF NOT EXISTS "Users can view their campaign assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'campaign-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM campaigns WHERE user_id = auth.uid()
  )
);

-- Policy: Users can update their campaign assets
CREATE POLICY IF NOT EXISTS "Users can update their campaign assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'campaign-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM campaigns WHERE user_id = auth.uid()
  )
);

-- Policy: Users can delete their campaign assets
CREATE POLICY IF NOT EXISTS "Users can delete their campaign assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'campaign-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM campaigns WHERE user_id = auth.uid()
  )
);

-- Policy: Public assets are readable by everyone
CREATE POLICY IF NOT EXISTS "Public assets are readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'campaign-assets');

-- Record this migration
INSERT INTO schema_migrations (version, description)
VALUES (2, 'Create campaign-assets storage bucket with RLS policies')
ON CONFLICT (version) DO NOTHING;

