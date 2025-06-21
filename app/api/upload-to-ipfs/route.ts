// app/api/upload-to-ipfs/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const apiKey = process.env.PINATA_API_KEY;
    const secretKey = process.env.PINATA_SECRET_KEY;
    
    console.log('Testing connection with API Key:', apiKey ? 'Present' : 'Missing');
    console.log('Testing connection with Secret Key:', secretKey ? 'Present' : 'Missing');
    
    if (!apiKey || !secretKey) {
      return NextResponse.json({
        success: false,
        message: 'API credentials not configured in environment variables'
      }, { status: 500 });
    }

    const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
      method: 'GET',
      headers: {
        'pinata_api_key': apiKey,
        'pinata_secret_api_key': secretKey,
      },
    });

    if (response.ok) {
      const result = await response.json();
      return NextResponse.json({
        success: true,
        message: `Connected successfully: ${result.message}`
      });
    } else {
      const errorText = await response.text();
      console.error('Pinata authentication failed:', errorText);
      return NextResponse.json({
        success: false,
        message: `Connection failed: ${errorText}`
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Connection test error:', error);
    return NextResponse.json({
      success: false,
      message: `Connection error: ${error.message}`
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.PINATA_API_KEY;
    const secretKey = process.env.PINATA_SECRET_KEY;
    
    if (!apiKey || !secretKey) {
      return NextResponse.json({
        success: false,
        error: 'IPFS service not configured'
      }, { status: 500 });
    }

    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }

    // Validate file
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({
        success: false,
        error: 'Only image files are supported'
      }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({
        success: false,
        error: 'File size must be less than 10MB'
      }, { status: 400 });
    }

    // Create FormData for Pinata
    const pinataFormData = new FormData();
    pinataFormData.append('file', file);
    
    // Add metadata
    const metadata = JSON.stringify({
      name: `TaskFi Proof - ${file.name}`,
      description: 'Task completion proof uploaded to TaskFi',
      timestamp: new Date().toISOString(),
      taskfi: true
    });
    pinataFormData.append('pinataMetadata', metadata);

    // Add options
    const options = JSON.stringify({
      cidVersion: 1,
    });
    pinataFormData.append('pinataOptions', options);

    console.log('📤 Uploading to Pinata...');
    
    // Upload to Pinata
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': apiKey,
        'pinata_secret_api_key': secretKey,
      },
      body: pinataFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Pinata upload failed:', response.status, errorText);
      
      return NextResponse.json({
        success: false,
        error: `Upload failed: ${response.status} - ${errorText}`
      }, { status: 500 });
    }

    const result = await response.json();
    console.log('✅ IPFS upload successful:', result.IpfsHash);

    return NextResponse.json({
      success: true,
      ipfsHash: result.IpfsHash,
      ipfsUrl: `https://ipfs.io/ipfs/${result.IpfsHash}`
    });

  } catch (error: any) {
    console.error('❌ IPFS upload error:', error);
    return NextResponse.json({
      success: false,
      error: `Server error: ${error.message}`
    }, { status: 500 });
  }
}