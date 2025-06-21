'use client';

import { Button } from '@/components/ui/button';
import { Timer } from '@/components/ui/timer';
import { useTaskFiContract } from '@/hooks/useTaskFiContract';
import { 
  Clock, 
  Coins, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  Trophy,
  AlertTriangle,
  Brain,
  Eye,
  Upload
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { canSubmitProofForTask, canClaimTask, canClaimFailedTask } from '@/lib/contract';

interface TaskCardProps {
  task: any; // Using any for now since we're transitioning from dummy data
  isOwn?: boolean;
  onComplete?: (task: any) => void;
  onClaim?: (task: any, type: 'own' | 'failed') => void;
  onViewProof?: (task: any) => void;
}

export function TaskCard({ 
  task, 
  isOwn = false, 
  onComplete, 
  onClaim, 
  onViewProof 
}: TaskCardProps) {
  const { address } = useAccount();
  const { claimReward, claimFailedTask, isLoading } = useTaskFiContract();

  const getStatusBadge = () => {
    switch (task.status) {
      case 'active':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium status-active">
            <Clock className="h-3 w-3" />
            Active
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium status-completed">
            <CheckCircle className="h-3 w-3" />
            Completed
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium status-failed">
            <XCircle className="h-3 w-3" />
            Failed
          </div>
        );
      case 'in-review':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium status-in-review">
            <Brain className="h-3 w-3" />
            Awaiting Review
          </div>
        );
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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

  const handleClaimReward = async () => {
    await claimReward(task.id);
  };

  const handleClaimFailed = async () => {
    await claimFailedTask(task.id);
  };

  // Enhanced logic for button states
  const canSubmitProof = canSubmitProofForTask(task, address);
  const canClaimOwn = canClaimTask(task, address);
  const canClaimFailed = canClaimFailedTask(task, address);
  const hasProof = task.proof && task.proof.length > 0;

  return (
    <div className="task-card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {getStatusBadge()}
            {task.status === 'active' && (
              <Timer deadline={task.deadline} />
            )}
            {task.status === 'in-review' && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs bg-yellow-400/10 border border-yellow-400/30 text-yellow-400">
                <Upload className="h-3 w-3" />
                Proof Submitted
              </div>
            )}
          </div>
          <h3 className="font-semibold text-foreground text-lg leading-tight mb-2">
            {task.description}
          </h3>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="font-mono">
              Creator: {isOwn ? 'You' : formatAddress(task.creator)}
            </span>
            <span className="text-foreground">
              Deadline: {formatDateTime(task.deadline)}
            </span>
          </div>
        </div>
      </div>

      {/* Proof Status Section */}
      {task.status === 'in-review' && hasProof && (
        <div className="mb-4 p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-medium text-yellow-400">
                Proof submitted - awaiting admin review
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewProof?.(task)}
              className="bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border-yellow-400/30 text-xs px-3"
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-primary" />
          <span className="font-bold text-lg text-primary">
            {task.stake} ETH
          </span>
          <span className="text-xs text-muted-foreground">
            (~${(parseFloat(task.stake) * 2000).toFixed(2)})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Submit Proof Button - only show if user can submit proof */}
          {canSubmitProof && (
            <Button
              size="sm"
              onClick={() => onComplete?.(task)}
              className="btn-primary text-xs px-4"
            >
              <Upload className="h-3 w-3 mr-1.5" />
              Submit Proof
            </Button>
          )}

          {/* View Proof Button - show if proof exists and not in review status */}
          {hasProof && task.status !== 'in-review' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewProof?.(task)}
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border text-xs px-4"
            >
              <ExternalLink className="h-3 w-3 mr-1.5" />
              View Proof
            </Button>
          )}

          {/* Claim Own Task Button */}
          {canClaimOwn && (
            <Button
              size="sm"
              onClick={handleClaimReward}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white text-xs px-4"
            >
              <Trophy className="h-3 w-3 mr-1.5" />
              Claim Stake
            </Button>
          )}

          {/* Claim Failed Task Button */}
          {canClaimFailed && (
            <Button
              size="sm"
              onClick={handleClaimFailed}
              disabled={isLoading}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-4"
            >
              <AlertTriangle className="h-3 w-3 mr-1.5" />
              Claim Failed
            </Button>
          )}

          {/* No Action Available State */}
          {!canSubmitProof && !hasProof && !canClaimOwn && !canClaimFailed && task.status === 'active' && !isOwn && (
            <div className="text-xs text-muted-foreground px-3 py-2">
              Active task
            </div>
          )}
        </div>
      </div>
    </div>
  );
}