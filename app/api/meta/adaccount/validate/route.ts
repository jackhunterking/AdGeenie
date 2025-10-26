/**
 * Feature: Validate Ad Account vs Business and Page permissions
 * Purpose: Ensure selected ad account belongs to selected business and can advertise for page
 * References:
 *  - Page → adaccounts: https://developers.facebook.com/docs/marketing-api/reference/page/adaccounts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { assertAdAccountCanAdvertiseForPage, getGraphVersion } from '@/lib/meta/graph'

export async function POST(req: NextRequest) {
  try {
    const { campaignId, pageId, adAccountId, businessId } = await req.json() as {
      campaignId?: string; pageId?: string; adAccountId?: string; businessId?: string;
    }
    if (!campaignId || !pageId || !adAccountId || !businessId) {
      return NextResponse.json({ error: 'campaignId, pageId, adAccountId, businessId required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .single()
    if (!campaign || campaign.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: conn } = await supabaseServer
      .from('campaign_meta_connections')
      .select('long_lived_user_token')
      .eq('campaign_id', campaignId)
      .single()
    const token = conn?.long_lived_user_token
    if (!token) return NextResponse.json({ ok: false, reason: 'Missing token' })

    // Validate account belongs to business via source list or direct fetch
    const gv = getGraphVersion()
    const acctRes = await fetch(`https://graph.facebook.com/${gv}/${encodeURIComponent(adAccountId)}?fields=business{id}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store'
    })
    const acctJson: unknown = await acctRes.json()
    const belongs = acctJson && typeof acctJson === 'object' && acctJson !== null && (acctJson as { business?: { id?: string } }).business?.id === businessId
    if (!belongs) {
      return NextResponse.json({ ok: false, reason: 'Ad account does not belong to selected business' })
    }

    // Validate can advertise for page
    const check = await assertAdAccountCanAdvertiseForPage({ userToken: token, pageId, adAccountId })
    if (!check.ok) return NextResponse.json({ ok: false, reason: check.reason })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


