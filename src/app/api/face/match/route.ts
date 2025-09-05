import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb.js';
import User from '../../../../models/User.js';
import FaceVerification from '../../../../models/FaceVerification.js';
import FaceRecognitionService from '../../../../services/face.service.js';

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

    // Parse request body
    const body = await request.json();
    const { 
      sourceImageUrl, 
      targetImageUrl, 
      threshold = 0.6,
      matchType = 'FACE_MATCH',
      kycApplicationId 
    } = body;

    if (!sourceImageUrl || !targetImageUrl) {
      return NextResponse.json(
        { error: 'Both source and target image URLs are required' },
        { status: 400 }
      );
    }

    // Initialize face recognition service
    const faceService = new FaceRecognitionService();

    // Perform face matching
    const result = await faceService.compareFaces(
      sourceImageUrl,
      targetImageUrl,
      user._id,
      kycApplicationId,
      {
        threshold,
        matchType,
        sourceCaptureMethod: 'camera',
        referenceSource: 'document'
      }
    );

    return NextResponse.json({
      success: true,
      match: result
    });

  } catch (error: any) {
    console.error('Face matching error:', error);
    return NextResponse.json(
      { 
        error: 'Face matching failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
