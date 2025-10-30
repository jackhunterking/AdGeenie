/**
 * Feature: Meta Business Login callback
 * Purpose: Exchange OAuth `code` for a user token, upgrade to long-lived,
 *          fetch first Business/Page/Ad Account, and persist for the campaign.
 * References:
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

function getGraphVersion(): string {
  return process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams, origin } = new URL(req.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.redirect(`${origin}/?meta=missing_code`)
    }

    const appId = process.env.NEXT_PUBLIC_FB_APP_ID
    const appSecret = process.env.FB_APP_SECRET
    const gv = getGraphVersion()
    if (!appId || !appSecret) {
      return NextResponse.redirect(`${origin}/?meta=server_missing_env`)
    }

    const cookieStore = await cookies()
    const campaignId = cookieStore.get('meta_cid')?.value || null
    if (!campaignId) {
      return NextResponse.redirect(`${origin}/?meta=missing_campaign`)
    }

    const redirectUri = `${origin}/api/meta/auth/callback`

    // 1) Exchange code -> short-lived user token
    const tokenRes = await fetch(
      `https://graph.facebook.com/${gv}/oauth/access_token?client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${encodeURIComponent(code)}`,
      { cache: 'no-store' }
    )
    const tokenJson: unknown = await tokenRes.json()
    const shortToken = (tokenJson && typeof tokenJson === 'object' && tokenJson !== null && typeof (tokenJson as { access_token?: string }).access_token === 'string')
      ? (tokenJson as { access_token: string }).access_token
      : null
    if (!shortToken) {
      return NextResponse.redirect(`${origin}/?meta=token_exchange_failed`)
    }

    // 2) Upgrade to long-lived user token
    const longRes = await fetch(
      `https://graph.facebook.com/${gv}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(shortToken)}`,
      { cache: 'no-store' }
    )
    const longJson: unknown = await longRes.json()
    const longToken = (longJson && typeof longJson === 'object' && longJson !== null && typeof (longJson as { access_token?: string }).access_token === 'string')
      ? (longJson as { access_token: string }).access_token
      : null
    if (!longToken) {
      return NextResponse.redirect(`${origin}/?meta=long_token_failed`)
    }

    // 3) Fetch assets with the long-lived token
    async function safeJson<T = unknown>(res: Response): Promise<T | null> {
      try { return (await res.json()) as T } catch { return null }
    }

    const meBizRes = await fetch(`https://graph.facebook.com/${gv}/me/businesses?fields=id,name&limit=100`, { headers: { Authorization: `Bearer ${longToken}` }, cache: 'no-store' })
    const meBiz: any = await safeJson(meBizRes)
    const firstBiz: { id: string; name?: string } | null = Array.isArray(meBiz?.data) && meBiz.data.length > 0 ? meBiz.data[0] : null

    const pagesRes = await fetch(`https://graph.facebook.com/${gv}/me/accounts?fields=id,name,instagram_business_account{username}&limit=500`, { headers: { Authorization: `Bearer ${longToken}` }, cache: 'no-store' })
    const pages: any = await safeJson(pagesRes)
    const firstPage: { id: string; name?: string; instagram_business_account?: { id?: string; username?: string } } | null = Array.isArray(pages?.data) && pages.data.length > 0 ? pages.data[0] : null

    const actsRes = await fetch(`https://graph.facebook.com/${gv}/me/adaccounts?fields=id,name,account_status,currency&limit=500`, { headers: { Authorization: `Bearer ${longToken}` }, cache: 'no-store' })
    const acts: any = await safeJson(actsRes)
    const firstAd: { id: string; name?: string; account_status?: number } | null = Array.isArray(acts?.data) && acts.data.length > 0 ? (acts.data.find((a: any) => a?.account_status === 1) || acts.data[0]) : null

    // 4) Persist
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(`${origin}/?meta=unauthorized`)
    }

    // Check if connection already exists
    const { data: existingConn } = await supabaseServer
      .from('campaign_meta_connections')
      .select('id,selected_business_id')
      .eq('campaign_id', campaignId)
      .single()

    const isReconnection = !!existingConn
    console.log(`[MetaCallback] ${isReconnection ? 'Replacing' : 'Creating'} connection for campaign ${campaignId}`, {
      oldBusinessId: existingConn?.selected_business_id,
      newBusinessId: firstBiz?.id,
    })

    await supabaseServer
      .from('campaign_meta_connections')
      .upsert({
        campaign_id: campaignId,
        user_id: user.id,
        long_lived_user_token: longToken,
        selected_business_id: firstBiz?.id || null,
        selected_business_name: firstBiz?.name || null,
        selected_page_id: firstPage?.id || null,
        selected_page_name: firstPage?.name || null,
        selected_ig_user_id: firstPage?.instagram_business_account?.id || null,
        selected_ig_username: firstPage?.instagram_business_account?.username || null,
        selected_ad_account_id: firstAd?.id || null,
        selected_ad_account_name: firstAd?.name || null,
        ad_account_payment_connected: false, // Reset payment connection on reconnect
      }, { onConflict: 'campaign_id' })

    await supabaseServer
      .from('campaign_states')
      .update({
        meta_connect_data: {
          status: firstAd?.id ? 'connected' : 'selected_assets',
          businessId: firstBiz?.id || null,
          pageId: firstPage?.id || null,
          igUserId: firstPage?.instagram_business_account?.id || null,
          adAccountId: firstAd?.id || null,
          connectedAt: new Date().toISOString(),
        }
      })
      .eq('campaign_id', campaignId)

    return NextResponse.redirect(`${origin}/?meta=connected`)
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


