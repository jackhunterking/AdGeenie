/**
 * Feature: Meta Diagnostics API
 * Purpose: Run preflight checks for Business ad account creation and asset access
 * References:
 *  - Graph API Debug Token: https://developers.facebook.com/docs/graph-api/securing-requests/#debug
 *  - Permissions: https://developers.facebook.com/docs/permissions/reference
 *  - Business Manager: https://developers.facebook.com/docs/marketing-api/businessmanager
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

function getGraphVersion(): string {
  return process.env.FB_GRAPH_VERSION || process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    const businessId = searchParams.get('businessId')
    const pageId = searchParams.get('pageId')

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    const gv = getGraphVersion()
    const FB_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID
    const FB_APP_SECRET = process.env.FB_APP_SECRET

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify user owns the campaign (defensive)
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .single()
    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Load long-lived user token
    const { data: conn } = await supabaseServer
      .from('campaign_meta_connections')
      .select('long_lived_user_token')
      .eq('campaign_id', campaignId)
      .single()

    const token = conn?.long_lived_user_token || null

    // 1) Token validity & scopes
    let tokenInfo: Record<string, unknown> | null = null
    let permissions: Array<{ permission: string; status: string }> = []
    if (token) {
      try {
        if (FB_APP_ID && FB_APP_SECRET) {
          const dbg = await fetch(`https://graph.facebook.com/${gv}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(FB_APP_ID)}|${encodeURIComponent(FB_APP_SECRET)}`)
          const dbgJson: unknown = await dbg.json()
          tokenInfo = dbgJson as Record<string, unknown>
        }
      } catch {
        // ignore debug failure
      }
      try {
        const permsRes = await fetch(`https://graph.facebook.com/${gv}/me/permissions`, {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store'
        })
        const permsJson: unknown = await permsRes.json()
        const data = (permsJson && typeof permsJson === 'object' && permsJson !== null && Array.isArray((permsJson as { data?: unknown[] }).data))
          ? (permsJson as { data: Array<{ permission: string; status: string }> }).data
          : []
        permissions = data
      } catch {
        // ignore
      }
    }

    // 2) App in Business
    let appInBusiness: boolean | null = null
    if (token && businessId && FB_APP_ID) {
      try {
        const res = await fetch(`https://graph.facebook.com/${gv}/${encodeURIComponent(businessId)}/apps?fields=id,name&limit=500`, {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store'
        })
        const j: unknown = await res.json()
        const apps = (j && typeof j === 'object' && j !== null && Array.isArray((j as { data?: unknown[] }).data))
          ? (j as { data: Array<{ id: string }> }).data
          : []
        appInBusiness = apps.some(a => a.id === FB_APP_ID)
      } catch {
        appInBusiness = null
      }
    }

    // 3) User’s role in Business
    let userRole: 'ADMIN' | 'OTHER' | null = null
    if (token && businessId) {
      try {
        const res = await fetch(`https://graph.facebook.com/${gv}/me/businesses?fields=id,name,permitted_roles&limit=500`, {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store'
        })
        const j: unknown = await res.json()
        const data = (j && typeof j === 'object' && j !== null && Array.isArray((j as { data?: unknown[] }).data))
          ? (j as { data: Array<{ id: string; permitted_roles?: string[] }> }).data
          : []
        const match = data.find(b => b.id === businessId)
        userRole = match?.permitted_roles?.includes('ADMIN') ? 'ADMIN' : 'OTHER'
      } catch {
        userRole = null
      }
    }

    // 4) Ad accounts visibility: business-owned + page-allowed counts (optional)
    let ownedCount = 0
    let pageAllowedCount = 0
    if (token && businessId) {
      try {
        const res = await fetch(`https://graph.facebook.com/${gv}/${encodeURIComponent(businessId)}/owned_ad_accounts?fields=id&limit=500`, {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store'
        })
        const j: unknown = await res.json()
        const data = (j && typeof j === 'object' && j !== null && Array.isArray((j as { data?: unknown[] }).data))
          ? (j as { data: Array<{ id: string }> }).data
          : []
        ownedCount = data.length
      } catch {
        // ignore
      }
    }
    if (token && pageId) {
      try {
        const res = await fetch(`https://graph.facebook.com/${gv}/${encodeURIComponent(pageId)}/adaccounts?fields=id&limit=500`, {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store'
        })
        const j: unknown = await res.json()
        const data = (j && typeof j === 'object' && j !== null && Array.isArray((j as { data?: unknown[] }).data))
          ? (j as { data: Array<{ id: string }> }).data
          : []
        pageAllowedCount = data.length
      } catch {
        // ignore
      }
    }

    // Build friendly recommendations
    const granted = new Set(permissions.filter(p => p.status === 'granted').map(p => p.permission))
    const required = ['business_management', 'ads_management', 'pages_show_list', 'pages_read_engagement', 'instagram_basic']
    const missing = required.filter(p => !granted.has(p))

    const recommendations: string[] = []
    if (!token) recommendations.push('Reconnect Facebook to create a long-lived token.')
    if (missing.length > 0) recommendations.push('Reconnect and grant required permissions.')
    if (appInBusiness === false) recommendations.push('Add the app to this Business in Business Settings → Apps.')
    if (userRole === 'OTHER') recommendations.push('Ask a Business Admin to grant you Admin access or create the ad account for you.')

    return NextResponse.json({
      ok: true,
      tokenPresent: Boolean(token),
      tokenInfo,
      permissions,
      missingPermissions: missing,
      appInBusiness,
      userRole,
      ownedCount,
      pageAllowedCount,
      recommendations,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


