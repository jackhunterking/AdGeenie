/**
 * Feature: Payment Status for Meta Ad Account
 * Purpose: Check ad account funding source and persist flag on success.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

function getGraphVersion(): string {
  return process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
}

export async function GET(req: NextRequest) {
  console.log('[PaymentStatus] Request started')
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    const adAccountId = searchParams.get('adAccountId')
    
    console.log('[PaymentStatus] Request params:', { campaignId, adAccountId })
    
    if (!campaignId || !adAccountId) {
      console.error('[PaymentStatus] Missing required parameters')
      return NextResponse.json({ error: 'campaignId and adAccountId required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id,user_id')
      .eq('id', campaignId)
      .single()
    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: conn } = await supabaseServer
      .from('campaign_meta_connections')
      .select('long_lived_user_token')
      .eq('campaign_id', campaignId)
      .single()

    const token = (conn as { long_lived_user_token?: string } | null)?.long_lived_user_token
    if (!token) {
      console.warn('[PaymentStatus] No token found for campaign:', campaignId)
      return NextResponse.json({ connected: false })
    }

    const gv = getGraphVersion()
    const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
    const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(actId)}?fields=funding_source,funding_source_details{credit_card,display_string}`
    
    console.log('[PaymentStatus] Fetching funding info from Graph API:', { actId, version: gv })
    
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('[PaymentStatus] Graph API error:', {
        status: res.status,
        statusText: res.statusText,
        error: errorText,
        actId,
        campaignId,
      })
      return NextResponse.json({ connected: false, error: `API error: ${res.status}` })
    }
    
    const json: unknown = await res.json()
    const obj = (json && typeof json === 'object' && json !== null) ? (json as Record<string, unknown>) : {}

    console.log('[PaymentStatus] Graph API response:', {
      hasFundingSource: !!obj['funding_source'],
      hasFundingSourceDetails: !!obj['funding_source_details'],
      fullResponse: obj,
    })

    const fundingSource = obj['funding_source']
    const fundingSourceDetails = obj['funding_source_details'] as Record<string, unknown> | null | undefined
    const connected = Boolean(fundingSource || fundingSourceDetails)

    console.log('[PaymentStatus] Payment connection status:', { connected, campaignId, adAccountId })

    if (connected) {
      console.log('[PaymentStatus] Updating payment connected flag in database')
      const { error: updateError } = await supabaseServer
        .from('campaign_meta_connections')
        .update({ ad_account_payment_connected: true })
        .eq('campaign_id', campaignId)
      
      if (updateError) {
        console.error('[PaymentStatus] Failed to update payment flag:', updateError)
      } else {
        console.log('[PaymentStatus] Payment flag updated successfully')
      }
    }

    return NextResponse.json({ connected })
  } catch (error) {
    console.error('[PaymentStatus] Server error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      campaignId: new URL(req.url).searchParams.get('campaignId'),
      adAccountId: new URL(req.url).searchParams.get('adAccountId'),
    })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


