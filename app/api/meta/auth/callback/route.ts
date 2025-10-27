/**
 * Feature: Meta Facebook Login Callback (Dual)
 * Purpose: Handle both standard user-token exchange and Business Login for Business (SUAT) code exchange.
 * References:
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 *  - Access tokens (long-lived): https://developers.facebook.com/docs/facebook-login/access-tokens/refreshing/
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

// Narrow types are not needed here since we no longer fetch assets

export async function POST(req: NextRequest) {
  try {
    // Read environment variables at runtime
    const FB_GRAPH_VERSION = process.env.FB_GRAPH_VERSION || process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
    const FB_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID
    const FB_APP_SECRET = process.env.FB_APP_SECRET

    const { campaignId, accessToken, userID, code, redirectUri } = await req.json() as { 
      campaignId?: string
      accessToken?: string
      userID?: string
      code?: string
      redirectUri?: string
    }

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

    // Mark minimal meta_connect_data to indicate token presence; asset selections occur later
    await supabaseServer
      .from('campaign_states')
      .update({
        meta_connect_data: {
          status: 'token_ready',
          connectedAt: new Date().toISOString(),
        }
      })
      .eq('campaign_id', campaignId)

    return NextResponse.json({ ok: true, token_type: tokenType })
  } catch (error) {
    console.error('Meta auth callback error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

