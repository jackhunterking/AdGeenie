/**
 * Feature: Disconnect Meta
 * Purpose: Remove campaign Meta connection and clear campaign state.
 * References:
 *  - Supabase CRUD: https://supabase.com/docs/guides/database
 *  - Supabase server-side auth: https://supabase.com/docs/guides/auth/server-side/creating-a-client
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { campaignId?: string }
  const campaignId = body?.campaignId

  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })
  }

  const supa = await createServerClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Verify campaign ownership
  const { data: campaign, error: campaignErr } = await supabaseServer
    .from('campaigns')
    .select('id,user_id')
    .eq('id', campaignId)
    .maybeSingle()

  if (campaignErr || !campaign || campaign.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { error: delErr } = await supabaseServer
    .from('campaign_meta_connections')
    .delete()
    .eq('campaign_id', campaignId)

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  // Optional: Clear related campaign state
  await supabaseServer
    .from('campaign_states')
    .update({ meta_connect_data: null })
    .eq('campaign_id', campaignId)

  return NextResponse.json({ ok: true })
}
