const Redis = require('ioredis');

/**
 * Redis Caching Service with Fallbacks
 * Provides intelligent caching for KYC application with graceful degradation
 */
class CacheService {
  constructor() {
    this.redis = null;
    this.fallbackCache = new Map(); // In-memory fallback
    this.isRedisConnected = false;
    this.maxFallbackSize = 1000; // Limit fallback cache size
    
    this.initializeRedis();
  }

  async initializeRedis() {
    try {
      if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        // Use Upstash Redis (serverless)
        this.redis = new Redis({
          host: process.env.UPSTASH_REDIS_REST_URL.replace('https://', '').replace('http://', ''),
          port: 6379,
          password: process.env.UPSTASH_REDIS_REST_TOKEN,
          tls: true,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true
        });
      } else if (process.env.REDIS_URL) {
        // Standard Redis connection
        this.redis = new Redis(process.env.REDIS_URL, {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true
        });
      }

      if (this.redis) {
        this.redis.on('connect', () => {
          console.log('Redis connected successfully');
          this.isRedisConnected = true;
        });

        this.redis.on('error', (error) => {
          console.warn('Redis connection error, falling back to memory cache:', error.message);
          this.isRedisConnected = false;
        });

        this.redis.on('close', () => {
          console.log('Redis connection closed');
          this.isRedisConnected = false;
        });

        // Test connection
        await this.redis.ping();
      }
    } catch (error) {
      console.warn('Redis initialization failed, using memory cache:', error.message);
      this.isRedisConnected = false;
    }
  }

  /**
   * Set cache value with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = 3600) {
    try {
      const serializedValue = JSON.stringify(value);
      
      if (this.isRedisConnected && this.redis) {
        if (ttl > 0) {
          await this.redis.setex(key, ttl, serializedValue);
        } else {
          await this.redis.set(key, serializedValue);
        }
        return true;
      } else {
        // Fallback to memory cache
        this.manageFallbackCacheSize();
        this.fallbackCache.set(key, {
          value: serializedValue,
          expiry: ttl > 0 ? Date.now() + (ttl * 1000) : null
        });
        return true;
      }
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Get cache value
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    try {
      if (this.isRedisConnected && this.redis) {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        // Fallback to memory cache
        const cached = this.fallbackCache.get(key);
        if (!cached) return null;
        
        // Check expiry
        if (cached.expiry && Date.now() > cached.expiry) {
          this.fallbackCache.delete(key);
          return null;
        }
        
        return JSON.parse(cached.value);
      }
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Delete cache value
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    try {
      if (this.isRedisConnected && this.redis) {
        await this.redis.del(key);
      } else {
        this.fallbackCache.delete(key);
      }
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Existence status
   */
  async exists(key) {
    try {
      if (this.isRedisConnected && this.redis) {
        const result = await this.redis.exists(key);
        return result === 1;
      } else {
        const cached = this.fallbackCache.get(key);
        if (!cached) return false;
        
        // Check expiry
        if (cached.expiry && Date.now() > cached.expiry) {
          this.fallbackCache.delete(key);
          return false;
        }
        
        return true;
      }
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Set multiple values
   * @param {Object} keyValues - Object with key-value pairs
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async mset(keyValues, ttl = 3600) {
    try {
      const promises = Object.entries(keyValues).map(([key, value]) => 
        this.set(key, value, ttl)
      );
      const results = await Promise.all(promises);
      return results.every(result => result);
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Get multiple values
   * @param {string[]} keys - Array of cache keys
   * @returns {Promise<Object>} Object with key-value pairs
   */
  async mget(keys) {
    try {
      const promises = keys.map(key => this.get(key));
      const values = await Promise.all(promises);
      
      const result = {};
      keys.forEach((key, index) => {
        result[key] = values[index];
      });
      
      return result;
    } catch (error) {
      console.error('Cache mget error:', error);
      return {};
    }
  }

  /**
   * Clear all cache (use with caution)
   * @returns {Promise<boolean>} Success status
   */
  async clear() {
    try {
      if (this.isRedisConnected && this.redis) {
        await this.redis.flushdb();
      } else {
        this.fallbackCache.clear();
      }
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  /**
   * Cache KYC application data
   * @param {string} userId - User ID
   * @param {string} applicationId - KYC application ID
   * @param {Object} data - Application data
   * @returns {Promise<boolean>} Success status
   */
  async cacheKYCApplication(userId, applicationId, data) {
    const key = `kyc:application:${applicationId}`;
    const userKey = `kyc:user:${userId}:applications`;
    
    const success = await this.set(key, data, 3600); // 1 hour
    
    // Cache user's applications list
    const userApps = await this.get(userKey) || [];
    if (!userApps.includes(applicationId)) {
      userApps.push(applicationId);
      await this.set(userKey, userApps, 7200); // 2 hours
    }
    
    return success;
  }

  /**
   * Cache face verification result
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID
   * @param {Object} result - Verification result
   * @returns {Promise<boolean>} Success status
   */
  async cacheFaceVerification(userId, sessionId, result) {
    const key = `face:verification:${userId}:${sessionId}`;
    return await this.set(key, result, 1800); // 30 minutes
  }

  /**
   * Cache document processing result
   * @param {string} documentId - Document ID
   * @param {Object} ocrResult - OCR processing result
   * @returns {Promise<boolean>} Success status
   */
  async cacheDocumentOCR(documentId, ocrResult) {
    const key = `document:ocr:${documentId}`;
    return await this.set(key, ocrResult, 7200); // 2 hours
  }

  /**
   * Cache user session data
   * @param {string} sessionId - Session ID
   * @param {Object} sessionData - Session data
   * @returns {Promise<boolean>} Success status
   */
  async cacheUserSession(sessionId, sessionData) {
    const key = `session:${sessionId}`;
    return await this.set(key, sessionData, 3600); // 1 hour
  }

  /**
   * Rate limiting helper
   * @param {string} identifier - Rate limit identifier (IP, user ID, etc.)
   * @param {number} limit - Request limit
   * @param {number} window - Time window in seconds
   * @returns {Promise<Object>} Rate limit status
   */
  async rateLimit(identifier, limit = 100, window = 3600) {
    try {
      const key = `ratelimit:${identifier}`;
      
      if (this.isRedisConnected && this.redis) {
        const current = await this.redis.incr(key);
        if (current === 1) {
          await this.redis.expire(key, window);
        }
        
        const remaining = Math.max(0, limit - current);
        const resetTime = await this.redis.ttl(key);
        
        return {
          allowed: current <= limit,
          remaining: remaining,
          resetTime: resetTime > 0 ? Date.now() + (resetTime * 1000) : null,
          current: current
        };
      } else {
        // Simple fallback rate limiting
        const now = Date.now();
        const windowStart = now - (window * 1000);
        const requestKey = `ratelimit_${identifier}`;
        
        let requests = this.fallbackCache.get(requestKey) || [];
        requests = requests.filter(timestamp => timestamp > windowStart);
        requests.push(now);
        
        this.fallbackCache.set(requestKey, requests);
        
        return {
          allowed: requests.length <= limit,
          remaining: Math.max(0, limit - requests.length),
          resetTime: requests.length > 0 ? requests[0] + (window * 1000) : null,
          current: requests.length
        };
      }
    } catch (error) {
      console.error('Rate limit error:', error);
      return { allowed: true, remaining: limit, resetTime: null, current: 0 };
    }
  }

  /**
   * Manage fallback cache size to prevent memory issues
   */
  manageFallbackCacheSize() {
    if (this.fallbackCache.size >= this.maxFallbackSize) {
      // Remove oldest entries (simple LRU approximation)
      const entries = Array.from(this.fallbackCache.entries());
      const toDelete = Math.floor(this.maxFallbackSize * 0.1); // Remove 10%
      
      for (let i = 0; i < toDelete; i++) {
        this.fallbackCache.delete(entries[i][0]);
      }
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getStats() {
    try {
      if (this.isRedisConnected && this.redis) {
        const info = await this.redis.info('memory');
        return {
          type: 'redis',
          connected: true,
          memory: info,
          keyspace: await this.redis.info('keyspace')
        };
      } else {
        return {
          type: 'memory',
          connected: false,
          size: this.fallbackCache.size,
          maxSize: this.maxFallbackSize
        };
      }
    } catch (error) {
      return {
        type: 'unknown',
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Health check
   * @returns {Promise<boolean>} Health status
   */
  async healthCheck() {
    try {
      if (this.isRedisConnected && this.redis) {
        await this.redis.ping();
        return true;
      }
      return this.fallbackCache instanceof Map;
    } catch (error) {
      return false;
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
