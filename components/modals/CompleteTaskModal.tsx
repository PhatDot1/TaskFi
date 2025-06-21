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
import { Loader2, CheckCircle, ExternalLink } from 'lucide-react';

const formSchema = z.object({
  proof: z.string().url('Please enter a valid URL'),
});

interface CompleteTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any | null; // Using any for now since we're transitioning from dummy data
}

export function CompleteTaskModal({ open, onOpenChange, task }: CompleteTaskModalProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            Complete Task
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Submit proof of completion for admin review.
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
                </FormItem>
              )}
            />

            <div className="bg-primary/10 rounded-lg p-4 border border-primary/30">
              <p className="text-sm text-primary mb-2">
                <strong>Admin Review Process:</strong>
              </p>
              <ul className="text-xs text-primary/80 space-y-1">
                <li>• Admin will review your proof for task completion</li>
                <li>• Approved tasks allow you to claim your stake</li>
                <li>• Rejected tasks become claimable by others</li>
                <li>• You'll receive an NFT upon approval</li>
              </ul>
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