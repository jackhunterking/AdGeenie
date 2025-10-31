/**
 * Feature: Meta Business Login callback
 * Purpose: Exchange OAuth `code` for a user token, upgrade to long-lived,
 *          fetch first Business/Page/Ad Account, and persist for the campaign.
 * References:
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 * Build: trigger (no-op)
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { exchangeCodeForTokens, fetchUserId, fetchBusinesses, fetchPagesWithTokens, fetchAdAccounts, chooseAssets, persistConnection, updateCampaignState } from '@/lib/meta/service'

// graph version is provided by the service

export async function GET(req: NextRequest) {
  console.log('[MetaCallback] Callback started')
  try {
    const { searchParams, origin } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const callbackType = searchParams.get('type') || 'system'

    if (!code) {
      // For implicit/token flow, access_token would be in URL fragment (#), which the server cannot read.
      // Log available query params to aid debugging when response_type is wrong.
      const paramsLog: Record<string, string> = {}
      searchParams.forEach((v, k) => { paramsLog[k] = v })
      console.error('[MetaCallback] Missing code parameter - likely wrong response_type (expected code grant).', { queryParams: paramsLog, state })
      return NextResponse.redirect(`${origin}/?meta=missing_code`)
    }

    // version via service when making calls

    const cookieStore = await cookies()
    const campaignId = cookieStore.get('meta_cid')?.value || null
    if (!campaignId) {
      console.error('[MetaCallback] Missing campaign ID from cookie')
      return NextResponse.redirect(`${origin}/?meta=missing_campaign`)
    }

    console.log('[MetaCallback] Processing callback for campaign:', campaignId)

    const redirectUri = `${origin}/api/meta/auth/callback?type=${callbackType}`

    // 1) Exchange code → tokens via service
    console.log('[MetaCallback] Exchanging code for token')
    let longToken: string | null = null
    try {
      const tokens = await exchangeCodeForTokens({ code, redirectUri })
      longToken = tokens.longToken
    } catch (err) {
      console.error('[MetaCallback] Token exchange failed:', err)
      return NextResponse.redirect(`${origin}/${campaignId}?meta=token_exchange_failed`)
    }

    // If this is a user app callback, store user token and exit early (no asset fetching)
    if (callbackType === 'user') {
      console.log('[MetaCallback] User app callback detected; persisting user_app_* fields')
      const fbUserId = await fetchUserId({ token: longToken! })

      // Approximate long-lived token expiry to 60 days from now
      const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)

      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      let userId: string | null = user?.id ?? null
      if (!userId) {
        const { data: campaignRow } = await supabaseServer
          .from('campaigns')
          .select('id,user_id')
          .eq('id', campaignId)
          .maybeSingle()
        userId = (campaignRow as { user_id?: string } | null)?.user_id ?? null
        if (!userId) {
          return NextResponse.redirect(`${origin}/?meta=unauthorized`)
        }
      }

      const { error } = await supabaseServer
        .from('campaign_meta_connections')
        .update({
          user_app_token: longToken!,
          user_app_token_expires_at: expiresAt.toISOString(),
          user_app_connected: true,
          user_app_fb_user_id: fbUserId,
          updated_at: new Date().toISOString(),
        })
        .eq('campaign_id', campaignId)

      if (error) {
        console.error('[MetaCallback] Failed to persist user app token:', error)
        return NextResponse.redirect(`${origin}/${campaignId}?meta=user_token_persist_failed`)
      }

      const bridgeUrl = new URL(`${origin}/meta/oauth/bridge`)
      bridgeUrl.searchParams.set('campaignId', campaignId)
      bridgeUrl.searchParams.set('meta', 'connected')
      if (state) bridgeUrl.searchParams.set('st', state)
      console.log('[MetaCallback] User app token saved, redirecting to bridge:', bridgeUrl.toString())
      return NextResponse.redirect(bridgeUrl.toString())
    }

    console.log('[MetaCallback] Fetching Meta assets (system app)')
    const fbUserId = await fetchUserId({ token: longToken! })
    const businesses = await fetchBusinesses({ token: longToken! })
    const pages = await fetchPagesWithTokens({ token: longToken! })
    const adAccounts = await fetchAdAccounts({ token: longToken! })
    const assets = chooseAssets({ businesses, pages, adAccounts })

    // 4) Persist
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    // Fallback: campaign owner if popup lacks session
    let userId: string | null = user?.id ?? null
    if (!userId) {
      const { data: campaignRow } = await supabaseServer
        .from('campaigns')
        .select('id,user_id')
        .eq('id', campaignId)
        .maybeSingle()
      userId = (campaignRow as { user_id?: string } | null)?.user_id ?? null
      if (!userId) {
        return NextResponse.redirect(`${origin}/?meta=unauthorized`)
      }
    }

    // Calculate token expiration (long-lived tokens are valid for 60 days)
    console.log('[MetaCallback] Upserting connection to database')
    try {
      await persistConnection({
        campaignId,
        userId,
        fbUserId,
        longToken: longToken!,
        assets,
      })
    } catch (e) {
      console.error('[MetaCallback] Failed to persist connection:', e)
      return NextResponse.redirect(`${origin}/${campaignId}?meta=connection_failed`)
    }

    const metaConnectData = {
      status: assets.adAccount?.id ? 'connected' : 'selected_assets',
      businessId: assets.business?.id || null,
      pageId: assets.page?.id || null,
      igUserId: assets.ig?.id || null,
      adAccountId: assets.adAccount?.id || null,
      connectedAt: new Date().toISOString(),
    }

    console.log('[MetaCallback] Updating campaign state:', {
      campaignId,
      metaConnectData,
    })
    
    try {
      await updateCampaignState({ campaignId, status: metaConnectData.status, extra: metaConnectData })
    } catch (e) {
      console.error('[MetaCallback] Failed to update campaign state:', e)
      // non-fatal
    }

    const bridgeUrl = new URL(`${origin}/meta/oauth/bridge`)
    bridgeUrl.searchParams.set('campaignId', campaignId)
    bridgeUrl.searchParams.set('meta', 'connected')
    if (state) bridgeUrl.searchParams.set('st', state)
    console.log('[MetaCallback] Successfully saved connection, redirecting to bridge:', bridgeUrl.toString())

    return NextResponse.redirect(bridgeUrl.toString())
  } catch (error) {
    console.error('[MetaCallback] Unhandled error:', error)
    const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').origin
    return NextResponse.redirect(`${origin}/?meta=error`)
  }
}


