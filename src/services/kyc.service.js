import { KycApplication, Document, AuditLog } from '../models/index.js';
import { encrypt, decrypt } from '../../lib/encryption.js';
import { redis } from '../../lib/redis.js';
import { SetuDigiLockerService } from './setu-digilocker.service.js';
import { FaceService } from './face.service.js';
import { NotificationService } from './notification.service.js';

/**
 * Comprehensive KYC Service for SAHAJ KYC Application
 * Handles the complete KYC workflow from initiation to completion
 */
export class KycService {
  static CACHE_PREFIX = 'kyc:';
  static CACHE_TTL = 3600; // 1 hour

  /**
   * Initialize a new KYC application
   */
  static async initiateKyc(userId, applicationData) {
    try {
      // Check if user has any pending applications
      const existingApplication = await KycApplication.findOne({
        userId,
        status: { $in: ['pending', 'in_progress', 'under_review'] }
      });

      if (existingApplication) {
        return {
          success: false,
          error: 'You already have a pending KYC application',
          applicationId: existingApplication._id,
          code: 'EXISTING_APPLICATION'
        };
      }

      // Create new KYC application
      const kycApplication = new KycApplication({
        userId,
        applicationType: applicationData.applicationType || 'individual',
        personalInfo: {
          ...applicationData.personalInfo,
          fullName: encrypt(applicationData.personalInfo.fullName),
          fatherName: encrypt(applicationData.personalInfo.fatherName),
          motherName: applicationData.personalInfo.motherName ? 
            encrypt(applicationData.personalInfo.motherName) : undefined
        },
        identityInfo: applicationData.identityInfo ? {
          aadhaarNumber: applicationData.identityInfo.aadhaarNumber ?
            encrypt(applicationData.identityInfo.aadhaarNumber) : undefined,
          panNumber: applicationData.identityInfo.panNumber ?
            encrypt(applicationData.identityInfo.panNumber) : undefined,
          passportNumber: applicationData.identityInfo.passportNumber ?
            encrypt(applicationData.identityInfo.passportNumber) : undefined
        } : {},
        addressInfo: applicationData.addressInfo,
        contactInfo: {
          ...applicationData.contactInfo,
          phone: encrypt(applicationData.contactInfo.phone),
          email: encrypt(applicationData.contactInfo.email)
        },
        status: 'initiated',
        steps: {
          documentsSubmitted: false,
          faceVerificationCompleted: false,
          digiLockerVerificationCompleted: false,
          manualReviewRequired: false
        },
        metadata: {
          language: applicationData.language || 'en',
          deviceInfo: applicationData.deviceInfo,
          ipAddress: applicationData.ipAddress,
          userAgent: applicationData.userAgent
        }
      });

      await kycApplication.save();

      // Create audit log
      await AuditLog.create({
        userId,
        action: 'KYC_INITIATED',
        resourceType: 'KycApplication',
        resourceId: kycApplication._id,
        details: {
          applicationType: applicationData.applicationType,
          language: applicationData.language
        },
        ipAddress: applicationData.ipAddress,
        userAgent: applicationData.userAgent
      });

      // Cache the application
      await redis.setex(
        `${this.CACHE_PREFIX}${kycApplication._id}`,
        this.CACHE_TTL,
        JSON.stringify(kycApplication)
      );

      // Send welcome notification
      await NotificationService.sendKycInitiated(userId, kycApplication._id);

      return {
        success: true,
        applicationId: kycApplication._id,
        status: kycApplication.status,
        steps: kycApplication.steps,
        estimatedCompletionTime: '15-20 minutes'
      };
    } catch (error) {
      console.error('KYC initiation error:', error);
      return {
        success: false,
        error: 'Failed to initiate KYC application',
        details: error.message
      };
    }
  }

  /**
   * Get KYC application status and progress
   */
  static async getKycStatus(userId, applicationId) {
    try {
      // Try cache first
      const cached = await redis.get(`${this.CACHE_PREFIX}${applicationId}`);
      if (cached) {
        const application = JSON.parse(cached);
        if (application.userId === userId) {
          return {
            success: true,
            application: this.sanitizeApplication(application)
          };
        }
      }

      // Fetch from database
      const application = await KycApplication.findOne({
        _id: applicationId,
        userId
      }).populate('documents faceVerification');

      if (!application) {
        return {
          success: false,
          error: 'KYC application not found',
          code: 'APPLICATION_NOT_FOUND'
        };
      }

      // Update cache
      await redis.setex(
        `${this.CACHE_PREFIX}${applicationId}`,
        this.CACHE_TTL,
        JSON.stringify(application)
      );

      return {
        success: true,
        application: this.sanitizeApplication(application)
      };
    } catch (error) {
      console.error('Get KYC status error:', error);
      return {
        success: false,
        error: 'Failed to fetch KYC status',
        details: error.message
      };
    }
  }

