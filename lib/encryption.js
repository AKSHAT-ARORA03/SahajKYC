import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits
const TAG_LENGTH = 16; // 128 bits

// Get encryption key from environment
const getEncryptionKey = () => {
  const envKey = process.env.ENCRYPTION_KEY;
  
  if (!envKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  
  // Derive key from environment variable using PBKDF2
  const salt = crypto.createHash('sha256').update('sahaj-kyc-salt').digest();
  return crypto.pbkdf2Sync(envKey, salt, 10000, KEY_LENGTH, 'sha256');
};

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param {string} text - Text to encrypt
 * @returns {string} - Encrypted data as base64 string
 */
export function encrypt(text) {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipher(ALGORITHM, key);
    
    cipher.setAAD(Buffer.from('sahaj-kyc-aad'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV + AuthTag + Encrypted Data
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data encrypted with encrypt()
 * @param {string} encryptedData - Base64 encrypted data
 * @returns {string} - Decrypted text
 */
export function decrypt(encryptedData) {
  try {
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Encrypted data must be a non-empty string');
    }

    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const iv = combined.slice(0, IV_LENGTH);
    const authTag = combined.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.slice(IV_LENGTH + TAG_LENGTH);
    
    const decipher = crypto.createDecipher(ALGORITHM, key);
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from('sahaj-kyc-aad'));
    
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash password using bcrypt-style approach with crypto
 * @param {string} password - Password to hash
 * @returns {string} - Hashed password
 */
export function hashPassword(password) {
  try {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const hash = crypto.pbkdf2Sync(password, salt, 10000, KEY_LENGTH, 'sha256');
    
    // Combine salt and hash
    const combined = Buffer.concat([salt, hash]);
    return combined.toString('base64');
  } catch (error) {
    console.error('Password hashing error:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify password against hash
 * @param {string} password - Password to verify
 * @param {string} hashedPassword - Hashed password to compare against
 * @returns {boolean} - True if password matches
 */
export function verifyPassword(password, hashedPassword) {
  try {
    const combined = Buffer.from(hashedPassword, 'base64');
    const salt = combined.slice(0, SALT_LENGTH);
    const hash = combined.slice(SALT_LENGTH);
    
    const testHash = crypto.pbkdf2Sync(password, salt, 10000, KEY_LENGTH, 'sha256');
    
    return crypto.timingSafeEqual(hash, testHash);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Generate cryptographically secure random string
 * @param {number} length - Length of random string
 * @returns {string} - Random string
 */
export function generateSecureRandom(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate HMAC signature for data integrity
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key for signing
 * @returns {string} - HMAC signature
 */
export function generateHMAC(data, secret = process.env.HMAC_SECRET) {
  if (!secret) {
    throw new Error('HMAC_SECRET environment variable is required');
  }
  
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 * @param {string} data - Original data
 * @param {string} signature - HMAC signature to verify
 * @param {string} secret - Secret key used for signing
 * @returns {boolean} - True if signature is valid
 */
export function verifyHMAC(data, signature, secret = process.env.HMAC_SECRET) {
  if (!secret) {
    throw new Error('HMAC_SECRET environment variable is required');
  }
  
  const expectedSignature = generateHMAC(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Mask sensitive data for display purposes
 * @param {string} data - Data to mask
 * @param {number} visibleStart - Number of characters to show at start
 * @param {number} visibleEnd - Number of characters to show at end
 * @returns {string} - Masked data
 */
export function maskSensitiveData(data, visibleStart = 2, visibleEnd = 2) {
  if (!data || typeof data !== 'string') {
    return '[HIDDEN]';
  }
  
  if (data.length <= visibleStart + visibleEnd) {
    return '*'.repeat(data.length);
  }
  
  const start = data.slice(0, visibleStart);
  const end = data.slice(-visibleEnd);
  const middle = '*'.repeat(data.length - visibleStart - visibleEnd);
  
  return start + middle + end;
}

/**
 * Encrypt PII data with additional metadata
 * @param {Object} piiData - Object containing PII fields
 * @returns {Object} - Encrypted PII with metadata
 */
export function encryptPII(piiData) {
  const encrypted = {};
  const metadata = {
    encryptedAt: new Date().toISOString(),
    fields: [],
    checksum: null
  };
  
  for (const [key, value] of Object.entries(piiData)) {
    if (value && typeof value === 'string') {
      encrypted[key] = encrypt(value);
      metadata.fields.push(key);
    } else {
      encrypted[key] = value;
    }
  }
  
  // Generate checksum for integrity verification
  metadata.checksum = generateHMAC(JSON.stringify(encrypted));
  encrypted._metadata = metadata;
  
  return encrypted;
}

/**
 * Decrypt PII data and verify integrity
 * @param {Object} encryptedPII - Encrypted PII object
 * @returns {Object} - Decrypted PII data
 */
export function decryptPII(encryptedPII) {
  if (!encryptedPII._metadata) {
    throw new Error('PII metadata missing - data may be corrupted');
  }
  
  const { _metadata, ...encryptedData } = encryptedPII;
  
  // Verify data integrity
  const expectedChecksum = generateHMAC(JSON.stringify(encryptedData));
  if (!verifyHMAC(JSON.stringify(encryptedData), _metadata.checksum)) {
    throw new Error('PII data integrity check failed');
  }
  
  const decrypted = {};
  
  for (const [key, value] of Object.entries(encryptedData)) {
    if (_metadata.fields.includes(key)) {
      decrypted[key] = decrypt(value);
    } else {
      decrypted[key] = value;
    }
  }
  
  return decrypted;
}

/**
 * Generate document checksum for tamper detection
 * @param {Object} document - Document object
 * @returns {string} - SHA-256 checksum
 */
export function generateDocumentChecksum(document) {
  const content = JSON.stringify(document, Object.keys(document).sort());
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Verify document integrity
 * @param {Object} document - Document to verify
 * @param {string} expectedChecksum - Expected checksum
 * @returns {boolean} - True if document is valid
 */
export function verifyDocumentIntegrity(document, expectedChecksum) {
  const actualChecksum = generateDocumentChecksum(document);
  return actualChecksum === expectedChecksum;
}

// Export utility functions for common encryption needs
export const EncryptionUtils = {
  // Aadhaar number encryption (India-specific)
  encryptAadhaar: (aadhaar) => {
    if (!/^\d{12}$/.test(aadhaar)) {
      throw new Error('Invalid Aadhaar format');
    }
    return encrypt(aadhaar);
  },
  
  // PAN number encryption (India-specific)
  encryptPAN: (pan) => {
    if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) {
      throw new Error('Invalid PAN format');
    }
    return encrypt(pan);
  },
  
  // Bank account encryption
  encryptBankAccount: (accountNumber) => {
    if (!/^\d{9,18}$/.test(accountNumber)) {
      throw new Error('Invalid bank account format');
    }
    return encrypt(accountNumber);
  },
  
  // Phone number encryption
  encryptPhone: (phone) => {
    if (!/^(\+91|91)?[6-9]\d{9}$/.test(phone)) {
      throw new Error('Invalid Indian mobile number format');
    }
    return encrypt(phone);
  }
};

export default {
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  generateSecureRandom,
  generateHMAC,
  verifyHMAC,
  maskSensitiveData,
  encryptPII,
  decryptPII,
  generateDocumentChecksum,
  verifyDocumentIntegrity,
  EncryptionUtils
};
