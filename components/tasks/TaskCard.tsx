'use client';

import { Button } from '@/components/ui/button';
import { Timer } from '@/components/ui/timer';
import { DummyTask } from '@/lib/types';
import { getClaimScore, calculateClaimableAmount, getClaimablePercentage } from '@/lib/dummy-data';
import { 
  Clock, 
  Coins, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  Trophy,
  AlertTriangle,
  Brain
} from 'lucide-react';
import { useAccount } from 'wagmi';

interface TaskCardProps {
  task: DummyTask;
  isOwn?: boolean;
  onComplete?: (task: DummyTask) => void;
  onClaim?: (task: DummyTask, type: 'own' | 'failed') => void;
  onViewProof?: (task: DummyTask) => void;
}

export function TaskCard({ 
  task, 
  isOwn = false, 
  onComplete, 
  onClaim, 
  onViewProof 
}: TaskCardProps) {
  const { address } = useAccount();
  const userClaimScore = getClaimScore(address);
  const claimableAmount = calculateClaimableAmount(task.stake, userClaimScore);
  const claimablePercentage = getClaimablePercentage(userClaimScore);

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
            {task.aiReviewed && task.approved ? 'AI Approved' : 'Completed'}
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium status-failed">
            <XCircle className="h-3 w-3" />
            {task.aiReviewed && !task.approved ? 'AI Rejected' : 'Failed'}
          </div>
        );
      case 'in-review':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium status-in-review">
            <Brain className="h-3 w-3" />
            AI Review
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

  const canClaim = userClaimScore > 0 && claimableAmount > 0;

  return (
    <div className="task-card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {getStatusBadge()}
            {task.status === 'active' && (
              <Timer deadline={task.deadline} />
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

      {/* Claimable amount info for failed tasks */}
      {task.status === 'failed' && task.isClaimable && !isOwn && (
        <div className="mb-4 p-3 bg-orange-400/10 rounded-lg border border-orange-400/30">
          <p className="text-sm text-orange-400">
            {canClaim 
              ? `You can claim ${claimableAmount.toFixed(3)} POL (${claimablePercentage.toFixed(1)}%) from this failed task`
              : 'Your Claim Score is too low to claim from this task'
            }
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-primary" />
          <span className="font-bold text-lg text-primary">
            {task.stake} POL
          </span>
          <span className="text-xs text-muted-foreground">
            (~${(parseFloat(task.stake) * 0.85).toFixed(2)})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {task.status === 'active' && isOwn && (
            <Button
              size="sm"
              onClick={() => onComplete?.(task)}
              className="btn-primary text-xs px-4"
            >
              <CheckCircle className="h-3 w-3 mr-1.5" />
              Complete Task
            </Button>
          )}

          {task.status === 'completed' && task.proof && (
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

          {task.status === 'completed' && isOwn && !task.claimed && task.approved && (
            <Button
              size="sm"
              onClick={() => onClaim?.(task, 'own')}
              className="bg-green-600 hover:bg-green-700 text-white text-xs px-4"
            >
              <Trophy className="h-3 w-3 mr-1.5" />
              Claim Stake
            </Button>
          )}

          {task.status === 'failed' && task.isClaimable && !isOwn && (
            <Button
              size="sm"
              onClick={() => onClaim?.(task, 'failed')}
              disabled={!canClaim}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-4 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canClaim ? 'Your Claim Score is too low to claim from this task' : ''}
            >
              <AlertTriangle className="h-3 w-3 mr-1.5" />
              Claim Failed
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}