import mongoose from 'mongoose';
import { encrypt, decrypt } from './encryption';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      retryReads: true,
      w: 'majority',
      journal: true,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ Connected to MongoDB Atlas');
      return mongoose;
    }).catch((error) => {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

/**
 * MongoDB Field Encryption Plugin
 * Automatically encrypts/decrypts sensitive fields
 */
function encryptionPlugin(schema, options = {}) {
  const { fields = [] } = options;

  // Pre-save hook to encrypt sensitive fields
  schema.pre('save', function(next) {
    fields.forEach(field => {
      if (this[field] && this.isModified(field)) {
        try {
          this[field] = encrypt(this[field]);
        } catch (error) {
          console.error(`Error encrypting field ${field}:`, error);
        }
      }
    });
    next();
  });

  // Transform function to decrypt on read
  schema.set('toJSON', {
    transform: function(doc, ret) {
      fields.forEach(field => {
        if (ret[field]) {
          try {
            ret[field] = decrypt(ret[field]);
          } catch (error) {
            console.error(`Error decrypting field ${field}:`, error);
            ret[field] = '[ENCRYPTED]';
          }
        }
      });
      return ret;
    }
  });

  // Instance method to get encrypted value
  schema.methods.getEncrypted = function(field) {
    if (fields.includes(field) && this[field]) {
      try {
        return encrypt(this[field]);
      } catch (error) {
        console.error(`Error encrypting field ${field}:`, error);
        return null;
      }
    }
    return this[field];
  };

  // Instance method to get decrypted value
  schema.methods.getDecrypted = function(field) {
    if (fields.includes(field) && this[field]) {
      try {
        return decrypt(this[field]);
      } catch (error) {
        console.error(`Error decrypting field ${field}:`, error);
        return '[ENCRYPTED]';
      }
    }
    return this[field];
  };
}

/**
 * Audit Trail Plugin
 * Automatically tracks changes for compliance
 */
function auditPlugin(schema, options = {}) {
  const { exclude = [] } = options;

  schema.pre('save', function(next) {
    if (this.isNew) {
      this._auditAction = 'CREATE';
    } else if (this.isModified()) {
      this._auditAction = 'UPDATE';
      this._modifiedFields = this.modifiedPaths().filter(path => !exclude.includes(path));
    }
    next();
  });

  schema.post('save', async function(doc) {
    if (doc._auditAction) {
      try {
        const AuditLog = mongoose.model('AuditLog');
        await AuditLog.create({
          entityType: this.constructor.modelName,
          entityId: this._id,
          action: doc._auditAction,
          changes: doc._modifiedFields ? doc._modifiedFields.reduce((acc, field) => {
            acc[field] = this[field];
            return acc;
          }, {}) : undefined,
          performedBy: this.userId || this.clerkId || 'system',
          timestamp: new Date(),
          metadata: {
            userAgent: this._userAgent,
            ipAddress: this._ipAddress,
            sessionId: this._sessionId
          }
        });
      } catch (error) {
        console.error('Error creating audit log:', error);
      }
    }
  });

  schema.pre('remove', function(next) {
    this._auditAction = 'DELETE';
    next();
  });

  schema.post('remove', async function(doc) {
    try {
      const AuditLog = mongoose.model('AuditLog');
      await AuditLog.create({
        entityType: this.constructor.modelName,
        entityId: this._id,
        action: 'DELETE',
        performedBy: this.userId || this.clerkId || 'system',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  });
}

/**
 * Soft Delete Plugin
 * Marks documents as deleted instead of removing them
 */
function softDeletePlugin(schema, options = {}) {
  schema.add({
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    },
    deletedBy: {
      type: String,
      default: null
    }
  });

  // Override remove to soft delete
  schema.methods.remove = function(callback) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save(callback);
  };

  // Add restore method
  schema.methods.restore = function(callback) {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    return this.save(callback);
  };

  // Modify find queries to exclude deleted documents
  schema.pre(/^find/, function() {
    if (!this.getQuery().isDeleted) {
      this.where({ isDeleted: { $ne: true } });
    }
  });

  // Add static method to find deleted documents
  schema.statics.findDeleted = function() {
    return this.find({ isDeleted: true });
  };

  // Add static method to find with deleted documents
  schema.statics.findWithDeleted = function() {
    return this.find({});
  };
}

/**
 * Validation Plugin for Indian-specific data
 */
function indianValidationPlugin(schema) {
  // Add custom validators
  schema.path('phone')?.validate(function(phone) {
    if (!phone) return true; // Allow empty phone
    return /^(\+91|91)?[6-9]\d{9}$/.test(phone);
  }, 'Invalid Indian mobile number format');

  schema.path('email')?.validate(function(email) {
    if (!email) return true; // Allow empty email
    return /^\S+@\S+\.\S+$/.test(email);
  }, 'Invalid email format');

  // Add Aadhaar validation if field exists
  if (schema.paths.aadhaarNumber) {
    schema.path('aadhaarNumber').validate(function(aadhaar) {
      if (!aadhaar) return true;
      // Aadhaar format: 12 digits, no sequential/repeated numbers
      return /^\d{12}$/.test(aadhaar) && 
             !/^(\d)\1{11}$/.test(aadhaar) && // No all same digits
             !/^0123456789/.test(aadhaar.slice(0, 10)); // No sequential
    }, 'Invalid Aadhaar number format');
  }

  // Add PAN validation if field exists
  if (schema.paths.panNumber) {
    schema.path('panNumber').validate(function(pan) {
      if (!pan) return true;
      // PAN format: 5 letters, 4 digits, 1 letter
      return /^[A-Z]{5}\d{4}[A-Z]$/.test(pan);
    }, 'Invalid PAN number format');
  }

  // Add pincode validation if field exists
  if (schema.paths.pincode || schema.paths['address.pincode']) {
    const pincodePath = schema.paths.pincode || schema.paths['address.pincode'];
    pincodePath.validate(function(pincode) {
      if (!pincode) return true;
      return /^[1-9][0-9]{5}$/.test(pincode);
    }, 'Invalid Indian pincode format');
  }
}

/**
 * Performance Optimization Plugin
 */
function performancePlugin(schema) {
  // Add common indexes
  schema.index({ createdAt: -1 });
  schema.index({ updatedAt: -1 });
  schema.index({ isDeleted: 1 });

  // Add lean method for read-only operations
  schema.statics.findLean = function(query = {}) {
    return this.find(query).lean().exec();
  };

  // Add pagination helper
  schema.statics.paginate = function(query = {}, options = {}) {
    const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
    const skip = (page - 1) * limit;

    return Promise.all([
      this.find(query).sort(sort).skip(skip).limit(limit).exec(),
      this.countDocuments(query)
    ]).then(([docs, total]) => ({
      docs,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      limit: parseInt(limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }));
  };
}

// Export plugins
export {
  connectDB,
  encryptionPlugin,
  auditPlugin,
  softDeletePlugin,
  indianValidationPlugin,
  performancePlugin
};

export default connectDB;
