import { z } from 'zod';
import { NextResponse } from 'next/server';

/**
 * Request Validation Middleware for SAHAJ KYC
 * Implements Zod-based validation with Indian-specific schemas
 */

// Indian-specific validation patterns
const INDIAN_PHONE_REGEX = /^(\+91|91)?[6-9]\d{9}$/;
const AADHAAR_REGEX = /^\d{4}\s?\d{4}\s?\d{4}$/;
const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;
const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]$/;
const PINCODE_REGEX = /^[1-9]\d{5}$/;

// Custom Zod validators for Indian data
const indianPhone = z.string()
  .regex(INDIAN_PHONE_REGEX, 'Invalid Indian phone number format')
  .transform(phone => phone.replace(/\s+/g, '').replace(/^\+91/, '91'));

const aadhaarNumber = z.string()
  .regex(AADHAAR_REGEX, 'Invalid Aadhaar number format')
  .transform(aadhaar => aadhaar.replace(/\s+/g, ''));

const panNumber = z.string()
  .regex(PAN_REGEX, 'Invalid PAN number format')
  .toUpperCase();

const indianPincode = z.string()
  .regex(PINCODE_REGEX, 'Invalid Indian pincode format');

export class ValidationMiddleware {
  // Common validation schemas
  static schemas = {
    // User registration/profile
    userProfile: z.object({
      firstName: z.string().min(2).max(50),
      lastName: z.string().min(2).max(50),
      email: z.string().email(),
      phone: indianPhone,
      dateOfBirth: z.string().date().optional(),
      language: z.enum([
        'hi', 'en', 'bn', 'te', 'ta', 'gu', 'kn', 'ml', 'pa', 'or', 'as', 'mr'
      ]).default('en')
    }),

    // KYC application
    kycApplication: z.object({
      applicationType: z.enum(['individual', 'business']),
      personalInfo: z.object({
        fullName: z.string().min(2).max(100),
        fatherName: z.string().min(2).max(100),
        motherName: z.string().min(2).max(100).optional(),
        dateOfBirth: z.string().date(),
        gender: z.enum(['male', 'female', 'other']),
        nationality: z.string().default('Indian'),
        maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']).optional()
      }),
      identityInfo: z.object({
        aadhaarNumber: aadhaarNumber.optional(),
        panNumber: panNumber.optional(),
        passportNumber: z.string().optional(),
        voterIdNumber: z.string().optional(),
        drivingLicenseNumber: z.string().optional()
      }),
      addressInfo: z.object({
        addressLine1: z.string().min(5).max(200),
        addressLine2: z.string().max(200).optional(),
        city: z.string().min(2).max(50),
        state: z.string().min(2).max(50),
        pincode: indianPincode,
        country: z.string().default('India')
      }),
      contactInfo: z.object({
        phone: indianPhone,
        alternatePhone: indianPhone.optional(),
        email: z.string().email(),
        alternateEmail: z.string().email().optional()
      })
    }),

    // Document upload
    documentUpload: z.object({
      documentType: z.enum([
        'aadhaar_front', 'aadhaar_back',
        'pan_card',
        'passport', 'passport_back',
        'voter_id_front', 'voter_id_back',
        'driving_license_front', 'driving_license_back',
        'bank_statement',
        'utility_bill',
        'selfie',
        'selfie_with_document'
      ]),
      file: z.object({
        name: z.string(),
        type: z.string().regex(/^image\/(jpeg|jpg|png|webp)$/, 'Only JPEG, PNG, and WebP images allowed'),
        size: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB')
      }),
      quality: z.object({
        brightness: z.number().min(0).max(255).optional(),
        sharpness: z.number().min(0).max(100).optional(),
        resolution: z.object({
          width: z.number().min(800),
          height: z.number().min(600)
        }).optional()
      }).optional()
    }),

    // Face verification
    faceVerification: z.object({
      imageData: z.string().min(100), // Base64 encoded image
      documentType: z.enum(['aadhaar', 'pan', 'passport', 'voter_id', 'driving_license']),
      livenessCheck: z.boolean().default(true),
      matchThreshold: z.number().min(0.5).max(1.0).default(0.8)
    }),

    // OCR extraction
    ocrExtraction: z.object({
      imageData: z.string().min(100),
      documentType: z.enum(['aadhaar', 'pan', 'passport', 'voter_id', 'driving_license']),
      language: z.enum(['en', 'hi', 'bn', 'te', 'ta', 'gu', 'kn', 'ml']).default('en'),
      extractFields: z.array(z.string()).optional()
    }),

    // Setu DigiLocker
    digiLockerConsent: z.object({
      consentId: z.string().uuid(),
      documentTypes: z.array(z.enum([
        'AADHAAR', 'PAN', 'DRIVING_LICENSE', 'VOTER_ID', 
        'PASSPORT', 'BIRTH_CERTIFICATE', 'INCOME_CERTIFICATE'
      ])),
      purpose: z.string().min(10).max(500),
      dataRetentionPeriod: z.number().min(30).max(2555), // days
      redirectUrl: z.string().url()
    }),

    // Business KYC (for businesses)
    businessKyc: z.object({
      businessInfo: z.object({
        businessName: z.string().min(2).max(200),
        businessType: z.enum(['private_limited', 'public_limited', 'partnership', 'llp', 'sole_proprietorship']),
        registrationNumber: z.string().min(5).max(50),
        gstinNumber: z.string().regex(GSTIN_REGEX, 'Invalid GSTIN format').optional(),
        panNumber: panNumber,
        incorporationDate: z.string().date(),
        authorizedCapital: z.number().positive().optional(),
        paidUpCapital: z.number().positive().optional()
      }),
      businessAddress: z.object({
        registeredAddress: z.object({
          addressLine1: z.string().min(5).max(200),
          addressLine2: z.string().max(200).optional(),
          city: z.string().min(2).max(50),
          state: z.string().min(2).max(50),
          pincode: indianPincode,
          country: z.string().default('India')
        }),
        operationalAddress: z.object({
          addressLine1: z.string().min(5).max(200),
          addressLine2: z.string().max(200).optional(),
          city: z.string().min(2).max(50),
          state: z.string().min(2).max(50),
          pincode: indianPincode,
          country: z.string().default('India')
        }).optional()
      }),
      authorizedPersons: z.array(z.object({
        name: z.string().min(2).max(100),
        designation: z.string().min(2).max(50),
        panNumber: panNumber,
        aadhaarNumber: aadhaarNumber.optional(),
        phone: indianPhone,
        email: z.string().email(),
        isDirector: z.boolean().default(false),
        shareholding: z.number().min(0).max(100).optional()
      })).min(1).max(10)
    }),

    // API pagination and filtering
    pagination: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      sortBy: z.string().optional(),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      search: z.string().max(100).optional(),
      filters: z.record(z.any()).optional()
    }),

    // File upload validation
    fileUpload: z.object({
      files: z.array(z.object({
        name: z.string().min(1),
        type: z.string(),
        size: z.number().positive()
      })).min(1).max(10),
      uploadType: z.enum(['document', 'profile_photo', 'signature', 'bulk_documents']),
      metadata: z.record(z.any()).optional()
    })
  };

  // Validate request body against schema
  static async validateBody(request, schemaName, options = {}) {
    try {
      const schema = this.schemas[schemaName];
      if (!schema) {
        return { error: `Unknown validation schema: ${schemaName}`, status: 500 };
      }

      const body = await request.json();
      const result = schema.safeParse(body);

      if (!result.success) {
        return {
          error: 'Validation failed',
          details: result.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code
          })),
          status: 400
        };
      }

      return { data: result.data };
    } catch (parseError) {
      return {
        error: 'Invalid JSON in request body',
        details: parseError.message,
        status: 400
      };
    }
  }

  // Validate query parameters
  static validateQuery(request, schemaName) {
    try {
      const schema = this.schemas[schemaName];
      if (!schema) {
        return { error: `Unknown validation schema: ${schemaName}`, status: 500 };
      }

      const url = new URL(request.url);
      const queryParams = Object.fromEntries(url.searchParams);
      
      const result = schema.safeParse(queryParams);

      if (!result.success) {
        return {
          error: 'Query parameter validation failed',
          details: result.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code
          })),
          status: 400
        };
      }

      return { data: result.data };
    } catch (error) {
      return {
        error: 'Query parameter validation error',
        details: error.message,
        status: 400
      };
    }
  }

  // Custom validation for file uploads
  static validateFileUpload(files, allowedTypes = [], maxSize = 10 * 1024 * 1024) {
    const errors = [];

    files.forEach((file, index) => {
      // Check file type
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        errors.push({
          field: `files[${index}].type`,
          message: `File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}`,
          code: 'invalid_file_type'
        });
      }

      // Check file size
      if (file.size > maxSize) {
        errors.push({
          field: `files[${index}].size`,
          message: `File size ${file.size} exceeds maximum allowed size ${maxSize}`,
          code: 'file_too_large'
        });
      }

      // Check file name
      if (!file.name || file.name.trim() === '') {
        errors.push({
          field: `files[${index}].name`,
          message: 'File name is required',
          code: 'missing_file_name'
        });
      }
    });

    return errors.length > 0 ? { error: 'File validation failed', details: errors } : { valid: true };
  }

  // Middleware wrapper
  static withValidation(handler, options = {}) {
    return async (request, context) => {
      try {
        const validationResults = {};

        // Validate request body if schema provided
        if (options.bodySchema) {
          const bodyValidation = await this.validateBody(request, options.bodySchema);
          if (bodyValidation.error) {
            return NextResponse.json(
              {
                error: bodyValidation.error,
                details: bodyValidation.details,
                code: 'VALIDATION_FAILED',
                timestamp: new Date().toISOString()
              },
              { status: bodyValidation.status }
            );
          }
          request.validatedBody = bodyValidation.data;
        }

        // Validate query parameters if schema provided
        if (options.querySchema) {
          const queryValidation = this.validateQuery(request, options.querySchema);
          if (queryValidation.error) {
            return NextResponse.json(
              {
                error: queryValidation.error,
                details: queryValidation.details,
                code: 'QUERY_VALIDATION_FAILED',
                timestamp: new Date().toISOString()
              },
              { status: queryValidation.status }
            );
          }
          request.validatedQuery = queryValidation.data;
        }

        // Custom validation function
        if (options.customValidation) {
          const customResult = await options.customValidation(request);
          if (customResult && customResult.error) {
            return NextResponse.json(
              {
                error: customResult.error,
                details: customResult.details,
                code: 'CUSTOM_VALIDATION_FAILED',
                timestamp: new Date().toISOString()
              },
              { status: customResult.status || 400 }
            );
          }
        }

        return await handler(request, context);
      } catch (error) {
        console.error('Validation middleware error:', error);
        return NextResponse.json(
          {
            error: 'Validation processing error',
            code: 'VALIDATION_INTERNAL_ERROR',
            timestamp: new Date().toISOString()
          },
          { status: 500 }
        );
      }
    };
  }
}

// Convenience functions for common validation patterns
export const withBodyValidation = (handler, schemaName) => 
  ValidationMiddleware.withValidation(handler, { bodySchema: schemaName });

export const withQueryValidation = (handler, schemaName) => 
  ValidationMiddleware.withValidation(handler, { querySchema: schemaName });

export const withFullValidation = (handler, bodySchema, querySchema) => 
  ValidationMiddleware.withValidation(handler, { bodySchema, querySchema });

// Export validation schemas for direct use
export const validationSchemas = ValidationMiddleware.schemas;
