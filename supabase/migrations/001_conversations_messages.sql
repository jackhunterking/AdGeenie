-- Migration 001: Conversations and Messages Tables
-- AI SDK Backend Restructure - Phase 1.1
-- References: 
--   - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
--   - Supabase: https://supabase.com/docs/guides/database

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_campaign ON conversations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- Create messages table with optimized schema
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, -- AI SDK generated ID
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL, -- Searchable text content (max 50KB enforced in app)
  parts JSONB NOT NULL DEFAULT '[]'::jsonb, -- AI SDK parts format
  tool_invocations JSONB DEFAULT '[]'::jsonb, -- AI SDK tool format
  created_at TIMESTAMPTZ DEFAULT NOW(),
  seq BIGINT GENERATED ALWAYS AS IDENTITY, -- Monotonic sequence for ordering
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT content_size_limit CHECK (length(content) <= 50000)
);

-- Primary ordering index (used for pagination and loading windows)
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_conv_seq ON messages(conversation_id, seq);

-- Fast fetch of latest messages
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at DESC);

-- Role filtering (for analytics/debugging)
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(conversation_id, role);

-- Optional: Full text search (only add if global search is needed)
-- CREATE INDEX idx_messages_content_search ON messages USING gin(to_tsvector('english', content));

-- Update generated_assets table to link with conversations and messages
ALTER TABLE generated_assets
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS message_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'campaign-assets',
  ADD COLUMN IF NOT EXISTS cdn_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'completed';

-- Indexes for generated_assets
CREATE INDEX IF NOT EXISTS idx_assets_conversation ON generated_assets(conversation_id);
CREATE INDEX IF NOT EXISTS idx_assets_message ON generated_assets(message_id);
CREATE INDEX IF NOT EXISTS idx_assets_campaign ON generated_assets(campaign_id);

-- Migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT
);

-- Record this migration
INSERT INTO schema_migrations (version, description)
VALUES (1, 'Create conversations and messages tables with optimized indexes')
ON CONFLICT (version) DO NOTHING;

-- Add helpful comments
COMMENT ON TABLE conversations IS 'Stores conversation sessions linked to campaigns';
COMMENT ON TABLE messages IS 'Stores AI SDK formatted messages with append-only writes';
COMMENT ON COLUMN messages.seq IS 'Monotonic sequence for efficient pagination';
COMMENT ON COLUMN messages.content IS 'Extracted text content for searching (max 50KB)';
COMMENT ON COLUMN messages.parts IS 'AI SDK parts array (text, tool-call, tool-result, etc.)';
COMMENT ON COLUMN messages.tool_invocations IS 'AI SDK tool invocations metadata';

