/**
 * Meta Admin Verification API (Simplified - localStorage-based)
 * Purpose: Verify admin roles without persisting to database
 * Returns: Role data for client-side storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/meta/service-refactored';
import { metaLogger } from '@/lib/meta/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaignId, token, businessId, adAccountId } = body;

    metaLogger.info('AdminVerifySimple', 'Admin verification requested', {
      campaignId,
      hasToken: !!token,
      businessId,
      adAccountId,
    });

    if (!token) {
      return NextResponse.json(
        {
          error: 'User app token required for admin verification',
          requiresUserLogin: true,
        },
        { status: 400 }
      );
    }

    if (!businessId || !adAccountId) {
      return NextResponse.json(
        {
          error: 'Business ID and Ad Account ID required',
        },
        { status: 400 }
      );
    }

    // Verify admin access (returns data, doesn't persist)
    const result = await verifyAdminAccess({
      token,
      businessId,
      adAccountId,
    });

    metaLogger.info('AdminVerifySimple', 'Admin verification completed', {
      campaignId,
      adminConnected: result.adminConnected,
      businessRole: result.businessRole,
      adAccountRole: result.adAccountRole,
    });

    return NextResponse.json({
      adminConnected: result.adminConnected,
      businessRole: result.businessRole,
      adAccountRole: result.adAccountRole,
      fbUserId: result.fbUserId,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    metaLogger.error(
      'AdminVerifySimple',
      'Admin verification failed',
      error as Error
    );

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Admin verification failed',
      },
      { status: 500 }
    );
  }
}
