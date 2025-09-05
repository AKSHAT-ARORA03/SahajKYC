# 📚 KYC Backend API Documentation

## Overview

This document provides comprehensive API documentation for the enhanced KYC backend with Setu DigiLocker integration, MongoDB Atlas, and free face recognition.

## 🚀 Base URL

```
Development: http://localhost:3000/api
Production: https://yourdomain.com/api
```

## 🔐 Authentication

All API endpoints require authentication. Currently using mock authentication for development - replace with Clerk auth in production.

```javascript
// Mock authentication headers (development)
Headers: {
  "Content-Type": "application/json"
}

// Production with Clerk
Headers: {
  "Authorization": "Bearer <clerk_session_token>",
  "Content-Type": "application/json"
}
```

## 📊 API Endpoints

### 🏛️ Setu DigiLocker Integration

#### 1. Create Consent Request
**Endpoint:** `POST /api/setu-digilocker/consent`

**Description:** Initialize Setu DigiLocker consent flow for document verification.

**Request Body:**
```json
{
  "docType": "PANCR",                    // Optional: PANCR, DRVLC, VTRCD
  "sessionId": "session_123",            // Optional: session tracking
  "kycApplicationId": "kyc_app_456"      // Optional: KYC application ID
}
```

**Response:**
```json
{
  "success": true,
  "requestId": "setu_req_789",
  "consentUrl": "https://dg-sandbox.setu.co/consent/...",
  "validUpto": "2024-12-31T23:59:59Z",
  "sessionId": "session_123"
}
```

**Error Response:**
```json
{
  "error": "Setu DigiLocker configuration error",
  "details": "Missing environment variables: SETU_CLIENT_ID"
}
```

---

#### 2. Handle DigiLocker Callback
**Endpoint:** `GET /api/setu-digilocker/callback`

**Description:** Handles redirect from Setu DigiLocker after user consent.

**Query Parameters:**
```
success=true
id=setu_req_789
scope=ADHAR+PANCR+DRVLC
sessionId=session_123
```

**Behavior:**
- **Success:** Redirects to `/kyc/documents?requestId=...&scopes=...`
- **Error:** Redirects to `/kyc/error?reason=...`

---

#### 3. Fetch Aadhaar Data
**Endpoint:** `POST /api/setu-digilocker/aadhaar`

**Description:** Fetch Aadhaar data after successful consent.

**Request Body:**
```json
{
  "requestId": "setu_req_789",
  "kycApplicationId": "kyc_app_456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "John Doe",
    "dob": "1990-01-01",
    "gender": "M",
    "phone": "+91XXXXXXXXXX",
    "email": "john@example.com",
    "address": {
      "house": "123",
      "street": "Main Street", 
      "landmark": "Near Park",
      "locality": "Central Delhi",
      "vtc": "Delhi",
      "district": "New Delhi",
      "state": "Delhi",
      "pincode": "110001"
    },
    "aadhaarNumber": "XXXX-XXXX-1234"  // Masked
  },
  "extractedAt": "2024-01-15T10:30:00Z",
  "requestId": "setu_req_789"
}
```

---

#### 4. Fetch Documents
**Endpoint:** `POST /api/setu-digilocker/documents`

**Description:** Fetch specific documents (PAN, DL, Voter ID) via Setu.

**Request Body:**
```json
{
  "requestId": "setu_req_789",
  "docType": "PANCR",                    // PANCR, DRVLC, VTRCD
  "parameters": [
    { "name": "panno", "value": "BKPPK8261K" }
  ],
  "format": "pdf",                       // pdf, xml
  "kycApplicationId": "kyc_app_456"
}
```

**Response:**
```json
{
  "success": true,
  "fileUrl": "https://setu-files.s3.amazonaws.com/documents/...",
  "validUpto": "2024-01-16T10:30:00Z",
  "docType": "PANCR",
  "format": "pdf",
  "requestId": "setu_req_789"
}
```

