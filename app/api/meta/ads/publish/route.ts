/**
 * Feature: Publish Campaign or Ad
 * Purpose: Set status ACTIVE for campaign or ad
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { getGraphVersion } from '@/lib/meta/graph'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { campaignId?: string; targetType?: 'ad' | 'campaign'; targetId?: string }
    const { campaignId, targetType = 'ad', targetId } = body
    if (!campaignId || !targetId) return NextResponse.json({ error: 'campaignId and targetId required' }, { status: 400 })

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
    const resource = targetType === 'campaign' ? 'campaigns' : 'ads'
    const res = await fetch(`https://graph.facebook.com/${gv}/${encodeURIComponent(targetId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ status: 'ACTIVE', access_token: userToken }),
    })
    const json = await res.json()
    if (!res.ok) return NextResponse.json({ error: json?.error?.message || 'Failed to publish' }, { status: res.status })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


