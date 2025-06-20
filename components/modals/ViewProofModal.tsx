'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DummyTask } from '@/lib/types';
import { ExternalLink, Eye, CheckCircle } from 'lucide-react';

interface ViewProofModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: DummyTask | null;
}

export function ViewProofModal({ open, onOpenChange, task }: ViewProofModalProps) {
  if (!task || !task.proof) return null;

  const handleOpenProof = () => {
    if (task.proof) {
      window.open(task.proof, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-400" />
            View Task Proof
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Review the submitted proof of completion.
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
                Stake: <span className="text-primary font-mono">{task.stake} POL</span>
              </span>
            </div>
          </div>

          <div className="bg-green-400/10 rounded-lg p-4 border border-green-400/30">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="font-medium text-green-400">Proof Submitted</span>
                </div>
                <p className="text-sm text-foreground mb-3">
                  The creator submitted the following proof link:
                </p>
                <div className="bg-background/50 rounded-lg p-3 border border-green-400/20">
                  <p className="text-sm font-mono text-foreground break-all">
                    {task.proof}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-400/10 rounded-lg p-3 border border-blue-400/30">
            <p className="text-xs text-blue-400">
              <strong>Trust-based system:</strong> Proofs are not validated or judged. 
              The blockchain only enforces timing requirements. Click the link to verify completion yourself.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border"
            >
              Close
            </Button>
            <Button
              onClick={handleOpenProof}
              className="flex-1 btn-primary"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Proof Link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}