  /**
   * Submit documents for KYC verification
   */
  static async submitDocuments(userId, applicationId, documents) {
    try {
      const application = await KycApplication.findOne({
        _id: applicationId,
        userId,
        status: { $in: ['initiated', 'in_progress'] }
      });

      if (!application) {
        return {
          success: false,
          error: 'KYC application not found or not in valid state',
          code: 'INVALID_APPLICATION_STATE'
        };
      }

      const documentResults = [];
      let allDocumentsValid = true;

      for (const docData of documents) {
        // Process each document
        const documentResult = await this.processDocument(applicationId, docData);
        documentResults.push(documentResult);

        if (!documentResult.success) {
          allDocumentsValid = false;
        }
      }

      // Update application status
      application.steps.documentsSubmitted = allDocumentsValid;
      application.status = allDocumentsValid ? 'documents_submitted' : 'documents_pending';
      application.documentSubmissionDate = new Date();

      if (allDocumentsValid) {
        application.progress = Math.min(application.progress + 30, 100);
      }

      await application.save();

      // Clear cache
      await redis.del(`${this.CACHE_PREFIX}${applicationId}`);

      // Create audit log
      await AuditLog.create({
        userId,
        action: 'DOCUMENTS_SUBMITTED',
        resourceType: 'KycApplication',
        resourceId: applicationId,
        details: {
          documentCount: documents.length,
          allValid: allDocumentsValid,
          results: documentResults
        }
      });

      // Send notification
      if (allDocumentsValid) {
        await NotificationService.sendDocumentsAccepted(userId, applicationId);
      } else {
        await NotificationService.sendDocumentsRejected(userId, applicationId, documentResults);
      }

      return {
        success: true,
        allDocumentsValid,
        documentResults,
        nextStep: allDocumentsValid ? 'face_verification' : 'resubmit_documents',
        progress: application.progress
      };
    } catch (error) {
      console.error('Document submission error:', error);
      return {
        success: false,
        error: 'Failed to submit documents',
        details: error.message
      };
    }
  }

  /**
   * Complete face verification step
   */
  static async completeFaceVerification(userId, applicationId, faceData) {
    try {
      const application = await KycApplication.findOne({
        _id: applicationId,
        userId,
        status: { $in: ['documents_submitted', 'in_progress'] }
      });

      if (!application) {
        return {
          success: false,
          error: 'KYC application not found or not ready for face verification',
          code: 'INVALID_APPLICATION_STATE'
        };
      }

      // Perform face verification
      const faceVerificationResult = await FaceService.verifyFaceWithDocument({
        selfieImage: faceData.selfieImage,
        documentImage: faceData.documentImage,
        documentType: faceData.documentType,
        applicationId
      });

      // Update application
      application.steps.faceVerificationCompleted = faceVerificationResult.success;
      application.faceVerification = faceVerificationResult.verificationId;

      if (faceVerificationResult.success) {
        application.status = 'face_verification_completed';
        application.progress = Math.min(application.progress + 25, 100);
        application.faceVerificationDate = new Date();
      } else {
        application.status = 'face_verification_failed';
        application.rejectionReasons = application.rejectionReasons || [];
        application.rejectionReasons.push({
          step: 'face_verification',
          reason: faceVerificationResult.error,
          timestamp: new Date()
        });
      }

      await application.save();

      // Clear cache
      await redis.del(`${this.CACHE_PREFIX}${applicationId}`);

      // Create audit log
      await AuditLog.create({
        userId,
        action: 'FACE_VERIFICATION_COMPLETED',
        resourceType: 'KycApplication',
        resourceId: applicationId,
        details: {
          success: faceVerificationResult.success,
          confidence: faceVerificationResult.confidence,
          matchScore: faceVerificationResult.matchScore
        }
      });

      // Send notification
      if (faceVerificationResult.success) {
        await NotificationService.sendFaceVerificationSuccess(userId, applicationId);
      } else {
        await NotificationService.sendFaceVerificationFailed(userId, applicationId);
      }

      return {
        success: faceVerificationResult.success,
        confidence: faceVerificationResult.confidence,
        matchScore: faceVerificationResult.matchScore,
        nextStep: faceVerificationResult.success ? 'digilocker_verification' : 'retry_face_verification',
        progress: application.progress,
        error: faceVerificationResult.error
      };
    } catch (error) {
      console.error('Face verification error:', error);
      return {
        success: false,
        error: 'Failed to complete face verification',
        details: error.message
      };
    }
  }

