/**
 * Feature: Payment Eligibility for Meta Ad Account
 * Purpose: Preflight check before opening FB.ui ads_payment to avoid white-screen
 * References:
 *  - Ad Account fields: https://developers.facebook.com/docs/marketing-api/reference/ad-account/
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
    if (!token) return NextResponse.json({ eligible: false, reason: 'Missing user token' })

    const gv = getGraphVersion()
    const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
    const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(actId)}?fields=account_status,capabilities`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    const json: unknown = await res.json()

    if (!res.ok || !json || typeof json !== 'object' || json === null) {
      const reason = (json && typeof json === 'object' && 'error' in json)
        ? String((json as { error?: { message?: string } }).error?.message || 'Graph error')
        : 'Graph error'
      return NextResponse.json({ eligible: false, reason }, { status: 200 })
    }

    const obj = json as Record<string, unknown>
    const statusVal = obj['account_status']
    const capabilities = obj['capabilities'] as unknown

    // Heuristic: eligible when account_status is active (1) and account has payments capability
    const statusOk = typeof statusVal === 'number' ? statusVal === 1 : true
    const caps = Array.isArray(capabilities) ? capabilities.map(String) : []
    const hasPaymentsCap = caps.includes('CAN_USE_SPENDING_LIMIT') || caps.includes('CAN_CREATE_AND_EDIT_ADS')

    const eligible = Boolean(statusOk && (caps.length === 0 || hasPaymentsCap))
    return NextResponse.json({ eligible, status: statusVal ?? null, capabilities: caps })
  } catch {
    return NextResponse.json({ eligible: false, reason: 'Server error' }, { status: 500 })
  }
}


