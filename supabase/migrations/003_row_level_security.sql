-- Migration 003: Row Level Security Policies
-- AI SDK Backend Restructure - Phase 7.1
-- References:
--   - Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security

-- Enable RLS on new tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CONVERSATIONS POLICIES
-- ============================================

-- Policy: Users can view their own conversations
CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can create conversations
CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own conversations
CREATE POLICY "Users can update own conversations"
ON conversations FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own conversations
CREATE POLICY "Users can delete own conversations"
ON conversations FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- MESSAGES POLICIES
-- ============================================

-- Policy: Users can view messages in their conversations
CREATE POLICY "Users can view conversation messages"
ON messages FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = auth.uid()
  )
);

-- Policy: Users can insert messages to their conversations
CREATE POLICY "Users can insert messages to conversations"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = auth.uid()
  )
);

-- Policy: Users can update messages in their conversations
-- Note: Typically messages are append-only, but allow for corrections
CREATE POLICY "Users can update conversation messages"
ON messages FOR UPDATE
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = auth.uid()
  )
);

-- Policy: Users can delete messages from their conversations
CREATE POLICY "Users can delete conversation messages"
ON messages FOR DELETE
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = auth.uid()
  )
);

-- ============================================
-- GENERATED_ASSETS POLICIES (Enhanced)
-- ============================================

-- Ensure RLS is enabled on generated_assets
ALTER TABLE generated_assets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their campaign assets
CREATE POLICY IF NOT EXISTS "Users can view their campaign assets"
ON generated_assets FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  campaign_id IN (
    SELECT id FROM campaigns WHERE user_id = auth.uid()
  )
);

-- Policy: Users can create assets for their campaigns
CREATE POLICY IF NOT EXISTS "Users can create campaign assets"
ON generated_assets FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR
  campaign_id IN (
    SELECT id FROM campaigns WHERE user_id = auth.uid()
  )
);

-- Policy: Users can update their campaign assets
CREATE POLICY IF NOT EXISTS "Users can update their campaign assets"
ON generated_assets FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  campaign_id IN (
    SELECT id FROM campaigns WHERE user_id = auth.uid()
  )
);

-- Policy: Users can delete their campaign assets
CREATE POLICY IF NOT EXISTS "Users can delete their campaign assets"
ON generated_assets FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR
  campaign_id IN (
    SELECT id FROM campaigns WHERE user_id = auth.uid()
  )
);

-- Record this migration
INSERT INTO schema_migrations (version, description)
VALUES (3, 'Enable RLS and create security policies for conversations, messages, and assets')
ON CONFLICT (version) DO NOTHING;

-- Create function to update conversation updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW(),
      message_count = (
        SELECT COUNT(*) FROM messages WHERE conversation_id = NEW.conversation_id
      )
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update conversation timestamp when message is added
CREATE TRIGGER update_conversation_on_message_insert
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_updated_at();

-- Add helpful comments
COMMENT ON POLICY "Users can view own conversations" ON conversations IS 'Users can only see their own conversations';
COMMENT ON POLICY "Users can view conversation messages" ON messages IS 'Users can only see messages from their conversations';

