'use client';

import { createWeb3Modal } from '@web3modal/wagmi/react';
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { WagmiProvider } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useEffect, useState } from 'react';
import { http } from 'viem';

// Use a valid WalletConnect project ID - you should replace this with your own
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '2f05a7cde2bb14b8de8ca916a2c5295d';

// Metadata for the dApp
const metadata = {
  name: 'TaskFi',
  description: 'Web3 Task Staking App on Polygon Amoy',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://taskfi.app',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

// Configure Sepolia with free public RPC endpoints (no API keys required)
const sepoliaWithRpc = {
  ...sepolia,
  rpcUrls: {
    default: {
      http: [
        'https://rpc-amoy.polygon.technology/',
        'https://rpc-amoy.polygon.technology/',
        'https://rpc-amoy.polygon.technology/',
        'https://rpc-amoy.polygon.technology/'
      ]
    },
    public: {
      http: [
        'https://rpc-amoy.polygon.technology/',
        'https://rpc-amoy.polygon.technology/',
        'https://rpc-amoy.polygon.technology/'
      ]
    }
  }
};

const chains = [sepoliaWithRpc] as const;

const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  enableWalletConnect: true,
  enableInjected: true,
  enableEIP6963: true,
  enableCoinbase: false,
  transports: {
    [sepolia.id]: http('https://rpc.sepolia.org')
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

export function Web3Provider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [modalCreated, setModalCreated] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !modalCreated && typeof window !== 'undefined') {
      try {
        createWeb3Modal({
          wagmiConfig: config,
          projectId,
          enableAnalytics: false,
          themeMode: 'dark',
          themeVariables: {
            '--w3m-accent': '#00f0ff',
            '--w3m-border-radius-master': '12px',
          },
          featuredWalletIds: [
            'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
          ],
          excludeWalletIds: [
            'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase
          ]
        });
        setModalCreated(true);
      } catch (error) {
        console.error('Error creating Web3Modal:', error);
      }
    }
  }, [mounted, modalCreated]);

  if (!mounted) {
    return null;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}