---

#### 5. Get Test Credentials
**Endpoint:** `GET /api/setu-digilocker/documents/test-credentials`

**Description:** Get sandbox test credentials for development.

**Response:**
```json
{
  "success": true,
  "testCredentials": {
    "aadhaar": "999999990019",
    "pan": "BKPPK8261K",
    "drivingLicense": "MH12-20110012345",
    "voterId": "BLB1234567"
  },
  "environment": "sandbox",
  "note": "These credentials are only for sandbox testing"
}
```

---

#### 6. Revoke Access
**Endpoint:** `POST /api/setu-digilocker/revoke`

**Description:** Revoke DigiLocker access token after data collection.

**Request Body:**
```json
{
  "requestId": "setu_req_789",
  "reason": "KYC process completed"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Access revoked successfully", 
  "requestId": "setu_req_789",
  "revokedAt": "2024-01-15T11:00:00Z"
}
```

---

### 🎭 Face Recognition

#### 1. Face Detection
**Endpoint:** `POST /api/face/detect`

**Description:** Detect faces in uploaded image using face-api.js.

**Request Body:** `multipart/form-data`
```
image: File (JPEG, PNG, WebP)
options: {
  "detectLandmarks": true,
  "detectExpressions": true,
  "minConfidence": 0.5
}
```

**Response:**
```json
{
  "success": true,
  "faces": [
    {
      "detection": {
        "x": 100,
        "y": 150,
        "width": 200,
        "height": 250,
        "score": 0.95
      },
      "landmarks": {
        "positions": [...],
        "score": 0.92
      },
      "expressions": {
        "neutral": 0.8,
        "happy": 0.15,
        "sad": 0.03,
        "angry": 0.02
      }
    }
  ],
  "faceCount": 1,
  "imageSize": { "width": 640, "height": 480 }
}
```

---

#### 2. Face Verification (Liveness)
**Endpoint:** `POST /api/face/verify`

**Description:** Perform liveness detection and face verification.

**Request Body:** `multipart/form-data`
```
image: File
sessionId: "session_123"
options: {
  "enableLiveness": true,
  "enableAntiSpoofing": true,
  "minLivenessScore": 0.7
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isLive": true,
    "confidence": 0.89,
    "faceDetected": true,
    "livenessChecks": {
      "eyeAspectRatio": 0.25,
      "headPoseAnalysis": {
        "yaw": 2.1,
        "pitch": 1.8,
        "roll": 0.5
      },
      "antiSpooFing": {
        "screenDetection": false,
        "depthAnalysis": 0.82,
        "textureAnalysis": 0.91
      }
    },
    "riskAssessment": {
      "riskLevel": "LOW",
      "spoofingProbability": 0.12,
      "qualityScore": 0.91
    }
  },
  "sessionId": "session_123"
}
```

---

#### 3. Face Matching
**Endpoint:** `POST /api/face/match`

**Description:** Compare two face images for matching.

**Request Body:** `multipart/form-data`
```
image1: File
image2: File
options: {
  "threshold": 0.6,
  "algorithm": "facenet"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isMatch": true,
    "confidence": 0.78,
    "distance": 0.22,
    "threshold": 0.6,
    "faces1": 1,
    "faces2": 1,
    "algorithm": "facenet",
    "processingTime": 1250
  }
}
```

---

### 📄 Document Management

#### 1. Upload Document
**Endpoint:** `POST /api/documents/upload`

**Description:** Upload and process KYC documents with OCR.

**Request Body:** `multipart/form-data`
```
document: File (PDF, JPEG, PNG)
documentType: "aadhaar" | "pan" | "passport" | "driving_license"
kycApplicationId: "kyc_app_456"
```

