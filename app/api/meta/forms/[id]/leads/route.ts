/**
 * Feature: Fetch Leads for a Lead Form
 * Purpose: Poll leads from a leadgen form id
 * References:
 *  - Leads endpoint: https://developers.facebook.com/docs/marketing-api/reference/leadgen-form/leads/
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { getGraphVersion, getPageAccessToken } from '@/lib/meta/graph'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const url = new URL(req.url)
    const campaignId = url.searchParams.get('campaignId')
    if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: conn } = await supabaseServer
      .from('campaign_meta_connections')
      .select('selected_page_id,long_lived_user_token')
      .eq('campaign_id', campaignId)
      .single()

    const pageId = (conn as { selected_page_id?: string } | null)?.selected_page_id
    const userToken = (conn as { long_lived_user_token?: string } | null)?.long_lived_user_token
    if (!pageId || !userToken) return NextResponse.json({ error: 'Missing page or user token' }, { status: 400 })

    const gv = getGraphVersion()
    const pageToken = await getPageAccessToken(gv, userToken, pageId)
    if (!pageToken) return NextResponse.json({ error: 'Could not derive page access token' }, { status: 400 })

    const leadsRes = await fetch(`https://graph.facebook.com/${gv}/${encodeURIComponent(id)}/leads?limit=25`, {
      headers: { Authorization: `Bearer ${pageToken}` },
      cache: 'no-store',
    })
    const json = await leadsRes.json()
    if (!leadsRes.ok) return NextResponse.json({ error: json?.error?.message || 'Failed to fetch leads' }, { status: leadsRes.status })
    return NextResponse.json(json)
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


