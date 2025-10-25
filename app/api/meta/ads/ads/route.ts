/**
 * Feature: Create Ad from Ad Set and Creative
 * Purpose: Create a paused ad linked to the ad set and creative
 * References:
 *  - Ads: https://developers.facebook.com/docs/marketing-api/reference/adgroup/
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'
import { getGraphVersion } from '@/lib/meta/graph'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { campaignId?: string; adSetId?: string; creativeId?: string; name?: string }
    const { campaignId, adSetId, creativeId, name = 'Lead Ad' } = body
    if (!campaignId || !adSetId || !creativeId) return NextResponse.json({ error: 'campaignId, adSetId, creativeId required' }, { status: 400 })

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: conn } = await supabaseServer
      .from('campaign_meta_connections')
      .select('selected_ad_account_id,long_lived_user_token')
      .eq('campaign_id', campaignId)
      .single()

    const adAccountId = (conn as { selected_ad_account_id?: string } | null)?.selected_ad_account_id
    const userToken = (conn as { long_lived_user_token?: string } | null)?.long_lived_user_token
    if (!adAccountId || !userToken) return NextResponse.json({ error: 'Missing ad account or user token' }, { status: 400 })

    const gv = getGraphVersion()
    const payload = {
      access_token: userToken,
      adset_id: adSetId,
      creative: { creative_id: creativeId },
      name,
      status: 'PAUSED',
    }
    const res = await fetch(`https://graph.facebook.com/${gv}/act_${encodeURIComponent(adAccountId)}/ads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) return NextResponse.json({ error: json?.error?.message || 'Failed to create ad' }, { status: res.status })

    const id = json?.id as string | undefined
    if (id) {
      const { data: stateRow } = await supabaseServer
        .from('campaign_states')
        .select('meta_connect_data')
        .eq('campaign_id', campaignId)
        .single()

      const current = (stateRow?.meta_connect_data as Record<string, unknown> | null) || {}
      const existingDelivery = (current.delivery_data as Record<string, unknown> | undefined) || {}
      const nextMeta = { ...current, delivery_data: { ...existingDelivery, adId: id } }
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


