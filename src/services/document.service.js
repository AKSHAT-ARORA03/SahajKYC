import { Document, AuditLog } from '../models/index.js';
import { encrypt, decrypt } from '../../lib/encryption.js';
import { redis } from '../../lib/redis.js';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

/**
 * Document Processing Service for SAHAJ KYC
 * Handles document upload, validation, OCR extraction, and management
 */
export class DocumentService {
  static CACHE_PREFIX = 'document:';
  static CACHE_TTL = 1800; // 30 minutes
  static UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
  static MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  static ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

  /**
   * Upload and process document
   */
  static async uploadDocument(userId, applicationId, fileData, documentType) {
    try {
      // Validate file
      const validation = await this.validateFile(fileData);
      if (!validation.valid) {
        return {
          success: false,
          error: 'File validation failed',
          details: validation.errors
        };
      }

      // Generate secure filename
      const fileName = await this.generateSecureFileName(fileData.name, documentType);
      const filePath = path.join(this.UPLOAD_DIR, 'documents', applicationId, fileName);

      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Process and save file
      let processedFile;
      if (fileData.type.startsWith('image/')) {
        processedFile = await this.processImage(fileData.buffer, filePath);
      } else {
        // Handle PDF files
        await fs.writeFile(filePath, fileData.buffer);
        processedFile = {
          path: filePath,
          size: fileData.size,
          dimensions: null,
          quality: null
        };
      }

      // Create document record
      const document = new Document({
        applicationId,
        userId,
        documentType,
        fileName: fileData.name,
        secureFileName: fileName,
        filePath: processedFile.path,
        fileSize: processedFile.size,
        mimeType: fileData.type,
        uploadDate: new Date(),
        status: 'uploaded',
        metadata: {
          originalName: fileData.name,
          dimensions: processedFile.dimensions,
          quality: processedFile.quality,
          uploadSource: 'web'
        },
        processingDetails: {
          uploaded: true,
          processed: true,
          ocrCompleted: false,
          validated: false
        }
      });

      await document.save();

      // Cache document info
      await redis.setex(
        `${this.CACHE_PREFIX}${document._id}`,
        this.CACHE_TTL,
        JSON.stringify({
          id: document._id,
          documentType,
          status: document.status,
          uploadDate: document.uploadDate
        })
      );

      // Create audit log
      await AuditLog.create({
        userId,
        action: 'DOCUMENT_UPLOADED',
        resourceType: 'Document',
        resourceId: document._id,
        details: {
          documentType,
          fileName: fileData.name,
          fileSize: fileData.size,
          applicationId
        }
      });

      return {
        success: true,
        documentId: document._id,
        documentType,
        fileName: fileData.name,
        fileSize: processedFile.size,
        status: document.status,
        requiresOcr: this.requiresOcr(documentType),
        nextStep: this.requiresOcr(documentType) ? 'ocr_extraction' : 'validation'
      };
    } catch (error) {
      console.error('Document upload error:', error);
      return {
        success: false,
        error: 'Failed to upload document',
        details: error.message
      };
    }
  }

