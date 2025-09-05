const mongoose = require('mongoose');

/**
 * Audit Log Schema - For compliance and security tracking
 * Comprehensive logging for all KYC-related activities
 */
const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  sessionId: {
    type: String,
    index: true
  },
  
  action: {
    type: String,
    required: true,
    enum: [
      // Authentication actions
      'USER_LOGIN', 'USER_LOGOUT', 'USER_REGISTER', 'USER_PASSWORD_CHANGE',
      'OTP_SENT', 'OTP_VERIFIED', 'OTP_FAILED',
      
      // KYC actions
      'KYC_APPLICATION_CREATED', 'KYC_APPLICATION_UPDATED', 'KYC_APPLICATION_SUBMITTED',
      'KYC_APPLICATION_APPROVED', 'KYC_APPLICATION_REJECTED', 'KYC_APPLICATION_REVIEWED',
      
      // Document actions
      'DOCUMENT_UPLOADED', 'DOCUMENT_VALIDATED', 'DOCUMENT_OCR_PROCESSED',
      'DOCUMENT_DELETED', 'DOCUMENT_DOWNLOADED',
      
      // Face recognition actions
      'FACE_DETECTION_PERFORMED', 'FACE_VERIFICATION_PERFORMED', 'FACE_MATCHING_PERFORMED',
      'LIVENESS_CHECK_PERFORMED', 'FACE_VERIFICATION_FAILED',
      
      // Setu DigiLocker actions
      'SETU_DIGILOCKER_REQUEST_CREATED', 'SETU_DIGILOCKER_CALLBACK_RECEIVED',
      'SETU_AADHAAR_FETCHED', 'SETU_DOCUMENT_FETCHED', 'SETU_ACCESS_REVOKED',
      
      // Admin actions
      'ADMIN_USER_ACCESSED', 'ADMIN_APPLICATION_REVIEWED', 'ADMIN_SETTINGS_CHANGED',
      'ADMIN_BULK_OPERATION', 'ADMIN_REPORT_GENERATED',
      
      // System actions
      'SYSTEM_BACKUP_CREATED', 'SYSTEM_MAINTENANCE', 'SYSTEM_ERROR_OCCURRED',
      'DATA_EXPORT_REQUESTED', 'DATA_DELETION_REQUESTED',
      
      // Security actions
      'SUSPICIOUS_ACTIVITY_DETECTED', 'RATE_LIMIT_EXCEEDED', 'UNAUTHORIZED_ACCESS_ATTEMPT',
      'DATA_BREACH_DETECTED', 'ENCRYPTION_KEY_ROTATED'
    ],
    index: true
  },
  
  resource: {
    type: String,
    required: true,
    enum: ['User', 'KycApplication', 'Document', 'FaceVerification', 'SetuDigiLocker', 'System', 'Admin'],
    index: true
  },
  
  resourceId: {
    type: String,
    index: true
  },
  
  status: {
    type: String,
    required: true,
    enum: ['SUCCESS', 'FAILURE', 'WARNING', 'INFO'],
    default: 'SUCCESS',
    index: true
  },
  
  ipAddress: {
    type: String,
    index: true
  },
  
  userAgent: {
    type: String
  },
  
  location: {
    country: String,
    state: String,
    city: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  deviceInfo: {
    platform: String,
    browser: String,
    version: String,
    mobile: Boolean,
    screenResolution: String
  },
  
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  duration: {
    type: Number // in milliseconds
  },
  
  errorDetails: {
    code: String,
    message: String,
    stack: String
  },
  
  complianceFlags: {
    gdprRelevant: {
      type: Boolean,
      default: false
    },
    pdpaRelevant: {
      type: Boolean,
      default: false
    },
    pciRelevant: {
      type: Boolean,
      default: false
    },
    retentionPeriod: {
      type: Number, // days
      default: 2555 // 7 years for financial compliance
    }
  },
  
  riskLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW',
    index: true
  },
  
  tags: [{
    type: String,
    index: true
  }]
}, {
  timestamps: true,
  collection: 'audit_logs'
});

// Compound indexes for efficient querying
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ status: 1, riskLevel: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ sessionId: 1, createdAt: -1 });
auditLogSchema.index({ ipAddress: 1, createdAt: -1 });

