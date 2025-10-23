/**
 * Feature: Campaigns API
 * Purpose: List and create campaigns with linked conversations
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { conversationManager } from '@/lib/services/conversation-manager'

// GET /api/campaigns - List user's campaigns
export async function GET() {
  try {
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

    const { data: campaigns, error } = await supabaseServer
      .from('campaigns')
      .select(`
        *,
        campaign_states (*)
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching campaigns:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}

// POST /api/campaigns - Create new campaign
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()
    const { name = 'Untitled Campaign', tempPromptId, prompt, goalType } = body

    const campaignName = name
    let initialPrompt = prompt
    let initialGoal = goalType

    // If tempPromptId is provided, fetch and use that prompt
    if (tempPromptId) {
      const { data: tempPrompt, error: promptError } = await supabaseServer
        .from('temp_prompts')
        .select('*')
        .eq('id', tempPromptId)
        .eq('used', false)
        .single()

      if (!promptError && tempPrompt) {
        // Check if not expired
        const expiresAt = new Date(tempPrompt.expires_at)
        if (expiresAt > new Date()) {
          initialPrompt = tempPrompt.prompt_text
          initialGoal = tempPrompt.goal_type || initialGoal
          
          // Mark as used
          await supabaseServer
            .from('temp_prompts')
            .update({ used: true })
            .eq('id', tempPromptId)
        }
      }
    }

    // Create campaign metadata with initial prompt if provided
    const metadata = initialPrompt ? { initialPrompt } : null

    // Create campaign
    const { data: campaign, error: campaignError } = await supabaseServer
      .from('campaigns')
      .insert({
        user_id: user.id,
        name: campaignName,
        status: 'draft',
        current_step: 1,
        total_steps: 6,
        metadata,
        initial_goal: initialGoal || null,
      })
      .select()
      .single()

    if (campaignError) {
      console.error('Error creating campaign:', campaignError)
      return NextResponse.json(
        { error: campaignError.message },
        { status: 500 }
      )
    }

    // Create campaign state with initial goal if provided
    const initialGoalData = initialGoal 
      ? { selectedGoal: initialGoal, status: 'idle', formData: null }
      : null

    const { error: stateError } = await supabaseServer
      .from('campaign_states')
      .insert({
        campaign_id: campaign.id,
        goal_data: initialGoalData,
        location_data: null,
        audience_data: null,
        ad_copy_data: null,
        ad_preview_data: null,
        budget_data: null,
      })

    if (stateError) {
      console.error('Error creating campaign state:', stateError)
      // Rollback campaign creation
      await supabaseServer.from('campaigns').delete().eq('id', campaign.id)
      return NextResponse.json(
        { error: 'Failed to initialize campaign state' },
        { status: 500 }
      )
    }

    // Create conversation for this campaign (AI SDK pattern)
    try {
      const conversation = await conversationManager.createConversation(
        user.id,
        campaign.id,
        {
          title: `Chat: ${campaignName}`,
          metadata: {
            campaign_name: campaignName,
            initial_prompt: initialPrompt,
            current_goal: initialGoal || null, // Store goal at conversation level
          },
        }
      )
      console.log(`Created conversation ${conversation.id} for campaign ${campaign.id} with goal: ${initialGoal || 'none'}`)
    } catch (convError) {
      console.error('Error creating conversation:', convError)
      // Don't fail campaign creation if conversation fails - it can be created later
    }

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    )
  }
}
