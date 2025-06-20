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
import { CompleteTaskFormData, DummyTask } from '@/lib/types';
import { toast } from 'sonner';
import { Loader2, CheckCircle, ExternalLink, Brain, XCircle } from 'lucide-react';

const formSchema = z.object({
  proof: z.string().url('Please enter a valid URL'),
});

interface CompleteTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: DummyTask | null;
}

export function CompleteTaskModal({ open, onOpenChange, task }: CompleteTaskModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [aiReviewStage, setAiReviewStage] = useState<'submitting' | 'reviewing' | 'complete' | null>(null);
  const [aiResult, setAiResult] = useState<{ approved: boolean; reason?: string } | null>(null);
  
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
    
    setIsLoading(true);
    setAiReviewStage('submitting');
    
    try {
      // Stage 1: Submit proof
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAiReviewStage('reviewing');
      
      // Stage 2: AI Review (2-3 seconds)
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Randomly approve or reject (70% approval rate)
      const approved = Math.random() > 0.3;
      const reasons = {
        approved: [
          'Task completion clearly demonstrated',
          'Evidence meets quality standards',
          'Proof shows meaningful progress'
        ],
        rejected: [
          'Insufficient evidence provided',
          'Proof does not clearly demonstrate completion',
          'Evidence quality below standards'
        ]
      };
      
      const reason = approved 
        ? reasons.approved[Math.floor(Math.random() * reasons.approved.length)]
        : reasons.rejected[Math.floor(Math.random() * reasons.rejected.length)];
      
      setAiResult({ approved, reason });
      setAiReviewStage('complete');
      
      // Show result
      if (approved) {
        toast.success('Task approved by AI!', {
          description: `${reason}. You can now claim your stake.`,
        });
      } else {
        toast.error('Task rejected by AI', {
          description: `${reason}. Task marked as failed.`,
        });
      }
      
      // Reset after showing result
      setTimeout(() => {
        form.reset();
        setAiReviewStage(null);
        setAiResult(null);
        onOpenChange(false);
      }, 3000);
      
    } catch (error) {
      toast.error('Failed to submit proof', {
        description: 'Please try again later.',
      });
      setAiReviewStage(null);
      setAiResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (!task) return null;

  const getAiStageContent = () => {
    switch (aiReviewStage) {
      case 'submitting':
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin text-blue-400" />,
          title: 'Submitting Proof',
          description: 'Uploading your proof for AI review...',
          color: 'blue'
        };
      case 'reviewing':
        return {
          icon: <Brain className="h-5 w-5 text-yellow-400 animate-pulse" />,
          title: 'AI Review in Progress',
          description: 'Our AI is analyzing your proof submission...',
          color: 'yellow'
        };
      case 'complete':
        return {
          icon: aiResult?.approved 
            ? <CheckCircle className="h-5 w-5 text-green-400" />
            : <XCircle className="h-5 w-5 text-red-400" />,
          title: aiResult?.approved ? 'Task Approved!' : 'Task Rejected',
          description: aiResult?.reason || '',
          color: aiResult?.approved ? 'green' : 'red'
        };
      default:
        return null;
    }
  };

  const stageContent = getAiStageContent();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            Complete Task
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Submit proof of completion for AI review.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-muted/30 rounded-lg p-4 border border-border/50 mb-6">
          <h4 className="font-medium text-foreground mb-2">Task Details</h4>
          <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Stake: <span className="text-primary font-mono">{task.stake} POL</span></span>
            <span className="text-muted-foreground">Deadline: <span className="text-foreground">{formatDateTime(task.deadline)}</span></span>
          </div>
        </div>

        {stageContent && (
          <div className={`rounded-lg p-4 border mb-6 ${
            stageContent.color === 'blue' ? 'bg-blue-400/10 border-blue-400/30' :
            stageContent.color === 'yellow' ? 'bg-yellow-400/10 border-yellow-400/30' :
            stageContent.color === 'green' ? 'bg-green-400/10 border-green-400/30' :
            'bg-red-400/10 border-red-400/30'
          }`}>
            <div className="flex items-center gap-3">
              {stageContent.icon}
              <div>
                <p className={`font-semibold ${
                  stageContent.color === 'blue' ? 'text-blue-400' :
                  stageContent.color === 'yellow' ? 'text-yellow-400' :
                  stageContent.color === 'green' ? 'text-green-400' :
                  'text-red-400'
                }`}>
                  {stageContent.title}
                </p>
                <p className="text-sm text-muted-foreground">{stageContent.description}</p>
              </div>
            </div>
          </div>
        )}

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
                <strong>AI Review Process:</strong>
              </p>
              <ul className="text-xs text-primary/80 space-y-1">
                <li>• AI will analyze your proof for task completion</li>
                <li>• Review typically takes 2-3 seconds</li>
                <li>• Approved tasks allow you to claim your stake</li>
                <li>• Rejected tasks become claimable by others</li>
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
                disabled={isLoading || aiReviewStage === 'complete'}
                className="flex-1 btn-primary"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Processing...' : 'Submit for AI Review'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}