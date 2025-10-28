/**
 * Feature: Meta Role/Ownership Guard
 * Purpose: Validate app-in-business, business admin role, and ad account assignment before enabling billing
 * References:
 *  - Ads Payments dialog: https://developers.facebook.com/ads/blog/post/v2/2018/10/02/ads-dialog-widget-payments/
 *  - Graph API Reference: https://developers.facebook.com/docs/graph-api
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

interface RoleCheckResult {
  ok: boolean
  selectedBusinessId?: string
  ownerBusinessId?: string | null
  appInBusiness?: boolean | null
  isBusinessAdmin?: boolean | null
  isAssignedToAdAccount?: boolean | null
  errors?: string[]
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })

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
      .select('long_lived_user_token, fb_user_id, selected_business_id, selected_ad_account_id')
      .eq('campaign_id', campaignId)
      .single()

    const token = (conn as { long_lived_user_token?: string } | null)?.long_lived_user_token || ''
    let selectedBusinessId = (conn as { selected_business_id?: string } | null)?.selected_business_id || null
    const adAccountId = (conn as { selected_ad_account_id?: string } | null)?.selected_ad_account_id || null
    let fbUserId = (conn as { fb_user_id?: string | null } | null)?.fb_user_id || null

    // Fallback: campaign_states.meta_connect_data.businessId
    if (!selectedBusinessId) {
      try {
        const { data: stateRow } = await supabaseServer
          .from('campaign_states')
          .select('meta_connect_data')
          .eq('campaign_id', campaignId)
          .single()
        const meta = (stateRow?.meta_connect_data ?? null) as Record<string, unknown> | null
        const bid = meta && typeof meta === 'object' && typeof (meta as { businessId?: unknown }).businessId === 'string'
          ? (meta as { businessId: string }).businessId
          : null
        if (bid) selectedBusinessId = bid
      } catch {
        // ignore
      }
    }

    if (!token || !selectedBusinessId || !adAccountId) {
      const missing: string[] = []
      if (!token) missing.push('token')
      if (!selectedBusinessId) missing.push('business')
      if (!adAccountId) missing.push('adAccount')
      const result: RoleCheckResult = { ok: false, selectedBusinessId: selectedBusinessId || undefined, ownerBusinessId: null, appInBusiness: null, isBusinessAdmin: null, isAssignedToAdAccount: null, errors: [`Missing: ${missing.join(', ')}`] }
      return NextResponse.json(result)
    }

    const gv = process.env.FB_GRAPH_VERSION || process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
    const appId = process.env.NEXT_PUBLIC_FB_APP_ID || ''

    const gfetch = async (path: string) => {
      const res = await fetch(`https://graph.facebook.com/${gv}/${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      return await res.json()
    }

    const errors: string[] = []

    // 0) Ensure fb user id
    if (!fbUserId) {
      try {
        const me = await gfetch('me?fields=id')
        if (me && typeof me === 'object' && me.id) fbUserId = String(me.id)
      } catch {
        // ignore
      }
    }

    // 1) Owner business of ad account
    let ownerBusinessId: string | null = null
    try {
      const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
      const j = await gfetch(`${encodeURIComponent(id)}?fields=business{id}`)
      ownerBusinessId = (j && typeof j === 'object' && j.business && typeof j.business.id === 'string') ? j.business.id : null
    } catch {
      errors.push('owner_business_fetch_failed')
    }

    // 2) App in selected business
    let appInBusiness: boolean | null = null
    try {
      const apps = await gfetch(`${encodeURIComponent(selectedBusinessId)}/apps?fields=id&limit=500`)
      const list = (apps && typeof apps === 'object' && Array.isArray((apps as { data?: unknown[] }).data)) ? (apps as { data: Array<{ id: string }> }).data : []
      appInBusiness = list.some(a => a && a.id === appId)
    } catch {
      appInBusiness = null
      errors.push('apps_list_failed')
    }

    // 3) User role in selected business (ADMIN required)
    let isBusinessAdmin: boolean | null = null
    try {
      const mb = await gfetch('me/businesses?fields=id,permitted_roles&limit=500')
      const list = (mb && typeof mb === 'object' && Array.isArray((mb as { data?: unknown[] }).data)) ? (mb as { data: Array<{ id: string; permitted_roles?: string[] }> }).data : []
      const match = list.find(b => b && b.id === selectedBusinessId)
      isBusinessAdmin = Boolean(match?.permitted_roles?.includes('ADMIN'))
    } catch {
      isBusinessAdmin = null
      errors.push('me_businesses_failed')
    }

    // 4) Ad account assignment for current user (MANAGE task)
    let isAssignedToAdAccount: boolean | null = null
    try {
      const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
      const au = await gfetch(`${encodeURIComponent(id)}/assigned_users?fields=id,tasks&limit=500`)
      const list = (au && typeof au === 'object' && Array.isArray((au as { data?: unknown[] }).data)) ? (au as { data: Array<{ id?: string; tasks?: string[] }> }).data : []
      const me = fbUserId ? list.find(u => u && typeof u.id === 'string' && u.id === fbUserId) : null
      isAssignedToAdAccount = Boolean(me && Array.isArray(me.tasks) && me.tasks.some(t => t && /MANAGE|ADMIN/i.test(t)))
    } catch {
      isAssignedToAdAccount = null
      errors.push('assigned_users_failed')
    }

    const ok = Boolean(
      selectedBusinessId && ownerBusinessId && selectedBusinessId === ownerBusinessId &&
      appInBusiness === true && isBusinessAdmin === true && isAssignedToAdAccount === true
    )

    const result: RoleCheckResult = {
      ok,
      selectedBusinessId: selectedBusinessId || undefined,
      ownerBusinessId,
      appInBusiness,
      isBusinessAdmin,
      isAssignedToAdAccount,
      errors: errors.length > 0 ? errors : undefined,
    }
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


