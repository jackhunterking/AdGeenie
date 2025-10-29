/**
 * Feature: Meta Ad Account Status Validation
 * Purpose: Pre-validate ad account status before attempting payment setup
 *          to diagnose and prevent FB.ui payment dialog internal errors.
 * References:
 *  - Facebook Graph API - Ad Account: https://developers.facebook.com/docs/marketing-api/reference/ad-account
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

function getGraphVersion(): string {
  return process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    const accountId = searchParams.get('accountId')

    if (!campaignId || !accountId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify campaign ownership
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id,user_id')
      .eq('id', campaignId)
      .single()

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get token from campaign_meta_connections
    const { data: conn } = await supabaseServer
      .from('campaign_meta_connections')
      .select('long_lived_user_token')
      .eq('campaign_id', campaignId)
      .single()

    const token = (conn as { long_lived_user_token?: string } | null)?.long_lived_user_token

    if (!token) {
      return NextResponse.json({
        isActive: false,
        status: null,
        error: 'No access token found'
      })
    }

    // Fetch comprehensive account details from Facebook Graph API
    const gv = getGraphVersion()
    const actId = accountId.startsWith('act_') ? accountId : `act_${accountId}`
    const fields = 'account_status,disable_reason,capabilities,funding_source,funding_source_details,business,tos_accepted,owner,currency'
    const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(actId)}?fields=${fields}`

    console.log('[Account Status] Fetching:', url.replace(token, 'TOKEN'))

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[Account Status] Facebook API error:', res.status, errorText)
      return NextResponse.json({
        isActive: false,
        status: null,
        error: `Facebook API error: ${res.status}`,
        details: errorText
      })
    }

    const data: unknown = await res.json()
    const obj = (data && typeof data === 'object' && data !== null) ? (data as Record<string, unknown>) : {}

    console.log('[Account Status] Response:', JSON.stringify(obj, null, 2))

    return NextResponse.json({
      isActive: obj.account_status === 1,
      status: typeof obj.account_status === 'number' ? obj.account_status : null,
      disableReason: typeof obj.disable_reason === 'string' ? obj.disable_reason : undefined,
      hasFunding: !!obj.funding_source,
      hasToSAccepted: typeof obj.tos_accepted === 'object' ? obj.tos_accepted : undefined,
      hasBusiness: !!obj.business,
      hasOwner: !!obj.owner,
      capabilities: Array.isArray(obj.capabilities) ? obj.capabilities : [],
      currency: typeof obj.currency === 'string' ? obj.currency : undefined,
      rawData: obj, // Include for debugging
    })
  } catch (error) {
    console.error('[Account Status] Exception:', error)
    return NextResponse.json({
      isActive: false,
      status: null,
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

