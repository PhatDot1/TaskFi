'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DummyTask } from '@/lib/types';
import { getClaimScore, calculateClaimableAmount, getClaimablePercentage } from '@/lib/dummy-data';
import { toast } from 'sonner';
import { Loader2, Coins, Trophy, AlertTriangle } from 'lucide-react';
import { useAccount } from 'wagmi';

interface ClaimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: DummyTask | null;
  claimType: 'own' | 'failed';
}

export function ClaimModal({ open, onOpenChange, task, claimType }: ClaimModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { address } = useAccount();
  const userClaimScore = getClaimScore(address);
  const claimableAmount = claimType === 'failed' 
    ? calculateClaimableAmount(task?.stake || '0', userClaimScore)
    : parseFloat(task?.stake || '0');
  const claimablePercentage = getClaimablePercentage(userClaimScore);

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

  const handleClaim = async () => {
    if (!task) return;
    
    setIsLoading(true);
    try {
      // Simulate blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const message = claimType === 'own' 
        ? `Successfully claimed ${task.stake} POL back!`
        : `Claimed ${claimableAmount.toFixed(3)} POL from failed task!`;
      
      toast.success('Claim successful!', {
        description: message,
      });
      
      onOpenChange(false);
    } catch (error) {
      toast.error('Claim failed', {
        description: 'Please try again later.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!task) return null;

  const isOwnClaim = claimType === 'own';
  const Icon = isOwnClaim ? Trophy : AlertTriangle;
  const iconColor = isOwnClaim ? 'text-green-400' : 'text-orange-400';
  const title = isOwnClaim ? 'Claim Your Stake' : 'Claim Failed Task';
  const description = isOwnClaim 
    ? 'Congratulations! Your task was approved by AI.'
    : 'This task failed AI review or expired without submission.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className={`text-xl font-bold text-foreground flex items-center gap-2`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
            {title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
            <h4 className="font-medium text-foreground mb-2">Task Details</h4>
            <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Creator: <span className="text-foreground font-mono">{task.creator}</span>
              </span>
              <span className="text-muted-foreground">
                Deadline: <span className="text-foreground">{formatDateTime(task.deadline)}</span>
              </span>
            </div>
          </div>

          <div className={`rounded-lg p-4 border ${isOwnClaim ? 'bg-green-400/10 border-green-400/30' : 'bg-orange-400/10 border-orange-400/30'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-semibold ${isOwnClaim ? 'text-green-400' : 'text-orange-400'}`}>
                  Claimable Amount
                </p>
                <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  {claimableAmount.toFixed(3)} POL
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {isOwnClaim ? 'Full stake' : `${claimablePercentage.toFixed(1)}% of stake`}
                </p>
                <p className="text-xs text-muted-foreground">
                  ~${(claimableAmount * 0.85).toFixed(2)} USD
                </p>
              </div>
            </div>
          </div>

          {!isOwnClaim && (
            <div className="bg-orange-400/10 rounded-lg p-3 border border-orange-400/30">
              <p className="text-xs text-orange-400 mb-2">
                <strong>Claim Score System:</strong>
              </p>
              <p className="text-xs text-orange-400/80">
                Your claim percentage is based on your Claim Score ({userClaimScore.toFixed(1)}). 
                Higher scores from consistent task completion allow larger claims from failed tasks.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleClaim}
              disabled={isLoading}
              className="flex-1 btn-primary"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Claiming...' : `Claim ${claimableAmount.toFixed(3)} POL`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}