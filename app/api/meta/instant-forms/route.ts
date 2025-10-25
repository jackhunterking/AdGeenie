/**
 * Feature: Meta Instant Forms List API
 * Purpose: List leadgen forms for a selected Page; normalized response
 * References:
 *  - Graph API: https://developers.facebook.com/docs/marketing-api/reference/page/leadgen_forms/
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const campaignId = url.searchParams.get('campaignId')
    if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })

    // Reuse existing implementation under /api/meta/forms for token handling
    const res = await fetch(`${url.origin}/api/meta/forms?campaignId=${encodeURIComponent(campaignId)}`, { cache: 'no-store' })
    const json: unknown = await res.json()
    if (!res.ok) return NextResponse.json(json, { status: res.status })

    const forms = (json as { forms?: Array<{ id: string; name?: string; created_time?: string }> }).forms || []
    return NextResponse.json({ data: forms })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
