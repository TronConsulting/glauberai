import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { getAuthCookie, verifyJwt } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Verify authentication
    const token = await getAuthCookie();
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyJwt(token);
    if (!decoded || typeof decoded === 'string') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = typeof decoded === 'object' && 'id' in decoded ? String(decoded.id) : null;
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    // Await params and decode the file path
    const resolvedParams = await params;
    const filePath = resolvedParams.path.map(segment => decodeURIComponent(segment)).join('/');
    
    // Security check: ensure the file is within the uploads directory
    if (!filePath.startsWith('uploads/')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    // Additional security: ensure user can only access their own files
    if (!filePath.includes(`/${userId}/`)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Read the file
    const fullPath = join(process.cwd(), filePath);
    const fileBuffer = await readFile(fullPath);

    // Determine content type based on file extension
    const extension = filePath.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
      case 'webp':
        contentType = 'image/webp';
        break;
      case 'pdf':
        contentType = 'application/pdf';
        break;
      case 'txt':
        contentType = 'text/plain';
        break;
      case 'json':
        contentType = 'application/json';
        break;
      case 'mp4':
        contentType = 'video/mp4';
        break;
      case 'mp3':
        contentType = 'audio/mpeg';
        break;
    }

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('Error serving file:', error);
    
    if (error instanceof Error && error.message.includes('ENOENT')) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
