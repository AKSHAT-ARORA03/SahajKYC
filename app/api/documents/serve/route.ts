import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

// Serve uploaded documents securely
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const fileName = searchParams.get('fileName');

    console.log('🖼️ Serving file:', { userId, fileName });

    if (!userId || !fileName) {
      return NextResponse.json({
        success: false,
        error: 'User ID and file name are required'
      }, { status: 400 });
    }

    // Construct file path
    const filePath = join(process.cwd(), 'uploads', 'documents', userId, fileName);
    
    console.log('📁 Looking for file at:', filePath);

    // Check if file exists
    if (!existsSync(filePath)) {
      console.error('❌ File not found:', filePath);
      return NextResponse.json({
        success: false,
        error: 'File not found'
      }, { status: 404 });
    }

    // Read and serve file
    const fileBuffer = await readFile(filePath);
    
    // Determine content type based on file extension
    const extension = fileName.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'webp':
        contentType = 'image/webp';
        break;
      case 'pdf':
        contentType = 'application/pdf';
        break;
    }

    console.log('✅ Serving file with content-type:', contentType);

    return new NextResponse(fileBuffer as any, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
        'Content-Disposition': `inline; filename="${fileName}"`
      }
    });

  } catch (error: any) {
    console.error('❌ File serving error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to serve file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
