const winston = require('winston');
const path = require('path');

/**
 * Structured Logging Service for KYC Application
 * Provides comprehensive logging with different levels and formats
 */
class LoggerService {
  constructor() {
    this.logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
    this.environment = process.env.NODE_ENV || 'development';
    this.appName = process.env.APP_NAME || 'kyc-app';
    
    this.initializeLogger();
  }

  initializeLogger() {
    // Custom log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, service, userId, sessionId, action, ...meta }) => {
        const logEntry = {
          timestamp,
          level,
          message,
          service: service || this.appName,
          environment: this.environment,
          ...(userId && { userId }),
          ...(sessionId && { sessionId }),
          ...(action && { action }),
          ...meta
        };
        return JSON.stringify(logEntry);
      })
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, service, userId, action }) => {
        let logLine = `${timestamp} [${level}]`;
        if (service) logLine += ` (${service})`;
        if (userId) logLine += ` [User: ${userId}]`;
        if (action) logLine += ` [${action}]`;
        logLine += `: ${message}`;
        return logLine;
      })
    );

    // Create transports based on environment
    const transports = [];

    // Console transport (always enabled in development)
    if (this.environment === 'development') {
      transports.push(
        new winston.transports.Console({
          format: consoleFormat,
          level: 'debug'
        })
      );
    } else {
      transports.push(
        new winston.transports.Console({
          format: logFormat,
          level: 'info'
        })
      );
    }

    // File transports for production
    if (this.environment === 'production') {
      // Error logs
      transports.push(
        new winston.transports.File({
          filename: path.join(this.logDir, 'error.log'),
          level: 'error',
          format: logFormat,
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 5,
          tailable: true
        })
      );

      // Combined logs
      transports.push(
        new winston.transports.File({
          filename: path.join(this.logDir, 'combined.log'),
          format: logFormat,
          maxsize: 100 * 1024 * 1024, // 100MB
          maxFiles: 10,
          tailable: true
        })
      );

      // Security logs
      transports.push(
        new winston.transports.File({
          filename: path.join(this.logDir, 'security.log'),
          level: 'warn',
          format: logFormat,
          maxsize: 25 * 1024 * 1024, // 25MB
          maxFiles: 20,
          tailable: true
        })
      );
    }

    this.logger = winston.createLogger({
      level: this.environment === 'production' ? 'info' : 'debug',
      format: logFormat,
      defaultMeta: { service: this.appName },
      transports,
      exitOnError: false
    });

    // Handle uncaught exceptions and unhandled rejections
    this.logger.exceptions.handle(
      new winston.transports.File({ 
        filename: path.join(this.logDir, 'exceptions.log'),
        maxsize: 10 * 1024 * 1024,
        maxFiles: 3
      })
    );

    this.logger.rejections.handle(
      new winston.transports.File({ 
        filename: path.join(this.logDir, 'rejections.log'),
        maxsize: 10 * 1024 * 1024,
        maxFiles: 3
      })
    );
  }

  /**
   * Log info message
   */
  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  /**
   * Log error message
   */
  error(message, error = null, meta = {}) {
    const errorMeta = error ? {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    } : {};
    
    this.logger.error(message, { ...errorMeta, ...meta });
  }

  /**
   * Log warning message
   */
  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  /**
   * Log debug message
   */
  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  /**
   * Log user activity
   */
  logUserActivity(userId, action, details = {}) {
    this.info(`User activity: ${action}`, {
      userId,
      action,
      category: 'user_activity',
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  /**
   * Log KYC activity
   */
  logKYCActivity(userId, kycApplicationId, action, status, details = {}) {
    this.info(`KYC activity: ${action}`, {
      userId,
      kycApplicationId,
      action,
      status,
      category: 'kyc_activity',
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(eventType, details = {}) {
    this.warn(`Security event: ${eventType}`, {
      eventType,
      category: 'security',
      riskLevel: details.riskLevel || 'MEDIUM',
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  /**
   * Log API request
   */
  logAPIRequest(req, res, duration) {
    const { method, url, ip, headers } = req;
    const { statusCode } = res;
    
    this.info('API Request', {
      method,
      url,
      ip,
      statusCode,
      duration,
      userAgent: headers['user-agent'],
      category: 'api_request',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log database operation
   */
  logDatabaseOperation(operation, collection, duration, recordCount = 1) {
    this.debug('Database operation', {
      operation,
      collection,
      duration,
      recordCount,
      category: 'database',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log face recognition operation
   */
  logFaceRecognition(userId, operation, result, confidence = null) {
    this.info(`Face recognition: ${operation}`, {
      userId,
      operation,
      result,
      confidence,
      category: 'face_recognition',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log Setu DigiLocker operation
   */
  logSetuOperation(userId, requestId, operation, status, details = {}) {
    this.info(`Setu DigiLocker: ${operation}`, {
      userId,
      requestId,
      operation,
      status,
      category: 'setu_digilocker',
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation, duration, details = {}) {
    this.info(`Performance: ${operation}`, {
      operation,
      duration,
      category: 'performance',
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  /**
   * Create child logger with persistent metadata
   */
  child(meta) {
    return {
      info: (message, additionalMeta = {}) => this.info(message, { ...meta, ...additionalMeta }),
      error: (message, error = null, additionalMeta = {}) => this.error(message, error, { ...meta, ...additionalMeta }),
      warn: (message, additionalMeta = {}) => this.warn(message, { ...meta, ...additionalMeta }),
      debug: (message, additionalMeta = {}) => this.debug(message, { ...meta, ...additionalMeta })
    };
  }

  /**
   * Get logger instance for direct access
   */
  getLogger() {
    return this.logger;
  }

  /**
   * Test logger configuration
   */
  test() {
    this.debug('Logger test: Debug level');
    this.info('Logger test: Info level');
    this.warn('Logger test: Warning level');
    this.error('Logger test: Error level');
    
    return {
      environment: this.environment,
      logLevel: this.logger.level,
      transports: this.logger.transports.length,
      logDir: this.logDir
    };
  }
}

// Create singleton instance
const loggerService = new LoggerService();

module.exports = loggerService;
