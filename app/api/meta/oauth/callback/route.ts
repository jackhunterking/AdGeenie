/**
 * Feature: Meta OAuth Callback (No-Op)
 * Purpose: Satisfy Facebook Login settings with a valid redirect URI; popup flow doesn't require it but Meta does.
 * References:
 *  - Facebook Login (Web): https://developers.facebook.com/docs/facebook-login/web
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return new NextResponse('OK', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' }
  })
}


