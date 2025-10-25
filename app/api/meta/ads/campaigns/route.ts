/**
 * Feature: Create Lead Ads Campaign
 * Purpose: Create a Marketing API campaign with OUTCOME_LEADS objective
 * References:
 *  - Lead Ads guide: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/create/
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'
import { getGraphVersion } from '@/lib/meta/graph'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { campaignId?: string; name?: string; specialAdCategories?: string[] }
    const { campaignId, name = 'Lead Ads Campaign', specialAdCategories = ['NONE'] } = body
    if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Resolve ad account for this campaign
    const { data: conn } = await supabaseServer
      .from('campaign_meta_connections')
      .select('selected_ad_account_id,long_lived_user_token')
      .eq('campaign_id', campaignId)
      .single()

    const adAccountId = (conn as { selected_ad_account_id?: string } | null)?.selected_ad_account_id
    const userToken = (conn as { long_lived_user_token?: string } | null)?.long_lived_user_token
    if (!adAccountId || !userToken) {
      return NextResponse.json({ error: 'Missing selected ad account or user token' }, { status: 400 })
    }

    const gv = getGraphVersion()

    const payload = {
      buying_type: 'AUCTION',
      name,
      objective: 'OUTCOME_LEADS',
      special_ad_categories: specialAdCategories,
      status: 'PAUSED',
      access_token: userToken,
    }

    const res = await fetch(`https://graph.facebook.com/${gv}/act_${encodeURIComponent(adAccountId)}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: json?.error?.message || 'Failed to create campaign' }, { status: res.status })
    }

    // Persist id to campaign_states.meta_connect_data.delivery_data (merge)
    const id = json?.id as string | undefined
    if (id) {
      const { data: stateRow } = await supabaseServer
        .from('campaign_states')
        .select('meta_connect_data')
        .eq('campaign_id', campaignId)
        .single()

      const current = (stateRow?.meta_connect_data as Record<string, unknown> | null) || {}
      const existingDelivery = (current.delivery_data as Record<string, unknown> | undefined) || {}
      const nextMeta = { ...current, delivery_data: { ...existingDelivery, campaignId: id } }
      await supabaseServer
        .from('campaign_states')
        .update({ meta_connect_data: nextMeta as Json })
        .eq('campaign_id', campaignId)
    }

    return NextResponse.json({ id })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


