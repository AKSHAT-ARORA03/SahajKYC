import { NextResponse } from 'next/server';
import { AuditLog } from '../models/index.js';

/**
 * Comprehensive Error Handling Middleware for SAHAJ KYC
 * Provides structured error handling, logging, and user-friendly responses
 */

// Error types and their HTTP status codes
const ERROR_TYPES = {
  ValidationError: 400,
  AuthenticationError: 401,
  AuthorizationError: 403,
  NotFoundError: 404,
  ConflictError: 409,
  RateLimitError: 429,
  InternalServerError: 500,
  ServiceUnavailableError: 503,
  BadGatewayError: 502
};

// Indian language error messages
const ERROR_MESSAGES = {
  en: {
    validation_failed: 'The provided data is invalid',
    authentication_required: 'Please log in to continue',
    access_denied: 'You do not have permission to perform this action',
    resource_not_found: 'The requested resource was not found',
    rate_limit_exceeded: 'Too many requests. Please try again later',
    internal_error: 'An internal error occurred. Please try again',
    service_unavailable: 'Service is temporarily unavailable',
    kyc_application_not_found: 'KYC application not found',
    document_upload_failed: 'Document upload failed',
    face_verification_failed: 'Face verification could not be completed',
    digilocker_error: 'DigiLocker service error'
  },
  hi: {
    validation_failed: 'प्रदान किया गया डेटा अवैध है',
    authentication_required: 'कृपया जारी रखने के लिए लॉग इन करें',
    access_denied: 'आपके पास यह कार्य करने की अनुमति नहीं है',
    resource_not_found: 'अनुरोधित संसाधन नहीं मिला',
    rate_limit_exceeded: 'बहुत से अनुरोध। कृपया बाद में पुनः प्रयास करें',
    internal_error: 'एक आंतरिक त्रुटि हुई। कृपया पुनः प्रयास करें',
    service_unavailable: 'सेवा अस्थायी रूप से उपलब्ध नहीं है',
    kyc_application_not_found: 'KYC आवेदन नहीं मिला',
    document_upload_failed: 'दस्तावेज़ अपलोड विफल',
    face_verification_failed: 'चेहरा सत्यापन पूरा नहीं हो सका',
    digilocker_error: 'DigiLocker सेवा त्रुटि'
  }
};

export class ErrorMiddleware {
  /**
   * Custom error classes
   */
  static ValidationError = class extends Error {
    constructor(message, details = null) {
      super(message);
      this.name = 'ValidationError';
      this.details = details;
    }
  };

  static AuthenticationError = class extends Error {
    constructor(message = 'Authentication required') {
      super(message);
      this.name = 'AuthenticationError';
    }
  };

  static AuthorizationError = class extends Error {
    constructor(message = 'Access denied') {
      super(message);
      this.name = 'AuthorizationError';
    }
  };

  static NotFoundError = class extends Error {
    constructor(message = 'Resource not found') {
      super(message);
      this.name = 'NotFoundError';
    }
  };

  static ConflictError = class extends Error {
    constructor(message = 'Resource conflict') {
      super(message);
      this.name = 'ConflictError';
    }
  };

  static RateLimitError = class extends Error {
    constructor(message = 'Rate limit exceeded', retryAfter = 60) {
      super(message);
      this.name = 'RateLimitError';
      this.retryAfter = retryAfter;
    }
  };

  static ServiceUnavailableError = class extends Error {
    constructor(message = 'Service temporarily unavailable') {
      super(message);
      this.name = 'ServiceUnavailableError';
    }
  };

  /**
   * Main error handling wrapper for API routes
   */
  static withErrorHandling(handler) {
    return async (request, context) => {
      try {
        return await handler(request, context);
      } catch (error) {
        return this.handleError(error, request);
      }
    };
  }

