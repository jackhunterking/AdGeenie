/**
 * Feature: Create Lead Ads Ad Set
 * Purpose: Create an ad set for a campaign with destination_type ON_AD and promoted_object set to Page
 * References:
 *  - Lead Ads guide: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/create/
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'
import { getGraphVersion } from '@/lib/meta/graph'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      campaignId?: string
      name?: string
      dailyBudget?: string
      bidAmount?: string
      campaignRefId?: string
      startTime?: string
      endTime?: string | null
      optimizationGoal?: 'LEAD_GENERATION' | 'QUALITY_LEAD'
    }
    const { campaignId, name = 'Lead Ads Ad Set', dailyBudget = '1000', bidAmount, campaignRefId, startTime, endTime, optimizationGoal = 'LEAD_GENERATION' } = body
    if (!campaignId || !campaignRefId) return NextResponse.json({ error: 'campaignId and campaignRefId required' }, { status: 400 })

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: conn } = await supabaseServer
      .from('campaign_meta_connections')
      .select('selected_ad_account_id,selected_page_id,long_lived_user_token')
      .eq('campaign_id', campaignId)
      .single()

    const adAccountId = (conn as { selected_ad_account_id?: string } | null)?.selected_ad_account_id
    const pageId = (conn as { selected_page_id?: string } | null)?.selected_page_id
    const userToken = (conn as { long_lived_user_token?: string } | null)?.long_lived_user_token
    if (!adAccountId || !pageId || !userToken) {
      return NextResponse.json({ error: 'Missing ad account, page, or user token' }, { status: 400 })
    }

    const gv = getGraphVersion()
    const payload: Record<string, unknown> = {
      billing_event: 'IMPRESSIONS',
      campaign_id: campaignRefId,
      daily_budget: dailyBudget,
      name,
      optimization_goal: optimizationGoal,
      destination_type: 'ON_AD',
      promoted_object: { page_id: pageId },
      status: 'PAUSED',
      access_token: userToken,
    }
    if (bidAmount) payload.bid_amount = bidAmount
    if (startTime) payload.start_time = startTime
    if (endTime) payload.end_time = endTime

    const res = await fetch(`https://graph.facebook.com/${gv}/act_${encodeURIComponent(adAccountId)}/adsets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: json?.error?.message || 'Failed to create ad set' }, { status: res.status })
    }
    const id = json?.id as string | undefined
    if (id) {
      const { data: stateRow } = await supabaseServer
        .from('campaign_states')
        .select('meta_connect_data')
        .eq('campaign_id', campaignId)
        .single()

      const current = (stateRow?.meta_connect_data as Record<string, unknown> | null) || {}
      const existingDelivery = (current.delivery_data as Record<string, unknown> | undefined) || {}
      const nextMeta = { ...current, delivery_data: { ...existingDelivery, adSetId: id } }
      await supabaseServer
        .from('campaign_states')
        .update({ meta_connect_data: nextMeta as Json })
        .eq('campaign_id', campaignId)
    }
    return NextResponse.json({ id })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