**Response:**
```json
{
  "success": true,
  "document": {
    "id": "doc_789",
    "filename": "aadhaar_front.jpg",
    "documentType": "aadhaar",
    "fileSize": 2048576,
    "uploadedAt": "2024-01-15T10:30:00Z",
    "processingStatus": "pending",
    "cloudinaryUrl": "https://res.cloudinary.com/..."
  },
  "kycApplicationId": "kyc_app_456"
}
```

---

#### 2. Extract Document Data (OCR)
**Endpoint:** `POST /api/documents/extract`

**Description:** Perform OCR extraction on uploaded document.

**Request Body:**
```json
{
  "documentId": "doc_789",
  "extractionType": "full",  // full, text_only, structured
  "language": "eng+hin"
}
```

**Response:**
```json
{
  "success": true,
  "extraction": {
    "rawText": "Government of India...",
    "structuredData": {
      "aadhaarNumber": "XXXX XXXX 1234",
      "name": "JOHN DOE",
      "dob": "01/01/1990",
      "gender": "MALE",
      "address": "123 Main Street, Delhi"
    },
    "confidence": 0.92,
    "processingTime": 3200,
    "language": "eng+hin"
  },
  "documentId": "doc_789"
}
```

---

#### 3. Validate Document
**Endpoint:** `POST /api/documents/validate`

**Description:** Validate document authenticity and format.

**Request Body:**
```json
{
  "documentId": "doc_789",
  "validationType": "format",  // format, authenticity, checksum
  "referenceData": {
    "expectedType": "aadhaar",
    "expectedFormat": "jpeg"
  }
}
```

**Response:**
```json
{
  "success": true,
  "validation": {
    "isValid": true,
    "validationType": "format",
    "checks": {
      "formatValid": true,
      "sizeValid": true,
      "qualityValid": true,
      "checksumValid": true
    },
    "confidence": 0.95,
    "issues": []
  },
  "documentId": "doc_789"
}
```

---

### 🎯 KYC Application Management

#### 1. Create KYC Application
**Endpoint:** `POST /api/kyc/application`

**Description:** Create a new KYC application.

**Request Body:**
```json
{
  "personalInfo": {
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "dateOfBirth": "1990-01-01",
    "gender": "male",
    "address": {
      "street": "123 Main Street",
      "city": "Delhi",
      "state": "Delhi",
      "pincode": "110001",
      "country": "India"
    }
  },
  "verificationType": "full",  // basic, full, enhanced
  "requiredDocuments": ["aadhaar", "pan"],
  "applicationMetadata": {
    "source": "web",
    "deviceInfo": "...",
    "ipAddress": "192.168.1.1"
  }
}
```

**Response:**
```json
{
  "success": true,
  "application": {
    "id": "kyc_app_456",
    "status": "draft",
    "progress": {
      "overall": 10,
      "personalInfo": 100,
      "documents": 0,
      "faceVerification": 0,
      "verification": 0
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-02-15T10:30:00Z"
  }
}
```

---

#### 2. Get KYC Application
**Endpoint:** `GET /api/kyc/application/[id]`

**Description:** Retrieve KYC application details.

**Response:**
```json
{
  "success": true,
  "application": {
    "id": "kyc_app_456",
    "status": "in_progress",
    "progress": {
      "overall": 65,
      "personalInfo": 100,
      "documents": 80,
      "faceVerification": 90,
      "verification": 0
    },
    "personalInfo": { /* ... */ },
    "documents": [
      {
        "id": "doc_789",
        "type": "aadhaar",
        "status": "verified",
        "uploadedAt": "2024-01-15T11:00:00Z"
      }
    ],
    "faceVerification": {
      "status": "completed",
      "confidence": 0.89,
      "verifiedAt": "2024-01-15T11:30:00Z"
    },
    "timeline": [
      {
        "event": "application_created",
        "timestamp": "2024-01-15T10:30:00Z"
      },
      {
        "event": "document_uploaded",
        "timestamp": "2024-01-15T11:00:00Z",
        "details": { "documentType": "aadhaar" }
      }
    ]
  }
}
```

---