  /**
   * Complete DigiLocker verification
   */
  static async completeDigiLockerVerification(userId, applicationId, consentData) {
    try {
      const application = await KycApplication.findOne({
        _id: applicationId,
        userId,
        status: { $in: ['face_verification_completed', 'in_progress'] }
      });

      if (!application) {
        return {
          success: false,
          error: 'KYC application not ready for DigiLocker verification',
          code: 'INVALID_APPLICATION_STATE'
        };
      }

      // Initiate DigiLocker verification
      const digiLockerResult = await SetuDigiLockerService.initiateDocumentFetch({
        userId,
        applicationId,
        documentTypes: consentData.documentTypes,
        purpose: consentData.purpose || 'KYC verification for SAHAJ platform'
      });

      if (digiLockerResult.success) {
        application.steps.digiLockerVerificationCompleted = true;
        application.status = 'digilocker_verification_completed';
        application.progress = Math.min(application.progress + 25, 100);
        application.digiLockerVerificationDate = new Date();
        application.digiLockerData = {
          consentId: digiLockerResult.consentId,
          requestId: digiLockerResult.requestId
        };
      } else {
        application.status = 'digilocker_verification_failed';
        application.rejectionReasons = application.rejectionReasons || [];
        application.rejectionReasons.push({
          step: 'digilocker_verification',
          reason: digiLockerResult.error,
          timestamp: new Date()
        });
      }

      await application.save();

      // Clear cache
      await redis.del(`${this.CACHE_PREFIX}${applicationId}`);

      return {
        success: digiLockerResult.success,
        consentId: digiLockerResult.consentId,
        redirectUrl: digiLockerResult.redirectUrl,
        nextStep: digiLockerResult.success ? 'final_review' : 'retry_digilocker',
        progress: application.progress,
        error: digiLockerResult.error
      };
    } catch (error) {
      console.error('DigiLocker verification error:', error);
      return {
        success: false,
        error: 'Failed to complete DigiLocker verification',
        details: error.message
      };
    }
  }

  /**
   * Submit KYC for final review
   */
  static async submitForReview(userId, applicationId, finalData = {}) {
    try {
      const application = await KycApplication.findOne({
        _id: applicationId,
        userId
      }).populate('documents faceVerification');

      if (!application) {
        return {
          success: false,
          error: 'KYC application not found',
          code: 'APPLICATION_NOT_FOUND'
        };
      }

      // Check if all required steps are completed
      const requiredSteps = ['documentsSubmitted', 'faceVerificationCompleted'];
      const missingSteps = requiredSteps.filter(step => !application.steps[step]);

      if (missingSteps.length > 0) {
        return {
          success: false,
          error: 'Required KYC steps not completed',
          missingSteps,
          code: 'INCOMPLETE_STEPS'
        };
      }

      // Perform final validation
      const validationResult = await this.performFinalValidation(application);

      if (validationResult.requiresManualReview) {
        application.status = 'under_review';
        application.steps.manualReviewRequired = true;
        application.reviewAssignedDate = new Date();
        
        // Auto-assignment logic for manual review
        application.assignedReviewer = await this.assignReviewer();
      } else if (validationResult.autoApproved) {
        application.status = 'approved';
        application.approvalDate = new Date();
        application.approvedBy = 'system';
        application.progress = 100;
      } else {
        application.status = 'rejected';
        application.rejectionDate = new Date();
        application.rejectionReasons = validationResult.rejectionReasons;
      }

      application.submittedForReviewDate = new Date();
      application.finalData = finalData;

      await application.save();

      // Clear cache
      await redis.del(`${this.CACHE_PREFIX}${applicationId}`);

      // Create audit log
      await AuditLog.create({
        userId,
        action: 'KYC_SUBMITTED_FOR_REVIEW',
        resourceType: 'KycApplication',
        resourceId: applicationId,
        details: {
          finalStatus: application.status,
          requiresManualReview: validationResult.requiresManualReview,
          autoApproved: validationResult.autoApproved
        }
      });

      // Send appropriate notification
      if (application.status === 'approved') {
        await NotificationService.sendKycApproved(userId, applicationId);
      } else if (application.status === 'under_review') {
        await NotificationService.sendKycUnderReview(userId, applicationId);
      } else {
        await NotificationService.sendKycRejected(userId, applicationId);
      }

      return {
        success: true,
        status: application.status,
        requiresManualReview: validationResult.requiresManualReview,
        estimatedReviewTime: validationResult.requiresManualReview ? '24-48 hours' : 'immediate',
        progress: application.progress
      };
    } catch (error) {
      console.error('KYC submission error:', error);
      return {
        success: false,
        error: 'Failed to submit KYC for review',
        details: error.message
      };
    }
  }

