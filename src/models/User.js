import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  line1: { type: String, required: true },
  line2: String,
  city: { type: String, required: true },
  state: { 
    type: String, 
    required: true,
    enum: [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
      'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
      'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
      'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
      'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
      'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
      'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
    ]
  },
  pincode: { 
    type: String, 
    required: true,
    match: /^[1-9][0-9]{5}$/ // Valid Indian pincode format
  },
  country: { type: String, default: 'India' }
}, { _id: false });

const userSchema = new mongoose.Schema({
  // Authentication
  clerkId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  
  // Contact Information
  phone: { 
    type: String, 
    sparse: true, 
    unique: true,
    match: /^(\+91|91)?[6-9]\d{9}$/, // Indian mobile number format
    index: true
  },
  email: { 
    type: String, 
    sparse: true, 
    unique: true,
    lowercase: true,
    match: /^\S+@\S+\.\S+$/,
    index: true
  },
  
  // Localization
  language: { 
    type: String, 
    default: 'hi',
    enum: ['hi', 'en', 'bn', 'ta', 'te', 'ml', 'kn', 'gu', 'mr', 'or', 'pa', 'as']
  },
  
  // Verification Status
  isVerified: { type: Boolean, default: false },
  verificationLevel: {
    type: String,
    enum: ['NONE', 'BASIC', 'INTERMEDIATE', 'FULL'],
    default: 'NONE'
  },
  
  // Profile Information
  profile: {
    firstName: String,
    lastName: String,
    fullName: String, // Computed field
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say']
    },
    fatherName: String, // Important for Indian documents
    occupation: String,
    annualIncome: {
      type: String,
      enum: ['below-1l', '1l-3l', '3l-5l', '5l-10l', '10l-25l', '25l-50l', 'above-50l']
    },
    address: addressSchema,
    avatar: String, // Cloudinary URL
  },
  
  // Preferences & Settings
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    privacy: {
      dataSharing: { type: Boolean, default: false },
      marketingEmails: { type: Boolean, default: false },
      analyticsTracking: { type: Boolean, default: true }
    },
    accessibility: {
      highContrast: { type: Boolean, default: false },
      fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
      screenReader: { type: Boolean, default: false }
    }
  },
  
  // Security & Compliance
  security: {
    twoFactorEnabled: { type: Boolean, default: false },
    lastPasswordChange: Date,
    failedLoginAttempts: { type: Number, default: 0 },
    accountLockedUntil: Date,
    ipWhitelist: [String],
    deviceFingerprints: [{
      fingerprint: String,
      lastUsed: Date,
      trusted: Boolean
    }]
  },
  
  // Activity Tracking
  activity: {
    lastLoginAt: Date,
    lastActiveAt: Date,
    loginCount: { type: Number, default: 0 },
    kycAttempts: { type: Number, default: 0 },
    sessionCount: { type: Number, default: 0 }
  },
  
  // KYC Related References
  kycApplications: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'KycApplication' 
  }],
  documents: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Document' 
  }],
  
  // Metadata
  metadata: {
    source: { type: String, default: 'web' }, // web, mobile, api
    referralCode: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    deviceType: String, // mobile, tablet, desktop
    browserInfo: String
  }
}, {
  timestamps: true,
  collection: 'users',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ clerkId: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ email: 1 });
userSchema.index({ 'profile.fullName': 'text' });
userSchema.index({ isVerified: 1, verificationLevel: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'activity.lastActiveAt': -1 });

// Compound indexes
userSchema.index({ isVerified: 1, 'profile.address.state': 1 });
userSchema.index({ verificationLevel: 1, createdAt: -1 });

// Virtual for full name
userSchema.virtual('displayName').get(function() {
  if (this.profile.fullName) return this.profile.fullName;
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.profile.firstName || this.email || this.phone || 'User';
});

// Methods
userSchema.methods.updateActivity = function() {
  this.activity.lastActiveAt = new Date();
  this.activity.sessionCount += 1;
  return this.save();
};

userSchema.methods.recordLogin = function() {
  this.activity.lastLoginAt = new Date();
  this.activity.loginCount += 1;
  this.security.failedLoginAttempts = 0; // Reset failed attempts
  return this.updateActivity();
};

userSchema.methods.canAttemptKYC = function() {
  const maxAttempts = 3;
  const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours
  
  if (this.activity.kycAttempts >= maxAttempts) {
    const lastAttempt = this.updatedAt;
    const timeSinceLastAttempt = Date.now() - lastAttempt.getTime();
    return timeSinceLastAttempt > cooldownPeriod;
  }
  
  return true;
};

// Static methods
userSchema.statics.findByClerkId = function(clerkId) {
  return this.findOne({ clerkId });
};

userSchema.statics.findByPhoneOrEmail = function(identifier) {
  return this.findOne({
    $or: [
      { phone: identifier },
      { email: identifier.toLowerCase() }
    ]
  });
};

userSchema.statics.getVerificationStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$verificationLevel',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

export default mongoose.model('User', userSchema);
