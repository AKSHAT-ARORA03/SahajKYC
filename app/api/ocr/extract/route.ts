import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Mock OCR extraction functions (in production, these would call real OCR APIs)
interface ExtractedField {
  value: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface DocumentExtraction {
  documentType: 'aadhaar' | 'pan' | 'passport' | 'license';
  fields: {
    [key: string]: ExtractedField;
  };
  processingTime: number;
  overallConfidence: number;
}

// Aadhaar card extraction patterns and validation
const extractAadhaarData = async (imageBuffer: Buffer): Promise<DocumentExtraction> => {
  // Simulate OCR processing time
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Mock extraction results based on common Aadhaar patterns
  const mockExtraction: DocumentExtraction = {
    documentType: 'aadhaar',
    fields: {
      fullName: {
        value: 'Rajesh Kumar Sharma',
        confidence: 0.96,
        boundingBox: { x: 120, y: 180, width: 200, height: 25 }
      },
      fatherName: {
        value: 'Mohan Lal Sharma',
        confidence: 0.94,
        boundingBox: { x: 120, y: 210, width: 180, height: 22 }
      },
      dateOfBirth: {
        value: '15/08/1985',
        confidence: 0.98,
        boundingBox: { x: 120, y: 240, width: 100, height: 20 }
      },
      gender: {
        value: 'MALE',
        confidence: 0.99,
        boundingBox: { x: 120, y: 270, width: 60, height: 20 }
      },
      aadhaarNumber: {
        value: '1234 5678 9012',
        confidence: 0.99,
        boundingBox: { x: 120, y: 300, width: 150, height: 25 }
      },
      address: {
        value: '304, Lotus Apartments, Sector 15, Gurgaon, Haryana - 122001',
        confidence: 0.92,
        boundingBox: { x: 120, y: 330, width: 300, height: 60 }
      }
    },
    processingTime: 2000,
    overallConfidence: 0.955
  };

  return mockExtraction;
};

// PAN card extraction patterns and validation
const extractPANData = async (imageBuffer: Buffer): Promise<DocumentExtraction> => {
  await new Promise(resolve => setTimeout(resolve, 1500));

  const mockExtraction: DocumentExtraction = {
    documentType: 'pan',
    fields: {
      fullName: {
        value: 'RAJESH KUMAR SHARMA',
        confidence: 0.97,
        boundingBox: { x: 80, y: 140, width: 220, height: 25 }
      },
      fatherName: {
        value: 'MOHAN LAL SHARMA',
        confidence: 0.95,
        boundingBox: { x: 80, y: 170, width: 200, height: 22 }
      },
      dateOfBirth: {
        value: '15/08/1985',
        confidence: 0.98,
        boundingBox: { x: 80, y: 200, width: 100, height: 20 }
      },
      panNumber: {
        value: 'ABCDE1234F',
        confidence: 0.99,
        boundingBox: { x: 80, y: 230, width: 120, height: 25 }
      }
    },
    processingTime: 1500,
    overallConfidence: 0.975
  };

  return mockExtraction;
};

// Passport extraction patterns and validation
const extractPassportData = async (imageBuffer: Buffer): Promise<DocumentExtraction> => {
  await new Promise(resolve => setTimeout(resolve, 2500));

  const mockExtraction: DocumentExtraction = {
    documentType: 'passport',
    fields: {
      fullName: {
        value: 'RAJESH KUMAR SHARMA',
        confidence: 0.96,
        boundingBox: { x: 100, y: 200, width: 250, height: 25 }
      },
      dateOfBirth: {
        value: '15AUG1985',
        confidence: 0.98,
        boundingBox: { x: 100, y: 280, width: 100, height: 20 }
      },
      placeOfBirth: {
        value: 'DELHI, INDIA',
        confidence: 0.94,
        boundingBox: { x: 100, y: 310, width: 120, height: 20 }
      },
      passportNumber: {
        value: 'A1234567',
        confidence: 0.99,
        boundingBox: { x: 100, y: 340, width: 100, height: 25 }
      },
      issueDate: {
        value: '15JAN2020',
        confidence: 0.97,
        boundingBox: { x: 100, y: 370, width: 100, height: 20 }
      },
      expiryDate: {
        value: '14JAN2030',
        confidence: 0.97,
        boundingBox: { x: 100, y: 400, width: 100, height: 20 }
      },
      nationality: {
        value: 'INDIAN',
        confidence: 0.99,
        boundingBox: { x: 100, y: 430, width: 80, height: 20 }
      }
    },
    processingTime: 2500,
    overallConfidence: 0.970
  };

  return mockExtraction;
};

// License extraction patterns and validation
const extractLicenseData = async (imageBuffer: Buffer): Promise<DocumentExtraction> => {
  await new Promise(resolve => setTimeout(resolve, 1800));

  const mockExtraction: DocumentExtraction = {
    documentType: 'license',
    fields: {
      fullName: {
        value: 'RAJESH KUMAR SHARMA',
        confidence: 0.95,
        boundingBox: { x: 90, y: 150, width: 200, height: 25 }
      },
      dateOfBirth: {
        value: '15-08-1985',
        confidence: 0.96,
        boundingBox: { x: 90, y: 180, width: 100, height: 20 }
      },
      address: {
        value: '304, LOTUS APARTMENTS, SECTOR 15, GURGAON, HARYANA - 122001',
        confidence: 0.90,
        boundingBox: { x: 90, y: 210, width: 280, height: 40 }
      },
      licenseNumber: {
        value: 'HR-0619850123456',
        confidence: 0.98,
        boundingBox: { x: 90, y: 260, width: 180, height: 25 }
      },
      issueDate: {
        value: '15-01-2020',
        confidence: 0.97,
        boundingBox: { x: 90, y: 290, width: 100, height: 20 }
      },
      validTill: {
        value: '14-01-2040',
        confidence: 0.97,
        boundingBox: { x: 90, y: 320, width: 100, height: 20 }
      },
      vehicleClass: {
        value: 'LMV',
        confidence: 0.99,
        boundingBox: { x: 90, y: 350, width: 60, height: 20 }
      },
      bloodGroup: {
        value: 'B+',
        confidence: 0.85,
        boundingBox: { x: 90, y: 380, width: 30, height: 20 }
      }
    },
    processingTime: 1800,
    overallConfidence: 0.945
  };

  return mockExtraction;
};

// Validate extracted data using government patterns
const validateExtractedData = (extraction: DocumentExtraction): boolean => {
  switch (extraction.documentType) {
    case 'aadhaar':
      const aadhaarNumber = extraction.fields.aadhaarNumber?.value.replace(/\s/g, '');
      return aadhaarNumber ? /^\d{12}$/.test(aadhaarNumber) : false;
      
    case 'pan':
      const panNumber = extraction.fields.panNumber?.value;
      return panNumber ? /^[A-Z]{5}\d{4}[A-Z]$/.test(panNumber) : false;
      
    case 'passport':
      const passportNumber = extraction.fields.passportNumber?.value;
      return passportNumber ? /^[A-Z]\d{7}$/.test(passportNumber) : false;
      
    case 'license':
      const licenseNumber = extraction.fields.licenseNumber?.value;
      return licenseNumber ? /^[A-Z]{2}-\d{13}$/.test(licenseNumber) : false;
      
    default:
      return false;
  }
};

// Enhanced data extraction with preprocessing
const preprocessImage = async (buffer: Buffer): Promise<Buffer> => {
  // In production, this would use image processing libraries like Sharp
  // to enhance image quality, correct rotation, remove noise, etc.
  
  // Mock preprocessing - return original buffer
  return buffer;
};

// Detect document type from image
const detectDocumentType = async (buffer: Buffer): Promise<'aadhaar' | 'pan' | 'passport' | 'license' | 'unknown'> => {
  // In production, this would use ML models to detect document type
  // based on visual patterns, logos, layouts, etc.
  
  // Mock detection based on common scenarios
  const random = Math.random();
  if (random < 0.4) return 'aadhaar';
  if (random < 0.7) return 'pan';
  if (random < 0.9) return 'passport';
  return 'license';
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('document') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload JPEG, PNG, or WebP images.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    console.log('🔍 OCR Extraction API called');
    console.log('📄 File info:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Preprocess image
    const preprocessedBuffer = await preprocessImage(buffer);

    // Detect document type
    const documentType = await detectDocumentType(preprocessedBuffer);
    
    if (documentType === 'unknown') {
      return NextResponse.json(
        { error: 'Could not detect document type. Please upload a clear image of Aadhaar, PAN, Passport, or License.' },
        { status: 400 }
      );
    }

    console.log('🎯 Detected document type:', documentType);

    // Extract data based on document type
    let extraction: DocumentExtraction;
    
    switch (documentType) {
      case 'aadhaar':
        extraction = await extractAadhaarData(preprocessedBuffer);
        break;
      case 'pan':
        extraction = await extractPANData(preprocessedBuffer);
        break;
      case 'passport':
        extraction = await extractPassportData(preprocessedBuffer);
        break;
      case 'license':
        extraction = await extractLicenseData(preprocessedBuffer);
        break;
      default:
        throw new Error('Unsupported document type');
    }

    // Validate extracted data
    const isValid = validateExtractedData(extraction);
    
    if (!isValid) {
      return NextResponse.json(
        { 
          error: 'Extracted data validation failed. Please upload a clearer image.',
          extraction: extraction,
          confidence: extraction.overallConfidence 
        },
        { status: 422 }
      );
    }

    console.log('✅ Data extraction completed successfully');
    console.log('📊 Overall confidence:', extraction.overallConfidence);

    // In production, save extraction results to database
    const extractionId = `extract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const response = {
      success: true,
      extractionId,
      documentType,
      extraction,
      timestamp: new Date().toISOString(),
      processingTime: extraction.processingTime,
      confidence: extraction.overallConfidence,
      fieldsExtracted: Object.keys(extraction.fields).length
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ OCR extraction error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to extract data from document. Please try again with a clearer image.',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'OCR Extraction API',
    supportedDocuments: ['aadhaar', 'pan', 'passport', 'license'],
    maxFileSize: '10MB',
    supportedFormats: ['JPEG', 'PNG', 'WebP'],
    features: [
      'Automatic document type detection',
      'High-accuracy OCR extraction',
      'Government format validation',
      'Confidence scoring',
      'Data preprocessing and enhancement'
    ]
  });
}
