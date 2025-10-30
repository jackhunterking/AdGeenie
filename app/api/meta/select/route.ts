/**
 * Feature: Meta selection update
 * Purpose: Update selected Business/Page/Ad Account in SSOT and reflect status
 * References:
 *  - Supabase (Server client): https://supabase.com/docs/guides/auth/server-side/creating-a-client
 *  - RLS patterns: https://supabase.com/docs/guides/auth/row-level-security
 *  - Facebook Graph API: https://developers.facebook.com/docs/graph-api
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { setSelectedAssets } from '@/lib/meta/service'

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json()
    const campaignId = (body && typeof body === 'object' && body !== null && typeof (body as { campaignId?: string }).campaignId === 'string')
      ? (body as { campaignId: string }).campaignId
      : null
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    // Optional fields
    const businessId = (body && typeof body === 'object' && body !== null && 'businessId' in body) ? (body as { businessId?: string | null }).businessId ?? null : undefined
    const pageId = (body && typeof body === 'object' && body !== null && 'pageId' in body) ? (body as { pageId?: string | null }).pageId ?? null : undefined
    const adAccountId = (body && typeof body === 'object' && body !== null && 'adAccountId' in body) ? (body as { adAccountId?: string | null }).adAccountId ?? null : undefined

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify user owns the campaign
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id,user_id')
      .eq('id', campaignId)
      .single()
    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await setSelectedAssets({ campaignId, businessId, pageId, adAccountId })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[MetaSelect] Server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


