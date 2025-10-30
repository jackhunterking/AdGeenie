/**
 * Feature: Meta selection summary
 * Purpose: Return selected Business/Page/IG/Ad Account and payment status
 *          for a campaign to hydrate the UI.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
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

    const { data: conn, error: connError } = await supabaseServer
      .from('campaign_meta_connections')
      .select('selected_business_id,selected_business_name,selected_page_id,selected_page_name,selected_ig_user_id,selected_ig_username,selected_ad_account_id,selected_ad_account_name,ad_account_payment_connected')
      .eq('campaign_id', campaignId)
      .maybeSingle()

    if (connError) {
      console.error('[MetaSelection] Error fetching connection:', {
        error: connError,
        campaignId,
        userId: user.id,
      })
    }

    const { data: state, error: stateError } = await supabaseServer
      .from('campaign_states')
      .select('meta_connect_data')
      .eq('campaign_id', campaignId)
      .maybeSingle()

    if (stateError) {
      console.error('[MetaSelection] Error fetching campaign state:', {
        error: stateError,
        campaignId,
        userId: user.id,
      })
    }

    const status = (state as { meta_connect_data?: { status?: string } } | null)?.meta_connect_data?.status || 'disconnected'

    console.log('[MetaSelection] Returning selection data:', {
      campaignId,
      hasConnection: !!conn,
      hasState: !!state,
      status,
      businessId: conn?.selected_business_id,
      pageId: conn?.selected_page_id,
      adAccountId: conn?.selected_ad_account_id,
      paymentConnected: conn?.ad_account_payment_connected,
    })

    return NextResponse.json({
      business: conn?.selected_business_id ? { id: conn.selected_business_id, name: conn.selected_business_name ?? undefined } : undefined,
      page: conn?.selected_page_id ? { id: conn.selected_page_id, name: conn.selected_page_name ?? undefined } : undefined,
      instagram: conn?.selected_ig_user_id ? { id: conn.selected_ig_user_id, username: conn.selected_ig_username ?? '' } : null,
      adAccount: conn?.selected_ad_account_id ? { id: conn.selected_ad_account_id, name: conn.selected_ad_account_name ?? undefined } : undefined,
      paymentConnected: Boolean(conn?.ad_account_payment_connected),
      status,
    })
  } catch (error) {
    console.error('[MetaSelection] Server error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      campaignId: new URL(req.url).searchParams.get('campaignId'),
    })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


