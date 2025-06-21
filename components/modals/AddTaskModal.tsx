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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CreateTaskFormData } from '@/lib/types';
import { useTaskFiContract } from '@/hooks/useTaskFiContract';
import { parseDurationToHours } from '@/lib/contract';
import { Loader2, Coins } from 'lucide-react';

const formSchema = z.object({
  description: z.string().min(10, 'Description must be at least 10 characters'),
  duration: z.string().min(1, 'Please select a duration'),
  stake: z.string()
    .min(1, 'Stake amount is required')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0.01;
    }, 'Stake must be at least 0.01 ETH')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num <= 10;
    }, 'Stake cannot exceed 10 ETH')
    .refine((val) => {
      // Check if it's a valid decimal number
      const regex = /^\d+(\.\d{1,18})?$/;
      return regex.test(val);
    }, 'Invalid decimal format'),
});

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTaskModal({ open, onOpenChange }: AddTaskModalProps) {
  const { submitTask, isLoading } = useTaskFiContract();
  
  const form = useForm<CreateTaskFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      duration: '',
      stake: '',
    },
  });

  const onSubmit = async (data: CreateTaskFormData) => {
    try {
      const timelineHours = parseDurationToHours(data.duration);
      const success = await submitTask(data.description, timelineHours, data.stake);
      
      if (success) {
        form.reset();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Create New Task
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Stake ETH to commit to completing your task by the deadline.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Task Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what you want to accomplish..."
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      Duration
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="1h">1 hour</SelectItem>
                        <SelectItem value="3h">3 hours</SelectItem>
                        <SelectItem value="6h">6 hours</SelectItem>
                        <SelectItem value="12h">12 hours</SelectItem>
                        <SelectItem value="24h">24 hours</SelectItem>
                        <SelectItem value="48h">48 hours</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stake"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      Stake Amount (ETH)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        min="0.01"
                        max="10"
                        placeholder="0.01"
                        className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Any amount from 0.01 to 10 ETH
                    </p>
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
              <p className="text-sm text-muted-foreground mb-2">
                <strong className="text-foreground">How it works:</strong>
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Your ETH stake will be locked until the deadline</li>
                <li>• Submit proof of completion before the deadline</li>
                <li>• Get admin approval to claim your stake back</li>
                <li>• Anyone can claim your stake if you miss the deadline</li>
              </ul>
            </div>

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
                type="submit"
                disabled={isLoading}
                className="flex-1 btn-primary"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}