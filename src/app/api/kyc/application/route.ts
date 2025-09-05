import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb.js';
import User from '../../../../models/User.js';
import KycApplication from '../../../../models/KycApplication.js';

// Mock auth for now - replace with actual Clerk auth when available
function auth() {
  return { userId: 'test-user-id' };
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkId } = auth();
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Find user
    const user = await User.findOne({ clerkId });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user can attempt KYC
    if (!user.canAttemptKYC()) {
      return NextResponse.json(
        { error: 'Maximum KYC attempts reached. Please wait 24 hours before trying again.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { method, personalInfo, compliance } = body;

    if (!method || !['DIGILOCKER', 'DOCUMENTS', 'HYBRID'].includes(method)) {
      return NextResponse.json(
        { error: 'Valid method required (DIGILOCKER, DOCUMENTS, or HYBRID)' },
        { status: 400 }
      );
    }

    // Create new KYC application
    const kycApplication = new KycApplication({
      userId: user._id,
      method,
      personalInfo: personalInfo || {},
      compliance: {
        ...compliance,
        consentGiven: true,
        consentTimestamp: new Date()
      },
      progress: {
        currentStep: 'PERSONAL_INFO',
        percentage: 10
      }
    });

    await kycApplication.save();

    // Update user's KYC attempts
    user.activity.kycAttempts += 1;
    user.kycApplications.push(kycApplication._id);
    await user.save();

    return NextResponse.json({
      success: true,
      application: {
        applicationId: kycApplication.applicationId,
        status: kycApplication.status,
        method: kycApplication.method,
        progress: kycApplication.progress,
        createdAt: kycApplication.createdAt
      }
    });

  } catch (error: any) {
    console.error('KYC application creation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create KYC application',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkId } = auth();
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Find user
    const user = await User.findOne({ clerkId });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (applicationId) {
      // Get specific application
      const application = await KycApplication.findOne({
        applicationId,
        userId: user._id
      }).populate('documents').populate('faceVerifications');

      if (!application) {
        return NextResponse.json(
          { error: 'KYC application not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        application
      });
    } else {
      // Get user's applications
      const query: any = { userId: user._id };
      if (status) {
        query.status = status;
      }

      const applications = await KycApplication.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .select('-personalInfo.aadhaarNumber -personalInfo.panNumber'); // Exclude sensitive data

      const total = await KycApplication.countDocuments(query);

      return NextResponse.json({
        success: true,
        applications,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });
    }

  } catch (error: any) {
    console.error('Get KYC application error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve KYC application data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkId } = auth();
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Find user
    const user = await User.findOne({ clerkId });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { applicationId, updates } = body;

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID required' },
        { status: 400 }
      );
    }

    // Find and update application
    const application = await KycApplication.findOne({
      applicationId,
      userId: user._id
    });

    if (!application) {
      return NextResponse.json(
        { error: 'KYC application not found' },
        { status: 404 }
      );
    }

    // Check if application can be updated
    if (['APPROVED', 'REJECTED', 'EXPIRED'].includes(application.status)) {
      return NextResponse.json(
        { error: 'Cannot update completed application' },
        { status: 400 }
      );
    }

    // Update allowed fields
    const allowedUpdates = ['personalInfo', 'progress'];
    for (const field of allowedUpdates) {
      if (updates[field]) {
        application[field] = { ...application[field], ...updates[field] };
      }
    }

    await application.save();

    return NextResponse.json({
      success: true,
      application: {
        applicationId: application.applicationId,
        status: application.status,
        progress: application.progress,
        updatedAt: application.updatedAt
      }
    });

  } catch (error: any) {
    console.error('KYC application update error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update KYC application',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
