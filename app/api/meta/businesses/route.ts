/**
 * Feature: List Businesses for current campaign's Meta connection
 * Purpose: Return `me/businesses` using stored long-lived user token
 * References:
 *  - Business Manager: https://developers.facebook.com/docs/marketing-api/businessmanager
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const FB_GRAPH_VERSION = process.env.FB_GRAPH_VERSION || process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })

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
    if (!token) return NextResponse.json({ businesses: [] })

    const res = await fetch(`https://graph.facebook.com/${FB_GRAPH_VERSION}/me/businesses?fields=id,name&limit=200`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    })
    const json: unknown = await res.json()
    const businesses = (json && typeof json === 'object' && json !== null && Array.isArray((json as { data?: unknown[] }).data))
      ? (json as { data: Array<{ id: string; name?: string }> }).data
      : []

    return NextResponse.json({ businesses })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


