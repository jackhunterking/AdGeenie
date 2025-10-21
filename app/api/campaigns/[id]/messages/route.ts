/**
 * Feature: Campaign Messages API
 * Purpose: Load chat messages for a campaign via conversation
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database/joins-and-nesting
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, supabaseServer } from '@/lib/supabase/server';

// GET /api/campaigns/[id]/messages - Load messages for a campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Authenticate user
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user owns this campaign
    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('user_id')
      .eq('id', id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You do not own this campaign' },
        { status: 403 }
      );
    }
    
    // Get conversation for this campaign
    const { data: conversation } = await supabaseServer
      .from('conversations')
      .select('id')
      .eq('campaign_id', id)
      .single();
      
    if (!conversation) {
      // No conversation yet - return empty messages
      return NextResponse.json({ messages: [] });
    }
    
    // Load messages from the conversation
    const { data: messages, error: messagesError } = await supabaseServer
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('seq', { ascending: true });
    
    if (messagesError) {
      console.error('Error loading messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to load messages' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    console.error('Unexpected error loading messages:', error);
    return NextResponse.json(
      { error: 'Failed to load messages' },
      { status: 500 }
    );
  }
}

