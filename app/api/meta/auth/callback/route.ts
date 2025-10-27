/**
 * Feature: Meta Facebook Login Callback (Dual)
 * Purpose: Handle both standard user-token exchange and Business Login for Business (SUAT) code exchange.
 * References:
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 *  - Access tokens (long-lived): https://developers.facebook.com/docs/facebook-login/access-tokens/refreshing/
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

// Narrow types are not needed here since we no longer fetch assets

export async function POST(req: NextRequest) {
  try {
    // Read environment variables at runtime
    const FB_GRAPH_VERSION = process.env.FB_GRAPH_VERSION || process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
    const FB_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID
    const FB_APP_SECRET = process.env.FB_APP_SECRET

    const body = await req.json() as { 
      campaignId?: string
      accessToken?: string
      userID?: string
      code?: string
      redirectUri?: string
    }
    // Resolve campaign id either from body or short-lived cookie set before redirect
    const cookieStore = await cookies()
    const cookieCid = cookieStore.get('meta_cid')?.value || null
    const campaignId = body.campaignId || cookieCid
    const { accessToken, userID, code, redirectUri } = body

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })
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

    if (!FB_APP_ID || !FB_APP_SECRET) {
      return NextResponse.json({ error: 'Server missing FB app credentials' }, { status: 500 })
    }

    let persistedToken: string | null = null
    let expiresAt: string | null = null
    let tokenType: 'user' | 'system_user' = 'user'

    if (code && redirectUri) {
      // Business Login for Business: exchange authorization code for SUAT
      const tokenUrl = `https://graph.facebook.com/${FB_GRAPH_VERSION}/oauth/access_token` +
        `?client_id=${encodeURIComponent(FB_APP_ID)}` +
        `&client_secret=${encodeURIComponent(FB_APP_SECRET)}` +
        `&code=${encodeURIComponent(code)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}`
      const tRes = await fetch(tokenUrl)
      const tJson = await tRes.json() as { access_token?: string; expires_in?: number; error?: { message?: string } }
      if (!tRes.ok || !tJson.access_token) {
        return NextResponse.json({ error: tJson?.error?.message || 'Failed to exchange code for token' }, { status: 400 })
      }
      persistedToken = tJson.access_token
      expiresAt = tJson.expires_in ? new Date(Date.now() + tJson.expires_in * 1000).toISOString() : null
      tokenType = 'system_user'
      // Optionally persist minimal meta_connect_data to indicate token present
      await supabaseServer
        .from('campaign_states')
        .update({ meta_connect_data: { status: 'token_ready', connectedAt: new Date().toISOString() } })
        .eq('campaign_id', campaignId)
    } else {
      // Standard user token flow: exchange short-lived for long-lived token
      if (!accessToken || !userID) {
        return NextResponse.json({ error: 'accessToken and userID are required for user-token flow' }, { status: 400 })
      }
      const exchangeUrl = `https://graph.facebook.com/${FB_GRAPH_VERSION}/oauth/access_token` +
        `?grant_type=fb_exchange_token` +
        `&client_id=${encodeURIComponent(FB_APP_ID)}` +
        `&client_secret=${encodeURIComponent(FB_APP_SECRET)}` +
        `&fb_exchange_token=${encodeURIComponent(accessToken)}`
      const exchangeRes = await fetch(exchangeUrl)
      const exchangeJson = await exchangeRes.json() as { access_token?: string; expires_in?: number; error?: { message?: string } }
      if (!exchangeRes.ok || !exchangeJson.access_token) {
        return NextResponse.json({ error: exchangeJson?.error?.message || 'Failed to exchange long-lived token' }, { status: 400 })
      }
      persistedToken = exchangeJson.access_token
      expiresAt = exchangeJson.expires_in ? new Date(Date.now() + exchangeJson.expires_in * 1000).toISOString() : null
      tokenType = 'user'
    }

    // Persist token
    await supabaseServer
      .from('campaign_meta_connections')
      .upsert({
        campaign_id: campaignId,
        user_id: user.id,
        fb_user_id: userID || null,
        long_lived_user_token: persistedToken,
        token_expires_at: expiresAt,
      }, { onConflict: 'campaign_id' })

    // Attempt to auto-resolve assets (Business → Page(+IG) → Ad Account) and persist selection
    try {
      const gv = FB_GRAPH_VERSION
      const token = persistedToken as string

      // 1) Businesses
      const bizRes = await fetch(`https://graph.facebook.com/${gv}/me/businesses?fields=id,name&limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const bizJson: unknown = await bizRes.json()
      const businesses = (bizJson && typeof bizJson === 'object' && bizJson !== null && Array.isArray((bizJson as { data?: unknown[] }).data))
        ? (bizJson as { data: Array<{ id: string; name?: string }> }).data
        : []
      const firstBiz = businesses[0]

      // 2) Pages for business (owned_pages) with IG
      let firstPage: { id: string; name?: string; instagram_business_account?: { id?: string; username?: string } } | null = null
      if (firstBiz?.id) {
        const pagesRes = await fetch(`https://graph.facebook.com/${gv}/${encodeURIComponent(firstBiz.id)}/owned_pages?fields=id,name,instagram_business_account{id,username}&limit=500`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        const pagesJson: unknown = await pagesRes.json()
        const pages = (pagesJson && typeof pagesJson === 'object' && pagesJson !== null && Array.isArray((pagesJson as { data?: unknown[] }).data))
          ? (pagesJson as { data: Array<{ id: string; name?: string; instagram_business_account?: { id?: string; username?: string } }> }).data
          : []
        firstPage = pages[0] || null
      }

      // 3) Ad Accounts for business
      let firstAdAccount: { id: string; name?: string; account_status?: number } | null = null
      if (firstBiz?.id) {
        const actsRes = await fetch(`https://graph.facebook.com/${gv}/${encodeURIComponent(firstBiz.id)}/adaccounts?fields=id,name,account_status,currency&limit=500`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        const actsJson: unknown = await actsRes.json()
        const adAccounts = (actsJson && typeof actsJson === 'object' && actsJson !== null && Array.isArray((actsJson as { data?: unknown[] }).data))
          ? (actsJson as { data: Array<{ id: string; name?: string; account_status?: number }> }).data
          : []
        // Prefer active accounts (status 1), else fallback to first
        firstAdAccount = adAccounts.find(a => a && typeof a.account_status === 'number' && a.account_status === 1) || adAccounts[0] || null
      }

      if (firstBiz?.id && firstPage?.id) {
        await supabaseServer
          .from('campaign_meta_connections')
          .upsert({
            campaign_id: campaignId,
            user_id: user.id,
            selected_business_id: firstBiz.id,
            selected_business_name: firstBiz.name || null,
            selected_page_id: firstPage.id,
            selected_page_name: firstPage.name || null,
            selected_ig_user_id: firstPage.instagram_business_account?.id || null,
            selected_ig_username: firstPage.instagram_business_account?.username || null,
            selected_ad_account_id: firstAdAccount?.id || null,
            selected_ad_account_name: firstAdAccount?.name || null,
          }, { onConflict: 'campaign_id' })

        await supabaseServer
          .from('campaign_states')
          .update({
            meta_connect_data: {
              status: firstAdAccount?.id ? 'connected' : 'selected_assets',
              businessId: firstBiz.id,
              pageId: firstPage.id,
              igUserId: firstPage.instagram_business_account?.id || null,
              adAccountId: firstAdAccount?.id || null,
              connectedAt: new Date().toISOString(),
            }
          })
          .eq('campaign_id', campaignId)
      } else {
        // Fallback: mark token ready so UI can prompt or retry
        await supabaseServer
          .from('campaign_states')
          .update({ meta_connect_data: { status: 'token_ready', connectedAt: new Date().toISOString() } })
          .eq('campaign_id', campaignId)
      }
    } catch (e) {
      // Non-fatal: leave status as token_ready; UI can retry fetch/persist via other routes
      await supabaseServer
        .from('campaign_states')
        .update({ meta_connect_data: { status: 'token_ready', connectedAt: new Date().toISOString() } })
        .eq('campaign_id', campaignId)
    }

    return NextResponse.json({ ok: true, token_type: tokenType })
  } catch (error) {
    console.error('Meta auth callback error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Handle SDK redirect (GET) and exchange code via the POST route
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const origin = `${url.protocol}//${url.host}`
    const code = url.searchParams.get('code')
    if (!code) {
      return NextResponse.redirect(`${origin}/?meta=error`)
    }

    // Read campaign id from short-lived cookie
    const cookieStore = await cookies()
    const cid = cookieStore.get('meta_cid')?.value || null

    // Resolve environment
    const FB_GRAPH_VERSION = process.env.FB_GRAPH_VERSION || process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
    const FB_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID
    const FB_APP_SECRET = process.env.FB_APP_SECRET

    if (!FB_APP_ID || !FB_APP_SECRET) {
      return NextResponse.redirect(cid ? `${origin}/${encodeURIComponent(cid)}?meta=error` : `${origin}/?meta=error`)
    }

    // Authenticate user via cookies and verify campaign ownership
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !cid) {
      return NextResponse.redirect(`${origin}/?meta=error`)
    }

    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id, user_id')
      .eq('id', cid)
      .single()
    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.redirect(`${origin}/?meta=error`)
    }

    // 1) Exchange authorization code for token (System User token via Business Login)
    const tokenUrl = `https://graph.facebook.com/${FB_GRAPH_VERSION}/oauth/access_token` +
      `?client_id=${encodeURIComponent(FB_APP_ID)}` +
      `&client_secret=${encodeURIComponent(FB_APP_SECRET)}` +
      `&code=${encodeURIComponent(code)}` +
      `&redirect_uri=${encodeURIComponent(`${origin}/api/meta/auth/callback`)}`

    const tRes = await fetch(tokenUrl)
    const tJson = await tRes.json() as { access_token?: string; expires_in?: number; error?: { message?: string } }
    if (!tRes.ok || !tJson.access_token) {
      return NextResponse.redirect(`${origin}/${encodeURIComponent(cid)}?meta=error`)
    }

    const persistedToken = tJson.access_token
    const expiresAt = tJson.expires_in ? new Date(Date.now() + tJson.expires_in * 1000).toISOString() : null

    // 2) Persist token (upsert)
    await supabaseServer
      .from('campaign_meta_connections')
      .upsert({
        campaign_id: cid,
        user_id: user.id,
        fb_user_id: null,
        long_lived_user_token: persistedToken,
        token_expires_at: expiresAt,
      }, { onConflict: 'campaign_id' })

    // 3) Ensure campaign_states row exists
    const existing = await supabaseServer
      .from('campaign_states')
      .select('id')
      .eq('campaign_id', cid)
      .limit(1)
    if (!existing.data || existing.data.length === 0) {
      await supabaseServer
        .from('campaign_states')
        .insert({ campaign_id: cid } as { campaign_id: string })
    }

    // 4) Auto-resolve Business → Pages(+IG) → Ad Accounts and persist selections
    try {
      const gv = FB_GRAPH_VERSION
      const token = persistedToken

      const bizRes = await fetch(`https://graph.facebook.com/${gv}/me/businesses?fields=id,name&limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const bizJson: unknown = await bizRes.json()
      const businesses = (bizJson && typeof bizJson === 'object' && bizJson !== null && Array.isArray((bizJson as { data?: unknown[] }).data))
        ? (bizJson as { data: Array<{ id: string; name?: string }> }).data
        : []
      const firstBiz = businesses[0]

      let firstPage: { id: string; name?: string; instagram_business_account?: { id?: string; username?: string } } | null = null
      if (firstBiz?.id) {
        const pagesRes = await fetch(`https://graph.facebook.com/${gv}/${encodeURIComponent(firstBiz.id)}/owned_pages?fields=id,name,instagram_business_account{id,username}&limit=500`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        const pagesJson: unknown = await pagesRes.json()
        const pages = (pagesJson && typeof pagesJson === 'object' && pagesJson !== null && Array.isArray((pagesJson as { data?: unknown[] }).data))
          ? (pagesJson as { data: Array<{ id: string; name?: string; instagram_business_account?: { id?: string; username?: string } }> }).data
          : []
        firstPage = pages[0] || null
      }
      // Fallback: if no business-owned pages, try user managed pages
      if (!firstPage) {
        const mePagesRes = await fetch(`https://graph.facebook.com/${gv}/me/accounts?fields=id,name,instagram_business_account{id,username}&limit=500`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
        const mePagesJson: unknown = await mePagesRes.json()
        const mePages = (mePagesJson && typeof mePagesJson === 'object' && mePagesJson !== null && Array.isArray((mePagesJson as { data?: unknown[] }).data))
          ? (mePagesJson as { data: Array<{ id: string; name?: string; instagram_business_account?: { id?: string; username?: string } }> }).data
          : []
        firstPage = mePages[0] || null
      }

      let firstAdAccount: { id: string; name?: string; account_status?: number } | null = null
      if (firstBiz?.id) {
        const actsRes = await fetch(`https://graph.facebook.com/${gv}/${encodeURIComponent(firstBiz.id)}/adaccounts?fields=id,name,account_status,currency&limit=500`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        const actsJson: unknown = await actsRes.json()
        const adAccounts = (actsJson && typeof actsJson === 'object' && actsJson !== null && Array.isArray((actsJson as { data?: unknown[] }).data))
          ? (actsJson as { data: Array<{ id: string; name?: string; account_status?: number }> }).data
          : []
        firstAdAccount = adAccounts.find(a => a && typeof a.account_status === 'number' && a.account_status === 1) || adAccounts[0] || null
      }
      // Fallback: if no business ad accounts, try user adaccounts list
      if (!firstAdAccount) {
        const meActsRes = await fetch(`https://graph.facebook.com/${gv}/me/adaccounts?fields=id,name,account_status,currency&limit=500`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
        const meActsJson: unknown = await meActsRes.json()
        const meAdAccounts = (meActsJson && typeof meActsJson === 'object' && meActsJson !== null && Array.isArray((meActsJson as { data?: unknown[] }).data))
          ? (meActsJson as { data: Array<{ id: string; name?: string; account_status?: number }> }).data
          : []
        firstAdAccount = meAdAccounts.find(a => a && typeof a.account_status === 'number' && a.account_status === 1) || meAdAccounts[0] || null
      }

      if (firstPage?.id) {
        await supabaseServer
          .from('campaign_meta_connections')
          .upsert({
            campaign_id: cid,
            user_id: user.id,
            selected_business_id: firstBiz?.id || null,
            selected_business_name: firstBiz?.name || null,
            selected_page_id: firstPage.id,
            selected_page_name: firstPage.name || null,
            selected_ig_user_id: firstPage.instagram_business_account?.id || null,
            selected_ig_username: firstPage.instagram_business_account?.username || null,
            selected_ad_account_id: firstAdAccount?.id || null,
            selected_ad_account_name: firstAdAccount?.name || null,
          }, { onConflict: 'campaign_id' })

        await supabaseServer
          .from('campaign_states')
          .update({
            meta_connect_data: {
              status: firstAdAccount?.id ? 'connected' : 'selected_assets',
              businessId: firstBiz?.id || null,
              pageId: firstPage.id,
              igUserId: firstPage.instagram_business_account?.id || null,
              adAccountId: firstAdAccount?.id || null,
              connectedAt: new Date().toISOString(),
            }
          })
          .eq('campaign_id', cid)
      } else {
        await supabaseServer
          .from('campaign_states')
          .update({ meta_connect_data: { status: 'token_ready', connectedAt: new Date().toISOString() } })
          .eq('campaign_id', cid)
      }
    } catch {
      await supabaseServer
        .from('campaign_states')
        .update({ meta_connect_data: { status: 'token_ready', connectedAt: new Date().toISOString() } })
        .eq('campaign_id', cid)
    }

    // Serve small HTML to notify opener and close popup when possible; fallback to redirect
    const html = `<!doctype html><meta charset="utf-8"><title>Connected</title>
<script>
try { if (window.opener && window.opener !== window) { window.opener.postMessage({type:'meta-connected'}, '${origin}'); window.close(); } else { window.location = '${origin}/${encodeURIComponent(cid)}?meta=connected'; } } catch(e) { window.location = '${origin}/${encodeURIComponent(cid)}?meta=connected'; }
</script>
<body style="font-family:system-ui;padding:16px">Connected. You can close this window.</body>`
    const resp = new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
    resp.cookies.set('meta_cid', '', { path: '/', expires: new Date(0) })
    return resp
  } catch (error) {
    const url = new URL(req.url)
    const origin = `${url.protocol}//${url.host}`
    return NextResponse.redirect(`${origin}/?meta=error`)
  }
}

