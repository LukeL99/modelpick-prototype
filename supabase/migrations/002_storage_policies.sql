-- ModelPick Phase 1: Storage RLS Policies
-- Fixes missing RLS policies for the benchmark-images storage bucket.
-- These policies were designed during research (01-RESEARCH.md lines 903-912)
-- but were not included in 001_initial_schema.sql, causing "new row violates
-- row-level security policy" errors on image upload.
--
-- The upload path pattern is: ${user.id}/${draftId}/${nanoid()}.${ext}
-- so (storage.foldername(name))[1] resolves to the user's UUID, enabling
-- folder-based ownership checks.

-- Ensure the benchmark-images bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('benchmark-images', 'benchmark-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images to their own folder
CREATE POLICY "Users can upload own images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'benchmark-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- Allow authenticated users to view their own images
CREATE POLICY "Users can view own images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'benchmark-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- Allow authenticated users to update (overwrite) their own images
CREATE POLICY "Users can update own images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'benchmark-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'benchmark-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- Allow authenticated users to delete their own images
CREATE POLICY "Users can delete own images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'benchmark-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
