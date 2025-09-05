# SAHAJ KYC - Comprehensive KYC Solution for Rural India 🇮🇳

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)](https://www.mongodb.com/atlas)
[![Redis](https://img.shields.io/badge/Redis-Upstash-red)](https://upstash.com/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-purple)](https://clerk.com/)
[![Cloudinary](https://img.shields.io/badge/Storage-Cloudinary-blue)](https://cloudinary.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

SAHAJ KYC is a comprehensive, production-ready Know Your Customer (KYC) solution specifically designed for rural and semi-urban markets in India. Built with Next.js 15, MongoDB, and Redis, it provides seamless government document verification, face recognition, and offline-first capabilities.

## 🚀 Features

### Core KYC Capabilities
- **Government Document Verification** - Aadhaar, PAN, Driving License, Passport
- **DigiLocker Integration** - Official government document access via Setu API
- **OCR Text Extraction** - Multi-language support (Hindi, English, Bengali, Tamil, etc.)
- **Face Recognition** - Real-time face matching with government documents
- **Offline-First Design** - Works without internet connectivity
- **Real-time Status Tracking** - Live application progress updates

### Indian Market Specific
- **Multi-Language Support** - 12 Indian languages supported
- **Rural Connectivity** - Optimized for slow networks and intermittent connectivity
- **Government Compliance** - RBI guidelines adherent, 7-year data retention
- **Regional Configuration** - Indian time zones, currency, address formats
- **Mobile-First UI** - Optimized for feature phones and smartphones

### Enterprise Features
- **Scalable Architecture** - MongoDB Atlas + Redis + Upstash
- **Advanced Security** - AES-256 encryption, HMAC verification, secure key management
- **Comprehensive Audit** - Complete audit trails for compliance
- **Performance Monitoring** - Built-in analytics and error tracking
- **API-First Design** - RESTful APIs with comprehensive documentation

## 📋 Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **MongoDB Atlas** account (free tier available)
- **Upstash Redis** account (free tier available)
- **Clerk** account for authentication (5,000 free MAUs)
- **Cloudinary** account for file storage (25k free transformations)

## 🛠️ Quick Setup

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/sahaj-kyc/sahaj-kyc-app.git
cd sahaj-kyc-app

# Run the automated setup script
node setup.js
```

The setup script will guide you through:
1. Prerequisites validation
2. Configuration collection
3. Environment setup
4. Dependency installation
5. Database connection testing
6. Security key generation

### Option 2: Manual Setup

1. **Clone and Install**
```bash
git clone https://github.com/sahaj-kyc/sahaj-kyc-app.git
cd sahaj-kyc-app
npm install
```

2. **Environment Configuration**
```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your configuration
nano .env.local
```

3. **Required Environment Variables**
```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sahaj-kyc

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Security Keys (generate random 32-byte hex strings)
ENCRYPTION_KEY=your-256-bit-encryption-key
HMAC_SECRET=your-hmac-secret
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
```

4. **Generate Security Keys**
```bash
# Generate secure random keys
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('HMAC_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

## 🚀 Development

```bash
# Start development server
npm run dev

# Type checking
npm run type-check

# Run tests
npm run test

# Clear cache
npm run cache:clear
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🏗️ Architecture

### Technology Stack

#### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component library
- **Framer Motion** - Animation library

#### Backend
- **MongoDB Atlas** - Cloud database with Mongoose ODM
- **Redis (Upstash)** - Serverless caching and queue management
- **Node.js APIs** - RESTful API endpoints

#### Authentication & Security
- **Clerk** - User authentication and management
- **AES-256-GCM** - Data encryption
- **HMAC-SHA256** - Data integrity verification
- **JWT** - Secure token management

#### File Storage & Processing
- **Cloudinary** - Image and document storage
- **Tesseract.js** - OCR text extraction
- **Face-api.js** - Face recognition and matching

#### Government Integration
- **Setu DigiLocker** - Official document verification
- **Indian Government APIs** - Aadhaar, PAN verification

### System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App   │────│   API Routes     │────│   MongoDB       │
│   (Frontend)    │    │   (Backend)      │    │   (Database)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Clerk Auth    │    │   Redis Cache    │    │   Cloudinary    │
│   (Identity)    │    │   (Sessions)     │    │   (Files)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
┌─────────────────────────────────────────────────────────────────┐
│                 Government APIs                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ DigiLocker  │  │   UIDAI     │  │    Other Gov APIs       │  │
│  │   (Setu)    │  │ (Aadhaar)   │  │  (PAN, DL, Passport)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Database Models

### User Model
```javascript
{
  clerkId: String,          // Clerk user ID
  phone: String,            // Indian mobile number
  email: String,            // Email address
  language: String,         // Preferred language (hi, en, bn, etc.)
  isVerified: Boolean,      // KYC verification status
  verificationLevel: String, // NONE, BASIC, INTERMEDIATE, FULL
  profile: {
    firstName: String,
    lastName: String,
    dateOfBirth: Date,
    gender: String,
    fatherName: String,      // Important for Indian documents
    address: AddressSchema,   // Indian address format
    // ... more fields
  },
  preferences: {
    notifications: Object,
    privacy: Object,
    accessibility: Object
  },
  security: {
    twoFactorEnabled: Boolean,
    failedLoginAttempts: Number,
    deviceFingerprints: Array
  },
  activity: {
    lastLoginAt: Date,
    kycAttempts: Number,
    sessionCount: Number
  }
}
```

### KYC Application Model
```javascript
{
  userId: ObjectId,
  applicationId: String,     // Unique KYC ID
  status: String,           // INITIATED, IN_PROGRESS, APPROVED, etc.
  method: String,           // DIGILOCKER, DOCUMENTS, HYBRID
  personalInfo: {
    name: String,
    aadhaarNumber: String,  // Encrypted
    panNumber: String,      // Encrypted
    // ... extracted data
  },
  documents: [ObjectId],    // Document references
  faceVerifications: [ObjectId], // Face verification results
  verification: {
    documentsVerified: Boolean,
    faceVerified: Boolean,
    overallScore: Number,   // 0-100
    riskLevel: String       // LOW, MEDIUM, HIGH
  },
  compliance: {
    ipAddress: String,
    consentGiven: Boolean,
    privacyPolicyVersion: String
  }
}
```

## 🔒 Security Features

### Data Encryption
- **AES-256-GCM** encryption for sensitive PII
- **HMAC-SHA256** for data integrity
- **PBKDF2** for key derivation
- **Separate encryption keys** for different data types

### Authentication & Authorization
- **Clerk** integration for secure user management
- **JWT tokens** for API authentication
- **Session management** with Redis
- **Device fingerprinting** for security

### Compliance
- **RBI guidelines** adherent
- **7-year data retention** policy
- **Comprehensive audit logs**
- **GDPR-style data protection**

## 🌐 API Documentation

### KYC Operations

#### Create KYC Application
```http
POST /api/kyc
Content-Type: application/json
Authorization: Bearer <clerk-token>

{
  "method": "DIGILOCKER",
  "priority": "NORMAL",
  "personalInfo": {
    "name": "John Doe",
    "phone": "+919876543210"
  }
}
```

#### Get KYC Status
```http
GET /api/kyc?applicationId=KYC_12345
Authorization: Bearer <clerk-token>
```

#### OCR Document Extraction
```http
POST /api/ocr/extract
Content-Type: multipart/form-data
Authorization: Bearer <clerk-token>

{
  "image": <file>,
  "documentType": "aadhaar"
}
```

#### Face Verification
```http
POST /api/face/verify
Content-Type: multipart/form-data
Authorization: Bearer <clerk-token>

{
  "selfie": <file>,
  "document": <file>,
  "applicationId": "KYC_12345"
}
```

## 🌍 Internationalization

SAHAJ KYC supports 12 Indian languages:

- **Hindi (hi)** - Default
- **English (en)**
- **Bengali (bn)**
- **Tamil (ta)**
- **Telugu (te)**
- **Malayalam (ml)**
- **Kannada (kn)**
- **Gujarati (gu)**
- **Marathi (mr)**
- **Odia (or)**
- **Punjabi (pa)**
- **Assamese (as)**

### Adding New Languages

1. Add language code to `SUPPORTED_LOCALES` in `.env.local`
2. Create translation files in `public/locales/[locale]/`
3. Update OCR language support in `TESSERACT_LANG`
4. Add language to UI components

## 📱 Offline Support

### Features
- **Offline data capture** - Forms work without internet
- **Background sync** - Data syncs when connection is restored
- **Progressive Web App** - Installable on mobile devices
- **Local storage** - Temporary data storage with encryption

### Implementation
```javascript
// Check online status
const isOnline = navigator.onLine;

// Queue operations when offline
if (!isOnline) {
  await SyncQueue.addToQueue({
    type: 'KYC_UPDATE',
    data: formData,
    timestamp: Date.now()
  });
}

// Process queue when back online
window.addEventListener('online', async () => {
  await processOfflineQueue();
});
```

## 🚀 Deployment

### Vercel Deployment (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Deploy to production
vercel --prod
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Environment Variables for Production

```bash
# Security
NODE_ENV=production
SECURE_COOKIES=true
ENABLE_HTTPS_ONLY=true
ENABLE_RATE_LIMITING=true

# Performance
DATABASE_CONNECTION_POOL_SIZE=20
REDIS_CONNECTION_POOL_SIZE=10

# Monitoring
SENTRY_DSN=your-sentry-dsn
ENABLE_ERROR_TRACKING=true
```

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

### API Testing
```bash
# Health check
curl http://localhost:3000/api/health

# KYC endpoints
curl -X POST http://localhost:3000/api/kyc \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"method": "DOCUMENTS"}'
```

## 📊 Monitoring & Analytics

### Built-in Monitoring
- **Health checks** - `/api/health`
- **Performance metrics** - Response times, error rates
- **User analytics** - KYC completion rates, drop-offs
- **System metrics** - Database performance, cache hit rates

### External Integrations
- **Sentry** - Error tracking and performance monitoring
- **Google Analytics** - User behavior analytics
- **Custom dashboards** - Business intelligence

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Maintain documentation
- Ensure accessibility compliance
- Follow security guidelines

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Documentation

### Getting Help
- **GitHub Issues** - Bug reports and feature requests
- **Documentation** - Comprehensive API and user guides
- **Community** - Discord server for real-time support

### Useful Links
- [API Documentation](https://sahaj-kyc.vercel.app/api/docs)
- [User Guide](https://docs.sahaj-kyc.com)
- [Video Tutorials](https://youtube.com/sahaj-kyc)
- [Best Practices](https://docs.sahaj-kyc.com/best-practices)

## 🙏 Acknowledgments

- **Government of India** - For DigiLocker and digital identity initiatives
- **Setu** - For DigiLocker API integration
- **Clerk** - For authentication infrastructure
- **Vercel** - For hosting and deployment
- **MongoDB** - For database services
- **Upstash** - For serverless Redis

---

**Made with ❤️ for Rural India 🇮🇳**

*SAHAJ KYC - Simplifying identity verification for everyone, everywhere.*
