/**
 * Feature: Meta Instant Forms Detail API
 * Purpose: Fetch leadgen form detail for preview
 * References:
 *  - Supabase Auth (Next.js): https://supabase.com/docs/guides/auth/server/nextjs
 *  - Graph API: https://developers.facebook.com/docs/marketing-api/reference/leadgen-form/
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const FB_GRAPH_VERSION = process.env.FB_GRAPH_VERSION
    if (!FB_GRAPH_VERSION) {
      return NextResponse.json({ error: 'Server missing FB_GRAPH_VERSION' }, { status: 500 })
    }

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

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

    if (!pageId || !userToken) {
      return NextResponse.json({ error: 'Missing selected page or user token' }, { status: 400 })
    }

    // Derive page access token
    const pageRes = await fetch(`https://graph.facebook.com/${FB_GRAPH_VERSION}/${encodeURIComponent(pageId)}?fields=access_token`, {
      headers: { Authorization: `Bearer ${userToken}` },
      cache: 'no-store',
    })
    const pageJson = await pageRes.json() as { access_token?: string }
    const pageToken = pageJson.access_token
    if (!pageToken) {
      return NextResponse.json({ error: 'Could not derive page access token' }, { status: 400 })
    }

    const detailRes = await fetch(
      `https://graph.facebook.com/${FB_GRAPH_VERSION}/${encodeURIComponent(id)}?fields=id,name,questions,privacy_policy_url,privacy_link_text`,
      { headers: { Authorization: `Bearer ${pageToken}` }, cache: 'no-store' }
    )
    const json = await detailRes.json()
    if (!detailRes.ok) {
      return NextResponse.json({ error: (json && json.error && json.error.message) || 'Failed to fetch form' }, { status: detailRes.status })
    }

    return NextResponse.json(json)
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
