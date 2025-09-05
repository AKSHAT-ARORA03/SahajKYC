import { NextResponse } from 'next/server';
import Redis from 'ioredis';

/**
 * Advanced Rate Limiting Middleware for SAHAJ KYC
 * Implements multiple rate limiting strategies with Redis backend
 */

let redis;
if (process.env.UPSTASH_REDIS_REST_URL) {
  redis = new Redis(process.env.UPSTASH_REDIS_REST_URL);
}

export class RateLimitMiddleware {
  // Rate limit configurations for different endpoints
  static configs = {
    // Authentication endpoints
    'auth/verify-otp': { window: 60, max: 5 },
    'auth/login': { window: 60, max: 10 },
    
    // KYC workflow endpoints
    'kyc/submit': { window: 300, max: 3 }, // 3 submissions per 5 minutes
    'documents/upload': { window: 60, max: 10 },
    'face/verify': { window: 60, max: 15 },
    
    // Setu DigiLocker endpoints (critical - avoid API quota exhaustion)
    'setu-digilocker/consent': { window: 300, max: 5 }, // 5 per 5 minutes
    'setu-digilocker/documents': { window: 60, max: 20 },
    'setu-digilocker/callback': { window: 60, max: 30 },
    
    // OCR endpoints (resource intensive)
    'ocr/extract': { window: 60, max: 8 },
    
    // Default limits
    'default': { window: 60, max: 100 }, // General API calls
    'public': { window: 60, max: 200 }   // Public endpoints
  };

  // Different rate limiting strategies
  static async slidingWindowRateLimit(key, windowSize, maxRequests) {
    if (!redis) {
      return { allowed: true, remaining: maxRequests }; // Fallback if Redis unavailable
    }

    const now = Date.now();
    const pipeline = redis.pipeline();
    
    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, now - windowSize * 1000);
    
    // Count current entries
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiration
    pipeline.expire(key, windowSize);
    
    const results = await pipeline.exec();
    const currentCount = results[1][1];
    
