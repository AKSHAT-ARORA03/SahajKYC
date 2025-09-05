import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { SetuDigiLockerService } from '@/services/setu-digilocker.service';
import AuditLog from '@/models/AuditLog';

// Mock authentication for now - replace with Clerk auth
function mockAuth() {
  return { userId: 'mock-user-123' };
}

/**
 * GET /api/setu-digilocker/callback
 * Handle Setu DigiLocker callback after user consent
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let auditData: any = {
    action: 'SETU_DIGILOCKER_CALLBACK_RECEIVED',
    resource: 'SetuDigiLocker',
    status: 'SUCCESS'
  };

  try {
    await connectMongoDB();
    
    const searchParams = request.nextUrl.searchParams;
    const query = Object.fromEntries(searchParams.entries());
    
    const setuService = new SetuDigiLockerService();
    const callbackResult = setuService.parseCallback(query);
    
    // Log the callback result
    auditData.metadata = {
      ...callbackResult,
      rawQuery: query,
      timestamp: new Date().toISOString(),
    };
    auditData.resourceId = callbackResult.requestId;
    
    if (!callbackResult.success) {
      auditData.status = 'FAILURE';
      auditData.errorDetails = {
        code: callbackResult.errorCode || 'CALLBACK_ERROR',
        message: callbackResult.error
      };
      auditData.riskLevel = 'MEDIUM';
      
      await AuditLog.createLog({
        ...auditData,
        duration: Date.now() - startTime
      });
      
      // Redirect to frontend with error
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const errorUrl = `${baseUrl}/kyc/error?reason=${encodeURIComponent(callbackResult.error)}`;
      return NextResponse.redirect(errorUrl);
    }
    
    await AuditLog.createLog({
      ...auditData,
      duration: Date.now() - startTime
    });
    
    // Redirect to frontend with success data
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/kyc/documents?requestId=${callbackResult.requestId}&scopes=${callbackResult.scopes.join(',')}`;
    return NextResponse.redirect(successUrl);
    
  } catch (error) {
    console.error('Setu DigiLocker callback error:', error);
    
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
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const errorUrl = `${baseUrl}/kyc/error?reason=callback_failed`;
    return NextResponse.redirect(errorUrl);
  }
}
