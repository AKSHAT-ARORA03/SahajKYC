import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { SetuDigiLockerService } from '@/services/setu-digilocker.service';
import AuditLog from '@/models/AuditLog';
import { z } from 'zod';

// Mock authentication for now - replace with Clerk auth
function mockAuth() {
  return { userId: 'mock-user-123' };
}

const revokeAccessSchema = z.object({
  requestId: z.string(),
  reason: z.string().optional(),
});

/**
 * POST /api/setu-digilocker/revoke
 * Revoke Setu DigiLocker access token
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let auditData: any = {
    action: 'SETU_ACCESS_REVOKED',
    resource: 'SetuDigiLocker',
    status: 'SUCCESS'
  };

  try {
    await connectMongoDB();
    
    const { userId } = mockAuth();
    if (!userId) {
      auditData.status = 'FAILURE';
      auditData.errorDetails = { code: 'UNAUTHORIZED', message: 'No authentication provided' };
      
      await AuditLog.createLog(auditData);
      
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    auditData.userId = userId;

    const body = await request.json();
    const { requestId, reason } = revokeAccessSchema.parse(body);
    
    auditData.resourceId = requestId;
    auditData.metadata = { 
      requestId, 
      reason: reason || 'Manual revocation',
      timestamp: new Date().toISOString()
    };
    
    const setuService = new SetuDigiLockerService();
    const result = await setuService.revokeAccess(requestId);
    
    if (!result.success) {
      auditData.status = 'FAILURE';
      auditData.errorDetails = { 
        code: 'REVOKE_ERROR', 
        message: result.error 
      };
      auditData.riskLevel = 'MEDIUM';
      
      await AuditLog.createLog({
        ...auditData,
        duration: Date.now() - startTime
      });
      
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    
    // Store successful revocation
    auditData.metadata.message = result.message;
    
    await AuditLog.createLog({
      ...auditData,
      duration: Date.now() - startTime
    });
    
    return NextResponse.json({
      success: true,
      message: result.message,
      requestId: requestId,
      revokedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Access revocation error:', error);
    
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
      { error: 'Failed to revoke access' },
      { status: 500 }
    );
  }
}
