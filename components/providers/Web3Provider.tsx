'use client';

import { createWeb3Modal } from '@web3modal/wagmi/react';
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { WagmiProvider } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useEffect, useState } from 'react';

// Get projectId from environment or use a demo project ID
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';

// Metadata for the dApp
const metadata = {
  name: 'TaskFi',
  description: 'Web3 Task Staking App',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://taskfi.app',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

// Use Sepolia testnet
const chains = [sepolia] as const;

const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  enableWalletConnect: true,
  enableInjected: true,
  enableEIP6963: true,
  enableCoinbase: false, // Disable to reduce conflicts
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export function Web3Provider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Wait for client-side mounting to avoid hydration issues
    setMounted(true);
    
    // Only create Web3Modal after component is mounted
    if (typeof window !== 'undefined') {
      // Small delay to ensure MetaMask is fully loaded
      const timer = setTimeout(() => {
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
            // MetaMask
            'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
          ],
          includeWalletIds: [
            // Only include MetaMask to reduce conflicts
            'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
          ]
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, []);

  // Don't render until mounted to avoid hydration mismatch
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