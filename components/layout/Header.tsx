'use client';

import { Button } from '@/components/ui/button';
import { Hexagon, Search, Settings, User } from 'lucide-react';
import { useAccount } from 'wagmi';

export function Header() {
  const { address, isConnected } = useAccount();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tasks..."
                className="bg-input border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>

            <Button variant="outline" size="sm" className="bg-secondary hover:bg-secondary/80 border-border">
              <Settings className="h-4 w-4" />
            </Button>

            {isConnected ? (
              <div className="flex items-center gap-2 bg-primary/10 px-3 py-2 rounded-lg border border-primary/30">
                <User className="h-4 w-4 text-primary" />
                <span className="text-sm font-mono text-primary">
                  {formatAddress(address!)}
                </span>
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