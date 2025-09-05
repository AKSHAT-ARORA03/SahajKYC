import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database';
import { SetuDigiLockerService } from '@/src/services/setu-digilocker.service';
import AuditLog from '@/src/models/AuditLog';
import { z } from 'zod';

// Mock authentication for now - replace with Clerk auth
function mockAuth() {
  return { userId: 'mock-user-123' };
}

const fetchAadhaarSchema = z.object({
  requestId: z.string(),
  kycApplicationId: z.string().optional(),
});

/**
 * POST /api/setu-digilocker/aadhaar
 * Fetch Aadhaar data using Setu DigiLocker
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let auditData: any = {
    action: 'SETU_AADHAAR_FETCHED',
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
    const { requestId, kycApplicationId } = fetchAadhaarSchema.parse(body);
    
    auditData.resourceId = requestId;
    auditData.metadata = { requestId, kycApplicationId };
    
    const setuService = new SetuDigiLockerService();
    const result = await setuService.fetchAadhaarData(requestId);
    
    if (!result.success) {
      auditData.status = 'FAILURE';
      auditData.errorDetails = { code: 'AADHAAR_FETCH_ERROR', message: result.error };
      auditData.riskLevel = 'MEDIUM';
      
      await AuditLog.createLog({
        ...auditData,
        duration: Date.now() - startTime
      });
      
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    
    // Store successful fetch metadata (without sensitive data in audit)
    auditData.metadata = {
      ...auditData.metadata,
      extractedAt: result.extractedAt,
      hasData: !!result.aadhaarData,
      dataFields: result.aadhaarData ? Object.keys(result.aadhaarData) : []
    };
    
    await AuditLog.createLog({
      ...auditData,
      duration: Date.now() - startTime
    });
    
    // Note: In production, you would encrypt and securely store the Aadhaar data
    // For now, we're returning it directly for development purposes
    
    return NextResponse.json({
      success: true,
      data: result.aadhaarData,
      extractedAt: result.extractedAt,
      requestId: requestId
    });
    
  } catch (error) {
    console.error('Aadhaar fetch error:', error);
    
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
      { error: 'Failed to fetch Aadhaar data' },
      { status: 500 }
    );
  }
}
