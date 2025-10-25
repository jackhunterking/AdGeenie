/**
 * Feature: Meta Facebook Login Callback
 * Purpose: Accept user access token, fetch business assets from Graph API, persist to campaign
 * References:
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 *  - Graph API Reference: https://developers.facebook.com/docs/graph-api/reference
 *  - Business Management API: https://developers.facebook.com/docs/marketing-api/businessmanager
 *  - Access tokens (long-lived user tokens): https://developers.facebook.com/docs/facebook-login/access-tokens/refreshing/
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

interface GraphAPIError {
  error?: {
    message?: string
    type?: string
    code?: number
  }
}

interface AdAccount {
  id: string
  name?: string
  account_id?: string
}

interface Page {
  id: string
  name?: string
  instagram_business_account?: {
    id: string
    username?: string
  }
}

interface Business {
  id: string
  name?: string
}

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

    // Fetch business assets using the (now) long-lived user token
    const baseURL = `https://graph.facebook.com/${FB_GRAPH_VERSION}`
    
    // 1. Fetch Ad Accounts
    const adAccountsRes = await fetch(
      `${baseURL}/me/adaccounts?fields=id,name,account_id&access_token=${encodeURIComponent(longLivedToken)}`
    )
    const adAccountsData = await adAccountsRes.json() as { data?: AdAccount[] } & GraphAPIError

    if (adAccountsData.error) {
      console.error('Error fetching ad accounts:', adAccountsData.error)
      return NextResponse.json({ 
        error: `Failed to fetch ad accounts: ${adAccountsData.error.message || 'Unknown error'}` 
      }, { status: 400 })
    }

    // 2. Fetch Pages (with Instagram account info)
    const pagesRes = await fetch(
      `${baseURL}/me/accounts?fields=id,name,instagram_business_account{id,username}&access_token=${encodeURIComponent(longLivedToken)}`
    )
    const pagesData = await pagesRes.json() as { data?: Page[] } & GraphAPIError

    if (pagesData.error) {
      console.error('Error fetching pages:', pagesData.error)
      return NextResponse.json({ 
        error: `Failed to fetch pages: ${pagesData.error.message || 'Unknown error'}` 
      }, { status: 400 })
    }

    // 3. Fetch Businesses (optional - user may not have business manager)
    const businessesRes = await fetch(
      `${baseURL}/me/businesses?fields=id,name&access_token=${encodeURIComponent(accessToken)}`
    )
    const businessesData = await businessesRes.json() as { data?: Business[] } & GraphAPIError

    // Don't fail if businesses fetch fails - user may not have business manager access
    const businesses = businessesData.data || []

    // Select first available assets (in production, you'd want to let user choose)
    const selectedAdAccount = adAccountsData.data?.[0]
    const selectedPage = pagesData.data?.[0]
    const selectedBusiness = businesses[0]
    const selectedInstagram = selectedPage?.instagram_business_account

    if (!selectedAdAccount) {
      return NextResponse.json({ 
        error: 'No ad accounts found. Please create an ad account in Facebook Business Manager first.' 
      }, { status: 400 })
    }

    if (!selectedPage) {
      return NextResponse.json({ 
        error: 'No Facebook pages found. Please create a Facebook page first.' 
      }, { status: 400 })
    }

    // Normalize summary
    const summary = {
      businessId: selectedBusiness?.id,
      page: selectedPage ? { 
        id: selectedPage.id, 
        name: selectedPage.name || 'Unnamed Page' 
      } : undefined,
      instagram: selectedInstagram ? { 
        id: selectedInstagram.id, 
        username: selectedInstagram.username || '' 
      } : null,
      adAccount: selectedAdAccount ? { 
        id: selectedAdAccount.id, 
        name: selectedAdAccount.name || selectedAdAccount.account_id || 'Unnamed Account' 
      } : undefined,
      pixel: null, // Pixels can be fetched separately if needed
    }

    // Persist to campaign_meta_connections table
    await supabaseServer
      .from('campaign_meta_connections')
      .upsert({
        campaign_id: campaignId,
        user_id: user.id,
        fb_user_id: userID,
        long_lived_user_token: longLivedToken,
        token_expires_at: tokenExpiresAt,
        selected_page_id: summary.page?.id || null,
        selected_page_name: summary.page?.name || null,
        selected_ig_user_id: summary.instagram?.id || null,
        selected_ig_username: summary.instagram?.username || null,
        selected_ad_account_id: summary.adAccount?.id || null,
        selected_ad_account_name: summary.adAccount?.name || null,
      }, { onConflict: 'campaign_id' })

    // Save campaign state meta_connect_data
    await supabaseServer
      .from('campaign_states')
      .update({
        meta_connect_data: {
          status: 'connected',
          ...summary,
          connectedAt: new Date().toISOString(),
        }
      })
      .eq('campaign_id', campaignId)

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('Meta auth callback error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

