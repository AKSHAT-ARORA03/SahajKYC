import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Cache Configuration
 */
const CACHE_KEYS = {
  USER: 'user:',
  KYC_APPLICATION: 'kyc:',
  DOCUMENT: 'doc:',
  FACE_VERIFICATION: 'face:',
  SESSION: 'session:',
  OTP: 'otp:',
  RATE_LIMIT: 'rate:',
  SYNC_QUEUE: 'sync:queue',
  OFFLINE_DATA: 'offline:',
};

const CACHE_TTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 hour
  DAY: 86400,      // 24 hours
  WEEK: 604800,    // 7 days
  MONTH: 2592000,  // 30 days
};

/**
 * Generic Cache Operations
 */
export class CacheService {
  static async get(key) {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  static async set(key, value, ttl = CACHE_TTL.MEDIUM) {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  static async del(key) {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  static async exists(key) {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  static async increment(key, increment = 1, ttl = CACHE_TTL.MEDIUM) {
    try {
      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, ttl);
      const [count] = await pipeline.exec();
      return count;
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  static async getPattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return [];
      
      const values = await redis.mget(...keys);
      return keys.map((key, index) => ({
        key,
        value: values[index] ? JSON.parse(values[index]) : null
      }));
    } catch (error) {
      console.error(`Cache pattern get error for pattern ${pattern}:`, error);
      return [];
    }
  }
}

/**
 * User Cache Operations
 */
export class UserCache {
  static getKey(userId) {
    return `${CACHE_KEYS.USER}${userId}`;
  }

  static async get(userId) {
    return CacheService.get(this.getKey(userId));
  }

  static async set(userId, userData, ttl = CACHE_TTL.LONG) {
    return CacheService.set(this.getKey(userId), userData, ttl);
  }

  static async invalidate(userId) {
    return CacheService.del(this.getKey(userId));
  }

  static async getProfile(userId) {
    const key = `${this.getKey(userId)}:profile`;
    return CacheService.get(key);
  }

  static async setProfile(userId, profile, ttl = CACHE_TTL.LONG) {
    const key = `${this.getKey(userId)}:profile`;
    return CacheService.set(key, profile, ttl);
  }
}

/**
 * KYC Application Cache Operations
 */
export class KycCache {
  static getKey(applicationId) {
    return `${CACHE_KEYS.KYC_APPLICATION}${applicationId}`;
  }

  static async get(applicationId) {
    return CacheService.get(this.getKey(applicationId));
  }

  static async set(applicationId, applicationData, ttl = CACHE_TTL.MEDIUM) {
    return CacheService.set(this.getKey(applicationId), applicationData, ttl);
  }

  static async invalidate(applicationId) {
    return CacheService.del(this.getKey(applicationId));
  }

  static async getUserApplications(userId) {
    const key = `${CACHE_KEYS.USER}${userId}:kyc`;
    return CacheService.get(key);
  }

  static async setUserApplications(userId, applications, ttl = CACHE_TTL.MEDIUM) {
    const key = `${CACHE_KEYS.USER}${userId}:kyc`;
    return CacheService.set(key, applications, ttl);
  }

  static async getStatus(applicationId) {
    const key = `${this.getKey(applicationId)}:status`;
    return CacheService.get(key);
  }

  static async setStatus(applicationId, status, ttl = CACHE_TTL.SHORT) {
    const key = `${this.getKey(applicationId)}:status`;
    return CacheService.set(key, { status, updatedAt: new Date() }, ttl);
  }
}

/**
 * Session Cache Operations
 */
export class SessionCache {
  static getKey(sessionId) {
    return `${CACHE_KEYS.SESSION}${sessionId}`;
  }

  static async get(sessionId) {
    return CacheService.get(this.getKey(sessionId));
  }

  static async set(sessionId, sessionData, ttl = CACHE_TTL.LONG) {
    return CacheService.set(this.getKey(sessionId), sessionData, ttl);
  }

  static async invalidate(sessionId) {
    return CacheService.del(this.getKey(sessionId));
  }

  static async extend(sessionId, ttl = CACHE_TTL.LONG) {
    const sessionData = await this.get(sessionId);
    if (sessionData) {
      sessionData.lastActivity = new Date();
      return this.set(sessionId, sessionData, ttl);
    }
    return false;
  }
}

/**
 * OTP Cache Operations
 */
export class OTPCache {
  static getKey(identifier, type = 'login') {
    return `${CACHE_KEYS.OTP}${type}:${identifier}`;
  }

  static async set(identifier, otp, type = 'login', ttl = 300) {
    const key = this.getKey(identifier, type);
    const otpData = {
      otp,
      attempts: 0,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + ttl * 1000)
    };
    return CacheService.set(key, otpData, ttl);
  }

  static async verify(identifier, otp, type = 'login') {
    const key = this.getKey(identifier, type);
    const otpData = await CacheService.get(key);
    
    if (!otpData) {
      return { success: false, error: 'OTP_EXPIRED' };
    }

    otpData.attempts += 1;

    if (otpData.attempts > 3) {
      await CacheService.del(key);
      return { success: false, error: 'MAX_ATTEMPTS_EXCEEDED' };
    }

    if (otpData.otp === otp) {
      await CacheService.del(key);
      return { success: true };
    }

    await CacheService.set(key, otpData, 300);
    return { success: false, error: 'INVALID_OTP', attemptsLeft: 3 - otpData.attempts };
  }

  static async resend(identifier, type = 'login') {
    const key = this.getKey(identifier, type);
    const existing = await CacheService.get(key);
    
    if (existing && existing.createdAt > Date.now() - 60000) { // 1 minute cooldown
      return { success: false, error: 'RESEND_COOLDOWN' };
    }

    return { success: true };
  }
}

/**
 * Rate Limiting Operations
 */
export class RateLimiter {
  static getKey(identifier, action) {
    return `${CACHE_KEYS.RATE_LIMIT}${action}:${identifier}`;
  }

  static async checkLimit(identifier, action, limit = 5, window = 300) {
    const key = this.getKey(identifier, action);
    const count = await CacheService.increment(key, 1, window);
    
    return {
      allowed: count <= limit,
      count,
      limit,
      resetTime: Date.now() + (window * 1000),
      retryAfter: count > limit ? window : 0
    };
  }

  static async reset(identifier, action) {
    const key = this.getKey(identifier, action);
    return CacheService.del(key);
  }
}

/**
 * Offline Sync Queue Operations
 */
export class SyncQueue {
  static async addToQueue(operation) {
    try {
      const queueItem = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        operation,
        createdAt: new Date(),
        status: 'PENDING',
        retryCount: 0,
        maxRetries: 3
      };

      await redis.lpush(CACHE_KEYS.SYNC_QUEUE, JSON.stringify(queueItem));
      return queueItem.id;
    } catch (error) {
      console.error('Sync queue add error:', error);
      return null;
    }
  }

  static async getNextItem() {
    try {
      const item = await redis.rpop(CACHE_KEYS.SYNC_QUEUE);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Sync queue get error:', error);
      return null;
    }
  }

  static async requeue(item) {
    try {
      item.retryCount += 1;
      item.lastRetryAt = new Date();
      
      if (item.retryCount >= item.maxRetries) {
        // Move to dead letter queue
        await redis.lpush(`${CACHE_KEYS.SYNC_QUEUE}:failed`, JSON.stringify(item));
        return false;
      }

      // Re-add to queue with exponential backoff
      const delay = Math.pow(2, item.retryCount) * 1000; // 2s, 4s, 8s delays
      setTimeout(async () => {
        await redis.lpush(CACHE_KEYS.SYNC_QUEUE, JSON.stringify(item));
      }, delay);

      return true;
    } catch (error) {
      console.error('Sync queue requeue error:', error);
      return false;
    }
  }

  static async getQueueStatus() {
    try {
      const pending = await redis.llen(CACHE_KEYS.SYNC_QUEUE);
      const failed = await redis.llen(`${CACHE_KEYS.SYNC_QUEUE}:failed`);
      
      return {
        pending,
        failed,
        total: pending + failed
      };
    } catch (error) {
      console.error('Sync queue status error:', error);
      return { pending: 0, failed: 0, total: 0 };
    }
  }
}

/**
 * Offline Data Cache Operations
 */
export class OfflineCache {
  static getKey(userId, dataType) {
    return `${CACHE_KEYS.OFFLINE_DATA}${userId}:${dataType}`;
  }

