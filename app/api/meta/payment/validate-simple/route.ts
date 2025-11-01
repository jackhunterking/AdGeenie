/**
 * Meta Payment Validation API (Simplified - localStorage-based)
 * Purpose: Validate ad account funding status without persisting
 * Returns: Validation result for client-side storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdAccount } from '@/lib/meta/service-refactored';
import { metaLogger } from '@/lib/meta/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaignId, token, adAccountId } = body;

    metaLogger.info('PaymentValidateSimple', 'Payment validation requested', {
      campaignId,
      hasToken: !!token,
      adAccountId,
    });

    if (!token) {
      return NextResponse.json(
        {
          error: 'Token required for payment validation',
        },
        { status: 400 }
      );
    }

    if (!adAccountId) {
      return NextResponse.json(
        {
          error: 'Ad Account ID required',
        },
        { status: 400 }
      );
    }

    // Validate ad account (checks funding status)
    const validation = await validateAdAccount({
      token,
      actId: adAccountId,
    });

    metaLogger.info('PaymentValidateSimple', 'Payment validation completed', {
      campaignId,
      adAccountId,
      hasFunding: validation.hasFunding,
      isActive: validation.isActive,
    });

    return NextResponse.json({
      connected: validation.hasFunding || false,
      isActive: validation.isActive,
      status: validation.status,
      disableReason: validation.disableReason,
      hasFunding: validation.hasFunding,
      hasBusiness: validation.hasBusiness,
      capabilities: validation.capabilities,
      currency: validation.currency,
      validatedAt: new Date().toISOString(),
    });
  } catch (error) {
    metaLogger.error(
      'PaymentValidateSimple',
      'Payment validation failed',
      error as Error
    );

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Payment validation failed',
        connected: false,
      },
      { status: 500 }
    );
  }
}
