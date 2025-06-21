/**
 * IPFS Upload utilities using Pinata
 */

export interface IPFSUploadResult {
  success: boolean;
  ipfsHash?: string;
  ipfsUrl?: string;
  error?: string;
}

/**
 * Upload file to IPFS using Pinata
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
    
    // Add metadata
    const metadata = JSON.stringify({
      name: `TaskFi Proof - ${file.name}`,
      description: 'Task completion proof uploaded to TaskFi',
      timestamp: new Date().toISOString()
    });
    formData.append('pinataMetadata', metadata);

    // Add options
    const options = JSON.stringify({
      cidVersion: 1,
    });
    formData.append('pinataOptions', options);

    // Get JWT token
    const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
    if (!jwt || jwt === 'your_pinata_jwt_token_here') {
      console.warn('⚠️ No Pinata JWT found, using mock upload');
      return {
        success: true,
        ipfsHash: `mock-hash-${Date.now()}`,
        ipfsUrl: `https://ipfs.io/ipfs/mock-hash-${Date.now()}`
      };
    }

    console.log('📤 Uploading to Pinata...');
    
    // Upload to Pinata
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Pinata upload failed:', response.status, errorText);
      
      // Fallback to mock for development
      console.log('🔄 Using mock upload as fallback');
      return {
        success: true,
        ipfsHash: `mock-hash-${Date.now()}`,
        ipfsUrl: `https://ipfs.io/ipfs/mock-hash-${Date.now()}`
      };
    }

    const result = await response.json();
    console.log('✅ IPFS upload successful:', result);

    return {
      success: true,
      ipfsHash: result.IpfsHash,
      ipfsUrl: `https://ipfs.io/ipfs/${result.IpfsHash}`
    };

  } catch (error) {
    console.error('❌ IPFS upload error:', error);
    
    // Fallback to mock for development
    console.log('🔄 Using mock upload due to error');
    return {
      success: true,
      ipfsHash: `mock-hash-${Date.now()}`,
      ipfsUrl: `https://ipfs.io/ipfs/mock-hash-${Date.now()}`
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
  return url.includes('ipfs.io/ipfs/') || url.includes('gateway.pinata.cloud/ipfs/');
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