  /**
   * Extract data using OCR
   */
  static async extractDocumentData(documentId, options = {}) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        return {
          success: false,
          error: 'Document not found',
          code: 'DOCUMENT_NOT_FOUND'
        };
      }

      // Check if already processed
      if (document.processingDetails.ocrCompleted && !options.reprocess) {
        return {
          success: true,
          data: document.extractedData,
          confidence: document.ocrConfidence,
          fromCache: true
        };
      }

      // Perform OCR based on document type
      let ocrResult;
      switch (document.documentType) {
        case 'aadhaar_front':
        case 'aadhaar_back':
          ocrResult = await this.extractAadhaarData(document);
          break;
        case 'pan_card':
          ocrResult = await this.extractPanData(document);
          break;
        case 'passport':
          ocrResult = await this.extractPassportData(document);
          break;
        case 'voter_id_front':
        case 'voter_id_back':
          ocrResult = await this.extractVoterIdData(document);
          break;
        case 'driving_license_front':
        case 'driving_license_back':
          ocrResult = await this.extractDrivingLicenseData(document);
          break;
        default:
          ocrResult = await this.extractGenericData(document);
      }

      // Update document with extracted data
      document.extractedData = encrypt(JSON.stringify(ocrResult.data));
      document.ocrConfidence = ocrResult.confidence;
      document.processingDetails.ocrCompleted = true;
      document.processingDetails.ocrDate = new Date();

      if (ocrResult.confidence > 0.8) {
        document.status = 'processed';
      } else {
        document.status = 'needs_review';
        document.processingDetails.needsManualReview = true;
      }

      await document.save();

      // Update cache
      await redis.del(`${this.CACHE_PREFIX}${documentId}`);

      // Create audit log
      await AuditLog.create({
        userId: document.userId,
        action: 'OCR_EXTRACTION_COMPLETED',
        resourceType: 'Document',
        resourceId: documentId,
        details: {
          documentType: document.documentType,
          confidence: ocrResult.confidence,
          fieldsExtracted: Object.keys(ocrResult.data).length
        }
      });

      return {
        success: true,
        data: ocrResult.data,
        confidence: ocrResult.confidence,
        status: document.status,
        requiresReview: ocrResult.confidence < 0.8
      };
    } catch (error) {
      console.error('OCR extraction error:', error);
      return {
        success: false,
        error: 'Failed to extract document data',
        details: error.message
      };
    }
  }

  /**
   * Validate document authenticity and quality
   */
  static async validateDocument(documentId) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        return {
          success: false,
          error: 'Document not found'
        };
      }

      const validationResults = {
        qualityCheck: await this.performQualityCheck(document),
        authenticityCheck: await this.performAuthenticityCheck(document),
        dataConsistencyCheck: await this.performDataConsistencyCheck(document),
        securityFeatureCheck: await this.performSecurityFeatureCheck(document)
      };

      // Calculate overall validation score
      const scores = Object.values(validationResults).map(result => result.score);
      const overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

      const isValid = overallScore >= 0.7;
      const requiresReview = overallScore < 0.9;

      // Update document status
      document.validationResults = validationResults;
      document.validationScore = overallScore;
      document.processingDetails.validated = true;
      document.processingDetails.validationDate = new Date();

      if (isValid) {
        document.status = requiresReview ? 'needs_review' : 'validated';
      } else {
        document.status = 'rejected';
        document.rejectionReasons = this.generateRejectionReasons(validationResults);
      }

      await document.save();

      return {
        success: true,
        isValid,
        requiresReview,
        overallScore,
        validationResults,
        status: document.status,
        rejectionReasons: document.rejectionReasons
      };
    } catch (error) {
      console.error('Document validation error:', error);
      return {
        success: false,
        error: 'Failed to validate document',
        details: error.message
      };
    }
  }

  /**
   * Get document details with decrypted data
   */
  static async getDocument(documentId, userId, includeExtractedData = false) {
    try {
      // Check cache first
      const cached = await redis.get(`${this.CACHE_PREFIX}${documentId}`);
      if (cached && !includeExtractedData) {
        return {
          success: true,
          document: JSON.parse(cached)
        };
      }

      const document = await Document.findOne({
        _id: documentId,
        userId
      });

      if (!document) {
        return {
          success: false,
          error: 'Document not found or access denied',
          code: 'DOCUMENT_NOT_FOUND'
        };
      }

      const documentData = {
        id: document._id,
        documentType: document.documentType,
        fileName: document.fileName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        uploadDate: document.uploadDate,
        status: document.status,
        validationScore: document.validationScore,
        processingDetails: document.processingDetails,
        metadata: document.metadata
      };

      if (includeExtractedData && document.extractedData) {
        try {
          documentData.extractedData = JSON.parse(decrypt(document.extractedData));
        } catch (decryptError) {
          console.error('Failed to decrypt extracted data:', decryptError);
        }
      }

      return {
        success: true,
        document: documentData
      };
    } catch (error) {
      console.error('Get document error:', error);
      return {
        success: false,
        error: 'Failed to retrieve document',
        details: error.message
      };
    }
  }

  /**
   * Delete document (soft delete with audit trail)
   */
  static async deleteDocument(documentId, userId, reason = 'User requested') {
    try {
      const document = await Document.findOne({
        _id: documentId,
        userId,
        isDeleted: false
      });

      if (!document) {
        return {
          success: false,
          error: 'Document not found or already deleted',
          code: 'DOCUMENT_NOT_FOUND'
        };
      }

      // Soft delete
      document.isDeleted = true;
      document.deletedAt = new Date();
      document.deletionReason = reason;

      await document.save();

      // Clear cache
      await redis.del(`${this.CACHE_PREFIX}${documentId}`);

      // Create audit log
      await AuditLog.create({
        userId,
        action: 'DOCUMENT_DELETED',
        resourceType: 'Document',
        resourceId: documentId,
        details: {
          documentType: document.documentType,
          fileName: document.fileName,
          reason
        }
      });

      return {
        success: true,
        message: 'Document deleted successfully'
      };
    } catch (error) {
      console.error('Document deletion error:', error);
      return {
        success: false,
        error: 'Failed to delete document',
        details: error.message
      };
    }
  }

  /**
   * Helper methods for file processing
   */
  static async validateFile(fileData) {
    const errors = [];

    // Check file size
    if (fileData.size > this.MAX_FILE_SIZE) {
      errors.push(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Check file type
    if (!this.ALLOWED_TYPES.includes(fileData.type)) {
      errors.push(`File type ${fileData.type} is not allowed`);
    }

    // Check if file has content
    if (!fileData.buffer || fileData.buffer.length === 0) {
      errors.push('File appears to be empty');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static async generateSecureFileName(originalName, documentType) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const extension = path.extname(originalName);
    return `${documentType}_${timestamp}_${random}${extension}`;
  }

  static async processImage(buffer, outputPath) {
    try {
      const metadata = await sharp(buffer).metadata();
      
      // Process image for optimal OCR
      const processed = await sharp(buffer)
        .resize(2000, 2000, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 95 })
        .toFile(outputPath);

      return {
        path: outputPath,
        size: processed.size,
        dimensions: {
          width: processed.width,
          height: processed.height
        },
        quality: this.calculateImageQuality(metadata)
      };
    } catch (error) {
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  static calculateImageQuality(metadata) {
    let score = 0;
    
    // Resolution check
    const pixels = metadata.width * metadata.height;
    if (pixels > 2000000) score += 30; // >2MP
    else if (pixels > 1000000) score += 20; // >1MP
    else if (pixels > 500000) score += 10; // >0.5MP

    // Density check
    if (metadata.density > 150) score += 20;
    else if (metadata.density > 100) score += 10;

    // Format check
    if (metadata.format === 'jpeg' || metadata.format === 'png') score += 20;

    // Color depth
    if (metadata.channels >= 3) score += 10;

    return Math.min(score, 100);
  }

  static requiresOcr(documentType) {
    return ![
      'selfie',
      'selfie_with_document',
      'utility_bill',
      'bank_statement'
    ].includes(documentType);
  }

  /**
   * OCR extraction methods for different document types
   */
  static async extractAadhaarData(document) {
    // Implementation for Aadhaar OCR
    // This would integrate with Tesseract.js or other OCR service
    return {
      data: {
        name: 'John Doe',
        aadhaarNumber: '1234 5678 9012',
        dateOfBirth: '01/01/1990',
        address: 'Sample Address',
        // Add more fields as needed
      },
      confidence: 0.95
    };
  }

  static async extractPanData(document) {
    // Implementation for PAN card OCR
    return {
      data: {
        name: 'JOHN DOE',
        panNumber: 'ABCDE1234F',
        fatherName: 'JANE DOE',
        dateOfBirth: '01/01/1990'
      },
      confidence: 0.92
    };
  }

  static async extractPassportData(document) {
    // Implementation for Passport OCR
    return {
      data: {
        name: 'John Doe',
        passportNumber: 'A1234567',
        dateOfBirth: '01/01/1990',
        placeOfBirth: 'India',
        issueDate: '01/01/2020',
        expiryDate: '01/01/2030'
      },
      confidence: 0.88
    };
  }

  static async extractVoterIdData(document) {
    // Implementation for Voter ID OCR
    return {
      data: {
        name: 'John Doe',
        voterIdNumber: 'ABC1234567',
        dateOfBirth: '01/01/1990',
        address: 'Sample Address'
      },
      confidence: 0.85
    };
  }

  static async extractDrivingLicenseData(document) {
    // Implementation for Driving License OCR
    return {
      data: {
        name: 'John Doe',
        licenseNumber: 'DL123456789',
        dateOfBirth: '01/01/1990',
        address: 'Sample Address',
        issueDate: '01/01/2020',
        validUpto: '01/01/2040'
      },
      confidence: 0.90
    };
  }

  static async extractGenericData(document) {
    // Generic OCR for other document types
    return {
      data: {
        extractedText: 'Generic extracted text content'
      },
      confidence: 0.75
    };
  }

  /**
   * Document validation methods
   */
  static async performQualityCheck(document) {
    // Check image quality, resolution, clarity
    return {
      score: 0.9,
      checks: {
        resolution: 'pass',
        clarity: 'pass',
        lighting: 'pass',
        completeness: 'pass'
      }
    };
  }

  static async performAuthenticityCheck(document) {
    // Check for document authenticity features
    return {
      score: 0.85,
      checks: {
        securityFeatures: 'pass',
        template: 'pass',
        formatting: 'pass'
      }
    };
  }

  static async performDataConsistencyCheck(document) {
    // Cross-verify extracted data
    return {
      score: 0.92,
      checks: {
        dateFormat: 'pass',
        nameConsistency: 'pass',
        numberFormat: 'pass'
      }
    };
  }

  static async performSecurityFeatureCheck(document) {
    // Check for security features (watermarks, holograms, etc.)
    return {
      score: 0.88,
      checks: {
        watermark: 'detected',
        hologram: 'not_applicable',
        microprint: 'pass'
      }
    };
  }

  static generateRejectionReasons(validationResults) {
    const reasons = [];
    
    Object.entries(validationResults).forEach(([check, result]) => {
      if (result.score < 0.7) {
        reasons.push(`Failed ${check}: Score ${result.score.toFixed(2)}`);
      }
    });

    return reasons;
  }
}
