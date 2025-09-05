# 🚀 Setu DigiLocker Setup Guide

## Overview

This guide helps you set up the enhanced KYC backend with **Setu DigiLocker integration** - a student-friendly alternative to direct DigiLocker that's easier to set up and use.

## 🎯 Why Setu DigiLocker?

### ✅ **Student-Friendly Benefits**
- **No business registration required** for sandbox testing
- **Faster approval** (hours vs weeks for direct DigiLocker)
- **Better documentation** with clear examples and quickstart guides
- **Simpler OAuth flow** with fewer steps and callbacks
- **Free sandbox environment** with test data
- **Dedicated developer support** and community

### 💰 **Cost Advantages**
- **Development**: 100% FREE sandbox access
- **Production**: Pay-per-use model (much cheaper than direct DigiLocker setup)
- **No upfront costs** or minimum commitments
- **Transparent pricing** with clear documentation

## 🚀 Quick Setup (Step-by-Step)

### Step 1: Get Setu Sandbox Access

1. **Sign up at Setu**
   - Go to [https://setu.co](https://setu.co)
   - Create a free developer account
   - No business documents needed for sandbox!

2. **Enable DigiLocker Data Product**
   - In your Setu dashboard, navigate to "Products"
   - Enable "DigiLocker Data" product
   - You'll get instant sandbox access

3. **Get Your Credentials**
   ```bash
   # Copy these from your Setu dashboard:
   SETU_CLIENT_ID="your_client_id_here"
   SETU_CLIENT_SECRET="your_client_secret_here"
   SETU_PRODUCT_INSTANCE_ID="your_instance_id_here"
   ```

### Step 2: Setup Your Development Environment

1. **Install Dependencies**
   ```bash
   npm install axios crypto-js ioredis winston uuid
   ```

2. **Create Environment File**
   ```bash
   cp .env.example .env.local
   ```

3. **Configure Setu Variables**
   ```bash
   # Add to .env.local
   SETU_DG_BASE_URL="https://dg-sandbox.setu.co"
   SETU_CLIENT_ID="your_actual_client_id"
   SETU_CLIENT_SECRET="your_actual_client_secret"
   SETU_PRODUCT_INSTANCE_ID="your_actual_instance_id"
   ```

### Step 3: Setup ngrok for Local Testing

1. **Install ngrok**
   ```bash
   npm install -g ngrok
   ```

2. **Start Your App**
   ```bash
   npm run dev
   ```

3. **Expose Local Server**
   ```bash
   # In another terminal
   ngrok http 3000
   ```

4. **Update Callback URL**
   ```bash
   # Copy the HTTPS URL from ngrok (e.g., https://abc123.ngrok.io)
   # Add to .env.local:
   SETU_REDIRECT_URL="https://abc123.ngrok.io/api/setu-digilocker/callback"
   NEXT_PUBLIC_APP_URL="https://abc123.ngrok.io"
   ```

### Step 4: Test the Integration

1. **Use Sandbox Test Data**
   ```javascript
   // Test Aadhaar number for sandbox
   const testAadhaar = "999999990019";
   
   // Test PAN number for sandbox  
   const testPAN = "BKPPK8261K";
   
   // Test Driving License for sandbox
   const testDL = "MH12-20110012345";
   ```

2. **Test the Flow**
   - Navigate to your KYC application
   - Click "Verify with DigiLocker"
   - You'll be redirected to Setu's sandbox environment
   - Login with test Aadhaar: `999999990019`
   - Select documents to share
   - Get redirected back to your app with data

## 📊 Integration Flow

```
User Request
     ↓
Create Setu DigiLocker Request (/api/setu-digilocker/consent)
     ↓
Get consentUrl from Setu
     ↓
Redirect User to Setu DigiLocker Sandbox
     ↓
User Login & Document Selection
     ↓
Setu Redirects Back (/api/setu-digilocker/callback)
     ↓
Parse Callback (success/error, scopes)
     ↓
Fetch Documents Based on Scopes:
├── ADHAR → Fetch Aadhaar Data (/api/setu-digilocker/aadhaar)
├── PANCR → Fetch PAN Document (/api/setu-digilocker/documents)
└── DRVLC → Fetch Driving License (/api/setu-digilocker/documents)
     ↓
Store Securely in MongoDB
     ↓
Revoke Access (/api/setu-digilocker/revoke)
     ↓
Complete KYC Process
```

## 🔧 API Endpoints

### 1. **Create Consent Request**
```typescript
POST /api/setu-digilocker/consent

Body:
{
  "docType": "PANCR",  // Optional: pin to specific document
  "sessionId": "unique-session-id",
  "kycApplicationId": "kyc-app-123"
}

Response:
{
  "success": true,
  "requestId": "setu-request-id",
  "consentUrl": "https://dg-sandbox.setu.co/consent/...",
  "validUpto": "2024-12-31T23:59:59Z"
}
```

### 2. **Handle Callback**
```typescript
GET /api/setu-digilocker/callback?success=true&id=request-id&scope=ADHAR+PANCR

// Automatically redirects to:
// Success: /kyc/documents?requestId=...&scopes=ADHAR,PANCR
// Error: /kyc/error?reason=user_denied_consent
```

### 3. **Fetch Aadhaar Data**
```typescript
POST /api/setu-digilocker/aadhaar

Body:
{
  "requestId": "setu-request-id",
  "kycApplicationId": "kyc-app-123"
}

Response:
{
  "success": true,
  "data": {
    "name": "John Doe",
    "dob": "1990-01-01",
    "gender": "M",
    "address": "...",
    // ... other Aadhaar fields
  },
  "extractedAt": "2024-01-15T10:30:00Z"
}
```

### 4. **Fetch Documents**
```typescript
POST /api/setu-digilocker/documents

Body:
{
  "requestId": "setu-request-id",
  "docType": "PANCR",
  "parameters": [
    { "name": "panno", "value": "BKPPK8261K" }
  ],
  "format": "pdf"
}

Response:
{
  "success": true,
  "fileUrl": "https://setu-files.s3.amazonaws.com/...",
  "validUpto": "2024-01-15T23:59:59Z",
  "docType": "PANCR",
  "format": "pdf"
}
```

### 5. **Revoke Access**
```typescript
POST /api/setu-digilocker/revoke

Body:
{
  "requestId": "setu-request-id",
  "reason": "KYC process completed"
}

Response:
{
  "success": true,
  "message": "Access revoked successfully",
  "revokedAt": "2024-01-15T11:00:00Z"
}
```

## 🧪 Testing & Development

### Sandbox Test Credentials
```javascript
// Use these for sandbox testing
const testCredentials = {
  aadhaar: "999999990019",
  pan: "BKPPK8261K", 
  drivingLicense: "MH12-20110012345",
  voterId: "BLB1234567"
};
```

### Test Flow
1. Start your development server
2. Navigate to KYC flow
3. Click "Verify with DigiLocker"
4. Use sandbox Aadhaar: `999999990019`
5. Select documents to share
6. Verify data is fetched and stored correctly

### Error Handling
```javascript
// Common error scenarios to test:
// 1. User denies consent
// 2. Network timeout
// 3. Invalid request ID
// 4. Document not found
// 5. Rate limiting
```

## 🛡️ Security Best Practices

### 1. **Data Encryption**
```javascript
// All sensitive data is encrypted before storage
const encryptedAadhaar = encryptionService.encryptAadhaar(aadhaarNumber);
// Stores: { encrypted: "...", masked: "XXXX-XXXX-1234", hash: "..." }
```

### 2. **Audit Logging**
```javascript
// All operations are logged for compliance
await AuditLog.createLog({
  userId,
  action: 'SETU_AADHAAR_FETCHED',
  resource: 'SetuDigiLocker',
  status: 'SUCCESS',
  metadata: { requestId, timestamp: new Date() }
});
```

### 3. **Access Revocation**
```javascript
// Always revoke access after data collection
await setuService.revokeAccess(requestId);
```

## 📈 Production Deployment

### 1. **Environment Setup**
```bash
# Production environment variables
SETU_DG_BASE_URL="https://dg.setu.co"  # Production URL
SETU_CLIENT_ID="prod_client_id"
SETU_CLIENT_SECRET="prod_client_secret"
SETU_REDIRECT_URL="https://yourdomain.com/api/setu-digilocker/callback"
```

### 2. **Webhook Configuration**
```javascript
// Set up webhooks for production monitoring
// Setu will notify your app of status changes
```

### 3. **Rate Limiting**
```javascript
// Production rate limits (check Setu documentation)
// Implement appropriate retry logic and queuing
```

## 💰 Cost Optimization

### Development (FREE!)
- Setu DigiLocker: Free sandbox
- MongoDB Atlas: Free 512MB
- Face Recognition: Free (face-api.js)
- Cloudinary: Free 25k transformations
- **Total: $0/month**

### Production (~$200/month)
- Setu DigiLocker: Pay per request (~$0.10-0.50 per verification)
- MongoDB Atlas: $57/month (M10)
- Cloudinary: $99/month
- Other services: ~$50/month
- **Total: ~$200/month vs $500-1500 traditional**

## 🎓 Learning Resources

### Setu Documentation
- [Quickstart Guide](https://docs.setu.co/data/digilocker/quickstart)
- [API Reference](https://docs.setu.co/data/digilocker/api-reference)
- [Sandbox Environment](https://docs.setu.co/data/digilocker/sandbox)

### Code Examples
- [GitHub Repository](https://github.com/setu-co/sample-apps)
- [Postman Collection](https://documenter.getpostman.com/view/setu-digilocker)
- [Interactive API Explorer](https://docs.setu.co/api-explorer)

## 🔧 Troubleshooting

### Common Issues

1. **"Invalid client credentials"**
   - Check SETU_CLIENT_ID and SETU_CLIENT_SECRET
   - Ensure you're using sandbox credentials for development

2. **"Callback URL mismatch"**
   - Verify SETU_REDIRECT_URL matches your ngrok URL
   - Ensure ngrok is running and accessible

3. **"Request not found"**
   - Check if requestId is valid and not expired
   - Verify the request was created successfully

4. **"Document fetch failed"**
   - Ensure correct document type and parameters
   - Check if user has granted consent for that document

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL="debug"
ENABLE_DEBUG_LOGS="true"
```

## 🎉 Success!

You now have a fully functional Setu DigiLocker integration that's:
- ✅ Student-friendly and easy to set up
- ✅ Cost-optimized for learning and development
- ✅ Production-ready and scalable
- ✅ Compliant with Indian regulations
- ✅ Secure with encryption and audit logging

Perfect for building impressive KYC applications for your portfolio! 🚀
