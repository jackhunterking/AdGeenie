/**
 * Feature: Meta Page→IG Lookup API
 * Purpose: Given a pageId, return linked Instagram Business/Creator account (id, username)
 * References:
 *  - Page → Instagram Business Account: https://developers.facebook.com/docs/instagram-api/reference/page#linked_ig_account
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

const FB_GRAPH_VERSION = process.env.FB_GRAPH_VERSION || 'v20.0'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    const pageId = searchParams.get('pageId')
    if (!campaignId || !pageId) {
      return NextResponse.json({ error: 'campaignId and pageId required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: conn } = await supabaseServer
      .from('campaign_meta_connections')
      .select('long_lived_user_token')
      .eq('campaign_id', campaignId)
      .single()

    if (!conn?.long_lived_user_token) {
      return NextResponse.json({ instagram: null })
    }

    const token = conn.long_lived_user_token as string

    const res = await fetch(`https://graph.facebook.com/${FB_GRAPH_VERSION}/${pageId}?fields=instagram_business_account{id,username}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const json = await res.json()
    const instagram = json.instagram_business_account || null

    return NextResponse.json({ instagram })
  } catch (err) {
    console.error('[META] Page IG error', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


