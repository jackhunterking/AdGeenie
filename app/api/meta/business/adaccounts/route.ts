/**
 * Feature: List Business Owned Ad Accounts
 * Purpose: Return `{business}/owned_ad_accounts` for a selected business
 * References:
 *  - Business owned ad accounts: https://developers.facebook.com/docs/marketing-api/businessmanager#owned_ad_accounts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const FB_GRAPH_VERSION = process.env.FB_GRAPH_VERSION || process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    const businessId = searchParams.get('businessId')
    if (!campaignId || !businessId) return NextResponse.json({ error: 'campaignId and businessId required' }, { status: 400 })

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Confirm ownership
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
    if (!token) return NextResponse.json({ adAccounts: [] })

    const url = `https://graph.facebook.com/${FB_GRAPH_VERSION}/${encodeURIComponent(businessId)}/owned_ad_accounts?fields=id,name,account_status,currency&limit=500`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    const json: unknown = await res.json()
    const adAccounts = (json && typeof json === 'object' && json !== null && Array.isArray((json as { data?: unknown[] }).data))
      ? (json as { data: Array<{ id: string; name?: string; account_status?: number; currency?: string }> }).data
      : []

    return NextResponse.json({ adAccounts })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


