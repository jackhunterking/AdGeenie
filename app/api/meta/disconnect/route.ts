/**
 * Feature: Meta Disconnect
 * Purpose: Clear Meta connection for a campaign, allowing users to reconnect with different accounts
 * References:
 *  - Supabase: https://supabase.com/docs/guides/api
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'
import { deleteConnection, setDisconnected } from '@/lib/meta/service'

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json()
    const campaignId = (body && typeof body === 'object' && body !== null && typeof (body as { campaignId?: string }).campaignId === 'string')
      ? (body as { campaignId: string }).campaignId
      : null

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns the campaign
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('id,user_id')
      .eq('id', campaignId)
      .single()

    if (!campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try { await deleteConnection({ campaignId }) } catch (e) {
      console.error('[MetaDisconnect] Error deleting connection:', e)
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    await setDisconnected({ campaignId })

    console.log('[MetaDisconnect] Successfully disconnected Meta account for campaign:', campaignId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[MetaDisconnect] Server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

