/**
 * Feature: Verify Ad Account Billing Status
 * Purpose: Check `funding_source` on the ad account using the stored user token; persist when connected
 * References:
 *  - Meta blog (Ads Payments dialog): https://developers.facebook.com/ads/blog/post/v2/2018/10/02/ads-dialog-widget-payments/
 *  - Ad Account fields: https://developers.facebook.com/docs/marketing-api/reference/ad-account/
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    const adAccountId = searchParams.get('adAccountId')
    if (!campaignId || !adAccountId) {
      return NextResponse.json({ error: 'campaignId and adAccountId required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id,user_id')
      .eq('id', campaignId)
      .single()
    if (!campaign || campaign.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: conn } = await supabaseServer
      .from('campaign_meta_connections')
      .select('long_lived_user_token')
      .eq('campaign_id', campaignId)
      .single()

    const token = (conn as { long_lived_user_token?: string } | null)?.long_lived_user_token
    if (!token) return NextResponse.json({ connected: false, details: null })

    const FB_GRAPH_VERSION = process.env.FB_GRAPH_VERSION || process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
    const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
    const url = `https://graph.facebook.com/${FB_GRAPH_VERSION}/${encodeURIComponent(actId)}?fields=funding_source,funding_source_details`

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    const json: unknown = await res.json()
    const obj = (json && typeof json === 'object' && json !== null) ? (json as Record<string, unknown>) : {}
    const fundingSource = obj['funding_source']
    const fundingSourceDetails = obj['funding_source_details']
    const connected = Boolean(fundingSource || fundingSourceDetails)

    if (connected) {
      await supabaseServer
        .from('campaign_meta_connections')
        .update({ ad_account_payment_connected: true })
        .eq('campaign_id', campaignId)
    }

    return NextResponse.json({ connected, details: connected ? { funding_source: fundingSource ?? null } : null })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


