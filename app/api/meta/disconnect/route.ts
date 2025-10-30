/**
 * Feature: Meta Disconnect
 * Purpose: Clear Meta connection for a campaign, allowing users to reconnect with different accounts
 * References:
 *  - Supabase: https://supabase.com/docs/guides/api
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseServer } from '@/lib/supabase/server'

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

    // Delete the connection record
    const { error: deleteError } = await supabaseServer
      .from('campaign_meta_connections')
      .delete()
      .eq('campaign_id', campaignId)

    if (deleteError) {
      console.error('[MetaDisconnect] Error deleting connection:', deleteError)
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    // Update campaign state to reflect disconnection
    const { error: stateError } = await supabaseServer
      .from('campaign_states')
      .update({
        meta_connect_data: {
          status: 'disconnected',
          disconnectedAt: new Date().toISOString(),
        }
      })
      .eq('campaign_id', campaignId)

    if (stateError) {
      console.error('[MetaDisconnect] Error updating campaign state:', stateError)
      // Don't fail the request since the connection was already deleted
    }

    console.log('[MetaDisconnect] Successfully disconnected Meta account for campaign:', campaignId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[MetaDisconnect] Server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

