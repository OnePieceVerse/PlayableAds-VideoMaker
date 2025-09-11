import { NextRequest, NextResponse } from 'next/server';
import config from '@/config/api';

// Directly use the correct backend URL with port 18080
const BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? 'https://playableall-video.woa.com/api'
  : 'http://localhost:18080/api';

export async function GET(request: NextRequest) {
  try {
    // Get the path segments
    const path = request.nextUrl.pathname;
    const segments = path.split('/').filter(Boolean);
    
    // Determine if this is a request for a specific file or the list
    const isFileRequest = segments.length > 2;
    
    // Construct the appropriate backend URL
    let backendUrl: string;
    if (isFileRequest) {
      // Get the filename from the last segment
      // We need to handle the full path after /api/system-audio/
      const audioPath = path.replace(/^\/api\/system-audio\/?/, '');
      backendUrl = `${BACKEND_URL}/system-audio/${audioPath}`;
      
      console.log('Requesting audio file:', backendUrl);
    } else {
      backendUrl = `${BACKEND_URL}/system-audio`;
    }
    
    // Forward the request to the backend
    const response = await fetch(backendUrl);
    
    if (!response.ok) {
      console.error(`Backend returned error ${response.status} for ${backendUrl}`);
      return NextResponse.json(
        { error: `Backend returned ${response.status}` },
        { status: response.status }
      );
    }
    
    // If it's a file request, return the file with appropriate headers
    if (isFileRequest) {
      const contentType = response.headers.get('content-type');
      const data = await response.arrayBuffer();
      
      return new NextResponse(data, {
        headers: {
          'Content-Type': contentType || 'audio/mpeg',
          'Content-Disposition': response.headers.get('content-disposition') || 'inline',
        },
      });
    }
    
    // Otherwise return the JSON data
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error in system-audio API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system audio' },
      { status: 500 }
    );
  }
} 