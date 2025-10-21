-- Migration: Add metadata column to messages table for AI SDK v5
-- Purpose: Store structured custom data (editing context, timestamps, etc.) in messages
-- AI SDK v5 Pattern: metadata field is preserved through entire message flow
-- Reference: https://ai-sdk.dev/docs/reference/ai-sdk-core/ui-message

-- Add metadata column if not exists (safe, idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='messages' AND column_name='metadata'
  ) THEN
    ALTER TABLE messages ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    
    -- Add GIN index for efficient JSONB queries
    CREATE INDEX idx_messages_metadata ON messages USING gin (metadata);
    
    -- Add comment for documentation
    COMMENT ON COLUMN messages.metadata IS 'AI SDK v5 metadata field - stores editing context, timestamps, and custom data';
    
    RAISE NOTICE 'Added metadata column to messages table with GIN index';
  ELSE
    RAISE NOTICE 'metadata column already exists in messages table';
  END IF;
END $$;

-- Verify the column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='messages' AND column_name='metadata'
  ) THEN
    RAISE NOTICE '✅ Migration successful - metadata column is available';
  ELSE
    RAISE EXCEPTION '❌ Migration failed - metadata column was not created';
  END IF;
END $$;

