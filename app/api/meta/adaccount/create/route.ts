/**
 * Feature: Create Ad Account under Business
 * Purpose: Server route to create a new ad account for the selected business
 * References:
 *  - Business Manager: https://developers.facebook.com/docs/marketing-api/businessmanager
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { getGraphVersion } from '@/lib/meta/graph'

export async function POST(req: NextRequest) {
  try {
    const { campaignId, businessId, name, currency, timezone } = await req.json() as {
      campaignId?: string; businessId?: string; name?: string; currency?: string; timezone?: string;
    }
    if (!campaignId || !businessId || !name) {
      return NextResponse.json({ error: 'campaignId, businessId, name required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .single()
    if (!campaign || campaign.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: conn } = await supabaseServer
      .from('campaign_meta_connections')
      .select('long_lived_user_token')
      .eq('campaign_id', campaignId)
      .single()
    const token = conn?.long_lived_user_token
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    const gv = getGraphVersion()
    const body = new URLSearchParams()
    body.set('name', name)
    body.set('currency', currency || 'USD')
    if (timezone) body.set('time_zone_id', timezone)

    const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(businessId)}/adaccounts`
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    })
    const json: unknown = await res.json()
    if (!res.ok) {
      const message = json && typeof json === 'object' && json !== null && 'error' in json
        ? String((json as { error?: { message?: string } }).error?.message || 'Graph error')
        : 'Graph error'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    // Response typically includes id of the new ad account
    const adAccountId = (json as { id?: string }).id || ''
    return NextResponse.json({ adAccountId })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


