/**
 * Feature: Update Conversation Goal API
 * Purpose: Update goal in conversation metadata when user changes it
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 *  - Supabase: https://supabase.com/docs/guides/database/json
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { conversationManager } from '@/lib/services/conversation-manager'

/**
 * POST /api/conversations/update-goal
 * Update the goal in conversation metadata
 * Ensures conversation metadata stays in sync with campaign goal
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { conversationId, goalType } = body

    // Validate inputs
    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid conversationId' },
        { status: 400 }
      )
    }

    if (!goalType || typeof goalType !== 'string') {
      return NextResponse.json(
        { error: 'Invalid goalType' },
        { status: 400 }
      )
    }

    // Verify conversation ownership
    const conversation = await conversationManager.getConversation(conversationId)
    
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    if (conversation.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this conversation' },
        { status: 403 }
      )
    }

    // Update conversation goal in metadata
    await conversationManager.updateConversationGoal(conversationId, goalType)

    return NextResponse.json({ 
      success: true,
      message: 'Conversation goal updated successfully'
    })
  } catch (error) {
    console.error('Error updating conversation goal:', error)
    return NextResponse.json(
      { error: 'Failed to update conversation goal' },
      { status: 500 }
    )
  }
}

