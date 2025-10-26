/**
 * Feature: Campaigns API
 * Purpose: List and create campaigns with linked conversations
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { Tables } from '@/lib/supabase/database.types'
import { conversationManager } from '@/lib/services/conversation-manager'
import { generateNameCandidates, pickUniqueFromCandidates } from '@/lib/utils/campaign-naming'

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
    const { name, tempPromptId, prompt, goalType } = body as { name?: string; tempPromptId?: string; prompt?: string; goalType?: string }

    // Normalize provided name; treat empty/whitespace as missing to trigger auto-naming
    const requestedName = typeof name === 'string' && name.trim().length > 0 ? name.trim() : null
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

    // Determine campaign name
    let finalName = requestedName ?? null
    if (!finalName) {
      const source = initialPrompt ?? prompt ?? ''
      const candidates = generateNameCandidates(source)
      // Load existing names for user (case-insensitive)
      const { data: existing, error: existingError } = await supabaseServer
        .from('campaigns')
        .select('name')
        .eq('user_id', user.id)
      if (existingError) {
        console.error('Error loading existing campaign names:', existingError)
      }
      const existingSet = new Set<string>((existing || []).map(r => r.name.toLowerCase()))
      finalName = pickUniqueFromCandidates(candidates, existingSet)
    }

    // Create campaign (retry on collision once with next candidate set)
    const tryInsert = async (proposedName: string) => {
      return await supabaseServer
        .from('campaigns')
        .insert({
          user_id: user.id,
          name: proposedName,
          status: 'draft',
          current_step: 1,
          total_steps: 6,
          metadata,
          initial_goal: initialGoal || null,
        })
        .select()
        .single()
    }

    let insertResult = await tryInsert(finalName!)
    if (insertResult.error) {
      // On unique constraint violation, pick next candidate and retry once
      console.warn('Initial campaign insert failed, retrying with another name:', insertResult.error)
      if (!requestedName) {
        const candidates = generateNameCandidates(initialPrompt ?? prompt ?? '')
        const exclude = new Set<string>([(finalName || '').toLowerCase()])
        const next = pickUniqueFromCandidates(candidates, exclude)
        insertResult = await tryInsert(next)
      }
    }
    const campaign: Tables<'campaigns'> | null = insertResult.data as Tables<'campaigns'> | null
    const campaignError = insertResult.error

    if (campaignError || !campaign) {
      const message = campaignError?.message ?? 'Failed to create campaign'
      console.error('Error creating campaign:', campaignError)
      return NextResponse.json(
        { error: message },
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
          title: `Chat: ${campaign?.name ?? finalName}`,
          metadata: {
            campaign_name: campaign?.name ?? finalName,
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
