import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import connectDB from '@/lib/database';
import User from '@/src/models/User';
import KycApplication from '@/src/models/KycApplication';
import { KycCache, RateLimiter } from '@/lib/redis';
import { generateId, handleApiError } from '@/lib/utils';
import DigiLockerService from '@/lib/digilocker';

/**
 * GET /api/kyc - Get user's KYC applications
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await RateLimiter.checkLimit(userId, 'kyc_get', 10, 300);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      );
    }

    // Check cache first
    const cached = await KycCache.getUserApplications(userId);
    if (cached) {
      return NextResponse.json({ success: true, applications: cached });
    }

    await connectDB();

    const user = await User.findByClerkId(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const applications = await KycApplication.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .populate('documents')
      .lean();

    // Cache the results
    await KycCache.setUserApplications(userId, applications, 300); // 5 minutes

    return NextResponse.json({
      success: true,
      applications
    });

  } catch (error) {
    console.error('KYC GET error:', error);
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, { status: errorResponse.status });
  }
}

/**
 * POST /api/kyc - Create new KYC application
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await RateLimiter.checkLimit(userId, 'kyc_create', 3, 3600);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 3 KYC applications per hour.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { method, priority, personalInfo, compliance } = body;

    // Validate required fields
    if (!method || !['DIGILOCKER', 'DOCUMENTS', 'HYBRID'].includes(method)) {
      return NextResponse.json(
        { error: 'Valid method is required (DIGILOCKER, DOCUMENTS, HYBRID)' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findByClerkId(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user can attempt KYC
    if (!user.canAttemptKYC()) {
      return NextResponse.json(
        { error: 'Maximum KYC attempts exceeded. Please try after 24 hours.' },
        { status: 429 }
      );
    }

    // Create new KYC application
    const applicationData = {
      userId: user._id,
      applicationId: generateId('KYC'),
      method,
      priority: priority || 'NORMAL',
      personalInfo: personalInfo || {},
      compliance: {
        ...compliance,
        consentGiven: true,
        consentTimestamp: new Date(),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      },
      progress: {
        percentage: 10,
        currentStep: 'PERSONAL_INFO',
        stepsCompleted: ['INITIATED']
      }
    };

    const application = new KycApplication(applicationData);
    await application.save();

    // Update user's KYC attempt count
    user.activity.kycAttempts += 1;
    await user.save();

    // Invalidate cache
    await KycCache.invalidate(`user_${userId}_kyc`);

    // If DigiLocker method, initiate DigiLocker flow
    let digilockerAuth = null;
    if (method === 'DIGILOCKER' || method === 'HYBRID') {
      try {
        const digilockerService = new DigiLockerService();
        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/kyc/digilocker/callback`;
        
        digilockerAuth = await digilockerService.initiateKYC(userId, redirectUri);
        
        // Update application with DigiLocker request ID
        application.metadata = {
          digilockerRequestId: digilockerAuth.requestId,
          digilockerState: digilockerAuth.state
        };
        await application.save();
      } catch (error) {
        console.warn('DigiLocker initiation failed:', error);
        // Continue without DigiLocker if it fails
      }
    }

    return NextResponse.json({
      success: true,
      application: {
        id: application._id,
        applicationId: application.applicationId,
        status: application.status,
        method: application.method,
        progress: application.progress,
        createdAt: application.createdAt
      },
      digilockerAuth
    }, { status: 201 });

  } catch (error) {
    console.error('KYC POST error:', error);
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, { status: errorResponse.status });
  }
}

/**
 * PUT /api/kyc - Update KYC application
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { applicationId, personalInfo, documents, faceVerifications, status } = body;

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findByClerkId(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const application = await KycApplication.findOne({
      applicationId,
      userId: user._id
    });

    if (!application) {
      return NextResponse.json({ error: 'KYC application not found' }, { status: 404 });
    }

    // Check if application can be updated
    if (['APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'].includes(application.status)) {
      return NextResponse.json(
        { error: 'Cannot update finalized application' },
        { status: 400 }
      );
    }

    // Update fields
    if (personalInfo) {
      application.personalInfo = { ...application.personalInfo, ...personalInfo };
    }

    if (documents && Array.isArray(documents)) {
      application.documents = [...application.documents, ...documents];
    }

    if (faceVerifications && Array.isArray(faceVerifications)) {
      application.faceVerifications = [...application.faceVerifications, ...faceVerifications];
    }

    if (status && ['DOCUMENTS_UPLOADED', 'FACE_VERIFICATION_PENDING', 'IN_PROGRESS'].includes(status)) {
      application.status = status;
    }

    // Update progress based on completed steps
    let newPercentage = application.progress.percentage;
    let currentStep = application.progress.currentStep;

    if (personalInfo && !application.progress.stepsCompleted.includes('PERSONAL_INFO')) {
      application.progress.stepsCompleted.push('PERSONAL_INFO');
      newPercentage = Math.max(newPercentage, 25);
      currentStep = 'DOCUMENT_UPLOAD';
    }

    if (documents && documents.length > 0 && !application.progress.stepsCompleted.includes('DOCUMENT_UPLOAD')) {
      application.progress.stepsCompleted.push('DOCUMENT_UPLOAD');
      newPercentage = Math.max(newPercentage, 50);
      currentStep = 'FACE_VERIFICATION';
    }

    if (faceVerifications && faceVerifications.length > 0 && !application.progress.stepsCompleted.includes('FACE_VERIFICATION')) {
      application.progress.stepsCompleted.push('FACE_VERIFICATION');
      newPercentage = Math.max(newPercentage, 75);
      currentStep = 'REVIEW';
    }

    application.progress.percentage = newPercentage;
    application.progress.currentStep = currentStep;

    await application.save();

    // Invalidate cache
    await KycCache.invalidate(applicationId);
    await KycCache.invalidate(`user_${userId}_kyc`);

    return NextResponse.json({
      success: true,
      application: {
        id: application._id,
        applicationId: application.applicationId,
        status: application.status,
        progress: application.progress,
        updatedAt: application.updatedAt
      }
    });

  } catch (error) {
    console.error('KYC PUT error:', error);
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, { status: errorResponse.status });
  }
}

/**
 * DELETE /api/kyc - Cancel KYC application
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findByClerkId(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const application = await KycApplication.findOne({
      applicationId,
      userId: user._id
    });

    if (!application) {
      return NextResponse.json({ error: 'KYC application not found' }, { status: 404 });
    }

    // Check if application can be cancelled
    if (['APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'].includes(application.status)) {
      return NextResponse.json(
        { error: 'Cannot cancel finalized application' },
        { status: 400 }
      );
    }

    // Update application status
    application.status = 'CANCELLED';
    application.progress.percentage = 0;
    application.progress.currentStep = 'CANCELLED';
    await application.save();

    // Clean up DigiLocker consent if applicable
    if (application.method === 'DIGILOCKER' && application.metadata?.digilockerUserToken) {
      try {
        const digilockerService = new DigiLockerService();
        await digilockerService.cleanup(
          application.metadata.digilockerUserToken,
          application.metadata.digilockerConsentId
        );
      } catch (error) {
        console.warn('DigiLocker cleanup failed:', error);
      }
    }

    // Invalidate cache
    await KycCache.invalidate(applicationId);
    await KycCache.invalidate(`user_${userId}_kyc`);

    return NextResponse.json({
      success: true,
      message: 'KYC application cancelled successfully'
    });

  } catch (error) {
    console.error('KYC DELETE error:', error);
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, { status: errorResponse.status });
  }
}
