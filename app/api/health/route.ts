import { NextRequest, NextResponse } from 'next/server';
import connectDatabase from '../../../lib/database.js';
import { redis } from '../../../lib/redis.js';

/**
 * Health Check API Route
 * GET /api/health - System health status
 * Used for monitoring, load balancers, and deployment verification
 */

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: any;
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  services: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    await connectDatabase();
    const responseTime = Date.now() - startTime;
    
    return {
      service: 'mongodb',
      status: responseTime < 1000 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        maxResponseTime: 1000,
        connection: 'established'
      }
    };
  } catch (error: any) {
    return {
      service: 'mongodb',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message,
      details: {
        connection: 'failed'
      }
    };
  }
}

async function checkRedis(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    if (!redis) {
      return {
        service: 'redis',
        status: 'degraded',
        error: 'Redis not configured',
        details: {
          configured: false,
          fallback: 'memory'
        }
      };
    }

    // Test Redis connection with a ping
    await redis.ping();
    const responseTime = Date.now() - startTime;
    
    return {
      service: 'redis',
      status: responseTime < 500 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        maxResponseTime: 500,
        connection: 'established'
      }
    };
  } catch (error: any) {
    return {
      service: 'redis',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message,
      details: {
        connection: 'failed'
      }
    };
  }
}

async function checkExternalServices(): Promise<HealthCheckResult[]> {
  const services: HealthCheckResult[] = [];

  // Check Setu DigiLocker API
  if (process.env.SETU_CLIENT_ID && process.env.SETU_CLIENT_SECRET) {
    const startTime = Date.now();
    try {
      // Simple connectivity check (would need actual endpoint)
      const response = await fetch(process.env.SETU_BASE_URL + '/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      services.push({
        service: 'setu_digilocker',
        status: response.ok ? 'healthy' : 'degraded',
        responseTime: Date.now() - startTime,
        details: {
          configured: true,
          httpStatus: response.status
        }
      });
    } catch (error: any) {
      services.push({
        service: 'setu_digilocker',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
        details: {
          configured: true,
          connection: 'failed'
        }
      });
    }
  } else {
    services.push({
      service: 'setu_digilocker',
      status: 'degraded',
      error: 'Not configured',
      details: {
        configured: false
      }
    });
  }

  // Check Cloudinary
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    services.push({
      service: 'cloudinary',
      status: 'healthy',
      details: {
        configured: true,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME
      }
    });
  } else {
    services.push({
      service: 'cloudinary',
      status: 'degraded',
      error: 'Not configured',
      details: {
        configured: false
      }
    });
  }

  // Check Clerk Authentication
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    services.push({
      service: 'clerk_auth',
      status: 'healthy',
      details: {
        configured: true
      }
    });
  } else {
    services.push({
      service: 'clerk_auth',
      status: 'unhealthy',
      error: 'Not configured',
      details: {
        configured: false
      }
    });
  }

  return services;
}

async function checkSystemResources(): Promise<HealthCheckResult> {
  try {
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const memoryTotalMB = memoryUsage.heapTotal / 1024 / 1024;
    const memoryUsagePercent = (memoryUsedMB / memoryTotalMB) * 100;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (memoryUsagePercent > 90) {
      status = 'unhealthy';
    } else if (memoryUsagePercent > 75) {
      status = 'degraded';
    }

    return {
      service: 'system_resources',
      status,
      details: {
        memory: {
          used: Math.round(memoryUsedMB),
          total: Math.round(memoryTotalMB),
          usagePercent: Math.round(memoryUsagePercent)
        },
        uptime: Math.round(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform
      }
    };
  } catch (error: any) {
    return {
      service: 'system_resources',
      status: 'unhealthy',
      error: error.message
    };
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<HealthResponse>> {
  const startTime = Date.now();
  
  try {
    // Run all health checks in parallel for faster response
    const [
      databaseHealth,
      redisHealth,
      externalServicesHealth,
      systemHealth
    ] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkExternalServices(),
      checkSystemResources()
    ]);

    // Combine all service checks
    const services: HealthCheckResult[] = [
      databaseHealth,
      redisHealth,
      systemHealth,
      ...externalServicesHealth
    ];

    // Calculate summary
    const summary = {
      total: services.length,
      healthy: services.filter(s => s.status === 'healthy').length,
      unhealthy: services.filter(s => s.status === 'unhealthy').length,
      degraded: services.filter(s => s.status === 'degraded').length
    };

    // Determine overall system status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (summary.unhealthy > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded';
    }

    const healthResponse: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.round(process.uptime()),
      services,
      summary
    };

    // Set appropriate HTTP status code
    let httpStatus = 200;
    if (overallStatus === 'degraded') {
      httpStatus = 207; // Multi-status
    } else if (overallStatus === 'unhealthy') {
      httpStatus = 503; // Service unavailable
    }

    // Add response time to headers
    const responseTime = Date.now() - startTime;

    return NextResponse.json(healthResponse, {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${responseTime}ms`,
        'X-Health-Status': overallStatus
      }
    });

  } catch (error: any) {
    console.error('Health check error:', error);
    
    const errorResponse: HealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.round(process.uptime()),
      services: [{
        service: 'health_check',
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - startTime
      }],
      summary: {
        total: 1,
        healthy: 0,
        unhealthy: 1,
        degraded: 0
      }
    };

    return NextResponse.json(errorResponse, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': 'unhealthy'
      }
    });
  }
}

// Simple health endpoint that just returns OK (for basic load balancer checks)
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
