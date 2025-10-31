/**
 * Feature: Admin verification API
 * Purpose: Verify admin/payment permissions for connected Business & Ad Account
 * References:
 *  - Business assigned users: https://developers.facebook.com/docs/graph-api/reference/business/assigned_users/
 *  - Ad Account users/roles: https://developers.facebook.com/docs/marketing-api/reference/ad-account/
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { verifyAdminAccess } from '@/lib/meta/service'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json()) as unknown
    const campaignId = (body && typeof body === 'object' && body !== null ? (body as { campaignId?: string }).campaignId : undefined) || null
    if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })

    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id,user_id')
      .eq('id', campaignId)
      .single()
    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
      const result = await verifyAdminAccess(campaignId)
      
      return NextResponse.json({
        adminConnected: result.adminConnected,
        businessRole: result.businessRole,
        adAccountRole: result.adAccountRole,
        checkedAt: new Date().toISOString(),
      })
    } catch (verifyError) {
      const errorMessage = verifyError instanceof Error ? verifyError.message : 'Unknown error'
      console.error('[MetaAdminVerify] Verification failed:', errorMessage)
      
      // Return specific error for missing user token
      if (errorMessage.includes('User app token required')) {
        return NextResponse.json({ 
          error: errorMessage,
          requiresUserLogin: true 
        }, { status: 400 })
      }
      
      throw verifyError
    }
  } catch (error) {
    console.error('[MetaAdminVerify] Server error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


