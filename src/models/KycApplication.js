import mongoose from 'mongoose';

const kycApplicationSchema = new mongoose.Schema({
  // References
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  
  // Identification
  applicationId: { 
    type: String, 
    unique: true,
    default: () => `KYC_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  },
  
  // Application Status
  status: {
    type: String,
    enum: [
      'INITIATED',        // Just started
      'DOCUMENTS_PENDING', // Waiting for document upload
      'DOCUMENTS_UPLOADED', // Documents uploaded, processing
      'FACE_VERIFICATION_PENDING', // Face verification needed
      'IN_PROGRESS',      // All data submitted, under processing
      'UNDER_REVIEW',     // Manual review required
      'APPROVED',         // KYC approved
      'REJECTED',         // KYC rejected
      'EXPIRED',          // Application expired
      'CANCELLED'         // User cancelled
    ],
    default: 'INITIATED',
    index: true
  },
  
  // Method Used
  method: {
    type: String,
    enum: ['DIGILOCKER', 'DOCUMENTS', 'HYBRID'],
    required: true,
    index: true
  },
  
  // Priority Level
  priority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL'
  },
  
  // Application Progress
  progress: {
    percentage: { type: Number, min: 0, max: 100, default: 0 },
    currentStep: {
      type: String,
      enum: [
        'PERSONAL_INFO',
        'DOCUMENT_UPLOAD',
        'FACE_VERIFICATION', 
        'REVIEW',
        'COMPLETED'
      ],
      default: 'PERSONAL_INFO'
    },
    stepsCompleted: [String],
    estimatedCompletion: Date
  },
  
  // Personal Information (extracted or provided)
  personalInfo: {
    // Basic Information
    name: String,
    fatherName: String,
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    
    // Identity Numbers
    aadhaarNumber: {
      type: String,
      match: /^\d{12}$/,
      sparse: true
    },
    panNumber: {
      type: String,
      match: /^[A-Z]{5}\d{4}[A-Z]$/,
      sparse: true
    },
    
    // Address
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' }
    },
    
    // Contact
    phone: String,
    email: String,
    
    // Metadata
    extractedFrom: {
      type: String,
      enum: ['DIGILOCKER', 'OCR_AADHAAR', 'OCR_PAN', 'MANUAL', 'MIXED']
    },
    extractedAt: Date,
    confidence: { type: Number, min: 0, max: 1 }
  },
  
  // Document References
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  
  // Face Verification References
  faceVerifications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FaceVerification'
  }],
  
  // Verification Results
  verification: {
    // Document Verification
    documentsVerified: { type: Boolean, default: false },
    documentScore: { type: Number, min: 0, max: 100, default: 0 },
    documentIssues: [String],
    
    // Face Verification
    faceVerified: { type: Boolean, default: false },
    faceScore: { type: Number, min: 0, max: 100, default: 0 },
    faceIssues: [String],
    
    // Address Verification
    addressVerified: { type: Boolean, default: false },
    addressScore: { type: Number, min: 0, max: 100, default: 0 },
    
    // Phone Verification
    phoneVerified: { type: Boolean, default: false },
    phoneVerificationMethod: String, // OTP, MISSED_CALL, etc.
    
    // Overall Assessment
    overallScore: { type: Number, min: 0, max: 100, default: 0 },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },
    riskFactors: [String],
    
    // AI Analysis
    aiAnalysis: {
      confidence: Number,
      flags: [String],
      recommendations: [String],
      modelVersion: String,
      processedAt: Date
    }
  },
  
  // Compliance & Audit
  compliance: {
    ipAddress: String,
    userAgent: String,
    location: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
      city: String,
      state: String,
      country: String
    },
    deviceFingerprint: String,
    sessionId: String,
    consentGiven: { type: Boolean, required: true },
    consentTimestamp: Date,
    privacyPolicyVersion: String,
    termsVersion: String
  },
  
  // Review Information
  review: {
    isRequired: { type: Boolean, default: false },
    reviewerId: String, // Admin/reviewer ID
    reviewerName: String,
    reviewedAt: Date,
    reviewNotes: String,
    reviewDecision: {
      type: String,
      enum: ['APPROVED', 'REJECTED', 'NEEDS_MORE_INFO']
    },
    rejectionReason: {
      type: String,
      enum: [
        'INVALID_DOCUMENTS',
        'POOR_IMAGE_QUALITY',
        'FACE_MISMATCH',
        'SUSPICIOUS_ACTIVITY',
        'INCOMPLETE_INFORMATION',
        'DUPLICATE_APPLICATION',
        'OTHER'
      ]
    },
    rejectionDetails: String,
    requiredActions: [String],
    reviewDuration: Number // minutes
  },
  
  // Communication Log
  communications: [{
    type: {
      type: String,
      enum: ['EMAIL', 'SMS', 'PUSH', 'IN_APP']
    },
    subject: String,
    message: String,
    sentAt: Date,
    delivered: Boolean,
    opened: Boolean
  }],
  
  // Important Timestamps
  submittedAt: Date,
  completedAt: Date,
  approvedAt: Date,
  rejectedAt: Date,
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from creation
  }
}, {
  timestamps: true,
  collection: 'kyc_applications',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
kycApplicationSchema.index({ userId: 1, status: 1 });
kycApplicationSchema.index({ applicationId: 1 });
kycApplicationSchema.index({ status: 1, createdAt: -1 });
kycApplicationSchema.index({ method: 1, status: 1 });
kycApplicationSchema.index({ 'personalInfo.aadhaarNumber': 1 });
kycApplicationSchema.index({ 'personalInfo.panNumber': 1 });
kycApplicationSchema.index({ expiresAt: 1 }); // TTL index
kycApplicationSchema.index({ 'verification.overallScore': -1 });

// Compound indexes
kycApplicationSchema.index({ status: 1, priority: -1, createdAt: 1 });
kycApplicationSchema.index({ userId: 1, createdAt: -1 });

// TTL index for expired applications
kycApplicationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual fields
kycApplicationSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

kycApplicationSchema.virtual('daysUntilExpiry').get(function() {
  const now = new Date();
  const diffTime = this.expiresAt - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

kycApplicationSchema.virtual('processingTime').get(function() {
  if (!this.completedAt) return null;
  return this.completedAt - this.createdAt;
});

// Methods
kycApplicationSchema.methods.updateProgress = function(step, percentage) {
  this.progress.currentStep = step;
  this.progress.percentage = percentage;
  if (!this.progress.stepsCompleted.includes(step)) {
    this.progress.stepsCompleted.push(step);
  }
  return this.save();
};

kycApplicationSchema.methods.calculateOverallScore = function() {
  const weights = {
    document: 0.4,
    face: 0.3,
    address: 0.2,
    phone: 0.1
  };
  
  let totalScore = 0;
  totalScore += (this.verification.documentScore || 0) * weights.document;
  totalScore += (this.verification.faceScore || 0) * weights.face;
  totalScore += (this.verification.addressScore || 0) * weights.address;
  totalScore += (this.verification.phoneVerified ? 100 : 0) * weights.phone;
  
  this.verification.overallScore = Math.round(totalScore);
  return this.verification.overallScore;
};

kycApplicationSchema.methods.shouldRequireReview = function() {
  const reviewThreshold = 70;
  const highRiskFactors = ['DUPLICATE_APPLICATION', 'SUSPICIOUS_ACTIVITY', 'POOR_IMAGE_QUALITY'];
  
  const lowScore = this.verification.overallScore < reviewThreshold;
  const hasHighRiskFactors = this.verification.riskFactors.some(factor => 
    highRiskFactors.includes(factor)
  );
  
  return lowScore || hasHighRiskFactors || this.verification.riskLevel === 'HIGH';
};

// Static methods
kycApplicationSchema.statics.findByApplicationId = function(applicationId) {
  return this.findOne({ applicationId });
};

kycApplicationSchema.statics.getApplicationStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgScore: { $avg: '$verification.overallScore' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

kycApplicationSchema.statics.getPendingReviews = function() {
  return this.find({
    status: 'UNDER_REVIEW',
    'review.reviewedAt': { $exists: false }
  }).populate('userId', 'profile.firstName profile.lastName email phone');
};

// Pre-save middleware
kycApplicationSchema.pre('save', function(next) {
  // Auto-calculate overall score
  if (this.isModified('verification')) {
    this.calculateOverallScore();
  }
  
  // Auto-determine if review is required
  if (this.verification.overallScore > 0 && !this.review.isRequired) {
    this.review.isRequired = this.shouldRequireReview();
  }
  
  next();
});

export default mongoose.model('KycApplication', kycApplicationSchema);