  /**
   * Handle different types of errors
   */
  static async handleError(error, request) {
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();
    const url = new URL(request.url);
    const method = request.method;
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Get user language preference
    const language = request.headers.get('accept-language')?.includes('hi') ? 'hi' : 'en';

    // Log error details
    const errorDetails = {
      errorId,
      name: error.name,
      message: error.message,
      stack: error.stack,
      url: url.pathname,
      method,
      userAgent,
      ip,
      timestamp,
      userId: request.user?.id || null
    };

    console.error('API Error:', errorDetails);

    // Create audit log for significant errors
    if (request.user?.id && this.shouldAuditError(error)) {
      try {
        await AuditLog.create({
          userId: request.user.id,
          action: 'API_ERROR',
          resourceType: 'Error',
          details: {
            errorId,
            errorType: error.name,
            endpoint: url.pathname,
            method,
            message: error.message
          },
          ipAddress: ip,
          userAgent
        });
      } catch (auditError) {
        console.error('Failed to create audit log for error:', auditError);
      }
    }

    // Determine error response based on error type
    const errorResponse = this.buildErrorResponse(error, errorId, language);

    // Add correlation headers for debugging
    errorResponse.headers = {
      'X-Error-ID': errorId,
      'X-Timestamp': timestamp,
      ...errorResponse.headers
    };

    return NextResponse.json(errorResponse.body, {
      status: errorResponse.status,
      headers: errorResponse.headers
    });
  }

  /**
   * Build structured error response
   */
  static buildErrorResponse(error, errorId, language = 'en') {
    const status = ERROR_TYPES[error.name] || 500;
    const messages = ERROR_MESSAGES[language] || ERROR_MESSAGES.en;

    // Base error response structure
    const errorResponse = {
      success: false,
      error: {
        code: error.code || error.name || 'UNKNOWN_ERROR',
        message: this.getLocalizedMessage(error, language),
        errorId,
        timestamp: new Date().toISOString()
      }
    };

    // Add specific details based on error type
    switch (error.name) {
      case 'ValidationError':
        errorResponse.error.details = error.details;
        errorResponse.error.type = 'validation';
        break;

      case 'AuthenticationError':
        errorResponse.error.type = 'authentication';
        errorResponse.error.action = 'login_required';
        break;

      case 'AuthorizationError':
        errorResponse.error.type = 'authorization';
        errorResponse.error.action = 'contact_support';
        break;

      case 'NotFoundError':
        errorResponse.error.type = 'not_found';
        break;

      case 'ConflictError':
        errorResponse.error.type = 'conflict';
        errorResponse.error.action = 'check_existing_resource';
        break;

      case 'RateLimitError':
        errorResponse.error.type = 'rate_limit';
        errorResponse.error.retryAfter = error.retryAfter;
        errorResponse.error.action = 'retry_later';
        break;

      case 'ServiceUnavailableError':
        errorResponse.error.type = 'service_unavailable';
        errorResponse.error.action = 'retry_later';
        break;

      default:
        // For unknown/internal errors, don't expose technical details in production
        if (process.env.NODE_ENV === 'production') {
          errorResponse.error.message = messages.internal_error;
          errorResponse.error.type = 'internal';
        } else {
          errorResponse.error.message = error.message;
          errorResponse.error.stack = error.stack;
          errorResponse.error.type = 'internal';
        }
    }

    // Add user-friendly suggestions based on error type
    errorResponse.error.suggestions = this.getErrorSuggestions(error, language);

    return {
      body: errorResponse,
      status,
      headers: error.name === 'RateLimitError' ? {
        'Retry-After': error.retryAfter?.toString() || '60'
      } : {}
    };
  }

  /**
   * Get localized error message
   */
  static getLocalizedMessage(error, language) {
    const messages = ERROR_MESSAGES[language] || ERROR_MESSAGES.en;
    
    // Check if there's a specific message for this error code
    if (error.code && messages[error.code.toLowerCase()]) {
      return messages[error.code.toLowerCase()];
    }

    // Check for error name mapping
    const nameKey = error.name?.toLowerCase().replace('error', '_failed');
    if (nameKey && messages[nameKey]) {
      return messages[nameKey];
    }

    // Return the original error message or a default
    return error.message || messages.internal_error;
  }

