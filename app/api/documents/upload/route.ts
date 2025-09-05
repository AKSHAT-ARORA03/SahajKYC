import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Document upload API route with comprehensive error handling
export async function POST(request: NextRequest) {
  console.log('📄 Document upload API called');
  
  try {
    // Parse FormData from request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string;
    const userId = formData.get('userId') as string || 'anonymous';
    
    console.log('📋 Upload request details:', {
      fileName: file?.name,
      fileSize: file?.size,
      documentType,
      userId
    });

    // Validate required fields
    if (!file) {
      console.error('❌ No file provided in request');
      return NextResponse.json({
        success: false,
        error: 'No file provided',
        code: 'FILE_MISSING'
      }, { status: 400 });
    }

    if (!documentType) {
      console.error('❌ No document type provided');
      return NextResponse.json({
        success: false,
        error: 'Document type is required',
        code: 'DOCUMENT_TYPE_MISSING'
      }, { status: 400 });
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.error('❌ File too large:', file.size, 'bytes');
      return NextResponse.json({
        success: false,
        error: 'File too large. Maximum size is 5MB',
        code: 'FILE_TOO_LARGE',
        maxSize: '5MB',
        currentSize: `${Math.round(file.size / 1024 / 1024 * 100) / 100}MB`
      }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'application/pdf'
    ];

    if (!allowedTypes.includes(file.type)) {
      console.error('❌ Invalid file type:', file.type);
      return NextResponse.json({
        success: false,
        error: 'Invalid file type',
        code: 'INVALID_FILE_TYPE',
        allowedTypes: ['JPEG', 'PNG', 'WebP', 'PDF'],
        receivedType: file.type
      }, { status: 400 });
    }

    // Validate document type
    const validDocumentTypes = [
      // Frontend document types (from documents page)
      'aadhaar',
      'pan',
      'driving_license',
      'passport',
      'utility_bill',
      'bank_statement',
      // Detailed document types (from test page)
      'aadhaar_front',
      'aadhaar_back',
      'pan_card',
      'driving_license_front',
      'driving_license_back',
      'voter_id_front',
      'voter_id_back',
      'other'
    ];

    if (!validDocumentTypes.includes(documentType)) {
      console.error('❌ Invalid document type:', documentType);
      return NextResponse.json({
        success: false,
        error: 'Invalid document type',
        code: 'INVALID_DOCUMENT_TYPE',
        allowedTypes: validDocumentTypes
      }, { status: 400 });
    }

    // Create uploads directory structure
    const uploadsDir = join(process.cwd(), 'uploads');
    const userDir = join(uploadsDir, 'documents', userId);
    
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    
    if (!existsSync(userDir)) {
      await mkdir(userDir, { recursive: true });
    }

    // Generate unique file name
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${documentType}_${timestamp}.${fileExtension}`;
    const filePath = join(userDir, fileName);

    console.log('📁 Saving file to:', filePath);

    // Convert File to Buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);
    await writeFile(filePath, buffer);

    console.log('✅ File saved successfully');

    // Generate file ID and metadata
    const fileId = `doc_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Mock extracted data (in production, use OCR services)
    const extractedData = generateMockExtractedData(documentType, file.name);

    // Response data
    const responseData = {
      success: true,
      data: {
        fileId,
        fileName: file.name,
        savedFileName: fileName,
        fileSize: file.size,
        fileSizeFormatted: `${Math.round(file.size / 1024 / 1024 * 100) / 100}MB`,
        documentType,
        userId,
        uploadedAt: new Date().toISOString(),
        status: 'uploaded',
        filePath: `/uploads/documents/${userId}/${fileName}`,
        extractedData,
        processing: {
          status: 'completed',
          confidence: 0.95,
          processingTime: `${Math.random() * 2 + 1}s`
        }
      }
    };

    console.log('📤 Sending success response:', responseData);

    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    console.error('💥 Document upload error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error during file upload',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint to retrieve uploaded documents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'anonymous';
    const documentType = searchParams.get('documentType');

    console.log('📋 Getting documents for user:', userId);

    // Mock response - in production, query database
    const mockDocuments = [
      {
        fileId: 'doc_12345_abc',
        fileName: 'aadhaar_front.jpg',
        documentType: 'aadhaar_front',
        status: 'verified',
        uploadedAt: '2024-01-15T10:30:00Z',
        fileSize: 1024000
      }
    ];

    return NextResponse.json({
      success: true,
      documents: mockDocuments,
      count: mockDocuments.length
    });

  } catch (error: any) {
    console.error('❌ Get documents error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve documents',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// Helper function to generate mock extracted data
function generateMockExtractedData(documentType: string, fileName: string) {
  const baseData = {
    documentAnalysis: {
      quality: 'good',
      clarity: 'high',
      completeness: 'full'
    },
    processingMethod: 'OCR + AI Analysis',
    confidence: 0.95
  };

  switch (documentType) {
    case 'aadhaar_front':
      return {
        ...baseData,
        aadhaarNumber: 'XXXX XXXX 1234',
        name: 'JOHN DOE',
        dob: '01/01/1990',
        gender: 'M',
        fatherName: 'ROBERT DOE'
      };
    
    case 'aadhaar_back':
      return {
        ...baseData,
        address: '123 Main Street, City, State - 123456',
        pincode: '123456',
        qrCodeData: 'Verified'
      };

    case 'pan_card':
      return {
        ...baseData,
        panNumber: 'ABCDE1234F',
        name: 'JOHN DOE',
        fatherName: 'ROBERT DOE',
        dob: '01/01/1990'
      };

    case 'driving_license_front':
      return {
        ...baseData,
        licenseNumber: 'DL1234567890',
        name: 'John Doe',
        dob: '01/01/1990',
        issueDate: '01/01/2020',
        validTill: '01/01/2040'
      };

    default:
      return {
        ...baseData,
        documentType,
        fileName,
        status: 'processed'
      };
  }
}
