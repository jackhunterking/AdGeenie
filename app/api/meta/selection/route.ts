/**
 * Feature: Meta Selection API
 * Purpose: Persist selected Page, IG user (optional), and Ad Account for a campaign; mark state complete
 * References:
 *  - Page → IG Business Account: https://developers.facebook.com/docs/instagram-api/reference/page#linked_ig_account
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'

export async function POST(req: NextRequest) {
  try {
    const { campaignId, businessId, businessName, pageId, pageName, igUserId, igUsername, adAccountId, adAccountName } = await req.json() as {
      campaignId?: string; businessId?: string; businessName?: string; pageId?: string; pageName?: string; igUserId?: string | null; igUsername?: string | null; adAccountId?: string | null; adAccountName?: string | null;
    }
    if (!campaignId || !businessId || !pageId) {
      return NextResponse.json({ error: 'campaignId, businessId, pageId required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Upsert selection
    const baseUpdate: Record<string, unknown> = {
      campaign_id: campaignId,
      user_id: user.id,
      selected_business_id: businessId,
      selected_business_name: businessName || null,
      selected_page_id: pageId,
      selected_page_name: pageName || null,
      selected_ig_user_id: igUserId || null,
      selected_ig_username: igUsername || null,
    }
    if (adAccountId) {
      baseUpdate.selected_ad_account_id = adAccountId
      baseUpdate.selected_ad_account_name = adAccountName || null
    }

    const { error: upErr } = await supabaseServer
      .from('campaign_meta_connections')
      .upsert(baseUpdate, { onConflict: 'campaign_id' })

    if (upErr) {
      return NextResponse.json({ error: 'Failed to save selection', details: upErr.message }, { status: 500 })
    }

    // Optionally, save a minimal meta_connect_data state to campaign_states for UI completion flags
    const metaConnectData: Record<string, unknown> = adAccountId ? {
      status: 'connected',
      businessId,
      pageId,
      igUserId: igUserId || null,
      adAccountId,
    } : {
      status: 'selected_assets',
      businessId,
      pageId,
      igUserId: igUserId || null,
    }

    await supabaseServer
      .from('campaign_states')
      .update({ meta_connect_data: metaConnectData as Json })
      .eq('campaign_id', campaignId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[META] Selection error', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


