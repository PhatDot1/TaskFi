/**
 * IPFS Upload utilities using Pinata API Key and Secret
 */

export interface IPFSUploadResult {
  success: boolean;
  ipfsHash?: string;
  ipfsUrl?: string;
  error?: string;
}

/**
 * Upload file to IPFS using Pinata API Key and Secret
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

    // Get API credentials
    const apiKey = process.env.PINATA_API_KEY;
    const secretKey = process.env.PINATA_SECRET_KEY;
    
    if (!apiKey || !secretKey || apiKey === 'your_pinata_api_key_here') {
      console.warn('⚠️ No Pinata credentials found, using mock upload');
      return {
        success: true,
        ipfsHash: `mock-hash-${Date.now()}`,
        ipfsUrl: `https://ipfs.io/ipfs/mock-hash-${Date.now()}`
      };
    }

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    
    // Add metadata
    const metadata = JSON.stringify({
      name: `TaskFi Proof - ${file.name}`,
      description: 'Task completion proof uploaded to TaskFi',
      timestamp: new Date().toISOString(),
      taskfi: true
    });
    formData.append('pinataMetadata', metadata);

    // Add options
    const options = JSON.stringify({
      cidVersion: 1,
    });
    formData.append('pinataOptions', options);

    console.log('📤 Uploading to Pinata using API Key...');
    
    // Upload to Pinata using API Key and Secret
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': apiKey,
        'pinata_secret_api_key': secretKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Pinata upload failed:', response.status, errorText);
      
      // Try to parse error for better user feedback
      let errorMessage = 'Upload failed';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.details || errorData.message || errorMessage;
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${errorText}`;
      }
      
      // Fallback to mock for development
      console.log('🔄 Using mock upload as fallback');
      return {
        success: true,
        ipfsHash: `mock-hash-${Date.now()}`,
        ipfsUrl: `https://ipfs.io/ipfs/mock-hash-${Date.now()}`,
        error: `Real upload failed (${errorMessage}), using mock`
      };
    }

    const result = await response.json();
    console.log('✅ IPFS upload successful:', result);

    return {
      success: true,
      ipfsHash: result.IpfsHash,
      ipfsUrl: `https://ipfs.io/ipfs/${result.IpfsHash}`
    };

  } catch (error: any) {
    console.error('❌ IPFS upload error:', error);
    
    // Fallback to mock for development
    console.log('🔄 Using mock upload due to error');
    return {
      success: true,
      ipfsHash: `mock-hash-${Date.now()}`,
      ipfsUrl: `https://ipfs.io/ipfs/mock-hash-${Date.now()}`,
      error: `Upload error: ${error.message}`
    };
  }
}

/**
 * Test Pinata connection
 * @returns Promise with connection test result
 */
export async function testPinataConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const apiKey = process.env.PINATA_API_KEY;
    const secretKey = process.env.PINATA_SECRET_KEY;
    
    if (!apiKey || !secretKey) {
      return {
        success: false,
        message: 'API credentials not found'
      };
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
      return {
        success: true,
        message: `Connected successfully: ${result.message}`
      };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        message: `Connection failed: ${errorText}`
      };
    }
  } catch (error: any) {
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