import mongoose from 'mongoose';

const faceVerificationSchema = new mongoose.Schema({
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
  verificationId: {
    type: String,
    unique: true,
    default: () => `FACE_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  },
  
  // Verification Type & Status
  type: {
    type: String,
    enum: [
      'LIVENESS',           // Basic liveness detection
      'FACE_MATCH',         // Face matching between images
      'MULTI_FRAME',        // Advanced multi-frame liveness
      'DOCUMENT_FACE_MATCH', // Match face with document photo
      'COMBO'               // Combined liveness + matching
    ],
    required: true,
    index: true
  },
  
  status: {
    type: String,
    enum: [
      'PENDING',           // Not yet processed
      'IN_PROGRESS',       // Currently processing
      'SUCCESS',           // Verification successful
      'FAILED',            // Verification failed
      'ERROR',             // Processing error
      'CANCELLED',         // User cancelled
      'EXPIRED'            // Verification expired
    ],
    default: 'PENDING',
    index: true
  },
  
  // Image Data
  images: {
    // Primary live image
    liveImage: {
      url: String,
      quality: { type: Number, min: 0, max: 100 },
      dimensions: {
        width: Number,
        height: Number
      },
      captureMethod: String, // 'camera', 'upload'
      timestamp: Date
    },
    
    // Reference image (from document or previous verification)
    referenceImage: {
      url: String,
      source: String, // 'document', 'previous_verification'
      quality: { type: Number, min: 0, max: 100 }
    },
    
    // Additional frames for multi-frame liveness
    additionalFrames: [{
      url: String,
      frameNumber: Number,
      timestamp: Date,
      quality: Number,
      metadata: mongoose.Schema.Types.Mixed
    }],
    
    // Processed images (cropped faces, enhanced versions)
    processedImages: {
      croppedFace: String,
      enhancedImage: String,
      landmarks: String // Image with landmark overlays
    }
  },
  
  // Liveness Detection Results
  liveness: {
    // Provider Information
    provider: { 
      type: String, 
      enum: ['face-api-js', 'mediapipe', 'google-vision', 'custom'],
      default: 'face-api-js'
    },
    modelVersion: String,
    
    // Overall Results
    score: { type: Number, min: 0, max: 1, default: 0 },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    decision: { type: Boolean, default: false },
    
    // Detailed Checks
    checks: {
      // Basic Liveness
      eyesOpen: {
        passed: Boolean,
        confidence: Number,
        leftEye: Number,
        rightEye: Number
      },
      
      // Face Movement
      mouthMovement: {
        passed: Boolean,
        confidence: Number,
        openings: Number,
        maxOpening: Number
      },
      
      // Head Pose
      headPose: { 
        passed: Boolean,
        naturalPose: Boolean,
        pitch: Number,
        yaw: Number,
        roll: Number,
        stability: Number
      },
      
      // Advanced Checks
      blinkDetection: {
        passed: Boolean,
        blinkCount: Number,
        avgBlinkDuration: Number,
        naturalPattern: Boolean
      },
      
      // Expression Analysis
      expressionAnalysis: {
        dominant: String,
        confidence: Number,
        expressions: {
          neutral: Number,
          happy: Number,
          sad: Number,
          angry: Number,
          surprised: Number,
          fearful: Number,
          disgusted: Number
        },
        naturalVariation: Boolean
      },
      
      // Lighting & Quality
      imageQuality: {
        passed: Boolean,
        brightness: Number,
        contrast: Number,
        sharpness: Number,
        uniformLighting: Boolean,
        shadows: Boolean
      }
    },
    
    // Anti-Spoofing Detection
    antiSpoofing: {
      overall: Boolean,
      confidence: Number,
      
      // Screen Detection
      screenDetection: {
        detected: Boolean,
        confidence: Number,
        indicators: [String] // 'pixel-pattern', 'refresh-rate', 'moire'
      },
      
      // Mask/Photo Detection
      maskDetection: {
        detected: Boolean,
        confidence: Number,
        type: String // 'photo', 'video', '3d-mask', 'silicone'
      },
      
      // Deepfake Detection
      deepfakeDetection: {
        detected: Boolean,
        confidence: Number,
        artifacts: [String]
      },
      
      // Texture Analysis
      textureAnalysis: {
        skinTexture: Number,
        naturalVariation: Boolean,
        suspiciousArtifacts: [String]
      }
    },
    
    // Processing Information
    processingTime: Number, // milliseconds
    processedAt: Date,
    frameCount: Number,
    analysisDetails: mongoose.Schema.Types.Mixed
  },
  
  // Face Matching Results (if applicable)
  faceMatch: {
    // Similarity Metrics
    similarity: { type: Number, min: 0, max: 1 },
    confidence: { type: Number, min: 0, max: 1 },
    threshold: { type: Number, default: 0.75 },
    decision: { type: Boolean, default: false },
    
    // Detailed Analysis
    faceDescriptor: {
      dimensions: Number,
      algorithm: String,
      version: String
    },
    
    // Feature Matching
    landmarks: {
      matched: Number,
      total: Number,
      confidence: Number,
      keyPoints: mongoose.Schema.Types.Mixed
    },
    
    // Geometric Analysis
    faceGeometry: {
      eyeDistance: Number,
      noseWidth: Number,
      mouthWidth: Number,
      faceWidth: Number,
      faceHeight: Number,
      similarity: Number
    },
    
    // Processing Info
    algorithm: String,
    processingTime: Number,
    processedAt: Date
  },
  
  // Overall Verification Result
  result: {
    // Final Decision
    passed: { type: Boolean, default: false },
    overallScore: { type: Number, min: 0, max: 100, default: 0 },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    
    // Failure Analysis
    failureReasons: [String],
    criticalIssues: [String],
    warnings: [String],
    
    // Recommendations
    recommendations: [String],
    suggestedRetry: Boolean,
    retryInstructions: [String],
    
    // Risk Assessment
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },
    riskFactors: [String]
  },
  
  // Processing Metadata
  processing: {
    // Attempt Information
    attemptNumber: { type: Number, default: 1 },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    
    // Processing Pipeline
    stages: [{
      name: String,
      status: String,
      startTime: Date,
      endTime: Date,
      duration: Number,
      error: String
    }],
    
    // Performance Metrics
    totalProcessingTime: Number,
    faceDetectionTime: Number,
    livenessAnalysisTime: Number,
    faceMatchingTime: Number,
    
    // Technical Details
    worker: String,
    environment: String,
    resourceUsage: {
      cpu: Number,
      memory: Number,
      gpu: Number
    }
  },
  
  // Session & Device Information
  session: {
    sessionId: String,
    deviceInfo: {
      userAgent: String,
      platform: String,
      isMobile: Boolean,
      hasCamera: Boolean,
      cameraSpecs: {
        resolution: String,
        fps: Number,
        facing: String // 'front', 'back'
      },
      screenResolution: String
    },
    networkInfo: {
      connectionType: String,
      speed: String,
      latency: Number
    },
    location: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
      city: String,
      state: String,
      country: String
    },
    timestamp: Date,
    duration: Number, // Total session duration in seconds
    interactions: Number // User interactions during verification
  },
  
  // Quality Metrics
  quality: {
    imageQuality: { type: Number, min: 0, max: 100 },
    faceQuality: { type: Number, min: 0, max: 100 },
    livenessQuality: { type: Number, min: 0, max: 100 },
    overallQuality: { type: Number, min: 0, max: 100 },
    
    qualityIssues: [String],
    improvementSuggestions: [String]
  }
}, {
  timestamps: true,
  collection: 'face_verifications',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
faceVerificationSchema.index({ userId: 1, type: 1 });
faceVerificationSchema.index({ verificationId: 1 });
faceVerificationSchema.index({ kycApplicationId: 1 });
faceVerificationSchema.index({ status: 1, createdAt: -1 });
faceVerificationSchema.index({ 'result.passed': 1 });
faceVerificationSchema.index({ 'liveness.provider': 1 });

// Compound indexes
faceVerificationSchema.index({ userId: 1, status: 1, type: 1 });
faceVerificationSchema.index({ status: 1, createdAt: -1 });

// Virtual fields
faceVerificationSchema.virtual('isCompleted').get(function() {
  return ['SUCCESS', 'FAILED', 'ERROR'].includes(this.status);
});

faceVerificationSchema.virtual('processingDuration').get(function() {
  if (!this.processing.totalProcessingTime) return null;
  return Math.round(this.processing.totalProcessingTime / 1000); // Convert to seconds
});

// Methods
faceVerificationSchema.methods.updateStage = function(stageName, status, error = null) {
  const stage = this.processing.stages.find(s => s.name === stageName);
  
  if (stage) {
    stage.status = status;
    if (status === 'processing' && !stage.startTime) {
      stage.startTime = new Date();
    }
    if (['completed', 'failed'].includes(status)) {
      stage.endTime = new Date();
      if (stage.startTime) {
        stage.duration = stage.endTime - stage.startTime;
      }
    }
    if (error) stage.error = error;
  } else {
    this.processing.stages.push({
      name: stageName,
      status,
      startTime: status === 'processing' ? new Date() : undefined
    });
  }
  
  return this.save();
};

faceVerificationSchema.methods.calculateOverallScore = function() {
  let score = 0;
  let totalWeight = 0;
  
  // Liveness score (60% weight for liveness-type verifications)
  if (this.liveness && this.liveness.score > 0) {
    const livenessWeight = this.type.includes('LIVENESS') ? 60 : 30;
    score += this.liveness.score * 100 * livenessWeight;
    totalWeight += livenessWeight;
  }
  
  // Face match score (40% weight for matching-type verifications)
  if (this.faceMatch && this.faceMatch.similarity > 0) {
    const matchWeight = this.type.includes('MATCH') ? 60 : 40;
    score += this.faceMatch.similarity * 100 * matchWeight;
    totalWeight += matchWeight;
  }
  
  // Image quality (10% weight)
  if (this.quality && this.quality.overallQuality > 0) {
    score += this.quality.overallQuality * 10;
    totalWeight += 10;
  }
  
  this.result.overallScore = totalWeight > 0 ? Math.round(score / totalWeight) : 0;
  this.result.passed = this.result.overallScore >= 75; // 75% threshold
  
  return this.result.overallScore;
};

// Static methods
faceVerificationSchema.statics.findByVerificationId = function(verificationId) {
  return this.findOne({ verificationId });
};

faceVerificationSchema.statics.getVerificationStats = function(timeframe = '24h') {
  const since = new Date();
  since.setHours(since.getHours() - parseInt(timeframe));
  
  return this.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: {
          status: '$status',
          type: '$type'
        },
        count: { $sum: 1 },
        avgScore: { $avg: '$result.overallScore' },
        avgProcessingTime: { $avg: '$processing.totalProcessingTime' }
      }
    }
  ]);
};

// Pre-save middleware
faceVerificationSchema.pre('save', function(next) {
  if (this.isModified('liveness') || this.isModified('faceMatch')) {
    this.calculateOverallScore();
  }
  next();
});

export default mongoose.model('FaceVerification', faceVerificationSchema);
