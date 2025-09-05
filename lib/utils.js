import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in Indian Rupees
 */
export function formatCurrency(amount, locale = 'en-IN') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format date for Indian locale
 */
export function formatDate(date, locale = 'en-IN', options = {}) {
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  };
  
  return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(new Date(date));
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone) {
  if (!phone) return '';
  
  // Remove country code and format as Indian mobile number
  const cleaned = phone.replace(/^\+?91?/, '').replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  
  return phone;
}

/**
 * Mask sensitive information
 */
export function maskSensitive(value, type = 'default', visibleChars = 4) {
  if (!value) return '';
  
  switch (type) {
    case 'aadhaar':
      // Show only last 4 digits of Aadhaar
      return `XXXX XXXX ${value.slice(-4)}`;
    
    case 'pan':
      // Show first 3 and last 1 characters of PAN
      return `${value.slice(0, 3)}XXXXX${value.slice(-1)}`;
    
    case 'phone':
      // Show country code and last 2 digits
      return value.replace(/(\+91)(\d{6})(\d{2})/, '$1 XXXXXX$3');
    
    case 'email':
      const [username, domain] = value.split('@');
      const maskedUsername = username.slice(0, 2) + 'X'.repeat(username.length - 2);
      return `${maskedUsername}@${domain}`;
    
    case 'account':
      // Show only last 4 digits of account number
      return `XXXXXX${value.slice(-4)}`;
    
    default:
      const visibleStart = Math.floor(visibleChars / 2);
      const visibleEnd = visibleChars - visibleStart;
      return value.slice(0, visibleStart) + 
             'X'.repeat(Math.max(0, value.length - visibleChars)) + 
             value.slice(-visibleEnd);
  }
}

/**
 * Generate random ID
 */
export function generateId(prefix = '', length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return prefix ? `${prefix}_${result}` : result;
}

/**
 * Validate Indian mobile number
 */
export function validatePhoneNumber(phone) {
  const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
  return phoneRegex.test(phone?.replace(/\s+/g, ''));
}

/**
 * Validate Aadhaar number
 */
export function validateAadhaar(aadhaar) {
  if (!aadhaar || aadhaar.length !== 12) return false;
  
  // Check if all digits are the same
  if (/^(\d)\1{11}$/.test(aadhaar)) return false;
  
  // Check if it's a sequential number
  if (/^0123456789/.test(aadhaar.slice(0, 10))) return false;
  
  // Aadhaar checksum validation (simplified)
  const digits = aadhaar.split('').map(Number);
  const checksum = digits.pop();
  
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += digits[i] * (2 + (11 - i) % 8);
  }
  
  const calculatedChecksum = (12 - (sum % 11)) % 11;
  return calculatedChecksum === checksum;
}

/**
 * Validate PAN number
 */
export function validatePAN(pan) {
  const panRegex = /^[A-Z]{5}\d{4}[A-Z]$/;
  return panRegex.test(pan);
}

/**
 * Validate Indian pincode
 */
export function validatePincode(pincode) {
  const pincodeRegex = /^[1-9][0-9]{5}$/;
  return pincodeRegex.test(pincode);
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Get relative time string
 */
export function getRelativeTime(date, locale = 'en-IN') {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
  
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 }
  ];
  
  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count > 0) {
      return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
        .format(-count, interval.label);
    }
  }
  
  return 'just now';
}

/**
 * File size formatter
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename) {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * Check if file type is allowed
 */
export function isAllowedFileType(filename, allowedTypes = ['jpg', 'jpeg', 'png', 'pdf']) {
  const extension = getFileExtension(filename).toLowerCase();
  return allowedTypes.includes(extension);
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Deep clone object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

/**
 * Capitalize first letter
 */
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert string to title case
 */
export function toTitleCase(str) {
  return str.replace(/\w\S*/g, txt => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Generate OTP
 */
export function generateOTP(length = 6) {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
}

/**
 * Check if value is empty
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Get browser information
 */
export function getBrowserInfo() {
  if (typeof window === 'undefined') return null;
  
  const { userAgent } = navigator;
  const browserName = 
    userAgent.indexOf('Chrome') > -1 ? 'Chrome' :
    userAgent.indexOf('Firefox') > -1 ? 'Firefox' :
    userAgent.indexOf('Safari') > -1 ? 'Safari' :
    userAgent.indexOf('Edge') > -1 ? 'Edge' :
    'Unknown';
    
  return {
    name: browserName,
    userAgent,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled
  };
}

/**
 * Get device information
 */
export function getDeviceInfo() {
  if (typeof window === 'undefined') return null;
  
  const { screen, navigator } = window;
  
  return {
    type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    screenResolution: `${screen.width}x${screen.height}`,
    colorDepth: screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    onlineStatus: navigator.onLine
  };
}

/**
 * Generate device fingerprint
 */
export function generateDeviceFingerprint() {
  if (typeof window === 'undefined') return null;
  
  const browserInfo = getBrowserInfo();
  const deviceInfo = getDeviceInfo();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Create canvas fingerprint
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('SAHAJ KYC Fingerprint', 2, 2);
  const canvasFingerprint = canvas.toDataURL();
  
  const fingerprint = {
    userAgent: browserInfo?.userAgent,
    language: browserInfo?.language,
    platform: browserInfo?.platform,
    screenResolution: deviceInfo?.screenResolution,
    timezone: deviceInfo?.timezone,
    canvas: canvasFingerprint.slice(-50), // Last 50 chars
    timestamp: Date.now()
  };
  
  // Generate hash
  return btoa(JSON.stringify(fingerprint)).slice(0, 32);
}

/**
 * Local storage with expiry
 */
export const storage = {
  set(key, value, expiryInMinutes = 60) {
    const expiryTime = new Date().getTime() + (expiryInMinutes * 60 * 1000);
    const item = { value, expiry: expiryTime };
    localStorage.setItem(key, JSON.stringify(item));
  },
  
  get(key) {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    
    const item = JSON.parse(itemStr);
    const now = new Date().getTime();
    
    if (now > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    
    return item.value;
  },
  
  remove(key) {
    localStorage.removeItem(key);
  },
  
  clear() {
    localStorage.clear();
  }
};

/**
 * API error handler
 */
export function handleApiError(error) {
  console.error('API Error:', error);
  
  if (error.response) {
    // Server responded with error status
    return {
      message: error.response.data?.message || 'Server error occurred',
      status: error.response.status,
      code: error.response.data?.code
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      message: 'Network error - please check your connection',
      status: 0,
      code: 'NETWORK_ERROR'
    };
  } else {
    // Something else happened
    return {
      message: error.message || 'An unexpected error occurred',
      status: 500,
      code: 'UNKNOWN_ERROR'
    };
  }
}
