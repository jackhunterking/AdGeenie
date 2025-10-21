-- Migration: Add helpful database comments for documentation
-- Purpose: Document AI SDK v5 patterns and table purposes
-- References:
--   - AI SDK v5: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
--   - AI SDK UIMessage: https://ai-sdk.dev/docs/reference/ai-sdk-core/ui-message

-- Messages table documentation
COMMENT ON TABLE messages IS 
  'AI SDK v5 message store. Append-only writes with seq for ordering. Uses parts array for content and metadata for custom data. Each message belongs to a conversation.';

COMMENT ON COLUMN messages.id IS 
  'AI SDK generated message ID (text format). Primary key for message identity.';

COMMENT ON COLUMN messages.conversation_id IS 
  'Foreign key to conversations table. Links message to its conversation context.';

COMMENT ON COLUMN messages.role IS 
  'Message role: user, assistant, or system. Determines who sent the message.';

COMMENT ON COLUMN messages.content IS 
  'Searchable text content extracted from parts (max 50KB). Used for full-text search and queries. The actual content is stored in parts array.';

COMMENT ON COLUMN messages.parts IS 
  'AI SDK v5 parts array - contains text, tool-call, tool-result, image, and other content parts. This is the primary content field per AI SDK docs.';

COMMENT ON COLUMN messages.tool_invocations IS 
  'AI SDK v5 tool invocations array. Stores metadata about tool calls (generateImage, editImage, etc.) made during message generation.';

COMMENT ON COLUMN messages.metadata IS 
  'AI SDK v5 metadata field - stores editing context (editingReference, audienceContext), timestamps, and custom data. Indexed with GIN for efficient JSONB queries.';

COMMENT ON COLUMN messages.seq IS 
  'Monotonic sequence for efficient pagination and ordering. Generated automatically on insert.';

-- Conversations table documentation
COMMENT ON TABLE conversations IS 
  'AI SDK v5 conversation sessions. Each campaign has one conversation for chat history persistence. Links users to their message threads.';

COMMENT ON COLUMN conversations.campaign_id IS 
  'Foreign key to campaigns table. Links conversation to its campaign context (can be null for standalone conversations).';

COMMENT ON COLUMN conversations.message_count IS 
  'Cached count of messages in this conversation. Updated automatically by trigger when messages are inserted.';

COMMENT ON COLUMN conversations.metadata IS 
  'JSONB field for storing conversation-level metadata (settings, preferences, etc.).';

-- Campaigns table documentation
COMMENT ON TABLE campaigns IS 
  'User campaigns for Meta ad creation. Tracks workflow progress through 6 steps (goal, location, audience, copy, preview, budget).';

COMMENT ON COLUMN campaigns.current_step IS 
  'Current workflow step (1-6): 1=Goal, 2=Location, 3=Audience, 4=Copy, 5=Preview, 6=Budget.';

COMMENT ON COLUMN campaigns.status IS 
  'Campaign status: draft, active, paused, completed, or archived.';

COMMENT ON COLUMN campaigns.metadata IS 
  'JSONB field for storing campaign-level metadata (initialPrompt, settings, etc.).';

-- Campaign_states table documentation
COMMENT ON TABLE campaign_states IS 
  'Stores all campaign state data in JSONB columns. 1-to-1 relationship with campaigns table. Contains goal, location, audience, ad_copy, ad_preview, and budget data.';

COMMENT ON COLUMN campaign_states.ad_preview_data IS 
  'JSONB containing all generated ad variations with images. Replaces deprecated generated_assets table. Structure: { variations: [...], selectedFormat: "feed|story|reel" }';

COMMENT ON COLUMN campaign_states.generated_images IS 
  'Stores array of generated images with their variations for the campaign. Legacy field - new images should go in ad_preview_data.';

-- Profiles table documentation
COMMENT ON TABLE profiles IS 
  'User profiles linked to auth.users. Stores credits for API usage tracking.';

COMMENT ON COLUMN profiles.credits IS 
  'Available API credits for this user. Decremented on image generation and other paid operations.';

COMMENT ON COLUMN profiles.daily_credits IS 
  'Daily credit allowance for free tier users. Resets every 24 hours.';

-- Temp_prompts table documentation
COMMENT ON TABLE temp_prompts IS 
  'Temporary storage for initial prompts during user signup flow. Prompts expire after 1 hour and are marked as used when campaign is created.';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Added comprehensive documentation comments to all tables and key columns';
END $$;

