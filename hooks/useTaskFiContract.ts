'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWalletClient, useChainId } from 'wagmi';
import { ethers } from 'ethers';
import { 
  getTaskFiContract, 
  getReadOnlyContract, 
  formatTaskData, 
  FormattedTask,
  ContractTask,
  SEPOLIA_CHAIN_ID,
  isSepoliaNetwork,
  getAllTaskIds,
  getTaskSafely
} from '@/lib/contract';
import { toast } from 'sonner';

export interface UseTaskFiContractReturn {
  // Contract instances
  contract: ethers.Contract | null;
  readOnlyContract: ethers.Contract;
  
  // Network status
  isCorrectNetwork: boolean;
  isLoading: boolean;
  
  // Contract methods
  submitTask: (description: string, timelineHours: number, depositEth: string) => Promise<boolean>;
  submitProof: (taskId: number, proofUrl: string) => Promise<boolean>;
  claimReward: (taskId: number) => Promise<boolean>;
  claimFailedTask: (taskId: number) => Promise<boolean>;
  checkTaskFailure: (taskId: number) => Promise<boolean>;
  approveTaskCompletion: (taskId: number) => Promise<boolean>;
  
  // Data fetching
  getUserTasks: (address?: string) => Promise<FormattedTask[]>;
  getAllTasks: () => Promise<FormattedTask[]>;
  getTask: (taskId: number) => Promise<FormattedTask | null>;
  refreshTasks: () => void;
  
  // State
  userTasks: FormattedTask[];
  allTasks: FormattedTask[];
  isRefreshing: boolean;
}

