/**
 * Feature: Meta Auth Exchange API
 * Purpose: Exchange short-lived user token for long-lived token and fetch assets (Pages, IG link, Ad Accounts)
 * References:
 *  - Facebook Login (Web): https://developers.facebook.com/docs/facebook-login/web
 *  - Access Tokens & Exchange: https://developers.facebook.com/docs/facebook-login/guides/access-tokens
 *  - User Accounts → Pages: https://developers.facebook.com/docs/graph-api/reference/user/accounts/
 *  - Page Access Tokens: https://developers.facebook.com/docs/pages/access-tokens/
 *  - Marketing API Access: https://developers.facebook.com/docs/marketing-api/access
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

const FB_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID!
const FB_APP_SECRET = process.env.FB_APP_SECRET!
const FB_GRAPH_VERSION = process.env.FB_GRAPH_VERSION || 'v20.0'

export async function POST(req: NextRequest) {
  try {
    if (!FB_APP_ID || !FB_APP_SECRET) {
      return NextResponse.json({ error: 'Server missing FB app credentials' }, { status: 500 })
    }

    const { shortLivedToken, campaignId } = await req.json() as { shortLivedToken?: string; campaignId?: string }
    if (!shortLivedToken || !campaignId) {
      return NextResponse.json({ error: 'shortLivedToken and campaignId required' }, { status: 400 })
    }

    // Auth user via cookies
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify campaign ownership
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .single()

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Exchange short-lived token → long-lived token
    const exchangeUrl = `https://graph.facebook.com/${FB_GRAPH_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(FB_APP_ID)}&client_secret=${encodeURIComponent(FB_APP_SECRET)}&fb_exchange_token=${encodeURIComponent(shortLivedToken)}`

    const exchangeRes = await fetch(exchangeUrl, { method: 'GET' })
    if (!exchangeRes.ok) {
      const text = await exchangeRes.text()
      return NextResponse.json({ error: 'Failed to exchange token', details: text }, { status: 400 })
    }
    const exchangeJson = await exchangeRes.json() as { access_token: string, token_type: string, expires_in: number }
    const longLivedToken = exchangeJson.access_token
    const tokenExpiresAt = new Date(Date.now() + exchangeJson.expires_in * 1000).toISOString()

    // Fetch Pages with page access tokens
    const pagesRes = await fetch(`https://graph.facebook.com/${FB_GRAPH_VERSION}/me/accounts?fields=id,name,category,access_token&limit=500`, {
      headers: { Authorization: `Bearer ${longLivedToken}` }
    })
    const pagesJson = await pagesRes.json()
    const pages = Array.isArray(pagesJson.data) ? pagesJson.data : []

    // Fetch Ad Accounts
    const adActsRes = await fetch(`https://graph.facebook.com/${FB_GRAPH_VERSION}/me/adaccounts?fields=id,name,account_status,currency&limit=500`, {
      headers: { Authorization: `Bearer ${longLivedToken}` }
    })
    const adActsJson = await adActsRes.json()
    const adAccounts = Array.isArray(adActsJson.data) ? adActsJson.data : []

    // Upsert base connection (no selections yet)
    const { data: upserted, error: upErr } = await supabaseServer
      .from('campaign_meta_connections')
      .upsert({
        campaign_id: campaignId,
        user_id: user.id,
        long_lived_user_token: longLivedToken,
        token_expires_at: tokenExpiresAt
      }, { onConflict: 'campaign_id' })
      .select('id')
      .single()

    if (upErr) {
      return NextResponse.json({ error: 'Failed to store connection', details: upErr.message }, { status: 500 })
    }

    return NextResponse.json({
      pages,
      adAccounts,
      token: { expiresAt: tokenExpiresAt }
    })
  } catch (err) {
    console.error('[META] Exchange error', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


