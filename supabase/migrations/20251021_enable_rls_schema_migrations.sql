-- Migration: Enable RLS on schema_migrations table
-- Purpose: Fix security vulnerability where schema_migrations has RLS disabled
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public

-- Enable RLS on schema_migrations
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage migrations
CREATE POLICY "Service role can manage migrations"
ON schema_migrations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Prevent public access to migrations
CREATE POLICY "No public access to migrations"
ON schema_migrations FOR SELECT
TO public
USING (false);

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Enabled RLS on schema_migrations table';
END $$;

