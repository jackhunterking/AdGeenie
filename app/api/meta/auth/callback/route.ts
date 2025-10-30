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
  console.log('[MetaCallback] Callback started')
  try {
    const { searchParams, origin } = new URL(req.url)
    const code = searchParams.get('code')

    if (!code) {
      console.error('[MetaCallback] Missing code parameter')
      return NextResponse.redirect(`${origin}/?meta=missing_code`)
    }

    const appId = process.env.NEXT_PUBLIC_FB_APP_ID
    const appSecret = process.env.FB_APP_SECRET
    const gv = getGraphVersion()
    if (!appId || !appSecret) {
      console.error('[MetaCallback] Missing app credentials')
      return NextResponse.redirect(`${origin}/?meta=server_missing_env`)
    }

    const cookieStore = await cookies()
    const campaignId = cookieStore.get('meta_cid')?.value || null
    if (!campaignId) {
      console.error('[MetaCallback] Missing campaign ID from cookie')
      return NextResponse.redirect(`${origin}/?meta=missing_campaign`)
    }

    console.log('[MetaCallback] Processing callback for campaign:', campaignId)

    const redirectUri = `${origin}/api/meta/auth/callback`

    // 1) Exchange code -> short-lived user token
    console.log('[MetaCallback] Exchanging code for token')
    const tokenRes = await fetch(
      `https://graph.facebook.com/${gv}/oauth/access_token?client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${encodeURIComponent(code)}`,
      { cache: 'no-store' }
    )
    const tokenJson: unknown = await tokenRes.json()
    const shortToken = (tokenJson && typeof tokenJson === 'object' && tokenJson !== null && typeof (tokenJson as { access_token?: string }).access_token === 'string')
      ? (tokenJson as { access_token: string }).access_token
      : null
    if (!shortToken) {
      console.error('[MetaCallback] Failed to get short token:', tokenJson)
      return NextResponse.redirect(`${origin}/${campaignId}?meta=token_exchange_failed`)
    }
    console.log('[MetaCallback] Got short-lived token')

    // 2) Upgrade to long-lived user token
    console.log('[MetaCallback] Upgrading to long-lived token')
    const longRes = await fetch(
      `https://graph.facebook.com/${gv}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(shortToken)}`,
      { cache: 'no-store' }
    )
    const longJson: unknown = await longRes.json()
    const longToken = (longJson && typeof longJson === 'object' && longJson !== null && typeof (longJson as { access_token?: string }).access_token === 'string')
      ? (longJson as { access_token: string }).access_token
      : null
    if (!longToken) {
      console.error('[MetaCallback] Failed to get long-lived token:', longJson)
      return NextResponse.redirect(`${origin}/${campaignId}?meta=long_token_failed`)
    }
    console.log('[MetaCallback] Got long-lived token')

    // 3) Fetch assets with the long-lived token
    async function safeJson<T = unknown>(res: Response): Promise<T | null> {
      try { return (await res.json()) as T } catch (err) {
        console.error('[MetaCallback] Failed to parse JSON:', err)
        return null
      }
    }

    console.log('[MetaCallback] Fetching Meta assets')
    
    // Fetch Facebook user ID
    console.log('[MetaCallback] Fetching Facebook user info')
    const userInfoRes = await fetch(
      `https://graph.facebook.com/${gv}/me?fields=id`,
      { headers: { Authorization: `Bearer ${longToken}` }, cache: 'no-store' }
    )
    if (!userInfoRes.ok) {
      console.error('[MetaCallback] Failed to fetch user info:', {
        status: userInfoRes.status,
        statusText: userInfoRes.statusText,
      })
    }
    const userInfo: any = await safeJson(userInfoRes)
    const fbUserId = userInfo?.id || null
    console.log('[MetaCallback] Facebook user ID:', fbUserId)
    
    // Fetch businesses
    const meBizRes = await fetch(`https://graph.facebook.com/${gv}/me/businesses?fields=id,name&limit=100`, { headers: { Authorization: `Bearer ${longToken}` }, cache: 'no-store' })
    if (!meBizRes.ok) {
      console.error('[MetaCallback] Failed to fetch businesses:', {
        status: meBizRes.status,
        statusText: meBizRes.statusText,
        text: await meBizRes.text(),
      })
    }
    const meBiz: any = await safeJson(meBizRes)
    const firstBiz: { id: string; name?: string } | null = Array.isArray(meBiz?.data) && meBiz.data.length > 0 ? meBiz.data[0] : null
    console.log('[MetaCallback] Businesses:', { count: meBiz?.data?.length || 0, firstBiz })

    // Fetch pages with access_token field
    const pagesRes = await fetch(`https://graph.facebook.com/${gv}/me/accounts?fields=id,name,access_token,instagram_business_account{username}&limit=500`, { headers: { Authorization: `Bearer ${longToken}` }, cache: 'no-store' })
    if (!pagesRes.ok) {
      console.error('[MetaCallback] Failed to fetch pages:', {
        status: pagesRes.status,
        statusText: pagesRes.statusText,
        text: await pagesRes.text(),
      })
    }
    const pages: any = await safeJson(pagesRes)
    const firstPage: { id: string; name?: string; access_token?: string; instagram_business_account?: { id?: string; username?: string } } | null = Array.isArray(pages?.data) && pages.data.length > 0 ? pages.data[0] : null
    console.log('[MetaCallback] Pages:', { 
      count: pages?.data?.length || 0, 
      firstPage: firstPage ? { 
        id: firstPage.id, 
        name: firstPage.name, 
        hasToken: !!firstPage.access_token 
      } : null 
    })

    // Fetch ad accounts
    const actsRes = await fetch(`https://graph.facebook.com/${gv}/me/adaccounts?fields=id,name,account_status,currency&limit=500`, { headers: { Authorization: `Bearer ${longToken}` }, cache: 'no-store' })
    if (!actsRes.ok) {
      console.error('[MetaCallback] Failed to fetch ad accounts:', {
        status: actsRes.status,
        statusText: actsRes.statusText,
        text: await actsRes.text(),
      })
    }
    const acts: any = await safeJson(actsRes)
    const allAccounts = Array.isArray(acts?.data) ? acts.data : []
    const activeAccounts = allAccounts.filter((a: any) => a?.account_status === 1)
    const firstAd: { id: string; name?: string; account_status?: number } | null = activeAccounts.length > 0 ? activeAccounts[0] : (allAccounts.length > 0 ? allAccounts[0] : null)
    console.log('[MetaCallback] Ad Accounts:', {
      totalCount: allAccounts.length,
      activeCount: activeAccounts.length,
      firstAd,
      allAccountsStatuses: allAccounts.map((a: any) => ({ id: a?.id, status: a?.account_status })),
    })

    console.log('[MetaCallback] Fetched assets summary:', {
      fbUserId,
      businessId: firstBiz?.id,
      businessName: firstBiz?.name,
      pageId: firstPage?.id,
      pageName: firstPage?.name,
      pageHasToken: !!firstPage?.access_token,
      igUserId: firstPage?.instagram_business_account?.id,
      igUsername: firstPage?.instagram_business_account?.username,
      adAccountId: firstAd?.id,
      adAccountName: firstAd?.name,
      adAccountStatus: firstAd?.account_status,
    })

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
      .maybeSingle()

    const isReconnection = !!existingConn
    console.log(`[MetaCallback] ${isReconnection ? 'Replacing' : 'Creating'} connection for campaign ${campaignId}`, {
      oldBusinessId: existingConn?.selected_business_id,
      newBusinessId: firstBiz?.id,
    })

    // Calculate token expiration (long-lived tokens are valid for 60 days)
    const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)

    const connectionData = {
      campaign_id: campaignId,
      user_id: user.id,
      fb_user_id: fbUserId,
      long_lived_user_token: longToken,
      token_expires_at: tokenExpiresAt.toISOString(),
      selected_business_id: firstBiz?.id || null,
      selected_business_name: firstBiz?.name || null,
      selected_page_id: firstPage?.id || null,
      selected_page_name: firstPage?.name || null,
      selected_page_access_token: firstPage?.access_token || null,
      selected_ig_user_id: firstPage?.instagram_business_account?.id || null,
      selected_ig_username: firstPage?.instagram_business_account?.username || null,
      selected_ad_account_id: firstAd?.id || null,
      selected_ad_account_name: firstAd?.name || null,
      ad_account_payment_connected: false, // Reset payment connection on reconnect
    }

    console.log('[MetaCallback] Upserting connection to database:', {
      campaignId,
      userId: user.id,
      fbUserId,
      hasBusinessId: !!connectionData.selected_business_id,
      hasPageId: !!connectionData.selected_page_id,
      hasPageToken: !!connectionData.selected_page_access_token,
      hasAdAccountId: !!connectionData.selected_ad_account_id,
      hasIgUserId: !!connectionData.selected_ig_user_id,
      hasToken: !!longToken,
      tokenExpiresAt: tokenExpiresAt.toISOString(),
    })
    
    const { error: upsertError } = await supabaseServer
      .from('campaign_meta_connections')
      .upsert(connectionData, { onConflict: 'campaign_id' })

    if (upsertError) {
      console.error('[MetaCallback] Failed to upsert connection:', {
        error: upsertError,
        campaignId,
        userId: user.id,
        connectionData: {
          ...connectionData,
          long_lived_user_token: '[REDACTED]',
        },
      })
      return NextResponse.redirect(`${origin}/${campaignId}?meta=connection_failed&error=${encodeURIComponent(upsertError.message)}`)
    }

    console.log('[MetaCallback] Connection upserted successfully')

    const metaConnectData = {
      status: firstAd?.id ? 'connected' : 'selected_assets',
      businessId: firstBiz?.id || null,
      pageId: firstPage?.id || null,
      igUserId: firstPage?.instagram_business_account?.id || null,
      adAccountId: firstAd?.id || null,
      connectedAt: new Date().toISOString(),
    }

    console.log('[MetaCallback] Updating campaign state:', {
      campaignId,
      metaConnectData,
    })
    
    // Try update first; if no rows affected, insert a new state row.
    const { data: updatedRows, error: stateError } = await supabaseServer
      .from('campaign_states')
      .update({ meta_connect_data: metaConnectData })
      .eq('campaign_id', campaignId)
      .select('campaign_id')

    if (stateError || !updatedRows || updatedRows.length === 0) {
      if (!stateError && (!updatedRows || updatedRows.length === 0)) {
        console.warn('[MetaCallback] No campaign_state row updated; attempting insert')
      }
      const { error: insertError } = await supabaseServer
        .from('campaign_states')
        .insert({ campaign_id: campaignId, meta_connect_data: metaConnectData })

      if (insertError) {
        console.error('[MetaCallback] Failed to insert campaign state:', {
          error: insertError,
          campaignId,
          metaConnectData,
        })
      }
    }

    if (stateError) {
      console.error('[MetaCallback] Failed to update campaign state:', {
        error: stateError,
        campaignId,
        metaConnectData,
      })
      // Don't fail completely, connection is saved
    } else if (updatedRows && updatedRows.length > 0) {
      console.log('[MetaCallback] Campaign state updated successfully')
    }

    console.log('[MetaCallback] Successfully saved connection, redirecting to bridge:', `${origin}/meta/oauth/bridge?campaignId=${campaignId}&meta=connected`)

    return NextResponse.redirect(`${origin}/meta/oauth/bridge?campaignId=${campaignId}&meta=connected`)
  } catch (error) {
    console.error('[MetaCallback] Unhandled error:', error)
    const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').origin
    return NextResponse.redirect(`${origin}/?meta=error`)
  }
}


