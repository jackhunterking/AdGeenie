/**
 * Feature: Graph Proxy for Billing Debug (temporary)
 * Purpose: Run specific Graph calls server-side with stored long-lived token
 * References:
 *  - Graph API: https://developers.facebook.com/docs/graph-api
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    const adAccountId = searchParams.get('adAccountId') || ''
    const businessId = searchParams.get('businessId') || ''
    const pageId = searchParams.get('pageId') || ''
    const what = (searchParams.get('what') || '').toLowerCase()
    if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })

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
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    const gv = process.env.FB_GRAPH_VERSION || process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
    const doFetch = async (path: string) => {
      const r = await fetch(`https://graph.facebook.com/${gv}/${path}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      return await r.json()
    }

    switch (what) {
      case 'act': {
        const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
        return NextResponse.json(await doFetch(`${encodeURIComponent(id)}?fields=business,owner,account_status,funding_source,funding_source_details,capabilities`))
      }
      case 'perms':
        return NextResponse.json(await doFetch('me/permissions'))
      case 'apps':
        if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })
        return NextResponse.json(await doFetch(`${encodeURIComponent(businessId)}/apps?fields=id,name&limit=500`))
      case 'mebiz':
        return NextResponse.json(await doFetch('me/businesses?fields=id,name,permitted_roles&limit=500'))
      case 'owned':
        if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })
        return NextResponse.json(await doFetch(`${encodeURIComponent(businessId)}/owned_ad_accounts?fields=id&limit=500`))
      default:
        return NextResponse.json({ error: "unknown 'what' param" }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


