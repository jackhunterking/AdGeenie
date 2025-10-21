/**
 * Feature: Campaign Conversation API
 * Purpose: Get the conversation linked to a campaign
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, supabaseServer } from '@/lib/supabase/server';
import { conversationManager } from '@/lib/services/conversation-manager';

// GET /api/campaigns/[id]/conversation - Get linked conversation
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaignId = id;
    
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
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get or create conversation for campaign
    const conversation = await conversationManager.getOrCreateForCampaign(
      user.id,
      campaignId
    );

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('[Campaign Conversation API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get conversation' },
      { status: 500 }
    );
  }
}

