/**
 * Feature: Payment Status for Meta Ad Account
 * Purpose: Check ad account funding source and persist flag on success.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { getConnection, validateAdAccount, markPaymentConnected } from '@/lib/meta/service'

// Graph version handled by service

export async function GET(req: NextRequest) {
  console.log('[PaymentStatus] Request started')
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    const adAccountId = searchParams.get('adAccountId')
    
    console.log('[PaymentStatus] Request params:', { campaignId, adAccountId })
    
    if (!campaignId || !adAccountId) {
      console.error('[PaymentStatus] Missing required parameters')
      return NextResponse.json({ error: 'campaignId and adAccountId required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id,user_id')
      .eq('id', campaignId)
      .single()
    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const conn = await getConnection({ campaignId })
    const token = (conn as { long_lived_user_token?: string } | null)?.long_lived_user_token || null
    if (!token) {
      console.warn('[PaymentStatus] No token found for campaign:', campaignId)
      return NextResponse.json({ connected: false })
    }

    const validation = await validateAdAccount({ token, actId: adAccountId })
    const connected = Boolean(validation.hasFunding)

    console.log('[PaymentStatus] Payment connection status:', { connected, campaignId, adAccountId })

    if (connected) {
      console.log('[PaymentStatus] Updating payment connected flag in database')
      try { await markPaymentConnected({ campaignId }) } catch (e) { console.error('[PaymentStatus] Failed to update payment flag:', e) }
    }

    return NextResponse.json({ connected })
  } catch (error) {
    console.error('[PaymentStatus] Server error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      campaignId: new URL(req.url).searchParams.get('campaignId'),
      adAccountId: new URL(req.url).searchParams.get('adAccountId'),
    })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


