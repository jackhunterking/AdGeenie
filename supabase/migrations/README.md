# Supabase Migrations

## Overview

These migrations implement the AI SDK Backend Restructure plan, creating optimized tables and storage infrastructure for scalable conversation management.

## Migration Files

1. **001_conversations_messages.sql** - Core tables for conversations and messages
2. **002_storage_buckets.sql** - Supabase Storage configuration
3. **003_row_level_security.sql** - RLS policies and triggers

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of each migration file **in order**
5. Execute each migration
6. Verify success by checking the Tables section

### Option 2: Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push

# Or apply individually
psql $DATABASE_URL -f supabase/migrations/001_conversations_messages.sql
psql $DATABASE_URL -f supabase/migrations/002_storage_buckets.sql
psql $DATABASE_URL -f supabase/migrations/003_row_level_security.sql
```

## Verification Checklist

After applying migrations, verify:

- [ ] `conversations` table exists with 3 indexes
- [ ] `messages` table exists with 3 indexes and `seq` column
- [ ] `generated_assets` table has new columns (conversation_id, message_id, etc.)
- [ ] `schema_migrations` table shows all 3 migrations
- [ ] Storage bucket `campaign-assets` exists and is public
- [ ] RLS is enabled on `conversations` and `messages`
- [ ] Trigger `update_conversation_on_message_insert` exists

### Test Queries

```sql
-- Check migrations applied
SELECT * FROM schema_migrations ORDER BY version;

-- Check conversations table structure
\d conversations

-- Check messages table structure
\d messages

-- Check indexes
SELECT tablename, indexname FROM pg_indexes
WHERE tablename IN ('conversations', 'messages', 'generated_assets')
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('conversations', 'messages', 'generated_assets')
ORDER BY tablename, policyname;

-- Check storage bucket
SELECT * FROM storage.buckets WHERE id = 'campaign-assets';
```

## Rollback (if needed)

If you need to rollback these migrations:

```sql
-- WARNING: This will delete all conversation data!

DROP TRIGGER IF EXISTS update_conversation_on_message_insert ON messages;
DROP FUNCTION IF EXISTS update_conversation_updated_at();
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Revert generated_assets changes
ALTER TABLE generated_assets
  DROP COLUMN IF EXISTS conversation_id,
  DROP COLUMN IF EXISTS message_id,
  DROP COLUMN IF EXISTS storage_bucket,
  DROP COLUMN IF EXISTS cdn_url,
  DROP COLUMN IF EXISTS thumbnail_url,
  DROP COLUMN IF EXISTS processing_status;

-- Remove storage bucket
DELETE FROM storage.buckets WHERE id = 'campaign-assets';

-- Remove migration records
DELETE FROM schema_migrations WHERE version IN (1, 2, 3);
```

## Architecture Notes

### Key Design Decisions

1. **Append-Only Messages**: Uses `seq` column (auto-incrementing) for efficient pagination
2. **Content Size Limit**: 50KB per message enforced at DB level
3. **Conversation Tracking**: Auto-updates message_count and updated_at via trigger
4. **Asset Linking**: Assets can reference both conversations and individual messages
5. **RLS Security**: All tables protected by user_id checks

### Performance Characteristics

- **Message Loading**: Index on (conversation_id, seq) enables fast pagination
- **Recent Conversations**: Index on updated_at for dashboard views
- **Asset Lookups**: Indexes on conversation_id, message_id, and campaign_id
- **Search**: Optional FTS index (commented out) can be added if needed

### Expected Scale

This schema efficiently handles:
- 1,000+ concurrent users
- 10-50 ads per user
- 50-200 messages per conversation
- 2.5M-10M total messages

Partitioning becomes beneficial beyond ~10M rows.

## Next Steps

After applying migrations:

1. ✅ Verify all tables and indexes created
2. ✅ Test RLS policies with test user
3. ✅ Upload test file to storage bucket
4. → Implement service layer (message-store, conversation-manager, etc.)
5. → Update API routes to use new schema

