'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAccount, useChainId } from 'wagmi';
import { ethers } from 'ethers';
import { getReadOnlyContract, TASKFI_CONTRACT_ADDRESS, SEPOLIA_CHAIN_ID } from '@/lib/contract';
import { Bug, RefreshCw, CheckCircle, XCircle, AlertTriangle, Network, Database } from 'lucide-react';

export function ContractDebugPanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isDebugging, setIsDebugging] = useState(false);

  const runDiagnostics = async () => {
    setIsDebugging(true);
    const info: any = {
      timestamp: new Date().toISOString(),
      wallet: {},
      network: {},
      contract: {},
      rpc: {}
    };

    try {
      // Wallet Info
      info.wallet = {
        connected: isConnected,
        address: address || 'Not connected',
        chainId: chainId || 'Unknown'
      };

      // Network Info
      info.network = {
        expectedChainId: SEPOLIA_CHAIN_ID,
        currentChainId: chainId,
        isCorrectNetwork: chainId === SEPOLIA_CHAIN_ID,
        networkName: chainId === 11155111 ? 'Sepolia' : `Unknown (${chainId})`
      };

      // Test multiple RPC endpoints
      const rpcEndpoints = [
        'https://rpc.sepolia.org',
        'https://sepolia.gateway.tenderly.co',
        'https://ethereum-sepolia-rpc.publicnode.com',
        'https://1rpc.io/sepolia'
      ];

      info.rpc.endpoints = [];

      for (const rpc of rpcEndpoints) {
        try {
          const provider = new ethers.providers.JsonRpcProvider(rpc);
          const startTime = Date.now();
          const blockNumber = await provider.getBlockNumber();
          const responseTime = Date.now() - startTime;
          
          info.rpc.endpoints.push({
            url: rpc,
            status: 'working',
            blockNumber,
            responseTime: `${responseTime}ms`
          });
        } catch (error: any) {
          info.rpc.endpoints.push({
            url: rpc,
            status: 'failed',
            error: error.message
          });
        }
      }

      // Test wallet provider
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const network = await provider.getNetwork();
          const blockNumber = await provider.getBlockNumber();
          
          info.rpc.walletProvider = {
            status: 'working',
            chainId: network.chainId,
            blockNumber,
            name: network.name
          };
        } catch (error: any) {
          info.rpc.walletProvider = {
            status: 'failed',
            error: error.message
          };
        }
      } else {
        info.rpc.walletProvider = {
          status: 'not_available',
          error: 'window.ethereum not found'
        };
      }

      // Contract Info
      try {
        const contract = getReadOnlyContract();
        
        // Test basic contract calls
        const currentTaskId = await contract.getCurrentTaskId();
        const minDeposit = await contract.MIN_DEPOSIT();
        
        info.contract = {
          address: TASKFI_CONTRACT_ADDRESS,
          status: 'working',
          currentTaskId: currentTaskId.toNumber(),
          minDeposit: ethers.utils.formatEther(minDeposit),
          functions: []
        };

        // Test specific functions
        const functions = ['getCurrentTaskId', 'MIN_DEPOSIT', 'getTask', 'getUserTasks'];
        for (const funcName of functions) {
          try {
            if (funcName === 'getTask') {
              await contract.getTask(1); // Test with task ID 1
            } else if (funcName === 'getUserTasks') {
              await contract.getUserTasks(address || '0x0000000000000000000000000000000000000000');
            } else {
              await contract[funcName]();
            }
            info.contract.functions.push({ name: funcName, status: 'working' });
          } catch (error: any) {
            info.contract.functions.push({ 
              name: funcName, 
              status: 'failed', 
              error: error.message 
            });
          }
        }

      } catch (error: any) {
        info.contract = {
          address: TASKFI_CONTRACT_ADDRESS,
          status: 'failed',
          error: error.message
        };
      }

      // Test task loading
      try {
        if (isConnected && chainId === SEPOLIA_CHAIN_ID) {
          const contract = getReadOnlyContract();
          const currentTaskId = await contract.getCurrentTaskId();
          const taskCount = currentTaskId.toNumber();
          
          info.tasks = {
            totalTasks: taskCount,
            status: 'working'
          };

          // Try to load first few tasks
          const taskTests = [];
          for (let i = 1; i <= Math.min(taskCount, 3); i++) {
            try {
              const taskData = await contract.getTask(i);
              taskTests.push({
                taskId: i,
                status: 'loaded',
                creator: taskData.user,
                description: taskData.description.slice(0, 50) + '...'
              });
            } catch (error: any) {
              taskTests.push({
                taskId: i,
                status: 'failed',
                error: error.message
              });
            }
          }
          info.tasks.sampleTasks = taskTests;
        }
      } catch (error: any) {
        info.tasks = {
          status: 'failed',
          error: error.message
        };
      }

    } catch (error: any) {
      info.error = error.message;
    }

    setDebugInfo(info);
    setIsDebugging(false);
  };

  useEffect(() => {
    if (isConnected) {
      runDiagnostics();
    }
  }, [isConnected, chainId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-400" />;
      default: return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-card border border-border rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
      <div className="p-4 border-b border-border bg-blue-600/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-blue-400" />
            <h3 className="font-semibold text-blue-400">Contract Debug</h3>
          </div>
          <Button 
            onClick={runDiagnostics} 
            disabled={isDebugging}
            variant="ghost" 
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${isDebugging ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[60vh] p-4 space-y-4">
        {/* Wallet Status */}
        <div className="space-y-2">
          <h4 className="font-medium text-foreground flex items-center gap-2">
            <Network className="h-4 w-4" />
            Wallet & Network
          </h4>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>Connected:</span>
              <span className={debugInfo.wallet?.connected ? 'text-green-400' : 'text-red-400'}>
                {debugInfo.wallet?.connected ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Chain ID:</span>
              <span className={debugInfo.network?.isCorrectNetwork ? 'text-green-400' : 'text-red-400'}>
                {debugInfo.network?.currentChainId} {debugInfo.network?.isCorrectNetwork ? '✓' : '✗'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Address:</span>
              <span className="font-mono text-xs">
                {debugInfo.wallet?.address?.slice(0, 10)}...
              </span>
            </div>
          </div>
        </div>

        {/* RPC Status */}
        <div className="space-y-2">
          <h4 className="font-medium text-foreground flex items-center gap-2">
            <Database className="h-4 w-4" />
            RPC Endpoints
          </h4>
          <div className="text-xs space-y-1">
            {debugInfo.rpc?.endpoints?.map((endpoint: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <span className="truncate flex-1">{endpoint.url.split('//')[1]}</span>
                <div className="flex items-center gap-1">
                  {getStatusIcon(endpoint.status)}
                  {endpoint.responseTime && (
                    <span className="text-muted-foreground">{endpoint.responseTime}</span>
                  )}
                </div>
              </div>
            ))}
            
            {debugInfo.rpc?.walletProvider && (
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span>Wallet Provider:</span>
                  {getStatusIcon(debugInfo.rpc.walletProvider.status)}
                </div>
                {debugInfo.rpc.walletProvider.blockNumber && (
                  <div className="text-muted-foreground">
                    Block: {debugInfo.rpc.walletProvider.blockNumber}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Contract Status */}
        <div className="space-y-2">
          <h4 className="font-medium text-foreground">Contract Status</h4>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>Address:</span>
              <span className="font-mono">{TASKFI_CONTRACT_ADDRESS.slice(0, 10)}...</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              {debugInfo.contract?.status && getStatusIcon(debugInfo.contract.status)}
            </div>
            {debugInfo.contract?.currentTaskId && (
              <div className="flex justify-between">
                <span>Total Tasks:</span>
                <span className="text-primary">{debugInfo.contract.currentTaskId}</span>
              </div>
            )}
            {debugInfo.contract?.functions?.map((func: any, index: number) => (
              <div key={index} className="flex justify-between">
                <span>{func.name}:</span>
                {getStatusIcon(func.status)}
              </div>
            ))}
          </div>
        </div>

        {/* Tasks Status */}
        {debugInfo.tasks && (
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Tasks Loading</h4>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>Status:</span>
                {getStatusIcon(debugInfo.tasks.status)}
              </div>
              {debugInfo.tasks.totalTasks && (
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span>{debugInfo.tasks.totalTasks}</span>
                </div>
              )}
              {debugInfo.tasks.sampleTasks?.map((task: any, index: number) => (
                <div key={index} className="flex justify-between">
                  <span>Task {task.taskId}:</span>
                  {getStatusIcon(task.status)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Details */}
        {debugInfo.error && (
          <div className="bg-red-400/10 border border-red-400/30 rounded-lg p-3">
            <p className="text-xs text-red-400 font-mono">{debugInfo.error}</p>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          Last check: {debugInfo.timestamp ? new Date(debugInfo.timestamp).toLocaleTimeString() : 'Never'}
        </p>
      </div>
    </div>
  );
}