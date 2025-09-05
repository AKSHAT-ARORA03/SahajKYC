const mongoose = require('mongoose');

/**
 * Sync Queue Item Schema - For offline-first architecture
 * Manages synchronization of data when connection is restored
 */
const syncQueueItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  operation: {
    type: String,
    required: true,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'UPLOAD', 'VERIFY'],
    index: true
  },
  
  resource: {
    type: String,
    required: true,
    enum: ['USER', 'KYC_APPLICATION', 'DOCUMENT', 'FACE_VERIFICATION'],
    index: true
  },
  
  resourceId: {
    type: String,
    required: true
  },
  
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  priority: {
    type: Number,
    default: 5,
    min: 1,
    max: 10,
    index: true
  },
  
  status: {
    type: String,
    default: 'PENDING',
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    index: true
  },
  
  attempts: {
    type: Number,
    default: 0,
    max: 5
  },
  
  lastAttemptAt: {
    type: Date
  },
  
  errorMessage: {
    type: String
  },
  
  syncedAt: {
    type: Date
  },
  
  deviceInfo: {
    userAgent: String,
    platform: String,
    networkType: String,
    batteryLevel: Number
  },
  
  metadata: {
    originalTimestamp: Date,
    fileSize: Number,
    checksums: {
      md5: String,
      sha256: String
    },
    dependencies: [String] // Other sync items this depends on
  }
}, {
  timestamps: true,
  collection: 'sync_queue_items'
});

// Indexes for efficient querying
syncQueueItemSchema.index({ userId: 1, status: 1, priority: -1 });
syncQueueItemSchema.index({ createdAt: 1 }); // For cleanup jobs
syncQueueItemSchema.index({ status: 1, attempts: 1, lastAttemptAt: 1 });

// TTL index to auto-delete completed items after 30 days
syncQueueItemSchema.index(
  { syncedAt: 1 }, 
  { 
    expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
    partialFilterExpression: { status: 'COMPLETED' }
  }
);

// Virtual for retry eligibility
syncQueueItemSchema.virtual('canRetry').get(function() {
  return this.attempts < 5 && this.status === 'FAILED';
});

// Instance method to mark as processing
syncQueueItemSchema.methods.markAsProcessing = function() {
  this.status = 'PROCESSING';
  this.lastAttemptAt = new Date();
  this.attempts += 1;
  return this.save();
};

// Instance method to mark as completed
syncQueueItemSchema.methods.markAsCompleted = function() {
  this.status = 'COMPLETED';
  this.syncedAt = new Date();
  return this.save();
};

// Instance method to mark as failed
syncQueueItemSchema.methods.markAsFailed = function(errorMessage) {
  this.status = 'FAILED';
  this.errorMessage = errorMessage;
  this.lastAttemptAt = new Date();
  return this.save();
};

// Static method to get pending items for a user
syncQueueItemSchema.statics.getPendingForUser = function(userId, limit = 10) {
  return this.find({
    userId: userId,
    status: 'PENDING'
  })
  .sort({ priority: -1, createdAt: 1 })
  .limit(limit);
};

// Static method to get retry-eligible items
syncQueueItemSchema.statics.getRetryEligible = function(limit = 50) {
  const retryDelay = 5 * 60 * 1000; // 5 minutes
  const cutoffTime = new Date(Date.now() - retryDelay);
  
  return this.find({
    status: 'FAILED',
    attempts: { $lt: 5 },
    $or: [
      { lastAttemptAt: { $lte: cutoffTime } },
      { lastAttemptAt: { $exists: false } }
    ]
  })
  .sort({ priority: -1, lastAttemptAt: 1 })
  .limit(limit);
};

// Static method to cleanup old items
syncQueueItemSchema.statics.cleanup = function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  return this.deleteMany({
    $or: [
      { status: 'COMPLETED', syncedAt: { $lte: thirtyDaysAgo } },
      { status: 'CANCELLED', updatedAt: { $lte: thirtyDaysAgo } },
      { status: 'FAILED', attempts: { $gte: 5 }, lastAttemptAt: { $lte: thirtyDaysAgo } }
    ]
  });
};

// Pre-save middleware
syncQueueItemSchema.pre('save', function(next) {
  if (this.isNew) {
    // Set original timestamp if not provided
    if (!this.metadata.originalTimestamp) {
      this.metadata.originalTimestamp = new Date();
    }
  }
  next();
});

const SyncQueueItem = mongoose.model('SyncQueueItem', syncQueueItemSchema);

module.exports = SyncQueueItem;
