-- Migration: Verify foreign key constraints and data integrity
-- Purpose: Check for orphaned records and ensure referential integrity
-- Reference: https://supabase.com/docs/guides/database

-- Verify all foreign keys are properly set up
DO $$
DECLARE
  constraint_check RECORD;
  orphaned_count INTEGER;
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'VERIFYING DATA INTEGRITY';
  RAISE NOTICE '==========================================';
  
  -- Check for orphaned campaign_states
  SELECT COUNT(*) INTO orphaned_count
  FROM campaign_states
  WHERE campaign_id NOT IN (SELECT id FROM campaigns);
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'Found % orphaned campaign_state(s)', orphaned_count;
    FOR constraint_check IN
      SELECT campaign_id FROM campaign_states
      WHERE campaign_id NOT IN (SELECT id FROM campaigns)
    LOOP
      RAISE WARNING '  - Orphaned campaign_state for campaign_id: %', constraint_check.campaign_id;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ No orphaned campaign_states found';
  END IF;
  
  -- Check for orphaned conversations
  SELECT COUNT(*) INTO orphaned_count
  FROM conversations
  WHERE campaign_id IS NOT NULL 
  AND campaign_id NOT IN (SELECT id FROM campaigns);
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'Found % orphaned conversation(s)', orphaned_count;
    FOR constraint_check IN
      SELECT campaign_id FROM conversations
      WHERE campaign_id IS NOT NULL 
      AND campaign_id NOT IN (SELECT id FROM campaigns)
    LOOP
      RAISE WARNING '  - Orphaned conversation for campaign_id: %', constraint_check.campaign_id;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ No orphaned conversations found';
  END IF;
  
  -- Check for orphaned messages
  SELECT COUNT(*) INTO orphaned_count
  FROM messages
  WHERE conversation_id NOT IN (SELECT id FROM conversations);
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'Found % orphaned message(s)', orphaned_count;
    FOR constraint_check IN
      SELECT conversation_id FROM messages
      WHERE conversation_id NOT IN (SELECT id FROM conversations)
    LOOP
      RAISE WARNING '  - Orphaned message for conversation_id: %', constraint_check.conversation_id;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ No orphaned messages found';
  END IF;
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ Data integrity verification complete';
  RAISE NOTICE '==========================================';
END $$;

