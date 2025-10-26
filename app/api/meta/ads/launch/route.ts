/**
 * Feature: Launch Orchestration
 * Purpose: Idempotently create Campaign → Ad Set → Creative → Ad and optionally publish
 * References:
 *  - Lead Ads guide: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/create/
 *  - Ad Image: https://developers.facebook.com/docs/marketing-api/reference/ad-image/
 *  - Ads: https://developers.facebook.com/docs/marketing-api/reference/adgroup/
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'

export async function POST(req: NextRequest) {
  try {
    const { campaignId, publish } = await req.json() as { campaignId?: string; publish?: boolean }
    if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Load state and meta connection
    const [{ data: stateRow }, { data: conn }] = await Promise.all([
      supabaseServer.from('campaign_states').select('ad_preview_data,ad_copy_data,goal_data,meta_connect_data,budget_data').eq('campaign_id', campaignId).single(),
      supabaseServer.from('campaign_meta_connections').select('selected_page_id,selected_ad_account_id,long_lived_user_token').eq('campaign_id', campaignId).single(),
    ])

    const pageId = (conn as { selected_page_id?: string } | null)?.selected_page_id
    const adAccountId = (conn as { selected_ad_account_id?: string } | null)?.selected_ad_account_id
    const userToken = (conn as { long_lived_user_token?: string } | null)?.long_lived_user_token
    if (!pageId || !adAccountId || !userToken) return NextResponse.json({ error: 'Missing Meta connection (page/ad account/token)' }, { status: 400 })

    // Extract selections
    const adPreview = (stateRow?.ad_preview_data as Record<string, unknown> | null) || {}
    const adCopy = (stateRow?.ad_copy_data as Record<string, unknown> | null) || {}
    const goalData = (stateRow?.goal_data as { id?: string } | null) || null
    const budgetData = (stateRow?.budget_data as { dailyBudget?: number } | null) || null
    const metaConnect = (stateRow?.meta_connect_data as Record<string, unknown> | null) || {}
    const delivery = (metaConnect?.delivery_data as Record<string, string> | undefined) || {}

    // Validate essentials
    const leadFormId = goalData?.id
    if (!leadFormId) return NextResponse.json({ error: 'No lead form selected' }, { status: 400 })
    const dailyBudgetDollars = Math.max(1, Number(budgetData?.dailyBudget ?? 1))
    const dailyBudgetCents = String(Math.round(dailyBudgetDollars * 100))

    // Get image URL from selected variation
    const imageVariations = (adPreview?.adContent as { imageVariations?: Array<{ url: string }> } | null)?.imageVariations || []
    const selectedIndex = (adPreview?.selectedImageIndex as number | null) ?? null
    const selectedUrl = selectedIndex != null ? imageVariations[selectedIndex]?.url : undefined
    if (!selectedUrl) return NextResponse.json({ error: 'No ad image selected' }, { status: 400 })

    // 1) Ensure image hash
    let imageHash = delivery.imageHash
    if (!imageHash) {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/meta/ads/images`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId, url: selectedUrl }) })
      const j = await res.json()
      if (!res.ok || !j.imageHash) return NextResponse.json({ error: j.error || 'Failed to upload image' }, { status: res.status || 500 })
      imageHash = j.imageHash as string
      await persistDelivery(campaignId, { imageHash })
    }

    // 2) Ensure campaign
    let campaignRefId = delivery.campaignId
    if (!campaignRefId) {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/meta/ads/campaigns`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId, name: 'Lead Ads Campaign' }) })
      const j = await res.json()
      if (!res.ok || !j.id) return NextResponse.json({ error: j.error || 'Failed to create campaign' }, { status: res.status || 500 })
      campaignRefId = j.id as string
    }

    // 3) Ensure ad set
    let adSetId = delivery.adSetId
    if (!adSetId) {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/meta/ads/adsets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId, campaignRefId, dailyBudget: dailyBudgetCents }) })
      const j = await res.json()
      if (!res.ok || !j.id) return NextResponse.json({ error: j.error || 'Failed to create ad set' }, { status: res.status || 500 })
      adSetId = j.id as string
    }

    // 4) Ensure creative
    let creativeId = delivery.creativeId
    if (!creativeId) {
      const message = (adCopy as { customCopyVariations?: Array<{ primaryText?: string; headline?: string; description?: string }>; selectedCopyIndex?: number }).customCopyVariations?.[(adCopy as { selectedCopyIndex?: number }).selectedCopyIndex ?? 0]?.primaryText || 'Learn more'
      const description = (adCopy as { customCopyVariations?: Array<{ description?: string }> }).customCopyVariations?.[(adCopy as { selectedCopyIndex?: number }).selectedCopyIndex ?? 0]?.description || ''
      const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/meta/ads/adcreatives`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId, pageId, leadFormId, imageHash, message, description }) })
      const j = await res.json()
      if (!res.ok || !j.id) return NextResponse.json({ error: j.error || 'Failed to create creative' }, { status: res.status || 500 })
      creativeId = j.id as string
    }

    // 5) Ensure ad
    let adId = delivery.adId
    if (!adId) {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/meta/ads/ads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId, adSetId, creativeId }) })
      const j = await res.json()
      if (!res.ok || !j.id) return NextResponse.json({ error: j.error || 'Failed to create ad' }, { status: res.status || 500 })
      adId = j.id as string
    }

    // 6) Publish if requested
    if (publish) {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/meta/ads/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId, targetType: 'ad', targetId: adId }) })
      const j = await res.json()
      if (!res.ok) return NextResponse.json({ error: j.error || 'Failed to publish' }, { status: res.status || 500 })
      await supabaseServer.from('campaigns').update({ status: 'active' }).eq('id', campaignId)
    }

    return NextResponse.json({ ok: true, delivery: { imageHash, campaignId: campaignRefId, adSetId, creativeId, adId } })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

async function persistDelivery(campaignId: string, patch: Record<string, string>) {
  const { data: stateRow } = await supabaseServer
    .from('campaign_states')
    .select('meta_connect_data')
    .eq('campaign_id', campaignId)
    .single()

  const current = (stateRow?.meta_connect_data as Record<string, unknown> | null) || {}
  const existingDelivery = (current.delivery_data as Record<string, unknown> | undefined) || {}
  const nextMeta = { ...current, delivery_data: { ...existingDelivery, ...patch } }
  await supabaseServer
    .from('campaign_states')
    .update({ meta_connect_data: nextMeta as Json })
    .eq('campaign_id', campaignId)
}