  /**
   * Process individual document
   */
  static async processDocument(applicationId, docData) {
    try {
      // Create document record
      const document = new Document({
        applicationId,
        documentType: docData.documentType,
        fileName: docData.fileName,
        filePath: docData.filePath,
        fileSize: docData.fileSize,
        mimeType: docData.mimeType,
        uploadDate: new Date(),
        status: 'processing'
      });

      // Perform OCR extraction if needed
      if (docData.performOcr) {
        const ocrResult = await this.extractDocumentData(docData);
        document.extractedData = ocrResult.data;
        document.ocrConfidence = ocrResult.confidence;
        document.processingDetails.ocrCompleted = true;
      }

      // Validate document
      const validation = await this.validateDocument(document);
      document.validationResults = validation;
      document.status = validation.isValid ? 'validated' : 'rejected';

      await document.save();

      return {
        success: validation.isValid,
        documentId: document._id,
        documentType: docData.documentType,
        validationResults: validation,
        extractedData: document.extractedData
      };
    } catch (error) {
      console.error('Document processing error:', error);
      return {
        success: false,
        error: 'Failed to process document',
        details: error.message
      };
    }
  }

  /**
   * Perform final validation before approval
   */
  static async performFinalValidation(application) {
    const validationChecks = {
      documentsComplete: application.steps.documentsSubmitted,
      faceVerificationPassed: application.steps.faceVerificationCompleted,
      identityDataMatches: true, // Will be determined by document cross-verification
      addressVerified: false,
      noBlacklistMatch: true,
      riskScore: 0
    };

    // Calculate risk score based on various factors
    let riskScore = 0;
    
    // Check document consistency
    if (!this.checkDocumentConsistency(application)) {
      riskScore += 25;
      validationChecks.identityDataMatches = false;
    }

    // Check for address verification
    if (application.steps.digiLockerVerificationCompleted) {
      validationChecks.addressVerified = true;
    } else {
      riskScore += 15;
    }

    // Face verification confidence
    if (application.faceVerification && application.faceVerification.confidence < 0.8) {
      riskScore += 20;
    }

    validationChecks.riskScore = riskScore;

    // Decision logic
    const requiresManualReview = riskScore > 40 || !validationChecks.identityDataMatches;
    const autoApproved = riskScore <= 20 && validationChecks.documentsComplete && 
                        validationChecks.faceVerificationPassed;

    return {
      validationChecks,
      requiresManualReview,
      autoApproved,
      riskScore,
      rejectionReasons: riskScore > 70 ? ['High risk score', 'Manual review required'] : []
    };
  }

  /**
   * Helper methods
   */
  static sanitizeApplication(application) {
    // Remove sensitive data before sending to client
    const sanitized = { ...application };
    
    if (sanitized.personalInfo) {
      sanitized.personalInfo = {
        ...sanitized.personalInfo,
        fullName: decrypt(sanitized.personalInfo.fullName),
        // Don't decrypt other sensitive fields for client
      };
    }

    return sanitized;
  }

  static checkDocumentConsistency(application) {
    // Implement document cross-verification logic
    return true; // Placeholder
  }

  static async assignReviewer() {
    // Auto-assign to available reviewer (implement queue logic)
    return 'system_reviewer';
  }

  static async extractDocumentData(docData) {
    // Integrate with OCR service
    return { data: {}, confidence: 0.9 };
  }

  static async validateDocument(document) {
    // Implement document validation logic
    return { isValid: true, checks: [] };
  }
}
