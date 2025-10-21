import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

// GET /api/campaigns/[id] - Get a specific campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Create client that reads user session from cookies
    const supabase = await createServerClient()
    
    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: campaign, error } = await supabaseServer
      .from('campaigns')
      .select(`
        *,
        campaign_states (*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !campaign) {
      console.error(`[API] Campaign fetch error:`, error);
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // DEBUG: Log what Supabase returned
    console.log(`[API] Campaign loaded:`, {
      id: campaign.id,
      name: campaign.name,
      hasCampaignStates: !!campaign.campaign_states,
      campaignStatesType: Array.isArray(campaign.campaign_states) ? 'array' : typeof campaign.campaign_states,
      campaignStatesKeys: campaign.campaign_states ? Object.keys(campaign.campaign_states) : []
    });
    
    if (campaign.campaign_states && typeof campaign.campaign_states === 'object') {
      console.log(`[API] ✅ campaign_states exists as object:`, {
        hasAdPreviewData: !!(campaign.campaign_states as any).ad_preview_data,
        hasGoalData: !!(campaign.campaign_states as any).goal_data,
        hasLocationData: !!(campaign.campaign_states as any).location_data,
        hasAudienceData: !!(campaign.campaign_states as any).audience_data,
        adPreviewDataSample: (campaign.campaign_states as any).ad_preview_data ? 
          JSON.stringify((campaign.campaign_states as any).ad_preview_data).substring(0, 200) : null
      });
    } else {
      console.warn(`[API] ⚠️ campaign_states is NULL or wrong type!`);
    }

    return NextResponse.json({ campaign })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    )
  }
}