  static async store(userId, dataType, data, ttl = CACHE_TTL.DAY) {
    const key = this.getKey(userId, dataType);
    const offlineData = {
      data,
      cachedAt: new Date(),
      version: Date.now()
    };
    return CacheService.set(key, offlineData, ttl);
  }

  static async retrieve(userId, dataType) {
    const key = this.getKey(userId, dataType);
    return CacheService.get(key);
  }

  static async invalidate(userId, dataType) {
    const key = this.getKey(userId, dataType);
    return CacheService.del(key);
  }

  static async syncStatus(userId) {
    const pattern = `${CACHE_KEYS.OFFLINE_DATA}${userId}:*`;
    const items = await CacheService.getPattern(pattern);
    
    return {
      totalItems: items.length,
      lastSync: items.length > 0 ? Math.max(...items.map(item => item.value?.cachedAt || 0)) : null,
      dataTypes: items.map(item => item.key.split(':').pop())
    };
  }
}

/**
 * Document Cache Operations
 */
export class DocumentCache {
  static getKey(documentId) {
    return `${CACHE_KEYS.DOCUMENT}${documentId}`;
  }

  static async get(documentId) {
    return CacheService.get(this.getKey(documentId));
  }

  static async set(documentId, documentData, ttl = CACHE_TTL.LONG) {
    return CacheService.set(this.getKey(documentId), documentData, ttl);
  }

  static async invalidate(documentId) {
    return CacheService.del(this.getKey(documentId));
  }

  static async getProcessingStatus(documentId) {
    const key = `${this.getKey(documentId)}:processing`;
    return CacheService.get(key);
  }

  static async setProcessingStatus(documentId, status, ttl = CACHE_TTL.SHORT) {
    const key = `${this.getKey(documentId)}:processing`;
    return CacheService.set(key, { status, updatedAt: new Date() }, ttl);
  }
}

// Export Redis client and all cache services
export { 
  redis,
  CACHE_KEYS,
  CACHE_TTL,
  CacheService,
  UserCache,
  KycCache,
  SessionCache,
  OTPCache,
  RateLimiter,
  SyncQueue,
  OfflineCache,
  DocumentCache
};

export default redis;