#### 3. Submit KYC Application
**Endpoint:** `POST /api/kyc/submit`

**Description:** Submit KYC application for review.

**Request Body:**
```json
{
  "applicationId": "kyc_app_456",
  "submitType": "auto_review"  // auto_review, manual_review
}
```

**Response:**
```json
{
  "success": true,
  "submission": {
    "applicationId": "kyc_app_456",
    "submittedAt": "2024-01-15T12:00:00Z",
    "reviewType": "auto_review",
    "estimatedReviewTime": "2-24 hours",
    "submissionId": "sub_123"
  }
}
```

---

#### 4. Check KYC Status
**Endpoint:** `GET /api/kyc/status?applicationId=kyc_app_456`

**Description:** Check current KYC application status.

**Response:**
```json
{
  "success": true,
  "status": {
    "applicationId": "kyc_app_456",
    "currentStatus": "under_review",
    "overallScore": 85,
    "lastUpdated": "2024-01-15T12:30:00Z",
    "statusHistory": [
      {
        "status": "draft",
        "timestamp": "2024-01-15T10:30:00Z"
      },
      {
        "status": "submitted",
        "timestamp": "2024-01-15T12:00:00Z"
      },
      {
        "status": "under_review", 
        "timestamp": "2024-01-15T12:30:00Z"
      }
    ],
    "nextSteps": [
      "Automated document verification in progress",
      "Face verification completed successfully",
      "Awaiting final review"
    ]
  }
}
```

---

### 🔄 Sync & Offline Support

#### 1. Add to Sync Queue
**Endpoint:** `POST /api/sync/queue`

**Description:** Add operation to offline sync queue.

**Request Body:**
```json
{
  "operation": "CREATE",  // CREATE, UPDATE, DELETE, UPLOAD, VERIFY
  "resource": "KYC_APPLICATION",  // USER, KYC_APPLICATION, DOCUMENT, FACE_VERIFICATION
  "resourceId": "kyc_app_456",
  "data": { /* operation data */ },
  "priority": 5,  // 1-10, higher = more priority
  "deviceInfo": {
    "userAgent": "...",
    "platform": "web",
    "networkType": "wifi"
  }
}
```

**Response:**
```json
{
  "success": true,
  "queueItem": {
    "id": "sync_789",
    "status": "pending",
    "priority": 5,
    "queuePosition": 3,
    "estimatedProcessTime": "2024-01-15T12:35:00Z"
  }
}
```

---

#### 2. Process Sync Queue
**Endpoint:** `POST /api/sync/process`

**Description:** Process pending sync queue items.

**Request Body:**
```json
{
  "userId": "user_123",  // Optional: process for specific user
  "limit": 10,           // Optional: max items to process
  "priority": 7          // Optional: min priority to process
}
```

**Response:**
```json
{
  "success": true,
  "processed": {
    "total": 5,
    "successful": 4,
    "failed": 1,
    "skipped": 0
  },
  "items": [
    {
      "id": "sync_789",
      "status": "completed",
      "processingTime": 1200
    }
  ]
}
```

---

### 👨‍💼 Admin & Analytics

#### 1. Get Analytics
**Endpoint:** `GET /api/admin/analytics`

**Description:** Get KYC application analytics and metrics.

**Query Parameters:**
```
startDate=2024-01-01
endDate=2024-01-31
groupBy=day  // day, week, month
metrics=applications,success_rate,avg_time
```

**Response:**
```json
{
  "success": true,
  "analytics": {
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31",
      "groupBy": "day"
    },
    "summary": {
      "totalApplications": 1250,
      "successRate": 0.87,
      "averageProcessingTime": 3600,
      "topDocumentTypes": ["aadhaar", "pan", "driving_license"]
    },
    "timeSeries": [
      {
        "date": "2024-01-15",
        "applications": 45,
        "successful": 39,
        "failed": 6,
        "avgProcessingTime": 3200
      }
    ],
    "breakdown": {
      "byStatus": {
        "approved": 1087,
        "rejected": 163,
        "pending": 0
      },
      "byDocumentType": {
        "aadhaar": 1250,
        "pan": 1180,
        "driving_license": 450
      }
    }
  }
}
```

