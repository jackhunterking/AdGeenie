/**
 * Feature: Create Traffic (LPV) Campaign/AdSet/Creative/Ad
 * Purpose: Programmatically create Traffic campaign optimized for LANDING_PAGE_VIEWS
 * References:
 *  - Campaigns: https://developers.facebook.com/docs/marketing-api/campaigns/
 *  - Ad Sets: https://developers.facebook.com/docs/marketing-api/adsets/
 *  - Optimization Goals: https://developers.facebook.com/docs/marketing-api/optimization-goals/
 *  - Ad Creative Link Data: https://developers.facebook.com/docs/marketing-api/reference/ad-creative-link-data/
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'
import { getGraphVersion } from '@/lib/meta/graph'

export async function POST(req: NextRequest) {
  try {
    const { campaignId } = await req.json() as { campaignId?: string }
    if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // State + connection
    const [{ data: stateRow }, { data: conn }] = await Promise.all([
      supabaseServer.from('campaign_states').select('ad_preview_data,ad_copy_data,goal_data,budget_data,meta_connect_data').eq('campaign_id', campaignId).single(),
      supabaseServer.from('campaign_meta_connections').select('selected_ad_account_id,long_lived_user_token,selected_page_id').eq('campaign_id', campaignId).single(),
    ])

    const adAccountId = (conn as { selected_ad_account_id?: string } | null)?.selected_ad_account_id
    const userToken = (conn as { long_lived_user_token?: string } | null)?.long_lived_user_token
    const pageId = (conn as { selected_page_id?: string } | null)?.selected_page_id
    if (!adAccountId || !userToken || !pageId) return NextResponse.json({ error: 'Missing Meta connection (account/page/token)' }, { status: 400 })

    const gv = getGraphVersion()

    // 1) Campaign (Traffic)
    let campaignRefId = (stateRow?.meta_connect_data as { delivery_data?: { trafficCampaignId?: string } } | null)?.delivery_data?.trafficCampaignId
    if (!campaignRefId) {
      const campaignPayload = {
        buying_type: 'AUCTION',
        name: 'Traffic Campaign (LPV)',
        objective: 'OUTCOME_TRAFFIC',
        status: 'PAUSED',
        access_token: userToken,
      }
      const cRes = await fetch(`https://graph.facebook.com/${gv}/act_${encodeURIComponent(adAccountId)}/campaigns`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(campaignPayload) })
      const cJson = await cRes.json()
      if (!cRes.ok) return NextResponse.json({ error: cJson?.error?.message || 'Failed to create campaign' }, { status: cRes.status })
      campaignRefId = cJson.id as string
      await patchDelivery(campaignId, { trafficCampaignId: campaignRefId })
    }

    // 2) Ad Set (LPV, WEBSITE destination)
    const budget = Math.max(1, Number((stateRow?.budget_data as { dailyBudget?: number } | null)?.dailyBudget || 1))
    const dailyBudgetCents = String(Math.round(budget * 100))
    const startTime = (stateRow?.budget_data as { startTime?: string | null } | null)?.startTime || undefined
    const endTime = (stateRow?.budget_data as { endTime?: string | null } | null)?.endTime || undefined
    let adSetId = (stateRow?.meta_connect_data as { delivery_data?: { trafficAdSetId?: string } } | null)?.delivery_data?.trafficAdSetId
    if (!adSetId) {
      const adSetPayload: Record<string, unknown> = {
        billing_event: 'IMPRESSIONS',
        campaign_id: campaignRefId,
        daily_budget: dailyBudgetCents,
        name: 'Traffic Ad Set (LPV)',
        optimization_goal: 'LANDING_PAGE_VIEWS',
        destination_type: 'WEBSITE',
        status: 'PAUSED',
        access_token: userToken,
      }
      if (startTime) adSetPayload.start_time = startTime
      if (endTime) adSetPayload.end_time = endTime
      const asRes = await fetch(`https://graph.facebook.com/${gv}/act_${encodeURIComponent(adAccountId)}/adsets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(adSetPayload) })
      const asJson = await asRes.json()
      if (!asRes.ok) return NextResponse.json({ error: asJson?.error?.message || 'Failed to create ad set' }, { status: asRes.status })
      adSetId = asJson.id as string
      await patchDelivery(campaignId, { trafficAdSetId: adSetId })
    }

    // 3) Creative (link ad)
    const adContent = (stateRow?.ad_preview_data as { adContent?: { headline?: string; body?: string; cta?: string } } | null)?.adContent || {}
    const goal = (stateRow?.goal_data as { websiteUrl?: string } | null)
    const websiteUrl = goal?.websiteUrl
    if (!websiteUrl) return NextResponse.json({ error: 'Website URL missing' }, { status: 400 })

    let creativeId = (stateRow?.meta_connect_data as { delivery_data?: { trafficCreativeId?: string } } | null)?.delivery_data?.trafficCreativeId
    if (!creativeId) {
      const creativePayload = {
        access_token: userToken,
        object_story_spec: {
          page_id: pageId,
          link_data: {
            link: websiteUrl,
            message: adContent.body || 'Learn more',
            name: adContent.headline || 'Visit our site',
            call_to_action: { type: (adContent.cta || 'LEARN_MORE').toUpperCase().replace(/\s/g, '_') },
          },
        },
      }
      const crRes = await fetch(`https://graph.facebook.com/${gv}/act_${encodeURIComponent(adAccountId)}/adcreatives`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(creativePayload) })
      const crJson = await crRes.json()
      if (!crRes.ok) return NextResponse.json({ error: crJson?.error?.message || 'Failed to create creative' }, { status: crRes.status })
      creativeId = crJson.id as string
      await patchDelivery(campaignId, { trafficCreativeId: creativeId })
    }

    // 4) Ad
    let adId = (stateRow?.meta_connect_data as { delivery_data?: { trafficAdId?: string } } | null)?.delivery_data?.trafficAdId
    if (!adId) {
      const adPayload = {
        name: 'Traffic Ad',
        adset_id: adSetId,
        creative: { creative_id: creativeId },
        status: 'PAUSED',
        access_token: userToken,
      }
      const adRes = await fetch(`https://graph.facebook.com/${gv}/act_${encodeURIComponent(adAccountId)}/ads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(adPayload) })
      const adJson = await adRes.json()
      if (!adRes.ok) return NextResponse.json({ error: adJson?.error?.message || 'Failed to create ad' }, { status: adRes.status })
      adId = adJson.id as string
      await patchDelivery(campaignId, { trafficAdId: adId })
    }

    return NextResponse.json({ id: adId, campaignId: campaignRefId, adSetId, creativeId })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

async function patchDelivery(campaignId: string, patch: Record<string, string>) {
  const { data: stateRow } = await supabaseServer
    .from('campaign_states')
    .select('meta_connect_data')
    .eq('campaign_id', campaignId)
    .single()

  const current = (stateRow?.meta_connect_data as Record<string, unknown> | null) || {}
  const existingDelivery = (current.delivery_data as Record<string, unknown> | undefined) || {}
  const nextMeta = { ...current, delivery_data: { ...existingDelivery, ...patch } }
  await supabaseServer
    .from('campaign_states')
    .update({ meta_connect_data: nextMeta as Json })
    .eq('campaign_id', campaignId)
}


