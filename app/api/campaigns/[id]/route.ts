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
        campaign_states (*),
        generated_assets (
          id,
          public_url,
          asset_type,
          created_at
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Auto-consume: Return prompt only if not consumed, then mark as consumed
    let shouldReturnPrompt = false
    if (!campaign.initial_prompt_consumed && campaign.metadata?.initialPrompt) {
      shouldReturnPrompt = true
      
      // Mark as consumed (fire-and-forget, non-blocking)
      supabaseServer
        .from('campaigns')
        .update({ initial_prompt_consumed: true })
        .eq('id', id)
        .eq('user_id', user.id)
        .then(() => console.log(`Campaign ${id}: Initial prompt consumed`))
        .catch(err => console.error(`Failed to mark prompt consumed:`, err))
    }

    // Return prompt only if should be returned (first read)
    const responseData = {
      ...campaign,
      metadata: campaign.metadata 
        ? {
            ...campaign.metadata,
            initialPrompt: shouldReturnPrompt ? campaign.metadata.initialPrompt : null
          }
        : null
    }

    return NextResponse.json({ campaign: responseData })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    )
  }
}
