/**
 * Feature: Meta Assets API
 * Purpose: Return latest Pages (with access tokens), linked IG account, and Ad Accounts using stored long-lived token
 * References:
 *  - User Accounts → Pages: https://developers.facebook.com/docs/graph-api/reference/user/accounts/
 *  - Page → Instagram Business Account: https://developers.facebook.com/docs/instagram-api/reference/page#linked_ig_account
 *  - Marketing API Access: https://developers.facebook.com/docs/marketing-api/access
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    // Read environment variables at runtime
    const FB_GRAPH_VERSION = process.env.FB_GRAPH_VERSION

    if (!FB_GRAPH_VERSION) {
      return NextResponse.json({ error: 'Server missing FB_GRAPH_VERSION' }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Load connection
    const { data: conn } = await supabaseServer
      .from('campaign_meta_connections')
      .select('long_lived_user_token')
      .eq('campaign_id', campaignId)
      .single()

    if (!conn?.long_lived_user_token) {
      return NextResponse.json({ pages: [], adAccounts: [], instagram: null })
    }

    const token = conn.long_lived_user_token as string

    const pagesRes = await fetch(`https://graph.facebook.com/${FB_GRAPH_VERSION}/me/accounts?fields=id,name,category,access_token&limit=500`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const pagesJson = await pagesRes.json()
    const pages = Array.isArray(pagesJson.data) ? pagesJson.data : []

    // Optionally, for a selected page you can resolve IG account client-side by calling selection API

    const adActsRes = await fetch(`https://graph.facebook.com/${FB_GRAPH_VERSION}/me/adaccounts?fields=id,name,account_status,currency&limit=500`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const adActsJson = await adActsRes.json()
    const adAccounts = Array.isArray(adActsJson.data) ? adActsJson.data : []

    return NextResponse.json({ pages, adAccounts })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


