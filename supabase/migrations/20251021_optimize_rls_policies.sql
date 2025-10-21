-- Migration: Optimize RLS policies to prevent per-row auth.uid() re-evaluation
-- Purpose: Improve performance by wrapping auth.uid() in subqueries
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ============================================
-- PROFILES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO public
USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO public
USING ((SELECT auth.uid()) = id);

-- ============================================
-- CAMPAIGNS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view their own campaigns" ON campaigns;
CREATE POLICY "Users can view their own campaigns"
ON campaigns FOR SELECT
TO public
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own campaigns" ON campaigns;
CREATE POLICY "Users can insert their own campaigns"
ON campaigns FOR INSERT
TO public
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own campaigns" ON campaigns;
CREATE POLICY "Users can update their own campaigns"
ON campaigns FOR UPDATE
TO public
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own campaigns" ON campaigns;
CREATE POLICY "Users can delete their own campaigns"
ON campaigns FOR DELETE
TO public
USING ((SELECT auth.uid()) = user_id);

-- ============================================
-- CAMPAIGN_STATES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view their campaign states" ON campaign_states;
CREATE POLICY "Users can view their campaign states"
ON campaign_states FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = campaign_states.campaign_id 
    AND campaigns.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert their campaign states" ON campaign_states;
CREATE POLICY "Users can insert their campaign states"
ON campaign_states FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = campaign_states.campaign_id 
    AND campaigns.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can update their campaign states" ON campaign_states;
CREATE POLICY "Users can update their campaign states"
ON campaign_states FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = campaign_states.campaign_id 
    AND campaigns.user_id = (SELECT auth.uid())
  )
);

-- ============================================
-- CONVERSATIONS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
CREATE POLICY "Users can update own conversations"
ON conversations FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
CREATE POLICY "Users can delete own conversations"
ON conversations FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- ============================================
-- MESSAGES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view conversation messages" ON messages;
CREATE POLICY "Users can view conversation messages"
ON messages FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert messages to conversations" ON messages;
CREATE POLICY "Users can insert messages to conversations"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can update conversation messages" ON messages;
CREATE POLICY "Users can update conversation messages"
ON messages FOR UPDATE
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can delete conversation messages" ON messages;
CREATE POLICY "Users can delete conversation messages"
ON messages FOR DELETE
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = (SELECT auth.uid())
  )
);

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Optimized 17 RLS policies to use subqueries';
END $$;

