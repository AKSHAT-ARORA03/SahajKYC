import { NextRequest, NextResponse } from 'next/server';
import { requireKycAuth } from '../../../../src/middleware/auth.middleware.js';
import { withRateLimit } from '../../../../src/middleware/ratelimit.middleware.js';
import { withBodyValidation } from '../../../../src/middleware/validation.middleware.js';
import { withErrorHandling } from '../../../../src/middleware/error.middleware.js';
import { KycService } from '../../../../src/services/kyc.service.js';

/**
 * KYC Status and Management API Route
 * GET /api/kyc/status - Get KYC application status
 * PUT /api/kyc/status - Update KYC application status (admin only)
 */

async function handleGet(request: NextRequest & { user: any }) {
  const url = new URL(request.url);
  const applicationId = url.searchParams.get('applicationId');

  if (!applicationId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Application ID is required',
        code: 'MISSING_APPLICATION_ID'
      },
      { status: 400 }
    );
  }

  const result = await KycService.getKycStatus(request.user.id, applicationId);

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        code: result.code || 'STATUS_FETCH_FAILED'
      },
      { status: result.code === 'APPLICATION_NOT_FOUND' ? 404 : 400 }
    );
  }

  return NextResponse.json({
    success: true,
    application: result.application,
    timestamp: new Date().toISOString()
  });
}

async function handlePut(request: NextRequest & { user: any; validatedBody: any }) {
  // Admin-only route for updating KYC status
  if (request.user.role !== 'admin') {
    return NextResponse.json(
      {
        success: false,
        error: 'Admin access required',
        code: 'INSUFFICIENT_PERMISSIONS'
      },
      { status: 403 }
    );
  }

  const { applicationId, status, reason, reviewNotes } = request.validatedBody;

  // Update application status logic would go here
  // This is a placeholder implementation

  return NextResponse.json({
    success: true,
    message: 'KYC status updated successfully',
    applicationId,
    newStatus: status
  });
}

export const GET = withErrorHandling(
  requireKycAuth(
    withRateLimit(handleGet, { window: 60, max: 30 })
  )
);

export const PUT = withErrorHandling(
  requireKycAuth(
    withBodyValidation(
      withRateLimit(handlePut, { window: 60, max: 10 }),
      'kycStatusUpdate'
    )
  )
);
