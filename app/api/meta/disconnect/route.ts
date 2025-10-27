/**
 * Feature: Meta Disconnect API
 * Purpose: Clear stored Meta selections and token for a campaign.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'

export async function POST(req: NextRequest) {
  try {
    const { campaignId } = await req.json() as { campaignId?: string }
    if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Ensure ownership via campaigns table
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .single()
    if (!campaign || campaign.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Clear meta connection row
    await supabaseServer
      .from('campaign_meta_connections')
      .update({
        long_lived_user_token: null,
        token_expires_at: null,
        selected_business_id: null,
        selected_business_name: null,
        selected_page_id: null,
        selected_page_name: null,
        selected_page_access_token: null,
        selected_ig_user_id: null,
        selected_ig_username: null,
        selected_ad_account_id: null,
        selected_ad_account_name: null,
        ad_account_payment_connected: false,
      })
      .eq('campaign_id', campaignId)

    // Reset lightweight state for UI
    await supabaseServer
      .from('campaign_states')
      .update({ meta_connect_data: { status: 'disconnected' } as Json })
      .eq('campaign_id', campaignId)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


