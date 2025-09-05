import { z } from 'zod';
import type { DocumentType, KYCMethod } from '@/types/kyc';

// User validation schemas
export const userPreferencesSchema = z.object({
  fontSize: z.enum(['normal', 'large', 'xl']).default('normal'),
  highContrast: z.boolean().default(false),
  voiceInstructions: z.boolean().default(false),
  notifications: z.boolean().default(true)
});

export const userSchema = z.object({
  id: z.string().optional(),
  phone: z.string()
    .regex(/^[6-9]\d{9}$/, 'Invalid mobile number')
    .optional(),
  email: z.string()
    .email('Invalid email address')
    .optional(),
  language: z.enum(['hi', 'en', 'bn', 'ta']).default('hi'),
  isFirstTime: z.boolean().default(true),
  preferences: userPreferencesSchema
});

// Document validation schemas
export const documentTypeSchema = z.enum([
  'aadhaar', 
  'pan', 
  'driving_license', 
  'voter_id', 
  'passport'
]);

export const extractedDocumentDataSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  fatherName: z.string().min(2, 'Father name must be at least 2 characters').optional(),
  dateOfBirth: z.string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Date must be in DD/MM/YYYY format')
    .optional(),
  address: z.string().min(10, 'Address must be at least 10 characters').optional(),
  idNumber: z.string().min(4, 'ID number is too short').optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  confidence: z.number().min(0).max(1)
});

export const documentSchema = z.object({
  id: z.string(),
  type: documentTypeSchema,
  frontImage: z.string().optional(),
  backImage: z.string().optional(),
  extractedData: extractedDocumentDataSchema.optional(),
  validationResult: z.object({
    isValid: z.boolean(),
    isAuthentic: z.boolean(),
    qualityScore: z.number().min(0).max(1),
    issues: z.array(z.object({
      type: z.enum(['blur', 'glare', 'missing_corners', 'low_resolution', 'suspicious_patterns']),
      severity: z.enum(['low', 'medium', 'high']),
      message: z.string()
    })),
    confidence: z.number().min(0).max(1)
  }).optional(),
  uploadStatus: z.enum(['pending', 'uploading', 'uploaded', 'failed']),
  createdAt: z.date()
});

// Aadhaar specific validation
export const aadhaarSchema = z.object({
  number: z.string()
    .length(12, 'Aadhaar number must be 12 digits')
    .regex(/^\d{12}$/, 'Aadhaar number must contain only digits')
    .refine((val) => {
      // Aadhaar number validation using Verhoeff algorithm
      return validateAadhaarChecksum(val);
    }, 'Invalid Aadhaar number'),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  dateOfBirth: z.string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Date must be in DD/MM/YYYY format')
    .refine((val) => {
      const date = new Date(val.split('/').reverse().join('-'));
      const now = new Date();
      const age = now.getFullYear() - date.getFullYear();
      return age >= 18 && age <= 100;
    }, 'Age must be between 18 and 100 years'),
  gender: z.enum(['M', 'F', 'O']),
  address: z.string().min(10, 'Address must be at least 10 characters')
});

// PAN specific validation
export const panSchema = z.object({
  number: z.string()
    .length(10, 'PAN number must be 10 characters')
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format (e.g., ABCDE1234F)'),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  fatherName: z.string()
    .min(2, 'Father name must be at least 2 characters')
    .max(50, 'Father name must be less than 50 characters'),
  dateOfBirth: z.string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Date must be in DD/MM/YYYY format')
});

// Face verification schemas
export const livenessCheckSchema = z.object({
  isLive: z.boolean(),
  confidence: z.number().min(0).max(1),
  challenges: z.array(z.object({
    type: z.enum(['blink', 'smile', 'turn_head', 'nod']),
    completed: z.boolean(),
    confidence: z.number().min(0).max(1)
  }))
});

export const faceVerificationSchema = z.object({
  id: z.string(),
  faceImage: z.string().min(100, 'Face image data is required'),
  livenessScore: z.number().min(0).max(1),
  matchScore: z.number().min(0).max(1).optional(),
  isLive: z.boolean(),
  isMatch: z.boolean(),
  confidence: z.number().min(0).max(1),
  attempts: z.number().min(1).max(3),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  createdAt: z.date()
});

// KYC submission schema
export const kycSubmissionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  method: z.enum(['digilocker', 'documents']),
  documents: z.array(documentSchema).min(1, 'At least one document is required'),
  faceVerification: faceVerificationSchema,
  digilockerSession: z.object({
    sessionId: z.string(),
    accessToken: z.string().optional(),
    consentToken: z.string().optional(),
    status: z.enum(['initiated', 'consent_given', 'documents_fetched', 'completed', 'failed']),
    redirectUrl: z.string().url().optional(),
    documents: z.array(z.object({
      docType: z.string(),
      docId: z.string(),
      issuer: z.string(),
      issueDate: z.string(),
      name: z.string(),
      uri: z.string().url(),
      downloadUrl: z.string().url().optional()
    })),
    expiresAt: z.date()
  }).optional(),
  metadata: z.object({
    userAgent: z.string(),
    ipAddress: z.string().optional(),
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number(),
      timestamp: z.date(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional()
    }).optional(),
    deviceInfo: z.object({
      platform: z.string(),
      userAgent: z.string(),
      screenResolution: z.string(),
      timezone: z.string(),
      language: z.string()
    })
  })
});

// Form validation schemas for UI components
export const phoneVerificationSchema = z.object({
  phone: z.string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  otp: z.string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits')
    .optional()
});

export const emailVerificationSchema = z.object({
  email: z.string()
    .email('Enter a valid email address'),
  otp: z.string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits')
    .optional()
});

// DigiLocker consent schema
export const digilockerConsentSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  consentGiven: z.boolean().refine(val => val === true, 'Consent is required'),
  documentsRequested: z.array(z.string()).min(1, 'At least one document must be requested'),
  privacyAccepted: z.boolean().refine(val => val === true, 'Privacy policy must be accepted')
});

// Helper validation functions
export function validateAadhaarChecksum(aadhaarNumber: string): boolean {
  // Verhoeff algorithm implementation for Aadhaar validation
  const d = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
  ];

  const p = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
  ];

  const inv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

  let c = 0;
  const myArray = aadhaarNumber.split('').map(Number).reverse();

  for (let i = 0; i < myArray.length; i++) {
    c = d[c][p[((i + 1) % 8)][myArray[i]]];
  }

  return c === 0;
}

export function validatePANFormat(pan: string): boolean {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan);
}

export function validateAge(dateString: string, minAge: number = 18): boolean {
  const parts = dateString.split('/');
  if (parts.length !== 3) return false;
  
  const birthDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    return age - 1 >= minAge;
  }
  
  return age >= minAge;
}

// Export all schemas
export const validationSchemas = {
  user: userSchema,
  document: documentSchema,
  aadhaar: aadhaarSchema,
  pan: panSchema,
  faceVerification: faceVerificationSchema,
  kycSubmission: kycSubmissionSchema,
  phoneVerification: phoneVerificationSchema,
  emailVerification: emailVerificationSchema,
  digilockerConsent: digilockerConsentSchema
};

export default validationSchemas;
