/**
 * IPFS Upload utilities using API route
 */

export interface IPFSUploadResult {
  success: boolean;
  ipfsHash?: string;
  ipfsUrl?: string;
  error?: string;
}

/**
 * Upload file to IPFS using API route
 * @param file - File to upload
 * @returns Promise with upload result
 */
export async function uploadToIPFS(file: File): Promise<IPFSUploadResult> {
  try {
    console.log('🔄 Starting IPFS upload for file:', file.name);
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        error: 'Only image files are supported'
      };
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return {
        success: false,
        error: 'File size must be less than 10MB'
      };
    }

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);

    console.log('📤 Uploading via API route...');
    
    // Upload via API route
    const response = await fetch('/api/upload-to-ipfs', {
      method: 'POST',
      body: formData,
    });

    // Check if response is ok first
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API response not ok:', response.status, errorText);
      return {
        success: false,
        error: `API Error: ${response.status} - ${errorText.slice(0, 200)}`
      };
    }

    // Try to parse JSON
    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      const responseText = await response.text();
      console.error('❌ Failed to parse JSON response:', responseText.slice(0, 500));
      return {
        success: false,
        error: 'Invalid response from server'
      };
    }

    if (!result.success) {
      console.error('❌ Upload failed:', result.error);
      return {
        success: false,
        error: result.error || 'Upload failed'
      };
    }

    console.log('✅ IPFS upload successful:', result);

    return {
      success: true,
      ipfsHash: result.ipfsHash,
      ipfsUrl: result.ipfsUrl
    };

  } catch (error: any) {
    console.error('❌ IPFS upload error:', error);
    return {
      success: false,
      error: `Upload error: ${error.message}`
    };
  }
}

/**
 * Test Pinata connection via API route
 * @returns Promise with connection test result
 */
export async function testPinataConnection(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🔄 Testing Pinata connection...');
    
    const response = await fetch('/api/upload-to-ipfs', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Check if response is ok first
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API response not ok:', response.status, errorText);
      return {
        success: false,
        message: `API Error: ${response.status} - ${errorText.slice(0, 200)}`
      };
    }

    // Try to parse JSON
    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      const responseText = await response.text();
      console.error('Failed to parse JSON response:', responseText.slice(0, 500));
      return {
        success: false,
        message: 'Invalid response from server - check console for details'
      };
    }

    console.log('API response:', result);
    
    return {
      success: result.success,
      message: result.message
    };
  } catch (error: any) {
    console.error('Connection test error:', error);
    return {
      success: false,
      message: `Connection error: ${error.message}`
    };
  }
}

/**
 * Get IPFS URL from hash
 * @param hash - IPFS hash
 * @returns Full IPFS URL
 */
export function getIPFSUrl(hash: string): string {
  if (hash.startsWith('http')) {
    return hash; // Already a full URL
  }
  return `https://ipfs.io/ipfs/${hash}`;
}

/**
 * Validate if a URL is an IPFS URL
 * @param url - URL to validate
 * @returns True if valid IPFS URL
 */
export function isIPFSUrl(url: string): boolean {
  return url.includes('ipfs.io/ipfs/') || 
         url.includes('gateway.pinata.cloud/ipfs/') ||
         url.includes('cloudflare-ipfs.com/ipfs/');
}

/**
 * Extract IPFS hash from URL
 * @param url - IPFS URL
 * @returns IPFS hash or null
 */
export function extractIPFSHash(url: string): string | null {
  const match = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}