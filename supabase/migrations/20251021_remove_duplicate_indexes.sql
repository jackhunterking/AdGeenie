-- Migration: Remove duplicate indexes
-- Purpose: Free up disk space and reduce index maintenance overhead
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index

-- campaign_states has two identical indexes on campaign_id
-- Keep idx_campaign_states_campaign (created earlier)
-- Drop idx_campaign_states_campaign_id (redundant)
DROP INDEX IF EXISTS idx_campaign_states_campaign_id;

-- temp_prompts has two identical indexes on expires_at
-- Keep idx_temp_prompts_expires_at (follows naming convention)
-- Drop temp_prompts_expires_at_idx (older naming style)
DROP INDEX IF EXISTS temp_prompts_expires_at_idx;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Removed 2 duplicate indexes';
END $$;

