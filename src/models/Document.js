import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  // References
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  kycApplicationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'KycApplication',
    index: true
  },
  
  // Identification
  documentId: {
    type: String,
    unique: true,
    default: () => `DOC_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  },
  
  // Document Classification
  type: {
    type: String,
    enum: [
      'AADHAAR_FRONT',
      'AADHAAR_BACK', 
      'PAN_CARD',
      'DRIVING_LICENSE_FRONT',
      'DRIVING_LICENSE_BACK',
      'VOTER_ID_FRONT',
      'VOTER_ID_BACK',
      'PASSPORT',
      'UTILITY_BILL',
      'BANK_STATEMENT',
      'OTHER'
    ],
    required: true,
    index: true
  },
  
  // Processing Status
  status: {
    type: String,
    enum: [
      'UPLOADED',         // File uploaded successfully
      'QUEUED',          // Queued for processing
      'PROCESSING',      // Currently being processed
      'OCR_COMPLETED',   // OCR extraction completed
      'VALIDATION_PENDING', // Waiting for validation
      'PROCESSED',       // Fully processed
      'VALIDATED',       // Validated successfully
      'REJECTED',        // Rejected due to issues
      'EXPIRED'          // Processing expired
    ],
    default: 'UPLOADED',
    index: true
  },
  
  // File Information
  file: {
    // URLs
    originalUrl: { type: String, required: true },
    processedUrl: String, // Enhanced/corrected image
    thumbnailUrl: String, // Thumbnail for quick preview
    compressedUrl: String, // Compressed version for mobile
    
    // File Metadata
    originalName: String,
    fileSize: Number, // in bytes
    mimeType: String,
    checksum: String, // For integrity verification
    
    // Image Properties
    dimensions: {
      width: Number,
      height: Number
    },
    colorSpace: String,
    hasAlpha: Boolean,
    
    // Quality Assessment
    quality: {
      score: { type: Number, min: 0, max: 100 },
      brightness: Number,
      contrast: Number,
      sharpness: Number,
      noise: Number,
      blur: Number
    }
  },
  
  // OCR Extraction Results
  extractedData: {
    // Raw OCR Output
    raw: {
      text: String,
      confidence: Number,
      words: [{
        text: String,
        confidence: Number,
        boundingBox: {
          x: Number,
          y: Number,
          width: Number,
          height: Number
        }
      }],
      lines: [String],
      paragraphs: [String]
    },
    
    // Structured Data (document type specific)
    structured: {
      // Common Fields
      name: String,
      fatherName: String,
      dateOfBirth: Date,
      gender: String,
      
      // Aadhaar Specific
      aadhaarNumber: {
        type: String,
        match: /^\d{12}$/
      },
      
      // PAN Specific
      panNumber: {
        type: String,
        match: /^[A-Z]{5}\d{4}[A-Z]$/
      },
      
      // Address Information
      address: {
        line1: String,
        line2: String,
        city: String,
        state: String,
        pincode: {
          type: String,
          match: /^[1-9][0-9]{5}$/
        }
      },
      
      // Document Specific Info
      issueDate: Date,
      validUntil: Date,
      documentNumber: String,
      issuingAuthority: String
    },
    
    // Extraction Metadata
    confidence: { type: Number, min: 0, max: 1 },
    extractedAt: Date,
    processingTime: Number, // milliseconds
    ocrProvider: {
      type: String,
      enum: ['tesseract', 'google-vision', 'azure-cognitive', 'aws-textract']
    },
    modelVersion: String
  },
  
  // Validation & Verification
  validation: {
    // Overall Validation
    isValid: { type: Boolean, default: false },
    validationScore: { type: Number, min: 0, max: 100, default: 0 },
    validatedAt: Date,
    
    // Specific Checks
    checks: {
      // Format Validation
      hasRequiredFields: { passed: Boolean, missing: [String] },
      formatCompliance: { passed: Boolean, issues: [String] },
      
      // Image Quality
      imageQuality: {
        passed: Boolean,
        score: Number,
        issues: [String] // 'blur', 'dark', 'glare', 'partial', etc.
      },
      
      // Security Features
      securityFeatures: {
        passed: Boolean,
        detected: [String], // watermarks, holograms, etc.
        suspicious: [String]
      },
      
      // Consistency Checks
      crossFieldConsistency: {
        passed: Boolean,
        inconsistencies: [String]
      },
      
      // Anti-Fraud
      tampering: {
        detected: Boolean,
        confidence: Number,
        methods: [String] // 'digital-alteration', 'physical-alteration'
      }
    },
    
    // AI Analysis Results
    aiAnalysis: {
      provider: String,
      modelVersion: String,
      confidence: Number,
      flags: [String],
      recommendations: [String],
      processedAt: Date,
      rawResponse: mongoose.Schema.Types.Mixed
    },
    
    // Manual Review
    manualReview: {
      required: { type: Boolean, default: false },
      reviewerId: String,
      reviewedAt: Date,
      decision: {
        type: String,
        enum: ['APPROVED', 'REJECTED', 'NEEDS_RESUBMISSION']
      },
      notes: String,
      confidence: Number
    }
  },
  
  // Processing Pipeline
  processing: {
    // Processing Stages
    stages: [{
      name: String, // 'upload', 'ocr', 'validation', 'ai-analysis'
      status: String, // 'pending', 'processing', 'completed', 'failed'
      startedAt: Date,
      completedAt: Date,
      duration: Number, // milliseconds
      error: String,
      retryCount: { type: Number, default: 0 }
    }],
    
    // Overall Processing
    totalProcessingTime: Number,
    attempts: { type: Number, default: 1 },
    lastProcessedAt: Date,
    errors: [String],
    warnings: [String],
    
    // Queue Information
    queuedAt: Date,
    priority: { type: Number, default: 0 },
    worker: String // Which processing worker handled this
  },
  
  // Security & Privacy
  security: {
    // Encryption
    isEncrypted: { type: Boolean, default: true },
    encryptionAlgorithm: { type: String, default: 'AES-256-GCM' },
    encryptionKeyId: String,
    
    // Access Control
    accessLogs: [{
      accessedBy: String, // User ID or system component
      action: String, // 'view', 'download', 'process', 'delete'
      timestamp: Date,
      ipAddress: String,
      userAgent: String,
      success: Boolean
    }],
    
    // Data Retention
    retentionPolicy: String,
    scheduledDeletionAt: Date,
    
    // Privacy
    containsPII: { type: Boolean, default: true },
    anonymized: { type: Boolean, default: false },
    consentGiven: Boolean
  },
  
  // Metadata
  metadata: {
    uploadSource: String, // 'web', 'mobile', 'api'
    deviceInfo: {
      type: String, // 'mobile', 'tablet', 'desktop'
      os: String,
      browser: String,
      camera: String
    },
    captureMethod: String, // 'camera', 'gallery', 'scanner'
    location: {
      latitude: Number,
      longitude: Number,
      accuracy: Number
    },
    tags: [String],
    notes: String
  }
}, {
  timestamps: true,
  collection: 'documents',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
documentSchema.index({ userId: 1, type: 1 });
documentSchema.index({ documentId: 1 });
documentSchema.index({ kycApplicationId: 1 });
documentSchema.index({ status: 1, createdAt: -1 });
documentSchema.index({ 'extractedData.structured.aadhaarNumber': 1 });
documentSchema.index({ 'extractedData.structured.panNumber': 1 });
documentSchema.index({ 'validation.isValid': 1 });
documentSchema.index({ 'validation.validationScore': -1 });

// Text search index
documentSchema.index({ 
  'extractedData.raw.text': 'text',
  'extractedData.structured.name': 'text' 
});

// Compound indexes
documentSchema.index({ userId: 1, status: 1, type: 1 });
documentSchema.index({ status: 1, 'processing.priority': -1, createdAt: 1 });

// Virtual fields
documentSchema.virtual('isProcessed').get(function() {
  return ['PROCESSED', 'VALIDATED'].includes(this.status);
});

documentSchema.virtual('needsReview').get(function() {
  return this.validation.manualReview.required && !this.validation.manualReview.reviewedAt;
});

documentSchema.virtual('fileUrl').get(function() {
  return this.file.processedUrl || this.file.originalUrl;
});

// Methods
documentSchema.methods.updateStage = function(stageName, status, error = null) {
  const stage = this.processing.stages.find(s => s.name === stageName);
  
  if (stage) {
    stage.status = status;
    if (status === 'processing' && !stage.startedAt) {
      stage.startedAt = new Date();
    }
    if (['completed', 'failed'].includes(status)) {
      stage.completedAt = new Date();
      if (stage.startedAt) {
        stage.duration = stage.completedAt - stage.startedAt;
      }
    }
    if (error) {
      stage.error = error;
    }
  } else {
    this.processing.stages.push({
      name: stageName,
      status: status,
      startedAt: status === 'processing' ? new Date() : undefined
    });
  }
  
  return this.save();
};

documentSchema.methods.calculateValidationScore = function() {
  const checks = this.validation.checks;
  let score = 0;
  let totalChecks = 0;
  
  // Image quality (30%)
  if (checks.imageQuality) {
    score += checks.imageQuality.passed ? 30 : 0;
    totalChecks += 30;
  }
  
  // Required fields (25%)
  if (checks.hasRequiredFields) {
    score += checks.hasRequiredFields.passed ? 25 : 0;
    totalChecks += 25;
  }
  
  // Format compliance (20%)
  if (checks.formatCompliance) {
    score += checks.formatCompliance.passed ? 20 : 0;
    totalChecks += 20;
  }
  
  // Security features (15%)
  if (checks.securityFeatures) {
    score += checks.securityFeatures.passed ? 15 : 0;
    totalChecks += 15;
  }
  
  // Anti-tampering (10%)
  if (checks.tampering) {
    score += checks.tampering.detected ? 0 : 10;
    totalChecks += 10;
  }
  
  this.validation.validationScore = totalChecks > 0 ? Math.round(score) : 0;
  this.validation.isValid = this.validation.validationScore >= 70;
  
  return this.validation.validationScore;
};

// Static methods
documentSchema.statics.findByDocumentId = function(documentId) {
  return this.findOne({ documentId });
};

documentSchema.statics.getProcessingStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgProcessingTime: { $avg: '$processing.totalProcessingTime' }
      }
    }
  ]);
};

documentSchema.statics.getPendingProcessing = function() {
  return this.find({
    status: { $in: ['UPLOADED', 'QUEUED', 'PROCESSING'] }
  }).sort({ 'processing.priority': -1, createdAt: 1 });
};

// Pre-save middleware
documentSchema.pre('save', function(next) {
  if (this.isModified('validation.checks')) {
    this.calculateValidationScore();
  }
  next();
});

export default mongoose.model('Document', documentSchema);
