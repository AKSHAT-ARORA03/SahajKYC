const CryptoJS = require('crypto-js');

/**
 * Advanced Data Encryption Service
 * Provides comprehensive encryption/decryption for sensitive KYC data
 */
class EncryptionService {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY;
    if (!this.encryptionKey || this.encryptionKey.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
    }
  }

  /**
   * Encrypt sensitive data (Aadhaar, PAN, etc.)
   * @param {string} data - Data to encrypt
   * @param {string} additionalData - Additional authenticated data (AAD)
   * @returns {string} Encrypted data with IV and tag
   */
  encrypt(data, additionalData = '') {
    try {
      const iv = CryptoJS.lib.WordArray.random(12); // 96-bit IV for GCM
      const key = CryptoJS.enc.Utf8.parse(this.encryptionKey);
      
      const encrypted = CryptoJS.AES.encrypt(data, key, {
        iv: iv,
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.NoPadding
      });

      return {
        encrypted: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
        iv: iv.toString(CryptoJS.enc.Base64),
        tag: encrypted.tag?.toString(CryptoJS.enc.Base64) || '',
        algorithm: 'AES-256-GCM'
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive data
   * @param {Object} encryptedData - Object with encrypted, iv, and tag
   * @returns {string} Decrypted data
   */
  decrypt(encryptedData) {
    try {
      const { encrypted, iv, tag } = encryptedData;
      const key = CryptoJS.enc.Utf8.parse(this.encryptionKey);
      
      const decrypted = CryptoJS.AES.decrypt(
        {
          ciphertext: CryptoJS.enc.Base64.parse(encrypted),
          tag: CryptoJS.enc.Base64.parse(tag)
        },
        key,
        {
          iv: CryptoJS.enc.Base64.parse(iv),
          mode: CryptoJS.mode.GCM,
          padding: CryptoJS.pad.NoPadding
        }
      );

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Hash sensitive data for indexing (one-way)
   * @param {string} data - Data to hash
   * @param {string} salt - Optional salt
   * @returns {string} Hashed data
   */
  hash(data, salt = '') {
    const saltedData = salt + data + this.encryptionKey;
    return CryptoJS.SHA256(saltedData).toString(CryptoJS.enc.Hex);
  }

  /**
   * Generate secure random token
   * @param {number} length - Token length in bytes
   * @returns {string} Random token
   */
  generateToken(length = 32) {
    return CryptoJS.lib.WordArray.random(length).toString(CryptoJS.enc.Hex);
  }

  /**
   * Encrypt file data for storage
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} filename - Original filename
   * @returns {Object} Encrypted file data
   */
  encryptFile(fileBuffer, filename) {
    const fileData = fileBuffer.toString('base64');
    const metadata = {
      filename: filename,
      size: fileBuffer.length,
      timestamp: new Date().toISOString()
    };

    const encryptedData = this.encrypt(fileData);
    const encryptedMetadata = this.encrypt(JSON.stringify(metadata));

    return {
      data: encryptedData,
      metadata: encryptedMetadata,
      checksum: this.hash(fileData)
    };
  }

  /**
   * Decrypt file data
   * @param {Object} encryptedFileData - Encrypted file data object
   * @returns {Object} Decrypted file with metadata
   */
  decryptFile(encryptedFileData) {
    const decryptedData = this.decrypt(encryptedFileData.data);
    const decryptedMetadata = JSON.parse(this.decrypt(encryptedFileData.metadata));
    
    // Verify checksum
    const calculatedChecksum = this.hash(decryptedData);
    if (calculatedChecksum !== encryptedFileData.checksum) {
      throw new Error('File integrity check failed');
    }

    return {
      buffer: Buffer.from(decryptedData, 'base64'),
      metadata: decryptedMetadata
    };
  }

  /**
   * Encrypt Aadhaar number with special handling
   * @param {string} aadhaarNumber - 12-digit Aadhaar number
   * @returns {Object} Encrypted Aadhaar with masked version
   */
  encryptAadhaar(aadhaarNumber) {
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      throw new Error('Invalid Aadhaar number format');
    }

    const encrypted = this.encrypt(aadhaarNumber, 'AADHAAR');
    const masked = `XXXX-XXXX-${aadhaarNumber.slice(-4)}`;
    const hash = this.hash(aadhaarNumber, 'AADHAAR_SALT');

    return {
      encrypted: encrypted,
      masked: masked,
      hash: hash
    };
  }

  /**
   * Encrypt PAN number with special handling
   * @param {string} panNumber - 10-character PAN number
   * @returns {Object} Encrypted PAN with masked version
   */
  encryptPAN(panNumber) {
    if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(panNumber)) {
      throw new Error('Invalid PAN number format');
    }

    const encrypted = this.encrypt(panNumber, 'PAN');
    const masked = `${panNumber.slice(0, 3)}XXXX${panNumber.slice(-1)}`;
    const hash = this.hash(panNumber, 'PAN_SALT');

    return {
      encrypted: encrypted,
      masked: masked,
      hash: hash
    };
  }

  /**
   * Validate encryption key strength
   * @returns {Object} Validation result
   */
  validateKeyStrength() {
    if (!this.encryptionKey) {
      return { valid: false, error: 'No encryption key provided' };
    }

    if (this.encryptionKey.length !== 32) {
      return { valid: false, error: 'Key must be exactly 32 characters' };
    }

    // Check for complexity
    const hasLower = /[a-z]/.test(this.encryptionKey);
    const hasUpper = /[A-Z]/.test(this.encryptionKey);
    const hasDigit = /\d/.test(this.encryptionKey);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.encryptionKey);

    const complexity = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
    
    if (complexity < 3) {
      return { 
        valid: false, 
        error: 'Key should contain at least 3 of: lowercase, uppercase, digits, special characters' 
      };
    }

    return { valid: true, strength: complexity === 4 ? 'STRONG' : 'MEDIUM' };
  }
}

module.exports = EncryptionService;
