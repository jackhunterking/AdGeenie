/**
 * Feature: Create Calls Campaign/AdSet/Creative/Ad
 * Purpose: Programmatically create Calls campaign with click-to-call destination
 * References:
 *  - Campaigns: https://developers.facebook.com/docs/marketing-api/campaigns/
 *  - Ad Sets: https://developers.facebook.com/docs/marketing-api/adsets/
 *  - Destinations: https://developers.facebook.com/docs/marketing-api/destinations/
 *  - Ad Creative Link Data & CTA: https://developers.facebook.com/docs/marketing-api/reference/ad-creative-link-data/
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

    // Data
    const phone = (stateRow?.goal_data as { phoneNumber?: string } | null)?.phoneNumber
    if (!phone) return NextResponse.json({ error: 'Phone number missing' }, { status: 400 })
    const budget = Math.max(1, Number((stateRow?.budget_data as { dailyBudget?: number } | null)?.dailyBudget || 1))
    const dailyBudgetCents = String(Math.round(budget * 100))
    const startTime = (stateRow?.budget_data as { startTime?: string | null } | null)?.startTime || undefined
    const endTime = (stateRow?.budget_data as { endTime?: string | null } | null)?.endTime || undefined

  // 1) Campaign (Leads objective per ODAX)
    let campaignRefId = (stateRow?.meta_connect_data as { delivery_data?: { callsCampaignId?: string } } | null)?.delivery_data?.callsCampaignId
    if (!campaignRefId) {
      const payload = {
        buying_type: 'AUCTION',
        name: 'Calls Campaign',
        objective: 'OUTCOME_LEADS',
        status: 'PAUSED',
        access_token: userToken,
      }
      const res = await fetch(`https://graph.facebook.com/${gv}/act_${encodeURIComponent(adAccountId)}/campaigns`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (!res.ok) return NextResponse.json({ error: json?.error?.message || 'Failed to create campaign' }, { status: res.status })
      campaignRefId = json.id as string
      await patchDelivery(campaignId, { callsCampaignId: campaignRefId })
    }

  // 2) Ad Set (CALL destination)
    let adSetId = (stateRow?.meta_connect_data as { delivery_data?: { callsAdSetId?: string } } | null)?.delivery_data?.callsAdSetId
    if (!adSetId) {
      const adSetPayload: Record<string, unknown> = {
        billing_event: 'IMPRESSIONS',
        campaign_id: campaignRefId,
        daily_budget: dailyBudgetCents,
        name: 'Calls Ad Set',
        destination_type: 'CALL',
        promoted_object: { page_id: pageId },
        optimization_goal: 'LEAD_GENERATION',
        status: 'PAUSED',
        access_token: userToken,
      }
      if (startTime) adSetPayload.start_time = startTime
      if (endTime) adSetPayload.end_time = endTime

      const asRes = await fetch(`https://graph.facebook.com/${gv}/act_${encodeURIComponent(adAccountId)}/adsets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(adSetPayload) })
      const asJson = await asRes.json()
      if (!asRes.ok) return NextResponse.json({ error: asJson?.error?.message || 'Failed to create ad set' }, { status: asRes.status })
      adSetId = asJson.id as string
      await patchDelivery(campaignId, { callsAdSetId: adSetId })
    }

    // 3) Creative (link data with CALL_NOW)
    let creativeId = (stateRow?.meta_connect_data as { delivery_data?: { callsCreativeId?: string } } | null)?.delivery_data?.callsCreativeId
    if (!creativeId) {
      const adContent = (stateRow?.ad_preview_data as { adContent?: { headline?: string; body?: string } } | null)?.adContent || {}
      const creativePayload = {
        access_token: userToken,
        object_story_spec: {
          page_id: pageId,
          link_data: {
            link: 'http://fb.me/',
            message: adContent.body || 'Call us now',
            name: adContent.headline || 'Call Now',
            call_to_action: { type: 'CALL_NOW', value: { phone_number: phone } },
          },
        },
      }
      const crRes = await fetch(`https://graph.facebook.com/${gv}/act_${encodeURIComponent(adAccountId)}/adcreatives`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(creativePayload) })
      const crJson = await crRes.json()
      if (!crRes.ok) return NextResponse.json({ error: crJson?.error?.message || 'Failed to create creative' }, { status: crRes.status })
      creativeId = crJson.id as string
      await patchDelivery(campaignId, { callsCreativeId: creativeId })
    }

    // 4) Ad
    let adId = (stateRow?.meta_connect_data as { delivery_data?: { callsAdId?: string } } | null)?.delivery_data?.callsAdId
    if (!adId) {
      const adPayload = {
        name: 'Calls Ad',
        adset_id: adSetId,
        creative: { creative_id: creativeId },
        status: 'PAUSED',
        access_token: userToken,
      }
      const adRes = await fetch(`https://graph.facebook.com/${gv}/act_${encodeURIComponent(adAccountId)}/ads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(adPayload) })
      const adJson = await adRes.json()
      if (!adRes.ok) return NextResponse.json({ error: adJson?.error?.message || 'Failed to create ad' }, { status: adRes.status })
      adId = adJson.id as string
      await patchDelivery(campaignId, { callsAdId: adId })
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


