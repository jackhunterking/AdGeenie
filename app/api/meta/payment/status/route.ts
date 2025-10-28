/**
 * Feature: Payment Status for Meta Ad Account
 * Purpose: Check ad account funding source and persist flag on success.
 * References:
 *  - Facebook Marketing API (AdAccount fields): https://developers.facebook.com/docs/marketing-api/reference/ad-account/
 *  - Supabase Next.js Auth: https://supabase.com/docs/guides/auth/server/nextjs
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { getGraphVersion } from '@/lib/meta/graph'

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
    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: conn } = await supabaseServer
      .from('campaign_meta_connections')
      .select('long_lived_user_token')
      .eq('campaign_id', campaignId)
      .single()

    const token = (conn as { long_lived_user_token?: string } | null)?.long_lived_user_token
    if (!token) return NextResponse.json({ connected: false })

    const gv = getGraphVersion()
    const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
    const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(actId)}?fields=funding_source,funding_source_details{credit_card,display_string}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    const json: unknown = await res.json()
    const obj = (json && typeof json === 'object' && json !== null) ? (json as Record<string, unknown>) : {}

    const fundingSource = obj['funding_source']
    const fundingSourceDetails = obj['funding_source_details'] as Record<string, unknown> | null | undefined
    const connected = Boolean(fundingSource || fundingSourceDetails)

    if (connected) {
      await supabaseServer
        .from('campaign_meta_connections')
        .update({ ad_account_payment_connected: true })
        .eq('campaign_id', campaignId)
    }

    return NextResponse.json({ connected })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


