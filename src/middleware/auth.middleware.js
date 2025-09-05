import { clerkClient } from '@clerk/nextjs/server';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

/**
 * Authentication Middleware for SAHAJ KYC API Routes
 * Validates Clerk tokens and user sessions
 */
export class AuthMiddleware {
  static async validateClerkToken(request) {
    try {
      const token = this.extractToken(request);
      if (!token) {
        return { error: 'No authentication token provided', status: 401 };
      }

      // Verify Clerk session token
      const session = await clerkClient.verifyToken(token);
      if (!session) {
        return { error: 'Invalid or expired token', status: 401 };
      }

      // Get user details
      const user = await clerkClient.users.getUser(session.sub);
      if (!user) {
        return { error: 'User not found', status: 404 };
      }

      return {
        user: {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          phone: user.phoneNumbers[0]?.phoneNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          metadata: user.publicMetadata
        },
        session
      };
    } catch (error) {
      console.error('Auth middleware error:', error);
      return { error: 'Authentication failed', status: 401 };
    }
  }

  static extractToken(request) {
    // Check Authorization header
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check cookies for session token
    const cookies = request.headers.get('Cookie');
    if (cookies) {
      const sessionCookie = cookies
        .split(';')
        .find(c => c.trim().startsWith('__session='));
      if (sessionCookie) {
        return sessionCookie.split('=')[1];
      }
    }

    return null;
  }

  // Enhanced authentication for KYC operations
  static async validateKycAccess(request) {
    const authResult = await this.validateClerkToken(request);
    if (authResult.error) {
      return authResult;
    }

    const { user } = authResult;

    // Check if user has completed basic profile
    if (!user.phone || !user.email) {
      return {
        error: 'Profile incomplete. Phone and email required for KYC.',
        status: 403,
        code: 'PROFILE_INCOMPLETE'
      };
    }

    // Check if user is from India (for DigiLocker access)
    const indianPhonePattern = /^(\+91|91)?[6-9]\d{9}$/;
    if (!indianPhonePattern.test(user.phone?.replace(/\s+/g, ''))) {
      return {
        error: 'KYC services are currently available for Indian residents only.',
        status: 403,
        code: 'REGION_RESTRICTED'
      };
    }

    return authResult;
  }

  // Admin access validation
  static async validateAdminAccess(request) {
    const authResult = await this.validateClerkToken(request);
    if (authResult.error) {
      return authResult;
    }

    const { user } = authResult;

    // Check admin role in metadata
    const isAdmin = user.metadata?.role === 'admin' || 
                   user.metadata?.permissions?.includes('admin') ||
                   process.env.ADMIN_USERS?.split(',').includes(user.email);

    if (!isAdmin) {
      return {
        error: 'Admin access required',
        status: 403,
        code: 'INSUFFICIENT_PERMISSIONS'
      };
    }

    return authResult;
  }

  // Create middleware function for Next.js API routes
  static withAuth(handler, options = {}) {
    return async (request, context) => {
      try {
        // Choose validation method based on options
        let authResult;
        if (options.requireKycAccess) {
          authResult = await this.validateKycAccess(request);
        } else if (options.requireAdmin) {
          authResult = await this.validateAdminAccess(request);
        } else {
          authResult = await this.validateClerkToken(request);
        }

        // Return error response if authentication failed
        if (authResult.error) {
          return NextResponse.json(
            { 
              error: authResult.error,
              code: authResult.code || 'AUTH_FAILED',
              timestamp: new Date().toISOString()
            },
            { status: authResult.status }
          );
        }

        // Add user to request context
        request.user = authResult.user;
        request.session = authResult.session;

        // Call the actual handler
        return await handler(request, context);
      } catch (error) {
        console.error('Auth middleware wrapper error:', error);
        return NextResponse.json(
          { 
            error: 'Internal authentication error',
            code: 'AUTH_INTERNAL_ERROR',
            timestamp: new Date().toISOString()
          },
          { status: 500 }
        );
      }
    };
  }
}

// Convenience functions for common auth patterns
export const requireAuth = (handler) => AuthMiddleware.withAuth(handler);
export const requireKycAuth = (handler) => AuthMiddleware.withAuth(handler, { requireKycAccess: true });
export const requireAdminAuth = (handler) => AuthMiddleware.withAuth(handler, { requireAdmin: true });

// Rate limiting by user
export const authRateLimit = new Map();

export function getUserRateKey(userId, endpoint) {
  return `${userId}:${endpoint}:${Math.floor(Date.now() / 60000)}`; // Per minute
}

export function checkUserRateLimit(userId, endpoint, maxRequests = 10) {
  const key = getUserRateKey(userId, endpoint);
  const current = authRateLimit.get(key) || 0;
  
  if (current >= maxRequests) {
    return false;
  }
  
  authRateLimit.set(key, current + 1);
  
  // Cleanup old entries
  setTimeout(() => authRateLimit.delete(key), 70000);
  
  return true;
}
