'use client';

import { Button } from '@/components/ui/button';
import { Hexagon, User, LogOut } from 'lucide-react';
import { useAccount, useDisconnect } from 'wagmi';

export function Header() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleDisconnect = () => {
    disconnect();
  };

  return (
    <header className="border-b border-border/50 bg-card/20 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Hexagon className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">TaskFi</h1>
                <p className="text-xs text-muted-foreground">Polygon Amoy</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isConnected ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-primary/10 px-3 py-2 rounded-lg border border-primary/30">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-sm font-mono text-primary">
                    {formatAddress(address!)}
                  </span>
                </div>
                <Button
                  onClick={handleDisconnect}
                  variant="outline"
                  size="sm"
                  className="bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400 hover:text-red-300"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <w3m-button />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}