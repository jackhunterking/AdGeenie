-- Migration: Add performance-optimized indexes
-- Purpose: Improve query performance for common access patterns
-- References:
--   - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
--   - Postgres GIN indexes: https://www.postgresql.org/docs/current/gin-intro.html

-- Add GIN index for messages.metadata (AI SDK v5 pattern)
-- This enables fast JSONB queries on metadata (editingReference, audienceContext, etc.)
CREATE INDEX IF NOT EXISTS idx_messages_metadata 
ON messages USING gin (metadata);

-- Add partial index for active campaigns (most common query)
-- This index only includes draft and active campaigns (excludes archived/completed)
CREATE INDEX IF NOT EXISTS idx_campaigns_user_active
ON campaigns(user_id) 
WHERE status IN ('draft', 'active');

-- Add index for recent message queries
-- Standard index without partial filter (NOW() is not immutable)
CREATE INDEX IF NOT EXISTS idx_messages_recent
ON messages(conversation_id, created_at DESC);

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Added 3 performance-optimized indexes (1 GIN, 2 partial)';
END $$;

