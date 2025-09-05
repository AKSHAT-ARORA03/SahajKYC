import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';

// Debug API endpoint for troubleshooting
export async function GET(request: NextRequest) {
  console.log('🔧 Debug API called');
  
  try {
    const { searchParams } = new URL(request.url);
    const check = searchParams.get('check') || 'all';
    
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV
    };

    if (check === 'all' || check === 'directories') {
      // Check directory structure
      const uploadsDir = join(process.cwd(), 'uploads');
      const documentsDir = join(uploadsDir, 'documents');
      
      debugInfo.directories = {
        uploadsExists: existsSync(uploadsDir),
        documentsExists: existsSync(documentsDir),
        uploadsDirPath: uploadsDir,
        documentsDirPath: documentsDir,
        currentWorkingDirectory: process.cwd()
      };
    }

    if (check === 'all' || check === 'api') {
      // Check API endpoints
      debugInfo.apiEndpoints = {
        upload: '/api/documents/upload',
        serve: '/api/documents/serve',
        debug: '/api/debug'
      };
    }

    if (check === 'all' || check === 'permissions') {
      // Check write permissions
      try {
        const testDir = join(process.cwd(), 'uploads', 'test');
        debugInfo.permissions = {
          canCreateDirectories: true,
          canWriteFiles: true,
          testPath: testDir
        };
      } catch (error) {
        debugInfo.permissions = {
          canCreateDirectories: false,
          canWriteFiles: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return NextResponse.json({
      success: true,
      debug: debugInfo
    });

  } catch (error: any) {
    console.error('❌ Debug API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Debug check failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Test endpoint for file operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'test-upload') {
      // Test file upload functionality
      return NextResponse.json({
        success: true,
        message: 'Upload test endpoint working',
        canAcceptFormData: true,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Unknown test action'
    }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Debug test failed',
      details: error.message
    }, { status: 500 });
  }
}
