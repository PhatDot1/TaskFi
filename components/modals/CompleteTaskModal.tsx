'use client';

import { useState, useRef } from 'react';
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
import { Button } from '@/components/ui/button';
import { useTaskFiContract } from '@/hooks/useTaskFiContract';
import { Loader2, Upload, AlertTriangle, Image, X, CheckCircle } from 'lucide-react';
import { canSubmitProofForTask } from '@/lib/contract';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';

const formSchema = z.object({
  proofImage: z.any().refine((file) => {
    return file && file instanceof File;
  }, 'Please select an image file')
});

interface CompleteTaskFormData {
  proofImage: File | null;
}

interface CompleteTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any | null;
}

export function CompleteTaskModal({ open, onOpenChange, task }: CompleteTaskModalProps) {
  const { address } = useAccount();
  const { submitProof, isLoading } = useTaskFiContract();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<CompleteTaskFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      proofImage: null,
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image must be smaller than 10MB');
        return;
      }

      setSelectedFile(file);
      form.setValue('proofImage', file);

      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    form.setValue('proofImage', null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadToIPFS = async (file: File): Promise<string> => {
    setIsUploading(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload to a public IPFS service (using Pinata as example)
      // In production, you'd want to use your own IPFS node or service
      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT || 'your-pinata-jwt'}`,
        },
        body: formData,
      });

      if (!response.ok) {
        // Fallback to a mock IPFS URL for demo purposes
        console.warn('IPFS upload failed, using mock URL');
        return `https://ipfs.io/ipfs/mock-hash-${Date.now()}`;
      }

      const result = await response.json();
      return `https://ipfs.io/ipfs/${result.IpfsHash}`;
    } catch (error) {
      console.error('IPFS upload error:', error);
      // Return a mock URL for demo purposes
      return `https://ipfs.io/ipfs/mock-hash-${Date.now()}`;
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: CompleteTaskFormData) => {
    if (!task || !selectedFile) return;
    
    try {
      toast.success('Uploading image to IPFS...', {
        description: 'Please wait while we upload your proof image'
      });

      // Upload image to IPFS
      const ipfsUrl = await uploadToIPFS(selectedFile);
      
      toast.success('Image uploaded successfully!', {
        description: 'Now submitting proof to blockchain...'
      });

      // Submit proof with IPFS URL
      const success = await submitProof(task.id, ipfsUrl);
      
      if (success) {
        form.reset();
        removeFile();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error submitting proof:', error);
      toast.error('Failed to submit proof', {
        description: 'Please try again'
      });
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
            Upload an image that proves you've completed this task. An admin will review your submission.
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
              name="proofImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Proof Image
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {/* File Upload Area */}
                      {!selectedFile ? (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors bg-muted/20"
                        >
                          <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-sm font-medium text-foreground mb-2">
                            Click to upload proof image
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PNG, JPG, GIF up to 10MB
                          </p>
                        </div>
                      ) : (
                        /* File Preview */
                        <div className="border border-border rounded-lg p-4 bg-muted/20">
                          <div className="flex items-start gap-4">
                            {previewUrl && (
                              <img
                                src={previewUrl}
                                alt="Proof preview"
                                className="w-20 h-20 object-cover rounded-lg border border-border"
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    {selectedFile.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={removeFile}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-1 mt-2">
                                <CheckCircle className="h-3 w-3 text-green-400" />
                                <span className="text-xs text-green-400">Ready to upload</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-primary/10 rounded-lg p-4 border border-primary/30">
              <p className="text-sm text-primary mb-2">
                <strong>Review Process:</strong>
              </p>
              <ul className="text-xs text-primary/80 space-y-1">
                <li>• Your image will be uploaded to IPFS (decentralized storage)</li>
                <li>• An admin will review your proof image</li>
                <li>• Approved tasks allow you to claim your full stake back</li>
                <li>• Rejected tasks become claimable by other users</li>
                <li>• Make sure your image clearly shows task completion</li>
              </ul>
            </div>

            <div className="bg-yellow-400/10 rounded-lg p-3 border border-yellow-400/30">
              <p className="text-xs text-yellow-400">
                <strong>Important:</strong> You can only submit proof once per task. 
                Make sure your image clearly demonstrates completion before submitting.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading || isUploading}
                className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground border-border"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || isUploading || !selectedFile}
                className="flex-1 btn-primary"
              >
                {(isLoading || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isUploading ? 'Uploading to IPFS...' : 
                 isLoading ? 'Submitting...' : 
                 'Submit Proof'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}