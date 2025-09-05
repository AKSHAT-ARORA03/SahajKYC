import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { SetuDigiLockerService } from '@/services/setu-digilocker.service';
import AuditLog from '@/models/AuditLog';
import { z } from 'zod';

// Mock authentication for now - replace with Clerk auth
function mockAuth() {
  return { userId: 'mock-user-123' };
}

const fetchDocumentSchema = z.object({
  requestId: z.string(),
  docType: z.enum(['PANCR', 'DRVLC', 'VTRCD']),
  parameters: z.array(z.object({
    name: z.string(),
    value: z.string()
  })),
  format: z.enum(['pdf', 'xml']).default('pdf'),
  kycApplicationId: z.string().optional(),
});

/**
 * POST /api/setu-digilocker/documents
 * Fetch documents (PAN, DL, Voter ID) using Setu DigiLocker
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let auditData: any = {
    action: 'SETU_DOCUMENT_FETCHED',
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
    const { requestId, docType, parameters, format, kycApplicationId } = fetchDocumentSchema.parse(body);
    
    auditData.resourceId = requestId;
    auditData.metadata = { 
      requestId, 
      docType, 
      format, 
      kycApplicationId,
      parameterCount: parameters.length
    };
    
    const setuService = new SetuDigiLockerService();
    const result = await setuService.fetchDocument(requestId, docType, parameters, format);
    
    if (!result.success) {
      auditData.status = 'FAILURE';
      auditData.errorDetails = { 
        code: 'DOCUMENT_FETCH_ERROR', 
        message: result.error 
      };
      auditData.riskLevel = 'MEDIUM';
      
      await AuditLog.createLog({
        ...auditData,
        duration: Date.now() - startTime
      });
      
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    
    // Store successful fetch metadata
    auditData.metadata = {
      ...auditData.metadata,
      docType: result.docType,
      format: result.format,
      validUpto: result.validUpto,
      hasFileUrl: !!result.fileUrl
    };
    
    await AuditLog.createLog({
      ...auditData,
      duration: Date.now() - startTime
    });
    
    return NextResponse.json({
      success: true,
      fileUrl: result.fileUrl,
      validUpto: result.validUpto,
      docType: result.docType,
      format: result.format,
      requestId: requestId
    });
    
  } catch (error) {
    console.error('Document fetch error:', error);
    
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
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/setu-digilocker/documents/test-credentials
 * Get test credentials for sandbox testing
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = mockAuth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const setuService = new SetuDigiLockerService();
    const testCredentials = setuService.getTestCredentials();
    
    // Log test credentials access
    await AuditLog.createLog({
      userId,
      action: 'SETU_TEST_CREDENTIALS_ACCESSED',
      resource: 'SetuDigiLocker',
      status: 'SUCCESS',
      metadata: {
        timestamp: new Date().toISOString(),
        environment: 'sandbox'
      }
    });
    
    return NextResponse.json({
      success: true,
      testCredentials: testCredentials,
      environment: 'sandbox',
      note: 'These credentials are only for sandbox testing'
    });
    
  } catch (error) {
    console.error('Test credentials error:', error);
    return NextResponse.json(
      { error: 'Failed to get test credentials' },
      { status: 500 }
    );
  }
}
