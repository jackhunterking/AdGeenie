/**
 * Feature: Upload Ad Image
 * Purpose: Upload image bytes or a URL to Marketing API to get image_hash
 * References:
 *  - Ad Image: https://developers.facebook.com/docs/marketing-api/reference/ad-image/
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { getGraphVersion } from '@/lib/meta/graph'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { campaignId?: string; url?: string }
    const { campaignId, url } = body
    if (!campaignId || !url) return NextResponse.json({ error: 'campaignId and url required' }, { status: 400 })

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: conn } = await supabaseServer
      .from('campaign_meta_connections')
      .select('selected_ad_account_id,long_lived_user_token')
      .eq('campaign_id', campaignId)
      .single()

    const adAccountId = (conn as { selected_ad_account_id?: string } | null)?.selected_ad_account_id
    const userToken = (conn as { long_lived_user_token?: string } | null)?.long_lived_user_token
    if (!adAccountId || !userToken) return NextResponse.json({ error: 'Missing ad account or user token' }, { status: 400 })

    const gv = getGraphVersion()
    const form = new URLSearchParams()
    form.set('access_token', userToken)
    form.set('url', url)

    const res = await fetch(`https://graph.facebook.com/${gv}/act_${encodeURIComponent(adAccountId)}/adimages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    })
    const json = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: json?.error?.message || 'Failed to upload image' }, { status: res.status })
    }
    // Response shape: { images: { filename: { hash, url, ... } } }
    const images = (json as { images?: Record<string, { hash?: string }> }).images
    const first = images ? Object.values(images)[0] : undefined
    const imageHash = first?.hash
    return NextResponse.json({ imageHash })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


