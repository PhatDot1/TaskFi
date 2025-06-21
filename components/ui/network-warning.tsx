'use client';

import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NetworkWarningProps {
  currentChainId?: number;
  expectedChainId: number;
  expectedNetworkName: string;
}

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
        
        // If the network doesn't exist, try to add it (for testnets)
        if (error.code === 4902 && expectedChainId === 11155111) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xaa36a7',
                chainName: 'Sepolia test network',
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io/'],
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
                href="https://chainlist.org/chain/11155111" 
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