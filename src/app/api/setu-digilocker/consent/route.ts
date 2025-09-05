import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { SetuDigiLockerService } from '@/services/setu-digilocker.service';
import AuditLog from '@/models/AuditLog';
import { z } from 'zod';

// Mock authentication for now - replace with Clerk auth
function mockAuth() {
  return { userId: 'mock-user-123' };
}

const createConsentSchema = z.object({
  docType: z.string().optional(),
  sessionId: z.string().optional(),
  kycApplicationId: z.string().optional(),
});

/**
 * POST /api/setu-digilocker/consent
 * Create Setu DigiLocker consent request
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let auditData: any = {
    action: 'SETU_DIGILOCKER_REQUEST_CREATED',
    resource: 'SetuDigiLocker',
    status: 'SUCCESS'
  };

  try {
    await connectMongoDB();
    
    // Get user authentication (mock for now)
    const { userId } = mockAuth();
    if (!userId) {
      auditData.status = 'FAILURE';
      auditData.errorDetails = { code: 'UNAUTHORIZED', message: 'No authentication provided' };
      
      await AuditLog.createLog(auditData);
      
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    auditData.userId = userId;

    // Parse and validate request body
    const body = await request.json();
    const { docType, sessionId, kycApplicationId } = createConsentSchema.parse(body);
    
    // Generate redirect URL with session tracking
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUrl = `${baseUrl}/api/setu-digilocker/callback${sessionId ? `?sessionId=${sessionId}` : ''}`;
    
    // Create Setu DigiLocker service instance
    const setuService = new SetuDigiLockerService();
    
    // Validate Setu configuration
    const configValidation = setuService.validateConfig();
    if (!configValidation.valid) {
      auditData.status = 'FAILURE';
      auditData.errorDetails = { code: 'CONFIG_ERROR', message: configValidation.error };
      auditData.riskLevel = 'HIGH';
      
      await AuditLog.createLog(auditData);
      
      return NextResponse.json({ 
        error: 'Setu DigiLocker configuration error',
        details: configValidation.error
      }, { status: 500 });
    }
    
    // Create DigiLocker request
    const result = await setuService.createDigiLockerRequest(redirectUrl, docType);
    
    if (!result.success) {
      auditData.status = 'FAILURE';
      auditData.errorDetails = { code: 'SETU_API_ERROR', message: result.error };
      auditData.riskLevel = 'MEDIUM';
      
      await AuditLog.createLog({
        ...auditData,
        duration: Date.now() - startTime
      });
      
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    
    // Store successful request metadata in audit log
    auditData.metadata = {
      requestId: result.requestId,
      sessionId,
      kycApplicationId,
      docType,
      validUpto: result.validUpto,
      redirectUrl,
      timestamp: new Date().toISOString(),
    };
    auditData.resourceId = result.requestId;
    
    await AuditLog.createLog({
      ...auditData,
      duration: Date.now() - startTime
    });
    
    return NextResponse.json({
      success: true,
      requestId: result.requestId,
      consentUrl: result.digiLockerUrl,
      validUpto: result.validUpto,
      sessionId: sessionId
    });
    
  } catch (error) {
    console.error('Setu DigiLocker consent error:', error);
    
    auditData.status = 'FAILURE';
    auditData.errorDetails = {
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    };
    auditData.riskLevel = 'HIGH';
    
    await AuditLog.createLog({
      ...auditData,
      duration: Date.now() - startTime
    });
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to initiate consent flow' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/setu-digilocker/consent/[requestId]
 * Check status of a consent request
 */
export async function GET(request: NextRequest) {
  try {
    await connectMongoDB();
    
    const { userId } = mockAuth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const requestId = url.pathname.split('/').pop();
    
    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const setuService = new SetuDigiLockerService();
    const result = await setuService.checkRequestStatus(requestId);
    
    // Log status check
    await AuditLog.createLog({
      userId,
      action: 'SETU_DIGILOCKER_STATUS_CHECKED',
      resource: 'SetuDigiLocker',
      resourceId: requestId,
      status: result.success ? 'SUCCESS' : 'FAILURE',
      metadata: {
        requestId,
        status: result.status,
        timestamp: new Date().toISOString()
      }
    });
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      status: result.status,
      requestId: result.requestId
    });
    
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check request status' },
      { status: 500 }
    );
  }
}
