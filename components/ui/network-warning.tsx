'use client';

import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Extend the Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string;
        params?: any[];
      }) => Promise<any>;
    };
  }
}

interface NetworkWarningProps {
  currentChainId?: number;
  expectedChainId: number;
  expectedNetworkName: string;
}

// Get private RPC URL from environment variables
const getPrivateRpcUrl = (): string => {
  const rpcUrl = process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC_URL;
  if (!rpcUrl) {
    console.warn('NEXT_PUBLIC_POLYGON_AMOY_RPC_URL not found in environment variables');
    // Fallback to public RPC if private one is not available
    return 'https://rpc-amoy.polygon.technology/';
  }
  return rpcUrl;
};

export function NetworkWarning({ 
  currentChainId, 
  expectedChainId, 
  expectedNetworkName 
}: NetworkWarningProps) {
  const switchNetwork = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${expectedChainId.toString(16)}` }],
        });
      } catch (error: any) {
        console.error('Failed to switch network:', error);

        // If the network doesn't exist, try to add it (for Amoy testnet)
        if (error.code === 4902 && expectedChainId === 80002) {
          try {
            const privateRpcUrl = getPrivateRpcUrl();
            
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x13882', // 80002 decimal = 0x13882 hex (corrected)
                chainName: 'Polygon Amoy Testnet',
                nativeCurrency: {
                  name: 'POL',
                  symbol: 'POL',
                  decimals: 18,
                },
                rpcUrls: [privateRpcUrl],
                blockExplorerUrls: ['https://amoy.polygonscan.com/'],
              }],
            });
          } catch (addError) {
            console.error('Failed to add network:', addError);
          }
        }
      }
    }
  };

  return (
    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-orange-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-orange-400 mb-1">Wrong Network</h3>
          <p className="text-sm text-orange-400/80 mb-3">
            TaskFi requires {expectedNetworkName} network to function properly. 
            {currentChainId && ` You're currently on chain ID ${currentChainId}.`}
          </p>
          <div className="flex gap-2">
            <Button
              onClick={switchNetwork}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Switch to {expectedNetworkName}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
              asChild
            >
              <a 
                href="https://amoy.polygonscan.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                Add Network
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}