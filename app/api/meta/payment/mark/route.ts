/**
 * Feature: Mark Payment Connection for Ad Account
 * Purpose: Persist payment status after FB.ui ads_payment succeeds
 * References:
 *  - FB.ui payments: https://developers.facebook.com/docs/javascript/reference/FB.ui/
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { campaignId, adAccountId, connected } = await req.json() as {
      campaignId?: string; adAccountId?: string; connected?: boolean;
    }
    if (!campaignId || !adAccountId) {
      return NextResponse.json({ error: 'campaignId and adAccountId required' }, { status: 400 })
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

    const { error } = await supabaseServer
      .from('campaign_meta_connections')
      .update({ ad_account_payment_connected: Boolean(connected), selected_ad_account_id: adAccountId })
      .eq('campaign_id', campaignId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


