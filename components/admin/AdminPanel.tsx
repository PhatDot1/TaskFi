'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTaskFiContract } from '@/hooks/useTaskFiContract';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Loader2,
  Eye,
  Crown,
  AlertTriangle,
  Clock,
  Coins
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';

// Contract owner address (replace with your actual contract owner address)
const CONTRACT_OWNER = '0x823F76401544005FCeb7f7c441976bdE683F84f1'; // Replace with your wallet address

interface AdminPanelProps {
  isVisible: boolean;
  onToggle: () => void;
}

export function AdminPanel({ isVisible, onToggle }: AdminPanelProps) {
  const { address } = useAccount();
  const { allTasks, approveTaskCompletion, isLoading, refreshTasks } = useTaskFiContract();
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [nftUri, setNftUri] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Check if current user is admin
  const isAdmin = address?.toLowerCase() === CONTRACT_OWNER.toLowerCase();

  // Get tasks that need review (in-review status)
  const tasksNeedingReview = allTasks.filter(task => task.status === 'in-review');

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleApproveTask = async (task: any) => {
    if (!nftUri.trim()) {
      toast.error('Please provide an NFT URI for the completion certificate');
      return;
    }

    setIsApproving(true);
    try {
      const success = await approveTaskCompletion(task.id, nftUri);
      if (success) {
        toast.success('Task approved successfully!', {
          description: `${formatAddress(task.creator)} can now claim their ${task.stake} ETH`
        });
        setSelectedTask(null);
        setNftUri('');
        setTimeout(() => refreshTasks(), 2000);
      }
    } catch (error) {
      console.error('Error approving task:', error);
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectTask = async (task: any) => {
    // Note: The current contract doesn't have a reject function
    // This would need to be implemented in the smart contract
    // For now, we'll show what the UI would look like
    toast.error('Reject functionality not yet implemented in smart contract', {
      description: 'You can only approve tasks currently. Rejected tasks would become claimable by others.'
    });
  };

  const handleViewProof = (proofUrl: string) => {
    if (proofUrl) {
      window.open(proofUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={onToggle}
          className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
          size="sm"
        >
          <Shield className="h-4 w-4 mr-2" />
          Admin Panel
        </Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-card border border-border rounded-xl p-4 shadow-xl max-w-sm">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-orange-400" />
          <span className="font-medium text-orange-400">Access Denied</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Admin panel is only available to the contract owner.
        </p>
        <Button onClick={onToggle} variant="outline" size="sm" className="w-full">
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-card border border-border rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
      <div className="p-4 border-b border-border bg-purple-600/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-purple-400" />
            <h3 className="font-semibold text-purple-400">Admin Panel</h3>
          </div>
          <Button onClick={onToggle} variant="ghost" size="sm">
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-purple-400/80 mt-1">
          Review and approve task completions
        </p>
      </div>

      <div className="overflow-y-auto max-h-[60vh]">
        {tasksNeedingReview.length === 0 ? (
          <div className="p-6 text-center">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No tasks awaiting review</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {tasksNeedingReview.map(task => (
              <div key={task.id} className="border border-border rounded-lg p-3 bg-muted/30">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-foreground mb-1">
                      Task #{task.id}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      {task.description.slice(0, 60)}...
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Creator: {formatAddress(task.creator)}</span>
                      <span className="flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        {task.stake} ETH
                      </span>
                    </div>
                  </div>
                </div>

                {task.proof && (
                  <div className="mb-3 p-2 bg-background/50 rounded border">
                    <p className="text-xs text-muted-foreground mb-1">Proof submitted:</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-mono text-foreground flex-1 truncate">
                        {task.proof}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewProof(task.proof)}
                        className="text-xs px-2 py-1 h-auto"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {selectedTask?.id === task.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1 block">
                        NFT URI for completion certificate:
                      </label>
                      <Input
                        value={nftUri}
                        onChange={(e) => setNftUri(e.target.value)}
                        placeholder="https://ipfs.io/ipfs/your-nft-metadata"
                        className="text-xs"
                        disabled={isApproving}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveTask(task)}
                        disabled={isApproving || !nftUri.trim()}
                        className="bg-green-600 hover:bg-green-700 text-white flex-1 text-xs"
                      >
                        {isApproving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedTask(null)}
                        disabled={isApproving}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedTask(task);
                        setNftUri(`https://taskfi.app/nft/${task.id}`); // Default NFT URI
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white flex-1 text-xs"
                    >
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleRejectTask(task)}
                      variant="outline"
                      className="bg-red-600/10 hover:bg-red-600/20 text-red-400 border-red-400/30 flex-1 text-xs"
                    >
                      <XCircle className="mr-1 h-3 w-3" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          {tasksNeedingReview.length} task(s) awaiting review
        </p>
      </div>
    </div>
  );
}