  /**
   * Get user-friendly suggestions for error resolution
   */
  static getErrorSuggestions(error, language = 'en') {
    const suggestions = {
      en: {
        ValidationError: [
          'Check that all required fields are filled',
          'Ensure data formats match the expected pattern',
          'Verify file types and sizes are within limits'
        ],
        AuthenticationError: [
          'Log in to your account',
          'Check if your session has expired',
          'Contact support if you cannot access your account'
        ],
        NotFoundError: [
          'Check the URL for typos',
          'Verify the resource exists',
          'Contact support if the issue persists'
        ],
        RateLimitError: [
          'Wait a few minutes before trying again',
          'Reduce the frequency of your requests',
          'Contact support if you need higher limits'
        ],
        ConflictError: [
          'Check if you already have an active application',
          'Complete or cancel existing processes',
          'Contact support for assistance'
        ]
      },
      hi: {
        ValidationError: [
          'जांच लें कि सभी आवश्यक फील्ड भरे गए हैं',
          'सुनिश्चित करें कि डेटा प्रारूप अपेक्षित पैटर्न से मेल खाता है',
          'सत्यापित करें कि फ़ाइल प्रकार और आकार सीमा के भीतर हैं'
        ],
        AuthenticationError: [
          'अपने खाते में लॉग इन करें',
          'जांचें कि कहीं आपका सत्र समाप्त तो नहीं हो गया',
          'यदि आप अपने खाते तक पहुंच नहीं पा रहे तो सहायता से संपर्क करें'
        ]
      }
    };

    const langSuggestions = suggestions[language] || suggestions.en;
    return langSuggestions[error.name] || langSuggestions.ValidationError;
  }

  /**
   * Generate unique error ID for tracking
   */
  static generateErrorId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `err_${timestamp}_${random}`;
  }

  /**
   * Determine if error should be audited
   */
  static shouldAuditError(error) {
    const auditableErrors = [
      'AuthenticationError',
      'AuthorizationError',
      'ValidationError',
      'ConflictError'
    ];
    return auditableErrors.includes(error.name);
  }

  /**
   * Handle MongoDB/Database specific errors
   */
  static handleDatabaseError(error) {
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern || {})[0];
      return new this.ConflictError(
        `A record with this ${field} already exists`
      );
    }

    if (error.name === 'ValidationError') {
      // Mongoose validation error
      const details = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      return new this.ValidationError('Database validation failed', details);
    }

    if (error.name === 'CastError') {
      return new this.ValidationError(`Invalid ${error.path}: ${error.value}`);
    }

    // Generic database error
    return new Error('Database operation failed');
  }

  /**
   * Handle external service errors (Setu, Cloudinary, etc.)
   */
  static handleExternalServiceError(error, serviceName) {
    if (error.response?.status === 429) {
      return new this.RateLimitError(`${serviceName} rate limit exceeded`);
    }

    if (error.response?.status >= 500) {
      return new this.ServiceUnavailableError(`${serviceName} is temporarily unavailable`);
    }

    if (error.response?.status === 401) {
      return new this.AuthenticationError(`${serviceName} authentication failed`);
    }

    return new Error(`${serviceName} error: ${error.message}`);
  }

  /**
   * Middleware for handling uncaught errors in API routes
   */
  static globalErrorHandler() {
    // Set up global error handlers
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Promise Rejection:', reason);
      // Don't exit the process in production
      if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
      }
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      // Graceful shutdown
      process.exit(1);
    });
  }
}

// Initialize global error handlers
ErrorMiddleware.globalErrorHandler();

// Export error classes for use in other modules
export const {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError
} = ErrorMiddleware;

// Export convenience function
export const withErrorHandling = (handler) => ErrorMiddleware.withErrorHandling(handler);
