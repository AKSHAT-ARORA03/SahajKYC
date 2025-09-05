import axios from 'axios';

/**
 * Setu DigiLocker Service - Student-Friendly Integration
 * 
 * Benefits over direct DigiLocker:
 * - No business registration required for sandbox
 * - Faster approval (hours vs weeks)
 * - Better documentation with examples
 * - Simpler OAuth flow with fewer steps
 * - Free testing without production costs
 */
export class SetuDigiLockerService {
  constructor() {
    this.baseUrl = process.env.SETU_DG_BASE_URL || 'https://dg-sandbox.setu.co';
    this.headers = {
      'x-client-id': process.env.SETU_CLIENT_ID,
      'x-client-secret': process.env.SETU_CLIENT_SECRET,
      'x-product-instance-id': process.env.SETU_PRODUCT_INSTANCE_ID,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Create DigiLocker request to start user consent flow
   * @param {string} redirectUrl - URL to redirect after consent
   * @param {string} docType - Optional document type to pin to
   * @returns {Promise<Object>} Request result with consentUrl
   */
  async createDigiLockerRequest(redirectUrl, docType = null) {
    try {
      const body = {
        redirectUrl: redirectUrl,
        ...(docType && { docType }) // Optional: pin to specific document type
      };

      const response = await axios.post(
        `${this.baseUrl}/api/digilocker`,
        body,
        { headers: this.headers }
      );

      return {
        success: true,
        requestId: response.data.id,
        digiLockerUrl: response.data.url,
        status: response.data.status,
        validUpto: response.data.validUpto
      };
    } catch (error) {
      console.error('Setu DigiLocker request failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create DigiLocker request'
      };
    }
  }

  /**
   * Check the status of a DigiLocker request
   * @param {string} requestId - Request ID from createDigiLockerRequest
   * @returns {Promise<Object>} Status check result
   */
  async checkRequestStatus(requestId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/digilocker/${requestId}/status`,
        { headers: this.headers }
      );

      return {
        success: true,
        status: response.data.status,
        requestId: requestId
      };
    } catch (error) {
      console.error('Status check failed:', error);
      return {
        success: false,
        error: 'Failed to check request status'
      };
    }
  }

  /**
   * Fetch Aadhaar data after user consent
   * @param {string} requestId - Request ID from callback
   * @returns {Promise<Object>} Aadhaar data result
   */
  async fetchAadhaarData(requestId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/digilocker/${requestId}/aadhaar`,
        { consent: 'Y' },
        { headers: this.headers }
      );

      return {
        success: true,
        aadhaarData: response.data,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Aadhaar fetch failed:', error);
      return {
        success: false,
        error: 'Failed to fetch Aadhaar data'
      };
    }
  }

  /**
   * Fetch document (PAN, Driving License, etc.)
   * @param {string} requestId - Request ID from callback
   * @param {string} docType - Document type (PANCR, DRVLC, VTRCD)
   * @param {Array} parameters - Document-specific parameters
   * @param {string} format - Document format (pdf, xml)
   * @returns {Promise<Object>} Document fetch result
   */
  async fetchDocument(requestId, docType, parameters, format = 'pdf') {
    try {
      const body = {
        docType: docType,
        orgId: this.getOrgId(docType),
        format: format,
        consent: 'Y',
        parameters: parameters
      };

      const response = await axios.post(
        `${this.baseUrl}/api/digilocker/${requestId}/document`,
        body,
        { headers: this.headers }
      );

      return {
        success: true,
        fileUrl: response.data.fileUrl,
        validUpto: response.data.validUpto,
        docType: docType,
        format: format
      };
    } catch (error) {
      console.error('Document fetch failed:', error);
      return {
        success: false,
        error: 'Failed to fetch document'
      };
    }
  }

  /**
   * Revoke access token after fetching documents
   * @param {string} requestId - Request ID to revoke
   * @returns {Promise<Object>} Revoke result
   */
  async revokeAccess(requestId) {
    try {
      await axios.post(
        `${this.baseUrl}/api/digilocker/${requestId}/revoke`,
        {},
        { headers: this.headers }
      );

      return {
        success: true,
        message: 'Access revoked successfully'
      };
    } catch (error) {
      console.error('Revoke failed:', error);
      return {
        success: false,
        error: 'Failed to revoke access'
      };
    }
  }

  /**
   * Parse callback parameters from Setu redirect
   * @param {Object} query - Query parameters from callback URL
   * @returns {Object} Parsed callback result
   */
  parseCallback(query) {
    const { success, id, scope, errCode, errMessage, sessionId } = query;
    
    if (success === 'false') {
      return {
        success: false,
        error: errMessage || 'User denied consent',
        errorCode: errCode,
        requestId: id
      };
    }

    // Parse scopes (e.g., "ADHAR+PANCR+DRVLC")
    const scopes = scope ? scope.split('+') : [];
    
    return {
      success: true,
      requestId: id,
      scopes: scopes,
      sessionId: sessionId,
      hasAadhaar: scopes.includes('ADHAR'),
      hasPAN: scopes.includes('PANCR'),
      hasDL: scopes.includes('DRVLC')
    };
  }

  /**
   * Get organization ID for different document types
   * @param {string} docType - Document type
   * @returns {string} Organization ID
   */
  getOrgId(docType) {
    const orgIds = {
      'PANCR': '000001', // PAN Card
      'DRVLC': '002202', // Driving License
      'VTRCD': '000003'  // Voter ID Card
    };
    return orgIds[docType] || '000001';
  }

  /**
   * Generate parameters for document fetch based on type
   * @param {string} docType - Document type
   * @param {Object} data - Document data (numbers, etc.)
   * @returns {Array} Parameters array for API
   */
  generateDocumentParameters(docType, data) {
    switch (docType) {
      case 'DRVLC':
        return [{ name: 'dlno', value: data.dlNumber }];
      case 'PANCR':
        return [{ name: 'panno', value: data.panNumber }];
      case 'VTRCD':
        return [{ name: 'epic_no', value: data.voterIdNumber }];
      default:
        return [];
    }
  }

  /**
   * Get test credentials for sandbox environment
   * @returns {Object} Test credentials for different document types
   */
  getTestCredentials() {
    return {
      aadhaar: '999999990019', // Sandbox Aadhaar number
      pan: 'BKPPK8261K',       // Sandbox PAN number
      drivingLicense: 'MH12-20110012345', // Sandbox DL number
      voterId: 'BLB1234567'    // Sandbox Voter ID
    };
  }

  /**
   * Validate environment configuration
   * @returns {Object} Validation result
   */
  validateConfig() {
    const requiredEnvVars = [
      'SETU_CLIENT_ID',
      'SETU_CLIENT_SECRET', 
      'SETU_PRODUCT_INSTANCE_ID'
    ];

    const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missing.length > 0) {
      return {
        valid: false,
        error: `Missing environment variables: ${missing.join(', ')}`,
        missing: missing
      };
    }

    return {
      valid: true,
      message: 'Setu DigiLocker configuration is valid'
    };
  }
}

export default SetuDigiLockerService;
