/**
 * Feature: Meta selection summary
 * Purpose: Return per-campaign summary of connected Meta assets from Supabase.
 * References:
 *  - Supabase (server-side client): https://supabase.com/docs/guides/auth/server-side/creating-a-client
 *  - Supabase (select / RLS): https://supabase.com/docs/guides/database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

type Summary = {
  business?: { id: string; name?: string }
  page?: { id: string; name?: string }
  instagram?: { id: string; username?: string } | null
  adAccount?: { id: string; name?: string }
  paymentConnected?: boolean
  status?: string
}

type ConnRow = {
  selected_business_id: string | null
  selected_business_name: string | null
  selected_page_id: string | null
  selected_page_name: string | null
  selected_ig_user_id: string | null
  selected_ig_username: string | null
  selected_ad_account_id: string | null
  selected_ad_account_name: string | null
  ad_account_payment_connected: boolean | null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get('campaignId')

  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })
  }

  const supa = await createServerClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data: conn, error } = await supabaseServer
    .from('campaign_meta_connections')
    .select([
      'selected_business_id',
      'selected_business_name',
      'selected_page_id',
      'selected_page_name',
      'selected_ig_user_id',
      'selected_ig_username',
      'selected_ad_account_id',
      'selected_ad_account_name',
      'ad_account_payment_connected',
    ].join(', '))
    .eq('campaign_id', campaignId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!conn) {
    return NextResponse.json({ status: 'disconnected' })
  }

  const row = conn as unknown as ConnRow

  const summary: Summary = {
    business: row.selected_business_id
      ? { id: row.selected_business_id, name: row.selected_business_name ?? undefined }
      : undefined,
    page: row.selected_page_id
      ? { id: row.selected_page_id, name: row.selected_page_name ?? undefined }
      : undefined,
    instagram: row.selected_ig_user_id
      ? { id: row.selected_ig_user_id, username: row.selected_ig_username ?? undefined }
      : null,
    adAccount: row.selected_ad_account_id
      ? { id: row.selected_ad_account_id, name: row.selected_ad_account_name ?? undefined }
      : undefined,
    paymentConnected: Boolean(row.ad_account_payment_connected),
    status: row.selected_ad_account_id ? 'connected' : 'selected_assets',
  }

  return NextResponse.json(summary)
}
