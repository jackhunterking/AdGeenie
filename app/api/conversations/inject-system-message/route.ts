/**
 * Feature: System Message Injection API
 * Purpose: Inject system messages into conversations (e.g., for goal changes)
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { conversationManager } from '@/lib/services/conversation-manager'

/**
 * POST /api/conversations/inject-system-message
 * Inject a system message into a conversation
 * Used for transparent AI notifications (e.g., goal changes)
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
    const { conversationId, message } = body

    // Validate inputs
    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid conversationId' },
        { status: 400 }
      )
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message' },
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

    // Inject system message
    await conversationManager.injectSystemMessage(conversationId, message)

    return NextResponse.json({ 
      success: true,
      message: 'System message injected successfully'
    })
  } catch (error) {
    console.error('Error injecting system message:', error)
    return NextResponse.json(
      { error: 'Failed to inject system message' },
      { status: 500 }
    )
  }
}

