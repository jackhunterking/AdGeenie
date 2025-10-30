/**
 * Feature: Meta Ad Account Status Validation
 * Purpose: Pre-validate ad account status before attempting payment setup
 *          to diagnose and prevent FB.ui payment dialog internal errors.
 * References:
 *  - Facebook Graph API - Ad Account: https://developers.facebook.com/docs/marketing-api/reference/ad-account
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { getConnection, validateAdAccount } from '@/lib/meta/service'

// Graph version handled by service

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    const accountId = searchParams.get('accountId')

    if (!campaignId || !accountId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify campaign ownership
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
      return NextResponse.json({
        isActive: false,
        status: null,
        error: 'No access token found'
      })
    }

    // Fetch comprehensive account details from Facebook Graph API
    const result = await validateAdAccount({ token, actId: accountId })
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Account Status] Exception:', error)
    return NextResponse.json({
      isActive: false,
      status: null,
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