---

#### 2. Get Audit Logs
**Endpoint:** `GET /api/admin/audit`

**Description:** Retrieve audit logs for compliance.

**Query Parameters:**
```
userId=user_123           // Optional: filter by user
action=SETU_AADHAAR_FETCHED  // Optional: filter by action
startDate=2024-01-01
endDate=2024-01-31
limit=100
offset=0
```

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": "log_456",
      "userId": "user_123",
      "action": "SETU_AADHAAR_FETCHED",
      "resource": "SetuDigiLocker",
      "resourceId": "setu_req_789",
      "status": "SUCCESS",
      "timestamp": "2024-01-15T10:30:00Z",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "duration": 1250,
      "metadata": {
        "requestId": "setu_req_789",
        "extractedAt": "2024-01-15T10:30:00Z"
      }
    }
  ],
  "pagination": {
    "total": 500,
    "limit": 100,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### 🏥 Health & Monitoring

#### 1. Health Check
**Endpoint:** `GET /api/health`

**Description:** Check overall system health.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T12:00:00Z",
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": 25,
      "connections": 5
    },
    "cache": {
      "status": "healthy",
      "type": "redis",
      "responseTime": 5
    },
    "faceRecognition": {
      "status": "healthy",
      "modelsLoaded": 4
    },
    "setuDigiLocker": {
      "status": "healthy",
      "environment": "sandbox"
    }
  },
  "version": "1.0.0",
  "uptime": 86400
}
```

---

## 🚫 Error Handling

### Standard Error Response
```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T12:00:00Z",
  "requestId": "req_123",
  "details": {
    "field": "Validation error details"
  }
}
```

### Common HTTP Status Codes
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource not found)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Rate Limiting
```
Headers:
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

---

## 📊 Webhooks

### Webhook Events
- `kyc.application.created`
- `kyc.application.updated`
- `kyc.application.approved`
- `kyc.application.rejected`
- `document.uploaded`
- `document.verified`
- `face.verification.completed`

### Webhook Payload
```json
{
  "event": "kyc.application.approved",
  "timestamp": "2024-01-15T12:00:00Z",
  "data": {
    "applicationId": "kyc_app_456",
    "userId": "user_123",
    "status": "approved",
    "score": 95,
    "approvedAt": "2024-01-15T12:00:00Z"
  },
  "signature": "sha256=..."
}
```

---

## 🎯 SDKs & Examples

### JavaScript/TypeScript
```typescript
import { KYCClient } from '@/lib/kyc-client';

const client = new KYCClient({
  baseUrl: 'http://localhost:3000/api',
  apiKey: 'your-api-key'
});

// Create KYC application
const application = await client.kyc.create({
  personalInfo: { /* ... */ }
});

// Upload document
const document = await client.documents.upload(
  file, 
  'aadhaar',
  application.id
);

// Verify face
const verification = await client.face.verify(
  imageFile,
  sessionId
);
```

### cURL Examples
```bash
# Create consent request
curl -X POST http://localhost:3000/api/setu-digilocker/consent \
  -H "Content-Type: application/json" \
  -d '{"docType": "PANCR", "sessionId": "session_123"}'

# Upload document
curl -X POST http://localhost:3000/api/documents/upload \
  -F "document=@aadhaar.jpg" \
  -F "documentType=aadhaar" \
  -F "kycApplicationId=kyc_app_456"

# Face verification
curl -X POST http://localhost:3000/api/face/verify \
  -F "image=@selfie.jpg" \
  -F "sessionId=session_123"
```

This comprehensive API documentation covers all endpoints in your enhanced KYC backend with Setu DigiLocker integration! 🚀
