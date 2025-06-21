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
import { uploadToIPFS, testPinataConnection } from '@/lib/ipfs';
import { Loader2, Upload, AlertTriangle, Image, X, CheckCircle, Cloud, Settings } from 'lucide-react';
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
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
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

  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('Testing connection...');
    
    try {
      const result = await testPinataConnection();
      setConnectionStatus(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
      
      if (result.success) {
        toast.success('Pinata connection successful!');
      } else {
        toast.error('Pinata connection failed', {
          description: result.message
        });
      }
    } catch (error) {
      setConnectionStatus('❌ Connection test failed');
      toast.error('Connection test failed');
    } finally {
      setIsTestingConnection(false);
    }
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

  const onSubmit = async (data: CompleteTaskFormData) => {
    if (!task || !selectedFile) return;
    
    try {
      setIsUploading(true);
      setUploadProgress('Preparing upload...');
      
      toast.success('Uploading image to IPFS...', {
        description: 'Please wait while we upload your proof image to decentralized storage'
      });

      // Upload image to IPFS using API key and secret
      setUploadProgress('Uploading to IPFS via Pinata...');
      const uploadResult = await uploadToIPFS(selectedFile);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload to IPFS');
      }

      setUploadProgress('Upload complete! Submitting to blockchain...');
      
      toast.success('Image uploaded successfully!', {
        description: `IPFS Hash: ${uploadResult.ipfsHash?.slice(0, 20)}...`
      });

      // Submit proof with IPFS URL
      const success = await submitProof(task.id, uploadResult.ipfsUrl!);
      
      if (success) {
        form.reset();
        removeFile();
        setUploadProgress('');
        onOpenChange(false);
        
        toast.success('Proof submitted successfully!', {
          description: 'Your task is now awaiting admin review'
        });
      }
    } catch (error: any) {
      console.error('Error submitting proof:', error);
      toast.error('Failed to submit proof', {
        description: error.message || 'Please try again'
      });
    } finally {
      setIsUploading(false);
      setUploadProgress('');
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
            Upload an image that proves you've completed this task. It will be stored on IPFS using Pinata.
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

        {/* Connection Test Section */}
        <div className="bg-blue-400/10 rounded-lg p-3 border border-blue-400/30 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-400 mb-1">IPFS Connection</p>
              <p className="text-xs text-blue-400/80">
                {connectionStatus || 'Test your Pinata connection before uploading'}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={isTestingConnection}
              className="bg-blue-400/10 hover:bg-blue-400/20 text-blue-400 border-blue-400/30"
            >
              {isTestingConnection ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Settings className="h-3 w-3" />
              )}
            </Button>
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
                                  disabled={isUploading}
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
                        disabled={isUploading}
                        className="hidden"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Upload Progress */}
            {isUploading && uploadProgress && (
              <div className="bg-blue-400/10 rounded-lg p-3 border border-blue-400/30">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-blue-400 animate-pulse" />
                  <span className="text-sm text-blue-400">{uploadProgress}</span>
                </div>
              </div>
            )}

            <div className="bg-primary/10 rounded-lg p-4 border border-primary/30">
              <p className="text-sm text-primary mb-2">
                <strong>IPFS Storage via Pinata:</strong>
              </p>
              <ul className="text-xs text-primary/80 space-y-1">
                <li>• Your image will be uploaded to IPFS using Pinata API</li>
                <li>• Images are permanently stored and accessible worldwide</li>
                <li>• An admin will review your proof image</li>
                <li>• Approved tasks allow you to claim your full stake back</li>
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
                {isUploading ? 'Uploading...' : 
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