import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

// PATCH /api/campaigns/[id]/state - Update campaign state
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id
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
    
    const updateData: Record<string, any> = {}
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
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id

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

