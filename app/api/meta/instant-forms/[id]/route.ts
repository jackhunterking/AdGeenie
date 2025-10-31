/**
 * Feature: Meta Instant Forms (Detail)
 * Purpose: Return detail for a specific Instant Form (questions subset + privacy url)
 * References:
 *  - Facebook Graph API leadgen_form: https://developers.facebook.com/docs/marketing-api/reference/leadgen-form/
 *  - Supabase (server): https://supabase.com/docs/reference/javascript/installing#server-environments
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { getConnectionWithToken, fetchPagesWithTokens, getGraphVersion } from '@/lib/meta/service'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: formId } = await params
    if (!formId) return NextResponse.json({ error: 'Form id required' }, { status: 400 })

    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id,user_id')
      .eq('id', campaignId)
      .maybeSingle()
    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const conn = await getConnectionWithToken({ campaignId })
    if (!conn || !conn.long_lived_user_token || !conn.selected_page_id) {
      return NextResponse.json({ error: 'Page not selected or token missing' }, { status: 400 })
    }

    const pages = await fetchPagesWithTokens({ token: conn.long_lived_user_token })
    const match = pages.find(p => p.id === conn.selected_page_id) || null
    const pageAccessToken = match?.access_token || ''
    if (!pageAccessToken) return NextResponse.json({ error: 'Missing page access token' }, { status: 400 })

    const gv = getGraphVersion()
    const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(formId)}?fields=id,name,questions{type},privacy_policy_url`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${pageAccessToken}` },
      cache: 'no-store',
    })

    const json: unknown = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = (json && typeof json === 'object' && json !== null && (json as { error?: { message?: string } }).error?.message)
        || 'Failed to load form detail'
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    // Narrow to shape used by UI
    const out = (json && typeof json === 'object' && json !== null) ? (json as {
      id?: string
      name?: string
      questions?: Array<{ type?: string }>
      privacy_policy_url?: string
    }) : {}

    return NextResponse.json({
      id: typeof out.id === 'string' ? out.id : '',
      name: typeof out.name === 'string' ? out.name : '',
      questions: Array.isArray(out.questions) ? out.questions : [],
      privacy_policy_url: typeof out.privacy_policy_url === 'string' ? out.privacy_policy_url : undefined,
    })
  } catch (error) {
    console.error('[MetaInstantFormDetail] GET error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


