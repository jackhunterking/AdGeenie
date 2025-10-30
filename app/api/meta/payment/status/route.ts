/**
 * Feature: Payment Status
 * Purpose: Check if ad account has funding and update connection row.
 * References:
 *  - Facebook Graph API - Ad Account: https://developers.facebook.com/docs/marketing-api/reference/ad-account
 *  - Supabase server-side auth: https://supabase.com/docs/guides/auth/server-side/creating-a-client
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

function getGraphVersion(): string {
  return process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get('campaignId')
  const adAccountId = searchParams.get('adAccountId') // e.g., act_123...

  if (!campaignId || !adAccountId) {
    return NextResponse.json({ error: 'campaignId and adAccountId are required' }, { status: 400 })
  }

  const supa = await createServerClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Verify ownership
  const { data: campaign } = await supabaseServer
    .from('campaigns')
    .select('id,user_id')
    .eq('id', campaignId)
    .maybeSingle()

  if (!campaign || campaign.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { data: conn } = await supabaseServer
    .from('campaign_meta_connections')
    .select('long_lived_user_token')
    .eq('campaign_id', campaignId)
    .maybeSingle()

  const token = (conn as { long_lived_user_token?: string } | null)?.long_lived_user_token
  if (!token) {
    return NextResponse.json({ error: 'missing token' }, { status: 500 })
  }

  const gv = getGraphVersion()
  const numericId = adAccountId.replace(/^act_/i, '')
  const actId = `act_${numericId}`

  const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(actId)}?fields=funding_source_details`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json({ error: `Graph error ${res.status}`, details: text }, { status: 502 })
  }

  const j: unknown = await res.json()
  const hasFunding = Boolean((j as { funding_source_details?: unknown }).funding_source_details)

  if (hasFunding) {
    await supabaseServer
      .from('campaign_meta_connections')
      .update({ ad_account_payment_connected: true })
      .eq('campaign_id', campaignId)
  }

  return NextResponse.json({ connected: hasFunding })
}
