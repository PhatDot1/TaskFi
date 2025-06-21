'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { ethers } from 'ethers';
import { 
  getTaskFiContract, 
  getReadOnlyContract, 
  formatTaskData, 
  FormattedTask,
  ContractTask,
  SEPOLIA_CHAIN_ID,
  isSepoliaNetwork,
  getAllTaskIds
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
  approveTaskCompletion: (taskId: number, nftUri: string) => Promise<boolean>;
  
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
  
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userTasks, setUserTasks] = useState<FormattedTask[]>([]);
  const [allTasks, setAllTasks] = useState<FormattedTask[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const readOnlyContract = getReadOnlyContract();
  
  // For now, assume correct network since wagmi handles network switching
  const isCorrectNetwork = true;

  // Initialize contract when wallet is connected
  useEffect(() => {
    if (isConnected && walletClient && typeof window !== 'undefined') {
      try {
        // Add a small delay to ensure MetaMask is ready
        const timer = setTimeout(() => {
          if (window.ethereum) {
            const provider = new ethers.providers.Web3Provider(window.ethereum as any);
            const signer = provider.getSigner();
            setContract(getTaskFiContract(signer));
          }
        }, 500); // 500ms delay

        return () => clearTimeout(timer);
      } catch (error) {
        console.error('Error setting up contract:', error);
        setContract(null);
      }
    } else {
      setContract(null);
    }
  }, [isConnected, walletClient]);

  // Submit a new task
  const submitTask = useCallback(async (
    description: string, 
    timelineHours: number, 
    depositEth: string
  ): Promise<boolean> => {
    if (!contract || !isConnected || !isCorrectNetwork) {
      toast.error('Please connect your wallet to Sepolia network');
      return false;
    }

    try {
      setIsLoading(true);
      
      const depositWei = ethers.utils.parseEther(depositEth);
      const tx = await contract.submitTask(description, timelineHours, {
        value: depositWei
      });
      
      toast.success('Transaction submitted', {
        description: 'Waiting for confirmation...'
      });
      
      await tx.wait();
      
      toast.success('Task created successfully!', {
        description: `Staked ${depositEth} ETH for "${description.slice(0, 30)}..."`
      });
      
      // Refresh tasks after successful submission
      refreshTasks();
      
      return true;
    } catch (error: any) {
      console.error('Error submitting task:', error);
      toast.error('Failed to create task', {
        description: error.reason || error.message || 'Transaction failed'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [contract, isConnected, isCorrectNetwork]);

  // Submit proof for a task
  const submitProof = useCallback(async (taskId: number, proofUrl: string): Promise<boolean> => {
    if (!contract || !isConnected || !isCorrectNetwork) {
      toast.error('Please connect your wallet to Sepolia network');
      return false;
    }

    try {
      setIsLoading(true);
      
      const tx = await contract.submitProof(taskId, proofUrl);
      
      toast.success('Proof submitted', {
        description: 'Waiting for confirmation...'
      });
      
      await tx.wait();
      
      toast.success('Proof submitted successfully!', {
        description: 'Your task is now awaiting admin approval'
      });
      
      refreshTasks();
      return true;
    } catch (error: any) {
      console.error('Error submitting proof:', error);
      toast.error('Failed to submit proof', {
        description: error.reason || error.message || 'Transaction failed'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [contract, isConnected, isCorrectNetwork]);

  // Claim reward for completed task
  const claimReward = useCallback(async (taskId: number): Promise<boolean> => {
    if (!contract || !isConnected || !isCorrectNetwork) {
      toast.error('Please connect your wallet to Sepolia network');
      return false;
    }

    try {
      setIsLoading(true);
      
      const tx = await contract.claimReward(taskId);
      
      toast.success('Claim submitted', {
        description: 'Waiting for confirmation...'
      });
      
      await tx.wait();
      
      toast.success('Reward claimed successfully!');
      
      refreshTasks();
      return true;
    } catch (error: any) {
      console.error('Error claiming reward:', error);
      toast.error('Failed to claim reward', {
        description: error.reason || error.message || 'Transaction failed'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [contract, isConnected, isCorrectNetwork]);

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
      
      refreshTasks();
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
      refreshTasks();
      return true;
    } catch (error: any) {
      console.error('Error checking task failure:', error);
      return false;
    }
  }, [contract, isConnected, isCorrectNetwork]);

  // Approve task completion (admin only)
  const approveTaskCompletion = useCallback(async (taskId: number, nftUri: string): Promise<boolean> => {
    if (!contract || !isConnected || !isCorrectNetwork) {
      toast.error('Please connect your wallet to Sepolia network');
      return false;
    }

    try {
      setIsLoading(true);
      
      const tx = await contract.approveTaskCompletion(taskId, nftUri);
      
      toast.success('Approval submitted', {
        description: 'Waiting for confirmation...'
      });
      
      await tx.wait();
      
      toast.success('Task approved successfully!');
      
      refreshTasks();
      return true;
    } catch (error: any) {
      console.error('Error approving task:', error);
      toast.error('Failed to approve task', {
        description: error.reason || error.message || 'Transaction failed'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [contract, isConnected, isCorrectNetwork]);

  // Fetch user's tasks
  const getUserTasks = useCallback(async (userAddress?: string): Promise<FormattedTask[]> => {
    const targetAddress = userAddress || address;
    if (!targetAddress) return [];

    try {
      const taskIds = await readOnlyContract.getUserTasks(targetAddress);
      const tasks: FormattedTask[] = [];

      for (const taskId of taskIds) {
        const taskData: ContractTask = await readOnlyContract.getTask(taskId.toNumber());
        const formattedTask = formatTaskData(taskData);
        tasks.push(formattedTask);
      }

      return tasks;
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      return [];
    }
  }, [readOnlyContract, address]);

  // Fetch all tasks
  const getAllTasks = useCallback(async (): Promise<FormattedTask[]> => {
    try {
      const taskIds = await getAllTaskIds();
      const tasks: FormattedTask[] = [];

      for (const taskId of taskIds) {
        try {
          const taskData: ContractTask = await readOnlyContract.getTask(taskId);
          const formattedTask = formatTaskData(taskData);
          tasks.push(formattedTask);
        } catch (error) {
          // Skip tasks that don't exist or can't be fetched
          console.warn(`Could not fetch task ${taskId}:`, error);
        }
      }

      return tasks;
    } catch (error) {
      console.error('Error fetching all tasks:', error);
      return [];
    }
  }, [readOnlyContract]);

  // Get single task
  const getTask = useCallback(async (taskId: number): Promise<FormattedTask | null> => {
    try {
      const taskData: ContractTask = await readOnlyContract.getTask(taskId);
      return formatTaskData(taskData);
    } catch (error) {
      console.error('Error fetching task:', error);
      return null;
    }
  }, [readOnlyContract]);

  // Refresh all tasks
  const refreshTasks = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [userTasksData, allTasksData] = await Promise.all([
        getUserTasks(),
        getAllTasks()
      ]);
      
      setUserTasks(userTasksData);
      setAllTasks(allTasksData);
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [getUserTasks, getAllTasks]);

  // Initial data load with delay
  useEffect(() => {
    if (isConnected) {
      // Add delay to ensure wallet is fully connected
      const timer = setTimeout(() => {
        refreshTasks();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isConnected, refreshTasks]);

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