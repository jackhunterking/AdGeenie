import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

// PATCH /api/campaigns/[id]/state - Update campaign state
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const campaignId = id
    
    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user owns this campaign
    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    if (campaign.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You do not own this campaign' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    // Validate that at least one field is being updated
    const validFields = [
      'goal_data',
      'location_data',
      'audience_data',
      'ad_copy_data',
      'ad_preview_data',
      'budget_data',
    ]
    
    const updateData: Record<string, unknown> = {}
    for (const field of validFields) {
      if (field in body) {
        updateData[field] = body[field]
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update campaign state
    const { data, error } = await supabaseServer
      .from('campaign_states')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('campaign_id', campaignId)
      .select()
      .single()

    if (error) {
      console.error('Error updating campaign state:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also update the campaign's updated_at timestamp
    await supabaseServer
      .from('campaigns')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', campaignId)

    return NextResponse.json({ state: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to update campaign state' },
      { status: 500 }
    )
  }
}

// GET /api/campaigns/[id]/state - Get campaign state
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const campaignId = id

    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user owns this campaign
    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    if (campaign.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You do not own this campaign' },
        { status: 403 }
      )
    }

    const { data, error } = await supabaseServer
      .from('campaign_states')
      .select('*')
      .eq('campaign_id', campaignId)
      .single()

    if (error) {
      console.error('Error fetching campaign state:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ state: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign state' },
      { status: 500 }
    )
  }
}

