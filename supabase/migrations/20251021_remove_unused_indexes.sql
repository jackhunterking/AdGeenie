-- Migration: Remove unused indexes
-- Purpose: Free up ~500KB-1MB disk space and reduce write overhead
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index

-- These indexes have never been used according to Supabase advisor
DROP INDEX IF EXISTS idx_campaigns_updated;
DROP INDEX IF EXISTS profiles_email_idx;
DROP INDEX IF EXISTS idx_conversations_user;
DROP INDEX IF EXISTS idx_conversations_updated;
DROP INDEX IF EXISTS idx_messages_conv_created;
DROP INDEX IF EXISTS idx_temp_prompts_id_used;
DROP INDEX IF EXISTS idx_campaigns_user_id;

-- Note: We're keeping the following indexes even though they're marked as unused:
-- - idx_campaign_states_campaign: Required for uniqueness constraint
-- - idx_messages_conv_seq: Primary ordering index for pagination
-- - idx_messages_role: May be used for analytics/debugging later

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Removed 7 unused indexes, freeing ~500KB-1MB disk space';
END $$;

