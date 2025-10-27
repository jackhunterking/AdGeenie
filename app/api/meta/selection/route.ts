/**
 * Feature: Meta Selection API
 * Purpose: Persist selected Page, IG user (optional), and Ad Account for a campaign; mark state complete
 * References:
 *  - Page → IG Business Account: https://developers.facebook.com/docs/instagram-api/reference/page#linked_ig_account
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { Json, TablesInsert } from '@/lib/supabase/database.types'

export async function POST(req: NextRequest) {
  try {
    const { campaignId, businessId, businessName, pageId, pageName, igUserId, igUsername, adAccountId, adAccountName } = await req.json() as {
      campaignId?: string; businessId?: string; businessName?: string; pageId?: string; pageName?: string; igUserId?: string | null; igUsername?: string | null; adAccountId?: string | null; adAccountName?: string | null;
    }
    if (!campaignId || !businessId || !pageId) {
      return NextResponse.json({ error: 'campaignId, businessId, pageId required' }, { status: 400 })
    }

    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify campaign ownership (defensive parity with other routes)
    const { data: campaign, error: campaignErr } = await supabaseServer
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .single()
    if (campaignErr || !campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Upsert selection into campaign_meta_connections
    let baseUpdate: TablesInsert<'campaign_meta_connections'> = {
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
      baseUpdate = {
        ...baseUpdate,
        selected_ad_account_id: adAccountId,
        selected_ad_account_name: adAccountName || null,
      }
    }

    const upsertRes = await supabaseServer
      .from('campaign_meta_connections')
      .upsert(baseUpdate, { onConflict: 'campaign_id' })

    if (upsertRes.error) {
      // Return structured error for client logs
      const message = upsertRes.error.message || 'Unknown error'
      console.error('[META] selection upsert error:', upsertRes.error)
      return NextResponse.json({ error: 'Failed to save selection', details: message }, { status: 500 })
    }

    // Ensure campaign_states row exists before update (some older campaigns may miss it)
    const existing = await supabaseServer
      .from('campaign_states')
      .select('id')
      .eq('campaign_id', campaignId)
      .limit(1)

    const hasRow = Array.isArray(existing.data) && existing.data.length > 0
    if (!hasRow) {
      const insertRes = await supabaseServer
        .from('campaign_states')
        .insert({ campaign_id: campaignId } as { campaign_id: string })
      if (insertRes.error) {
        console.error('[META] ensure campaign_states insert error:', insertRes.error)
        // continue; state is optional for connection, but log for diagnosis
      }
    }

    // Save minimal meta_connect_data state for UI completion flags
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

    const updateStateRes = await supabaseServer
      .from('campaign_states')
      .update({ meta_connect_data: metaConnectData as Json })
      .eq('campaign_id', campaignId)

    if (updateStateRes.error) {
      console.warn('[META] meta_connect_data update warning:', updateStateRes.error)
      // Non-fatal for selection persistence; client can still proceed
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[META] Selection exception', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