// TTL index for compliance-based retention
auditLogSchema.index(
  { createdAt: 1 },
  { 
    expireAfterSeconds: 2555 * 24 * 60 * 60, // 7 years (financial compliance)
    partialFilterExpression: { 
      'complianceFlags.gdprRelevant': false,
      'complianceFlags.pdpaRelevant': false 
    }
  }
);

// Text index for search functionality
auditLogSchema.index({
  action: 'text',
  'metadata.description': 'text',
  'errorDetails.message': 'text'
});

// Virtual for formatted timestamp
auditLogSchema.virtual('formattedTimestamp').get(function() {
  return this.createdAt.toISOString();
});

// Virtual for anonymized IP (for GDPR compliance)
auditLogSchema.virtual('anonymizedIP').get(function() {
  if (!this.ipAddress) return null;
  
  const parts = this.ipAddress.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  return 'xxx.xxx.xxx.xxx';
});

// Static method to create audit log entry
auditLogSchema.statics.createLog = function(logData) {
  const auditEntry = new this({
    ...logData,
    timestamp: new Date()
  });
  
  return auditEntry.save();
};

// Static method to get user activity
auditLogSchema.statics.getUserActivity = function(userId, limit = 50, startDate = null, endDate = null) {
  const query = { userId };
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-metadata -userAgent -errorDetails.stack');
};

// Static method to get security events
auditLogSchema.statics.getSecurityEvents = function(limit = 100, riskLevel = 'HIGH') {
  return this.find({
    $or: [
      { riskLevel: { $in: [riskLevel, 'CRITICAL'] } },
      { action: { $regex: /SUSPICIOUS|UNAUTHORIZED|BREACH/ } },
      { status: 'FAILURE', action: { $regex: /LOGIN|AUTH/ } }
    ]
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Static method to get compliance report
auditLogSchema.statics.getComplianceReport = function(startDate, endDate, complianceType = null) {
  const match = {
    createdAt: { $gte: startDate, $lte: endDate }
  };
  
  if (complianceType) {
    match[`complianceFlags.${complianceType}Relevant`] = true;
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          action: '$action',
          status: '$status',
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
        },
        count: { $sum: 1 },
        riskLevels: { $push: '$riskLevel' }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        actions: {
          $push: {
            action: '$_id.action',
            status: '$_id.status',
            count: '$count',
            riskLevels: '$riskLevels'
          }
        },
        totalEvents: { $sum: '$count' }
      }
    },
    { $sort: { _id: -1 } }
  ]);
};

// Static method to detect anomalies
auditLogSchema.statics.detectAnomalies = function(userId, timeWindow = 24) {
  const windowStart = new Date(Date.now() - timeWindow * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        userId: userId,
        createdAt: { $gte: windowStart }
      }
    },
    {
      $group: {
        _id: {
          action: '$action',
          ipAddress: '$ipAddress',
          hour: { $hour: '$createdAt' }
        },
        count: { $sum: 1 },
        distinctLocations: { $addToSet: '$location.city' },
        statuses: { $push: '$status' }
      }
    },
    {
      $match: {
        $or: [
          { count: { $gt: 10 } }, // High frequency
          { 'distinctLocations.1': { $exists: true } }, // Multiple locations
          { statuses: 'FAILURE' } // Failed attempts
        ]
      }
    }
  ]);
};

// Pre-save middleware for risk assessment
auditLogSchema.pre('save', function(next) {
  // Auto-assign risk level based on action and status
  if (this.isNew) {
    if (this.status === 'FAILURE' && this.action.includes('LOGIN')) {
      this.riskLevel = 'MEDIUM';
    } else if (this.action.includes('SUSPICIOUS') || this.action.includes('BREACH')) {
      this.riskLevel = 'CRITICAL';
    } else if (this.action.includes('ADMIN') || this.action.includes('DELETE')) {
      this.riskLevel = 'MEDIUM';
    }
    
    // Add compliance flags based on action
    if (this.action.includes('USER') || this.action.includes('DOCUMENT')) {
      this.complianceFlags.gdprRelevant = true;
      this.complianceFlags.pdpaRelevant = true;
    }
    
    if (this.action.includes('PAYMENT') || this.action.includes('FINANCIAL')) {
      this.complianceFlags.pciRelevant = true;
    }
  }
  
  next();
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
