'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CompleteTaskFormData } from '@/lib/types';
import { useTaskFiContract } from '@/hooks/useTaskFiContract';
import { Loader2, CheckCircle, ExternalLink, AlertTriangle, Upload } from 'lucide-react';
import { canSubmitProofForTask } from '@/lib/contract';
import { useAccount } from 'wagmi';

const formSchema = z.object({
  proof: z.string()
    .url('Please enter a valid URL')
    .min(1, 'Proof URL is required')
    .refine(
      (url) => {
        // Allow common proof platforms
        const allowedDomains = [
          'imgur.com', 'i.imgur.com',
          'notion.so', 'www.notion.so',
          'github.com', 'www.github.com',
          'drive.google.com', 'docs.google.com',
          'dropbox.com', 'www.dropbox.com',
          'youtube.com', 'www.youtube.com', 'youtu.be',
          'twitter.com', 'x.com',
          'instagram.com', 'www.instagram.com'
        ];
        
        try {
          const domain = new URL(url).hostname.toLowerCase();
          return allowedDomains.some(allowed => domain.includes(allowed));
        } catch {
          return false;
        }
      },
      'Please use a supported platform (Imgur, Notion, GitHub, Google Drive, YouTube, etc.)'
    )
});

interface CompleteTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any | null; // Using any for now since we're transitioning from dummy data
}

export function CompleteTaskModal({ open, onOpenChange, task }: CompleteTaskModalProps) {
  const { address } = useAccount();
  const { submitProof, isLoading } = useTaskFiContract();
  
  const form = useForm<CompleteTaskFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      proof: '',
    },
  });

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

  const onSubmit = async (data: CompleteTaskFormData) => {
    if (!task) return;
    
    try {
      const success = await submitProof(task.id, data.proof);
      
      if (success) {
        form.reset();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error submitting proof:', error);
    }
  };

  if (!task) return null;

  // Check if user can actually submit proof
  const canSubmit = canSubmitProofForTask(task, address);
  const hasAlreadySubmitted = task.proof && task.proof.length > 0;
  const isExpired = task.deadline < Math.floor(Date.now() / 1000);

  // Show different content based on task state
  if (!canSubmit) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              Cannot Submit Proof
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-orange-400/10 rounded-lg p-4 border border-orange-400/30">
              <p className="text-orange-400 font-medium mb-2">
                {hasAlreadySubmitted ? 'Proof Already Submitted' : 
                 isExpired ? 'Task Deadline Passed' : 
                 'Not Authorized'}
              </p>
              <p className="text-sm text-orange-400/80">
                {hasAlreadySubmitted ? 'You have already submitted proof for this task. It is now awaiting admin review.' :
                 isExpired ? 'The deadline for this task has passed. You can no longer submit proof.' :
                 'You can only submit proof for your own active tasks.'}
              </p>
            </div>

            <Button
              onClick={() => onOpenChange(false)}
              className="w-full btn-secondary"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <Upload className="h-5 w-5 text-green-400" />
            Submit Proof of Completion
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Submit proof that you've completed this task. An admin will review your submission.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-muted/30 rounded-lg p-4 border border-border/50 mb-6">
          <h4 className="font-medium text-foreground mb-2">Task Details</h4>
          <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Stake: <span className="text-primary font-mono">{task.stake} ETH</span></span>
            <span className="text-muted-foreground">Deadline: <span className="text-foreground">{formatDateTime(task.deadline)}</span></span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="proof"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Proof Link
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="url"
                        placeholder="https://imgur.com/your-proof or https://notion.so/your-work"
                        className="bg-input border-border text-foreground placeholder:text-muted-foreground pr-10"
                        disabled={isLoading}
                        {...field}
                      />
                      <ExternalLink className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <FormMessage />
                  <div className="text-xs text-muted-foreground">
                    Supported platforms: Imgur, Notion, GitHub, Google Drive, YouTube, Twitter/X, Instagram
                  </div>
                </FormItem>
              )}
            />

            <div className="bg-primary/10 rounded-lg p-4 border border-primary/30">
              <p className="text-sm text-primary mb-2">
                <strong>Review Process:</strong>
              </p>
              <ul className="text-xs text-primary/80 space-y-1">
                <li>• Your proof will be reviewed by an admin</li>
                <li>• Approved tasks allow you to claim your full stake back</li>
                <li>• Rejected tasks become claimable by other users</li>
                <li>• You'll receive an NFT certificate upon approval</li>
                <li>• Make sure your proof clearly shows task completion</li>
              </ul>
            </div>

            <div className="bg-yellow-400/10 rounded-lg p-3 border border-yellow-400/30">
              <p className="text-xs text-yellow-400">
                <strong>Important:</strong> You can only submit proof once per task. 
                Make sure your link is correct and accessible before submitting.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 btn-primary"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Submitting...' : 'Submit Proof'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}