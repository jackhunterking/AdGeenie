/**
 * Feature: Meta Deauthorize Callback
 * Purpose: Receives deauthorization webhook from Meta and returns 200
 * References:
 *  - Deauthorization Callback: https://developers.facebook.com/docs/facebook-login/guides/permissions/revocation/
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    console.log('[META] Deauthorize payload:', body)
  } catch {}
  return NextResponse.json({ ok: true })
}

export async function GET() {
  // Some consoles ping this endpoint; respond 200
  return NextResponse.json({ ok: true })
}


