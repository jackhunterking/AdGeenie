/**
 * Feature: Meta Facebook Login Callback (Slim)
 * Purpose: Exchange short-lived token for long-lived user token and persist. Do NOT auto-select assets.
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

    const { campaignId, accessToken, userID } = await req.json() as { 
      campaignId?: string
      accessToken?: string
      userID?: string
    }

    if (!campaignId || !accessToken || !userID) {
      return NextResponse.json({ 
        error: 'campaignId, accessToken, and userID are required' 
      }, { status: 400 })
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

    // Exchange short-lived token for long-lived token per Meta docs
    // If app credentials are present, perform exchange; otherwise, fail fast
    if (!FB_APP_ID || !FB_APP_SECRET) {
      return NextResponse.json({ error: 'Server missing FB app credentials' }, { status: 500 })
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

    const longLivedToken = exchangeJson.access_token
    const tokenExpiresAt = exchangeJson.expires_in ? new Date(Date.now() + exchangeJson.expires_in * 1000).toISOString() : null

    // Persist only token/user linkage to campaign_meta_connections
    await supabaseServer
      .from('campaign_meta_connections')
      .upsert({
        campaign_id: campaignId,
        user_id: user.id,
        fb_user_id: userID,
        long_lived_user_token: longLivedToken,
        token_expires_at: tokenExpiresAt,
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

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Meta auth callback error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