export function useTaskFiContract(): UseTaskFiContractReturn {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userTasks, setUserTasks] = useState<FormattedTask[]>([]);
  const [allTasks, setAllTasks] = useState<FormattedTask[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const readOnlyContract = getReadOnlyContract();
  
  // Check if we're on the correct network (Sepolia)
  const isCorrectNetwork = chainId === SEPOLIA_CHAIN_ID;

  // Initialize contract when wallet is connected and on correct network
  useEffect(() => {
    if (isConnected && walletClient && isCorrectNetwork && typeof window !== 'undefined') {
      try {
        const timer = setTimeout(() => {
          if (window.ethereum) {
            const provider = new ethers.providers.Web3Provider(window.ethereum as any);
            const signer = provider.getSigner();
            setContract(getTaskFiContract(signer));
            console.log('Contract initialized successfully');
          }
        }, 500);

        return () => clearTimeout(timer);
      } catch (error) {
        console.error('Error setting up contract:', error);
        setContract(null);
      }
    } else {
      setContract(null);
    }
  }, [isConnected, walletClient, isCorrectNetwork]);

  // Submit a new task
  const submitTask = useCallback(async (
    description: string, 
    timelineHours: number, 
    depositEth: string
  ): Promise<boolean> => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return false;
    }

    if (!isCorrectNetwork) {
      toast.error('Please switch to Sepolia network');
      return false;
    }

    if (!contract) {
      toast.error('Contract not initialized. Please try again.');
      return false;
    }

    try {
      setIsLoading(true);
      
      const depositWei = ethers.utils.parseEther(depositEth);
      
      // Estimate gas first
      const gasEstimate = await contract.estimateGas.submitTask(description, timelineHours, {
        value: depositWei
      });
      
      const tx = await contract.submitTask(description, timelineHours, {
        value: depositWei,
        gasLimit: gasEstimate.mul(120).div(100) // Add 20% buffer
      });
      
      toast.success('Transaction submitted', {
        description: 'Waiting for confirmation...'
      });
      
      const receipt = await tx.wait();
      
      toast.success('Task created successfully!', {
        description: `Staked ${depositEth} ETH for "${description.slice(0, 30)}..."`
      });
      
      // Refresh tasks after successful submission with a longer delay
      setTimeout(() => refreshTasks(), 5000);
      
      return true;
    } catch (error: any) {
      console.error('Error submitting task:', error);
      
      if (error.code === 'NETWORK_ERROR') {
        toast.error('Network error', {
          description: 'Please check your connection and try again'
        });
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        toast.error('Insufficient funds', {
          description: 'You need more ETH to complete this transaction'
        });
      } else if (error.code === 'USER_REJECTED') {
        toast.error('Transaction cancelled', {
          description: 'You cancelled the transaction'
        });
      } else {
        toast.error('Failed to create task', {
          description: error.reason || error.message || 'Transaction failed'
        });
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [contract, isConnected, isCorrectNetwork]);

  // Submit proof for a task with enhanced validation
  const submitProof = useCallback(async (taskId: number, proofUrl: string): Promise<boolean> => {
    if (!contract || !isConnected || !isCorrectNetwork) {
      toast.error('Please connect your wallet to Sepolia network');
      return false;
    }

    if (!proofUrl || proofUrl.trim().length === 0) {
      toast.error('Proof URL is required');
      return false;
    }

    try {
      setIsLoading(true);
      
      // First check if the task exists and user can submit proof
      const taskData = await getTaskSafely(taskId);
      if (!taskData) {
        toast.error('Task not found');
        return false;
      }

      const formattedTask = formatTaskData(taskData);
      
      // Check if user owns the task
      if (formattedTask.creator.toLowerCase() !== address?.toLowerCase()) {
        toast.error('You can only submit proof for your own tasks');
        return false;
      }

      // Check if proof already submitted
      if (formattedTask.proof && formattedTask.proof.length > 0) {
        toast.error('Proof has already been submitted for this task');
        return false;
      }

      // Check if task is still active
      if (formattedTask.status !== 'active') {
        toast.error('Can only submit proof for active tasks');
        return false;
      }

      // Check if deadline has passed
      const now = Math.floor(Date.now() / 1000);
      if (formattedTask.deadline < now) {
        toast.error('Cannot submit proof after deadline has passed');
        return false;
      }

      // Estimate gas first
      const gasEstimate = await contract.estimateGas.submitProof(taskId, proofUrl);
      
      const tx = await contract.submitProof(taskId, proofUrl, {
        gasLimit: gasEstimate.mul(120).div(100) // Add 20% buffer
      });
      
      toast.success('Proof submission transaction sent', {
        description: 'Waiting for blockchain confirmation...'
      });
      
      const receipt = await tx.wait();
      
      toast.success('Proof submitted successfully!', {
        description: 'Your task is now awaiting admin review. You\'ll be notified when it\'s approved.'
      });
      
      // Refresh tasks to show updated status
      setTimeout(() => refreshTasks(), 3000);
      return true;
    } catch (error: any) {
      console.error('Error submitting proof:', error);
      
      if (error.code === 'USER_REJECTED') {
        toast.error('Transaction cancelled', {
          description: 'You cancelled the proof submission'
        });
      } else if (error.message?.includes('already submitted')) {
        toast.error('Proof already submitted', {
          description: 'You have already submitted proof for this task'
        });
      } else if (error.message?.includes('deadline')) {
        toast.error('Deadline passed', {
          description: 'Cannot submit proof after the deadline'
        });
      } else {
        toast.error('Failed to submit proof', {
          description: error.reason || error.message || 'Transaction failed'
        });
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [contract, isConnected, isCorrectNetwork, address]);

  // Enhanced claim reward function with better debugging
  const claimReward = useCallback(async (taskId: number): Promise<boolean> => {
    if (!contract || !isConnected || !isCorrectNetwork) {
      toast.error('Please connect your wallet to Sepolia network');
      return false;
    }

    try {
      setIsLoading(true);
      
      console.log('🔍 Attempting to claim reward for task:', taskId);
      
      // First, let's check the task status
      const taskData = await getTaskSafely(taskId);
      if (!taskData) {
        toast.error('Task not found');
        return false;
      }

      const formattedTask = formatTaskData(taskData);
      console.log('📋 Task data before claim:', {
        id: formattedTask.id,
        status: formattedTask.status,
        creator: formattedTask.creator,
        stake: formattedTask.stake,
        currentUser: address
      });

      // Validate that user can claim
      if (formattedTask.creator.toLowerCase() !== address?.toLowerCase()) {
        toast.error('You can only claim your own tasks');
        return false;
      }

      if (formattedTask.status !== 'completed') {
        toast.error(`Cannot claim task with status: ${formattedTask.status}`);
        return false;
      }

      // Check user's balance before transaction
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const balanceBefore = await provider.getBalance(address!);
      console.log('💰 Balance before claim:', ethers.utils.formatEther(balanceBefore), 'ETH');

      // Try multiple possible function names for claiming
      let tx;
      let functionUsed = '';
      
      try {
        // Try claimReward first
        console.log('🔄 Trying claimReward function...');
        const gasEstimate = await contract.estimateGas.claimReward(taskId);
        tx = await contract.claimReward(taskId, {
          gasLimit: gasEstimate.mul(120).div(100)
        });
        functionUsed = 'claimReward';
      } catch (error: any) {
        console.log('❌ claimReward failed:', error.message);
        
        try {
          // Try claimStake
          console.log('🔄 Trying claimStake function...');
          const gasEstimate = await contract.estimateGas.claimStake(taskId);
          tx = await contract.claimStake(taskId, {
            gasLimit: gasEstimate.mul(120).div(100)
          });
          functionUsed = 'claimStake';
        } catch (error2: any) {
          console.log('❌ claimStake failed:', error2.message);
          
          try {
            // Try withdrawDeposit
            console.log('🔄 Trying withdrawDeposit function...');
            const gasEstimate = await contract.estimateGas.withdrawDeposit(taskId);
            tx = await contract.withdrawDeposit(taskId, {
              gasLimit: gasEstimate.mul(120).div(100)
            });
            functionUsed = 'withdrawDeposit';
          } catch (error3: any) {
            console.log('❌ withdrawDeposit failed:', error3.message);
            throw new Error(`All claim functions failed. Last error: ${error3.message}`);
          }
        }
      }
      
      console.log(`✅ Transaction sent using ${functionUsed}:`, tx.hash);
      
      toast.success('Claim transaction submitted', {
        description: `Using ${functionUsed} function. Waiting for confirmation...`
      });
      
      const receipt = await tx.wait();
      console.log('📄 Transaction receipt:', receipt);
      
      // Check balance after transaction
      const balanceAfter = await provider.getBalance(address!);
      const balanceDiff = balanceAfter.sub(balanceBefore);
      console.log('💰 Balance after claim:', ethers.utils.formatEther(balanceAfter), 'ETH');
      console.log('📈 Balance difference:', ethers.utils.formatEther(balanceDiff), 'ETH');
      
      if (balanceDiff.gt(0)) {
        toast.success('Reward claimed successfully!', {
          description: `Received ${ethers.utils.formatEther(balanceDiff)} ETH`
        });
      } else {
        toast.warning('Transaction completed but no ETH received', {
          description: 'Please check if the task was already claimed or contact support'
        });
      }
      
      setTimeout(() => refreshTasks(), 3000);
      return true;
    } catch (error: any) {
      console.error('❌ Error claiming reward:', error);
      
      if (error.code === 'USER_REJECTED') {
        toast.error('Transaction cancelled', {
          description: 'You cancelled the claim transaction'
        });
      } else if (error.message?.includes('already claimed')) {
        toast.error('Already claimed', {
          description: 'This task reward has already been claimed'
        });
      } else if (error.message?.includes('not completed')) {
        toast.error('Task not completed', {
          description: 'Task must be approved before claiming'
        });
      } else {
        toast.error('Failed to claim reward', {
          description: error.reason || error.message || 'Transaction failed'
        });
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [contract, isConnected, isCorrectNetwork, address]);

  // Claim failed task deposit
  const claimFailedTask = useCallback(async (taskId: number): Promise<boolean> => {
    if (!contract || !isConnected || !isCorrectNetwork) {
      toast.error('Please connect your wallet to Sepolia network');
      return false;
    }

    try {
      setIsLoading(true);
      
      const tx = await contract.claimFailedTaskDeposit(taskId);
      
      toast.success('Claim submitted', {
        description: 'Waiting for confirmation...'
      });
      
      await tx.wait();
      
      toast.success('Failed task claimed successfully!');
      
      setTimeout(() => refreshTasks(), 3000);
      return true;
    } catch (error: any) {
      console.error('Error claiming failed task:', error);
      toast.error('Failed to claim failed task', {
        description: error.reason || error.message || 'Transaction failed'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [contract, isConnected, isCorrectNetwork]);

  // Check and mark task as failed if deadline passed
  const checkTaskFailure = useCallback(async (taskId: number): Promise<boolean> => {
    if (!contract || !isConnected || !isCorrectNetwork) {
      return false;
    }

    try {
      const tx = await contract.checkTaskFailure(taskId);
      await tx.wait();
      setTimeout(() => refreshTasks(), 3000);
      return true;
    } catch (error: any) {
      console.error('Error checking task failure:', error);
      return false;
    }
  }, [contract, isConnected, isCorrectNetwork]);

  // Approve task completion (admin only) - NO NFT LOGIC
  const approveTaskCompletion = useCallback(async (taskId: number): Promise<boolean> => {
    if (!contract || !isConnected || !isCorrectNetwork) {
      toast.error('Please connect your wallet to Sepolia network');
      return false;
    }

    try {
      setIsLoading(true);
      
      // Try different contract function names that might exist without NFT requirement
      let tx;
      try {
        // First try: approveTask (simple approval without NFT)
        tx = await contract.approveTask(taskId);
      } catch (error: any) {
        try {
          // Second try: markTaskComplete
          tx = await contract.markTaskComplete(taskId);
        } catch (error2: any) {
          try {
            // Third try: completeTask
            tx = await contract.completeTask(taskId);
          } catch (error3: any) {
            // If all else fails, try the original function with a placeholder NFT URI
            console.log('Trying original function with placeholder NFT URI...');
            tx = await contract.approveTaskCompletion(taskId, 'https://placeholder.nft');
          }
        }
      }
      
      toast.success('Approval submitted', {
        description: 'Waiting for confirmation...'
      });
      
      await tx.wait();
      
      toast.success('Task approved successfully!');
      
      setTimeout(() => refreshTasks(), 3000);
      return true;
    } catch (error: any) {
      console.error('Error approving task:', error);
      
      if (error.message?.includes('NFT URI cannot be empty')) {
        toast.error('Contract requires NFT URI', {
          description: 'The smart contract still requires an NFT URI. Please contact the developer to update the contract.'
        });
      } else {
        toast.error('Failed to approve task', {
          description: error.reason || error.message || 'Transaction failed'
        });
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [contract, isConnected, isCorrectNetwork]);

  // Fetch user's tasks - only when wallet is connected and on correct network
  const getUserTasks = useCallback(async (userAddress?: string): Promise<FormattedTask[]> => {
    const targetAddress = userAddress || address;
    if (!targetAddress || !isConnected || !isCorrectNetwork || !window.ethereum) {
      return [];
    }

    try {
      console.log('Fetching tasks for user:', targetAddress);
      const contract = getReadOnlyContract();
      const taskIds = await contract.getUserTasks(targetAddress);
      console.log('User task IDs:', taskIds.map((id: any) => id.toNumber()));
      
      const tasks: FormattedTask[] = [];

      for (const taskId of taskIds) {
        const taskData = await getTaskSafely(taskId.toNumber());
        if (taskData) {
          const formattedTask = formatTaskData(taskData);
          tasks.push(formattedTask);
        }
      }

      console.log('Formatted user tasks:', tasks);
      return tasks;
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      return [];
    }
  }, [address, isConnected, isCorrectNetwork]);

  // Fetch all tasks - only when wallet is connected and on correct network
  const getAllTasks = useCallback(async (): Promise<FormattedTask[]> => {
    if (!isConnected || !isCorrectNetwork || !window.ethereum) {
      return [];
    }

    try {
      console.log('Fetching all tasks...');
      const taskIds = await getAllTaskIds();
      console.log('All task IDs:', taskIds);
      
      const tasks: FormattedTask[] = [];

      for (const taskId of taskIds) {
        const taskData = await getTaskSafely(taskId);
        if (taskData) {
          const formattedTask = formatTaskData(taskData);
          tasks.push(formattedTask);
        }
      }

      console.log('Formatted all tasks:', tasks);
      return tasks;
    } catch (error) {
      console.error('Error fetching all tasks:', error);
      return [];
    }
  }, [isConnected, isCorrectNetwork]);

  // Get single task
  const getTask = useCallback(async (taskId: number): Promise<FormattedTask | null> => {
    if (!isConnected || !isCorrectNetwork || !window.ethereum) {
      return null;
    }

    try {
      const taskData = await getTaskSafely(taskId);
      return taskData ? formatTaskData(taskData) : null;
    } catch (error) {
      console.error('Error fetching task:', error);
      return null;
    }
  }, [isConnected, isCorrectNetwork]);

  // Refresh all tasks
  const refreshTasks = useCallback(async () => {
    if (!isConnected || !isCorrectNetwork) {
      console.log('Skipping refresh - not connected or wrong network');
      return;
    }
    
    console.log('Refreshing tasks...');
    setIsRefreshing(true);
    try {
      const [userTasksData, allTasksData] = await Promise.all([
        getUserTasks(),
        getAllTasks()
      ]);
      
      console.log('Setting user tasks:', userTasksData);
      console.log('Setting all tasks:', allTasksData);
      
      setUserTasks(userTasksData);
      setAllTasks(allTasksData);
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [getUserTasks, getAllTasks, isConnected, isCorrectNetwork]);

  // Initial data load with proper network check
  useEffect(() => {
    if (isConnected && isCorrectNetwork && address) {
      console.log('Initial data load triggered for address:', address);
      const timer = setTimeout(() => {
        refreshTasks();
      }, 3000); // Increased delay for initial load

      return () => clearTimeout(timer);
    } else {
      // Clear tasks when disconnected or on wrong network
      setUserTasks([]);
      setAllTasks([]);
    }
  }, [isConnected, isCorrectNetwork, address]);

  // Auto-refresh every 45 seconds when connected
  useEffect(() => {
    if (isConnected && isCorrectNetwork) {
      const interval = setInterval(() => {
        console.log('Auto-refreshing tasks...');
        refreshTasks();
      }, 45000);

      return () => clearInterval(interval);
    }
  }, [isConnected, isCorrectNetwork, refreshTasks]);

  return {
    contract,
    readOnlyContract,
    isCorrectNetwork,
    isLoading,
    submitTask,
    submitProof,
    claimReward,
    claimFailedTask,
    checkTaskFailure,
    approveTaskCompletion,
    getUserTasks,
    getAllTasks,
    getTask,
    refreshTasks,
    userTasks,
    allTasks,
    isRefreshing
  };
}