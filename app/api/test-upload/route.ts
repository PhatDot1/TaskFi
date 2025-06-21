// app/api/test-upload/route.ts - Create this as a backup test
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'GET endpoint working',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST request received');
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    
    // Check content type
    const contentType = request.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    if (contentType?.includes('multipart/form-data')) {
      try {
        const formData = await request.formData();
        console.log('FormData received');
        
        const file = formData.get('file') as File;
        console.log('File:', file ? `${file.name} (${file.size} bytes)` : 'No file');
        
        return NextResponse.json({
          success: true,
          message: 'POST with FormData successful',
          hasFile: !!file,
          fileName: file?.name || null,
          fileSize: file?.size || null,
          fileType: file?.type || null
        });
        
      } catch (formError: any) {
        console.error('FormData error:', formError);
        return NextResponse.json({
          success: false,
          error: `FormData parsing failed: ${formError.message}`
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'Expected multipart/form-data',
        receivedContentType: contentType
      }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error('POST error:', error);
    return NextResponse.json({
      success: false,
      error: `Server error: ${error.message}`,
      stack: error.stack
    }, { status: 500 });
  }
}