    if (currentCount >= maxRequests) {
      // Remove the request we just added since it's denied
      await redis.zrem(key, `${now}-${Math.random()}`);
      return {
        allowed: false,
        remaining: 0,
        resetTime: now + windowSize * 1000,
        retryAfter: windowSize
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - currentCount - 1),
      resetTime: now + windowSize * 1000
    };
  }

  // Get rate limit configuration for endpoint
  static getEndpointConfig(endpoint) {
    // Match the most specific endpoint configuration
    const configs = Object.keys(this.configs)
      .filter(pattern => endpoint.includes(pattern))
      .sort((a, b) => b.length - a.length); // Most specific first

    return this.configs[configs[0]] || this.configs.default;
  }

  // Generate rate limit key
  static generateKey(identifier, endpoint, type = 'user') {
    return `ratelimit:${type}:${identifier}:${endpoint}`;
  }

  // Main rate limiting function
  static async checkRateLimit(request, options = {}) {
    try {
      const url = new URL(request.url);
      const endpoint = url.pathname.replace('/api/', '');
      
      // Get identifier (IP for anonymous, user ID for authenticated)
      const identifier = options.userId || 
                        request.headers.get('x-forwarded-for') || 
                        request.headers.get('x-real-ip') || 
                        'anonymous';

      // Get configuration
      const config = options.config || this.getEndpointConfig(endpoint);
      
      // Generate key
      const key = this.generateKey(identifier, endpoint, options.userId ? 'user' : 'ip');
      
      // Check rate limit
      const result = await this.slidingWindowRateLimit(
        key, 
        config.window, 
        config.max
      );

      // Add request metadata
      result.endpoint = endpoint;
      result.identifier = identifier;
      result.config = config;

      return result;
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Fail open - allow request if rate limiting fails
      return { allowed: true, error: error.message };
    }
  }

  // Middleware wrapper for Next.js API routes
  static withRateLimit(handler, options = {}) {
    return async (request, context) => {
      try {
        // Check rate limit
        const rateLimitResult = await this.checkRateLimit(request, {
          userId: request.user?.id, // If auth middleware ran first
          config: options.config
        });

        // If rate limited, return 429 response
        if (!rateLimitResult.allowed) {
          return NextResponse.json(
            {
              error: 'Rate limit exceeded',
              code: 'RATE_LIMIT_EXCEEDED',
              details: {
                endpoint: rateLimitResult.endpoint,
                retryAfter: rateLimitResult.retryAfter,
                resetTime: rateLimitResult.resetTime
              },
              timestamp: new Date().toISOString()
            },
            { 
              status: 429,
              headers: {
                'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': rateLimitResult.resetTime?.toString() || ''
              }
            }
          );
        }

        // Add rate limit headers to response
        const response = await handler(request, context);
        
        if (response instanceof NextResponse) {
          response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining?.toString() || '');
          response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime?.toString() || '');
        }

        return response;
      } catch (error) {
        console.error('Rate limit middleware error:', error);
        // Continue to handler if rate limiting fails
        return await handler(request, context);
      }
    };
  }

  // Special rate limiting for KYC submission (prevent spam)
  static async checkKycSubmissionLimit(userId) {
    const key = `kyc_submissions:${userId}:${new Date().toDateString()}`;
    
    if (!redis) return { allowed: true };

    const submissions = await redis.incr(key);
    await redis.expire(key, 86400); // 24 hours

    // Allow max 5 KYC submissions per day
    if (submissions > 5) {
      return {
        allowed: false,
        message: 'Maximum KYC submissions per day exceeded. Please contact support if you need assistance.',
        retryAfter: 86400
      };
    }

    return { allowed: true, remaining: 5 - submissions };
  }

  // Rate limiting for DigiLocker API calls (protect API quota)
  static async checkDigiLockerQuota(userId) {
    const dailyKey = `digilocker_quota:daily:${new Date().toDateString()}`;
    const userKey = `digilocker_quota:user:${userId}:${new Date().toDateString()}`;

    if (!redis) return { allowed: true };

    const pipeline = redis.pipeline();
    pipeline.incr(dailyKey);
    pipeline.expire(dailyKey, 86400);
    pipeline.incr(userKey);
    pipeline.expire(userKey, 86400);

    const [dailyCount, , userCount] = await pipeline.exec();

    // Global daily limit (protect API quota)
    if (dailyCount[1] > 1000) {
      return {
        allowed: false,
        message: 'Daily DigiLocker quota exceeded. Please try again tomorrow.',
        code: 'DAILY_QUOTA_EXCEEDED'
      };
    }

    // Per-user daily limit
    if (userCount[1] > 10) {
      return {
        allowed: false,
        message: 'Your daily DigiLocker access limit exceeded. Please try again tomorrow.',
        code: 'USER_QUOTA_EXCEEDED'
      };
    }

    return { 
      allowed: true, 
      dailyRemaining: 1000 - dailyCount[1],
      userRemaining: 10 - userCount[1]
    };
  }

  // Burst protection for expensive operations
  static async checkBurstLimit(identifier, operation, burstLimit = 3, burstWindow = 10) {
    const key = `burst:${operation}:${identifier}`;
    
    if (!redis) return { allowed: true };

    const requests = await redis.incr(key);
    if (requests === 1) {
      await redis.expire(key, burstWindow);
    }

    if (requests > burstLimit) {
      return {
        allowed: false,
        retryAfter: burstWindow,
        message: `Too many ${operation} requests. Please wait ${burstWindow} seconds.`
      };
    }

    return { allowed: true, remaining: burstLimit - requests };
  }
}

// Convenience functions for common rate limiting patterns
export const withRateLimit = (handler, config) => RateLimitMiddleware.withRateLimit(handler, { config });

export const withStrictRateLimit = (handler) => RateLimitMiddleware.withRateLimit(handler, {
  config: { window: 60, max: 10 }
});

export const withKycRateLimit = (handler) => RateLimitMiddleware.withRateLimit(handler, {
  config: { window: 300, max: 5 }
});

export const withDigiLockerRateLimit = (handler) => RateLimitMiddleware.withRateLimit(handler, {
  config: { window: 300, max: 3 }
});
