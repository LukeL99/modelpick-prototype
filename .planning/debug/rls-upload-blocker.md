---
status: diagnosed
trigger: "Image upload to Supabase Storage fails with 'new row violates row-level security policy' when RLS is enabled on the storage bucket"
created: 2026-02-11T00:00:00Z
updated: 2026-02-11T00:00:00Z
---

## Current Focus

hypothesis: No RLS policies exist on storage.objects for the benchmark-images bucket -- confirmed as root cause
test: Searched entire codebase (migrations, seed files, supabase directory) for storage.objects policies
expecting: Would find CREATE POLICY on storage.objects -- found NONE applied, only commented-out examples in research doc
next_action: Report diagnosis

## Symptoms

expected: Authenticated users can upload images to the "benchmark-images" Supabase Storage bucket via signed URLs
actual: Upload fails with "new row violates row-level security policy" when RLS is enabled on the bucket
errors: "Failed to upload screen.png: new row violates row-level security policy"
reproduction: Enable RLS on storage.objects (Supabase default for new buckets), then attempt image upload through wizard Step 2
started: When RLS was enabled on the storage bucket

## Eliminated

(none -- root cause found on first hypothesis)

## Evidence

- timestamp: 2026-02-11T00:01:00Z
  checked: supabase/migrations/001_initial_schema.sql (full file, 105 lines)
  found: RLS policies defined for benchmark_drafts and reports tables. ZERO policies for storage.objects or storage.buckets. No bucket creation statement. No storage-related SQL at all.
  implication: The migration never set up storage RLS policies. The bucket was created manually (dashboard) but policies were never applied.

- timestamp: 2026-02-11T00:02:00Z
  checked: .planning/phases/01-configure-benchmark/01-RESEARCH.md (lines 899-912)
  found: Storage RLS policies were DOCUMENTED in the research phase but left COMMENTED OUT. Exact policies for INSERT and SELECT on storage.objects for benchmark-images bucket exist as comments, never promoted to actual migration SQL.
  implication: The policies were designed but never executed. This is the direct cause -- they were planned but forgotten during implementation.

- timestamp: 2026-02-11T00:03:00Z
  checked: src/app/api/upload/signed-url/route.ts (the server-side signed URL endpoint)
  found: Uses server-side createClient() which uses NEXT_PUBLIC_SUPABASE_ANON_KEY (not service_role key). Authenticates user via supabase.auth.getUser(). Creates signed upload URL via supabase.storage.from("benchmark-images").createSignedUploadUrl(path). Path pattern is `${user.id}/${draftId}/${nanoid()}.${ext}`.
  implication: The server creates the signed URL using the anon key with user session cookies. This means the Supabase client acts as the authenticated user, not as a privileged service role. When the client then uses uploadToSignedUrl(), the INSERT into storage.objects is subject to RLS policies -- which don't exist, so the insert is denied.

- timestamp: 2026-02-11T00:04:00Z
  checked: src/components/wizard/step-upload.tsx (client-side upload code)
  found: Client calls /api/upload/signed-url to get token+path, then uses browser-side supabase client (also anon key) to call supabase.storage.from("benchmark-images").uploadToSignedUrl(path, token, file). Also calls .remove() on delete and .getPublicUrl() on success.
  implication: Three storage operations need RLS policies: INSERT (upload), SELECT (read/getPublicUrl), and DELETE (remove). All three are missing.

- timestamp: 2026-02-11T00:05:00Z
  checked: src/lib/supabase/server.ts and src/lib/supabase/client.ts
  found: Both use NEXT_PUBLIC_SUPABASE_ANON_KEY. Neither uses SUPABASE_SERVICE_ROLE_KEY. Server client passes cookies for auth session.
  implication: All Supabase operations go through the anon key with user-scoped auth. This is the correct security pattern (no service role key exposed), but it means storage RLS policies are mandatory for any storage operation to succeed.

- timestamp: 2026-02-11T00:06:00Z
  checked: Entire supabase/ directory (only contains migrations/001_initial_schema.sql)
  found: No additional migration files, no seed files, no storage setup scripts.
  implication: Confirms there is exactly one migration and it contains zero storage policies.

## Resolution

root_cause: |
  No RLS policies exist on the `storage.objects` table for the `benchmark-images` bucket.

  The upload flow uses signed URLs created by the server (via anon key + user session),
  and the client uploads via `uploadToSignedUrl()`. Both operations act as the authenticated
  user through the anon key. With RLS enabled on storage.objects (Supabase default), every
  INSERT/SELECT/DELETE requires an explicit ALLOW policy. None were ever created.

  The policies were designed during research (01-RESEARCH.md, lines 903-912) but left as
  SQL comments and never promoted into the actual migration file (001_initial_schema.sql).

fix: |
  Add a new migration file (e.g., 002_storage_policies.sql) with these policies:

  ```sql
  -- Ensure the bucket exists (idempotent)
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('benchmark-images', 'benchmark-images', true)
  ON CONFLICT (id) DO NOTHING;

  -- Allow authenticated users to upload to their own folder
  CREATE POLICY "Users can upload own images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'benchmark-images'
      AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

  -- Allow authenticated users to read their own images
  CREATE POLICY "Users can view own images"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
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

  -- Allow authenticated users to update (overwrite) their own images
  CREATE POLICY "Users can update own images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'benchmark-images'
      AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );
  ```

  Note: The path pattern `${user.id}/${draftId}/${nanoid()}.ext` (from route.ts line 78)
  means (storage.foldername(name))[1] correctly resolves to the user's UUID, making the
  folder-based ownership check valid.

  If the bucket should NOT be public (images shouldn't be accessible without auth), set
  `public` to `false` in the bucket INSERT and ensure getPublicUrl() usage is replaced
  with createSignedUrl() for time-limited read access.

verification: Not applicable (diagnosis only)
files_changed: []
