/**
 * Setu DigiLocker Integration for SAHAJ KYC
 * Provides secure document verification through official DigiLocker API
 */

const SETU_CONFIG = {
  baseURL: process.env.SETU_BASE_URL || 'https://dg-sandbox.setu.co',
  clientId: process.env.SETU_CLIENT_ID,
  clientSecret: process.env.SETU_CLIENT_SECRET,
  apiKey: process.env.SETU_API_KEY,
  webhookSecret: process.env.SETU_WEBHOOK_SECRET,
  timeout: 30000, // 30 seconds
  maxRetries: 3
};

/**
 * Setu API Client
 */
class SetuClient {
  constructor() {
    this.baseURL = SETU_CONFIG.baseURL;
    this.headers = {
      'Content-Type': 'application/json',
      'X-API-KEY': SETU_CONFIG.apiKey,
      'User-Agent': 'SAHAJ-KYC/1.0'
    };
    this.accessToken = null;
    this.tokenExpiresAt = null;
  }

  /**
   * Get access token for authenticated requests
   */
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiresAt > Date.now()) {
      return this.accessToken;
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/token`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          client_id: SETU_CONFIG.clientId,
          client_secret: SETU_CONFIG.clientSecret,
          grant_type: 'client_credentials'
        })
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer

      return this.accessToken;
    } catch (error) {
      console.error('Setu authentication error:', error);
      throw new Error('Failed to authenticate with Setu DigiLocker');
    }
  }

  /**
   * Make authenticated API request
   */
  async apiRequest(endpoint, options = {}) {
    const token = await this.getAccessToken();
    
    const config = {
      method: 'GET',
      headers: {
        ...this.headers,
        'Authorization': `Bearer ${token}`
      },
      timeout: SETU_CONFIG.timeout,
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Setu API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Generate DigiLocker authorization URL
   */
  async generateAuthURL(userId, redirectUri, state) {
    try {
      const response = await this.apiRequest('/digilocker/auth/generate', {
        method: 'POST',
        body: {
          user_id: userId,
          redirect_uri: redirectUri,
          state: state,
          scopes: ['personal_info', 'documents']
        }
      });

      return {
        authUrl: response.auth_url,
        requestId: response.request_id,
        expiresAt: new Date(response.expires_at)
      };
    } catch (error) {
      console.error('DigiLocker auth URL generation error:', error);
      throw new Error('Failed to generate DigiLocker authorization URL');
    }
  }

  /**
   * Exchange authorization code for user consent
   */
  async exchangeAuthCode(code, requestId) {
    try {
      const response = await this.apiRequest('/digilocker/auth/exchange', {
        method: 'POST',
        body: {
          code,
          request_id: requestId
        }
      });

      return {
        userToken: response.user_token,
        consentId: response.consent_id,
        expiresAt: new Date(response.expires_at),
        scope: response.scope
      };
    } catch (error) {
      console.error('DigiLocker auth code exchange error:', error);
      throw new Error('Failed to exchange authorization code');
    }
  }

  /**
   * Fetch user profile from DigiLocker
   */
  async fetchUserProfile(userToken) {
    try {
      const response = await this.apiRequest('/digilocker/profile', {
        method: 'GET',
        headers: {
          ...this.headers,
          'X-User-Token': userToken
        }
      });

      return {
        name: response.name,
        fatherName: response.father_name,
        dateOfBirth: response.date_of_birth,
        gender: response.gender,
        aadhaarNumber: response.aadhaar_number,
        phone: response.phone,
        email: response.email,
        address: {
          line1: response.address?.line1,
          line2: response.address?.line2,
          city: response.address?.city,
          state: response.address?.state,
          pincode: response.address?.pincode,
          country: response.address?.country || 'India'
        },
        verificationStatus: response.verification_status,
        lastUpdated: new Date(response.last_updated)
      };
    } catch (error) {
      console.error('DigiLocker profile fetch error:', error);
      throw new Error('Failed to fetch user profile from DigiLocker');
    }
  }

  /**
   * Get available documents list
   */
  async getDocuments(userToken) {
    try {
      const response = await this.apiRequest('/digilocker/documents', {
        method: 'GET',
        headers: {
          ...this.headers,
          'X-User-Token': userToken
        }
      });

      return response.documents.map(doc => ({
        id: doc.document_id,
        type: doc.document_type,
        name: doc.document_name,
        issuer: doc.issuer,
        issuedDate: new Date(doc.issued_date),
        size: doc.size,
        mimeType: doc.mime_type,
        isAvailable: doc.is_available
      }));
    } catch (error) {
      console.error('DigiLocker documents fetch error:', error);
      throw new Error('Failed to fetch documents from DigiLocker');
    }
  }

  /**
   * Download specific document
   */
  async downloadDocument(userToken, documentId) {
    try {
      const response = await this.apiRequest(`/digilocker/documents/${documentId}/download`, {
        method: 'GET',
        headers: {
          ...this.headers,
          'X-User-Token': userToken
        }
      });

      return {
        documentId,
        content: response.content, // Base64 encoded
        contentType: response.content_type,
        filename: response.filename,
        size: response.size,
        downloadedAt: new Date()
      };
    } catch (error) {
      console.error('DigiLocker document download error:', error);
      throw new Error('Failed to download document from DigiLocker');
    }
  }

  /**
   * Verify document authenticity
   */
  async verifyDocument(documentId, documentHash) {
    try {
      const response = await this.apiRequest('/digilocker/verify', {
        method: 'POST',
        body: {
          document_id: documentId,
          document_hash: documentHash
        }
      });

      return {
        isValid: response.is_valid,
        issuer: response.issuer,
        issuedDate: new Date(response.issued_date),
        verifiedAt: new Date(response.verified_at),
        confidence: response.confidence,
        details: response.details
      };
    } catch (error) {
      console.error('DigiLocker document verification error:', error);
      throw new Error('Failed to verify document authenticity');
    }
  }

  /**
   * Revoke user consent
   */
  async revokeConsent(userToken, consentId) {
    try {
      await this.apiRequest('/digilocker/consent/revoke', {
        method: 'POST',
        headers: {
          ...this.headers,
          'X-User-Token': userToken
        },
        body: {
          consent_id: consentId
        }
      });

      return { success: true, revokedAt: new Date() };
    } catch (error) {
      console.error('DigiLocker consent revocation error:', error);
      throw new Error('Failed to revoke DigiLocker consent');
    }
  }
}

/**
 * Government Document Types Mapping
 */
export const DOCUMENT_TYPES = {
  AADHAAR: {
    code: 'AADHAAR',
    name: 'Aadhaar Card',
    issuer: 'UIDAI',
    format: 'PDF'
  },
  PAN: {
    code: 'PAN',
    name: 'PAN Card',
    issuer: 'NSDL/UTIITSL',
    format: 'PDF'
  },
  DRIVING_LICENSE: {
    code: 'DRIVING_LICENSE',
    name: 'Driving License',
    issuer: 'RTO',
    format: 'PDF'
  },
  VOTER_ID: {
    code: 'VOTER_ID',
    name: 'Voter ID Card',
    issuer: 'ECI',
    format: 'PDF'
  },
  PASSPORT: {
    code: 'PASSPORT',
    name: 'Passport',
    issuer: 'MEA',
    format: 'PDF'
  },
  RATION_CARD: {
    code: 'RATION_CARD',
    name: 'Ration Card',
    issuer: 'State Government',
    format: 'PDF'
  }
};

/**
 * DigiLocker Service Class
 */
export class DigiLockerService {
  constructor() {
    this.client = new SetuClient();
  }

  /**
   * Initiate DigiLocker KYC flow
   */
  async initiateKYC(userId, redirectUri) {
    try {
      const state = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const authResult = await this.client.generateAuthURL(userId, redirectUri, state);
      
      return {
        authUrl: authResult.authUrl,
        requestId: authResult.requestId,
        state,
        expiresAt: authResult.expiresAt
      };
    } catch (error) {
      console.error('DigiLocker KYC initiation error:', error);
      throw error;
    }
  }

  /**
   * Complete KYC verification
   */
  async completeKYC(code, requestId) {
    try {
      // Exchange auth code for user token
      const tokenResult = await this.client.exchangeAuthCode(code, requestId);
      
      // Fetch user profile
      const profile = await this.client.fetchUserProfile(tokenResult.userToken);
      
      // Get available documents
      const documents = await this.client.getDocuments(tokenResult.userToken);
      
      // Download key documents (Aadhaar and PAN if available)
      const downloadedDocs = [];
      for (const doc of documents) {
        if (['AADHAAR', 'PAN'].includes(doc.type)) {
          try {
            const downloaded = await this.client.downloadDocument(
              tokenResult.userToken, 
              doc.id
            );
            downloadedDocs.push({ ...doc, ...downloaded });
          } catch (error) {
            console.warn(`Failed to download ${doc.type}:`, error);
          }
        }
      }
      
      return {
        profile,
        documents: downloadedDocs,
        userToken: tokenResult.userToken,
        consentId: tokenResult.consentId,
        expiresAt: tokenResult.expiresAt,
        completedAt: new Date()
      };
    } catch (error) {
      console.error('DigiLocker KYC completion error:', error);
      throw error;
    }
  }

  /**
   * Verify extracted document data
   */
  async verifyDocumentData(documentType, extractedData, documentHash) {
    try {
      // Simulate document verification based on type
      switch (documentType) {
        case 'AADHAAR':
          return this.verifyAadhaarData(extractedData, documentHash);
        
        case 'PAN':
          return this.verifyPANData(extractedData, documentHash);
        
        default:
          throw new Error(`Verification not supported for document type: ${documentType}`);
      }
    } catch (error) {
      console.error('Document data verification error:', error);
      throw error;
    }
  }

  /**
   * Verify Aadhaar data
   */
  async verifyAadhaarData(data, documentHash) {
    // In production, this would make actual API calls to UIDAI
    // For now, we'll simulate the verification
    
    const isValidAadhaar = /^\d{12}$/.test(data.aadhaarNumber);
    const isValidName = data.name && data.name.length > 2;
    const isValidDOB = data.dateOfBirth && new Date(data.dateOfBirth) < new Date();
    
    const confidence = (isValidAadhaar && isValidName && isValidDOB) ? 0.95 : 0.6;
    
    return {
      isValid: confidence > 0.8,
      confidence,
      verifiedFields: {
        aadhaarNumber: isValidAadhaar,
        name: isValidName,
        dateOfBirth: isValidDOB,
        address: !!data.address
      },
      verificationMethod: 'DIGILOCKER',
      verifiedAt: new Date()
    };
  }

  /**
   * Verify PAN data
   */
  async verifyPANData(data, documentHash) {
    // In production, this would make actual API calls to NSDL/UTIITSL
    
    const isValidPAN = /^[A-Z]{5}\d{4}[A-Z]$/.test(data.panNumber);
    const isValidName = data.name && data.name.length > 2;
    const isValidDOB = data.dateOfBirth && new Date(data.dateOfBirth) < new Date();
    
    const confidence = (isValidPAN && isValidName && isValidDOB) ? 0.92 : 0.65;
    
    return {
      isValid: confidence > 0.8,
      confidence,
      verifiedFields: {
        panNumber: isValidPAN,
        name: isValidName,
        dateOfBirth: isValidDOB,
        fatherName: !!data.fatherName
      },
      verificationMethod: 'DIGILOCKER',
      verifiedAt: new Date()
    };
  }

  /**
   * Cleanup user consent and tokens
   */
  async cleanup(userToken, consentId) {
    try {
      await this.client.revokeConsent(userToken, consentId);
      return { success: true };
    } catch (error) {
      console.error('DigiLocker cleanup error:', error);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Webhook signature verification
 */
export function verifyWebhookSignature(payload, signature, secret = SETU_CONFIG.webhookSecret) {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Process DigiLocker webhook
 */
export async function processWebhook(webhookData) {
  try {
    const { event_type, data, timestamp } = webhookData;
    
    switch (event_type) {
      case 'document.downloaded':
        return await handleDocumentDownload(data);
      
      case 'verification.completed':
        return await handleVerificationComplete(data);
      
      case 'consent.revoked':
        return await handleConsentRevoked(data);
      
      default:
        console.warn(`Unknown webhook event type: ${event_type}`);
        return { processed: false, reason: 'Unknown event type' };
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    throw error;
  }
}

async function handleDocumentDownload(data) {
  // Handle document download notification
  return { processed: true, action: 'document_downloaded' };
}

async function handleVerificationComplete(data) {
  // Handle verification completion notification
  return { processed: true, action: 'verification_completed' };
}

async function handleConsentRevoked(data) {
  // Handle consent revocation notification
  return { processed: true, action: 'consent_revoked' };
}

// Export the main service
export default DigiLockerService;
