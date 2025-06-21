'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Hexagon, Search, User, LogOut, X } from 'lucide-react';
import { useAccount, useDisconnect } from 'wagmi';

interface HeaderProps {
  onSearch?: (query: string) => void;
  searchQuery?: string;
}

export function Header({ onSearch, searchQuery = '' }: HeaderProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setLocalSearchQuery(query);
    onSearch?.(query);
  };

  const clearSearch = () => {
    setLocalSearchQuery('');
    onSearch?.('');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(localSearchQuery);
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
                <p className="text-xs text-muted-foreground">Ethereum Sepolia</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Enhanced Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className={`relative transition-all duration-200 ${
                isSearchFocused ? 'w-80' : 'w-64'
              }`}>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={localSearchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Search tasks by description, creator, or stake amount..."
                  className="bg-input border border-border rounded-lg pl-10 pr-10 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent w-full transition-all duration-200"
                />
                {localSearchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Search suggestions/results indicator */}
              {localSearchQuery && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 p-2">
                  <p className="text-xs text-muted-foreground">
                    {localSearchQuery.length < 2 
                      ? 'Type at least 2 characters to search...' 
                      : `Searching for "${localSearchQuery}"`
                    }
                  </p>
                </div>
              )}
            </form>

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