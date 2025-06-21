import { ethers } from 'ethers';
import TaskFiABI from './TaskFi.json';

// Contract address on Ethereum Sepolia
export const TASKFI_CONTRACT_ADDRESS = '0x559B8F2476C923A418114ABFD3704Abf88d43776';

// Sepolia testnet configuration
export const SEPOLIA_CHAIN_ID = 11155111;

// Task status enum mapping (matches smart contract)
export enum TaskStatus {
  InProgress = 0,
  Complete = 1,
  Failed = 2
}

// Type definitions for contract data
export interface ContractTask {
  taskId: ethers.BigNumber;
  user: string;
  description: string;
  deposit: ethers.BigNumber;
  deadline: ethers.BigNumber;
  status: TaskStatus;
  proofOfCompletion: string;
  completionNFTUri: string;
  nftTokenId: ethers.BigNumber;
  createdAt: ethers.BigNumber;
}

export interface FormattedTask {
  id: number;
  creator: string;
  description: string;
  stake: string; // Formatted ETH amount
  deadline: number; // Unix timestamp
  proof: string; // IPFS hash or proof URL
  status: 'active' | 'completed' | 'failed' | 'in-review';
  deposit: ethers.BigNumber; // Raw BigNumber for calculations
  nftTokenId?: number;
  completionNFTUri?: string;
  createdAt: number;
  canSubmitProof?: boolean; // Helper flag for UI
  canClaim?: boolean; // Helper flag for UI
}

/**
 * Get TaskFi contract instance
 * @param providerOrSigner - Ethers provider or signer
 * @returns Contract instance
 */
export function getTaskFiContract(providerOrSigner: ethers.providers.Provider | ethers.Signer) {
  return new ethers.Contract(TASKFI_CONTRACT_ADDRESS, TaskFiABI.abi, providerOrSigner);
}

/**
 * Get read-only contract instance using the user's wallet provider
 * This avoids CORS issues by using the wallet's built-in provider
 * @returns Contract instance for reading data
 */
export function getReadOnlyContract() {
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      return getTaskFiContract(provider);
    } catch (error) {
      console.warn('Failed to create Web3Provider, falling back to dummy contract');
    }
  }
  
  // Return a dummy contract that will fail gracefully
  // This prevents the app from crashing when wallet is not connected
  const dummyProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
  return getTaskFiContract(dummyProvider);
}

/**
 * Format contract task data for UI consumption with enhanced status logic
 * @param taskData - Raw task data from contract
 * @returns Formatted task object
 */
export function formatTaskData(taskData: ContractTask): FormattedTask {
  const stakeInEth = ethers.utils.formatEther(taskData.deposit);
  const deadlineTimestamp = taskData.deadline.toNumber();
  const taskId = taskData.taskId.toNumber();
  const now = Math.floor(Date.now() / 1000);
  const hasProof = taskData.proofOfCompletion && taskData.proofOfCompletion.length > 0;
  const isExpired = deadlineTimestamp < now;
  
  // Enhanced status mapping with better logic
  let status: FormattedTask['status'];
  let canSubmitProof = false;
  let canClaim = false;
  
  switch (taskData.status) {
    case TaskStatus.InProgress:
      if (isExpired) {
        status = 'failed';
        canClaim = false; // Others can claim failed tasks
      } else if (hasProof) {
        status = 'in-review';
        canSubmitProof = false; // Already submitted proof
        canClaim = false; // Waiting for admin approval
      } else {
        status = 'active';
        canSubmitProof = true; // Can submit proof
        canClaim = false;
      }
      break;
    case TaskStatus.Complete:
      status = 'completed';
      canSubmitProof = false;
      canClaim = true; // Can claim reward
      break;
    case TaskStatus.Failed:
      status = 'failed';
      canSubmitProof = false;
      canClaim = false; // Others can claim this
      break;
    default:
      status = 'active';
      canSubmitProof = !hasProof && !isExpired;
      canClaim = false;
  }

  return {
    id: taskId,
    creator: taskData.user,
    description: taskData.description,
    stake: stakeInEth,
    deadline: deadlineTimestamp,
    proof: taskData.proofOfCompletion,
    status,
    deposit: taskData.deposit,
    nftTokenId: taskData.nftTokenId.toNumber(),
    completionNFTUri: taskData.completionNFTUri,
    createdAt: taskData.createdAt.toNumber(),
    canSubmitProof,
    canClaim
  };
}

/**
 * Convert hours to seconds for contract submission
 * @param hours - Number of hours
 * @returns Seconds
 */
export function hoursToSeconds(hours: number): number {
  return hours * 60 * 60;
}

/**
 * Parse duration string to hours
 * @param duration - Duration string (e.g., "1h", "24h")
 * @returns Number of hours
 */
export function parseDurationToHours(duration: string): number {
  const match = duration.match(/^(\d+)h$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  return parseInt(match[1], 10);
}

/**
 * Check if user is on Sepolia network
 * @param chainId - Current chain ID
 * @returns True if on Sepolia
 */
export function isSepoliaNetwork(chainId?: number): boolean {
  return chainId === SEPOLIA_CHAIN_ID;
}

/**
 * Get minimum deposit amount from contract
 * @returns Promise resolving to minimum deposit in ETH
 */
export async function getMinimumDeposit(): Promise<string> {
  try {
    const contract = getReadOnlyContract();
    const minDeposit = await contract.MIN_DEPOSIT();
    return ethers.utils.formatEther(minDeposit);
  } catch (error) {
    console.error('Error fetching minimum deposit:', error);
    return '0.01'; // Fallback to known minimum
  }
}

/**
 * Get all task IDs from the contract
 * @returns Promise resolving to array of task IDs
 */
export async function getAllTaskIds(): Promise<number[]> {
  try {
    if (!window.ethereum) {
      console.warn('No wallet provider available');
      return [];
    }

    const contract = getReadOnlyContract();
    const currentTaskId = await contract.getCurrentTaskId();
    const taskIds: number[] = [];
    
    // Task IDs start from 1
    for (let i = 1; i <= currentTaskId.toNumber(); i++) {
      taskIds.push(i);
    }
    
    console.log(`Found ${taskIds.length} tasks`);
    return taskIds;
  } catch (error) {
    console.error('Error fetching task IDs:', error);
    return [];
  }
}

/**
 * Get task data safely
 * @param taskId - Task ID to fetch
 * @returns Promise resolving to task data or null
 */
export async function getTaskSafely(taskId: number): Promise<ContractTask | null> {
  try {
    if (!window.ethereum) {
      console.warn('No wallet provider available');
      return null;
    }

    const contract = getReadOnlyContract();
    const taskData = await contract.getTask(taskId);
    return taskData;
  } catch (error) {
    console.error(`Failed to fetch task ${taskId}:`, error);
    return null;
  }
}

/**
 * Check if a task can have proof submitted
 * @param task - Formatted task object
 * @param userAddress - Current user's address
 * @returns True if user can submit proof
 */
export function canSubmitProofForTask(task: FormattedTask, userAddress?: string): boolean {
  if (!userAddress || !task) return false;
  
  const isOwner = task.creator.toLowerCase() === userAddress.toLowerCase();
  const isActive = task.status === 'active';
  const hasNoProof = !task.proof || task.proof.length === 0;
  const notExpired = task.deadline > Math.floor(Date.now() / 1000);
  
  return isOwner && isActive && hasNoProof && notExpired;
}

/**
 * Check if a task can be claimed by the owner
 * @param task - Formatted task object
 * @param userAddress - Current user's address
 * @returns True if user can claim the task
 */
export function canClaimTask(task: FormattedTask, userAddress?: string): boolean {
  if (!userAddress || !task) return false;
  
  const isOwner = task.creator.toLowerCase() === userAddress.toLowerCase();
  const isCompleted = task.status === 'completed';
  
  return isOwner && isCompleted;
}

/**
 * Check if a failed task can be claimed by anyone
 * @param task - Formatted task object
 * @param userAddress - Current user's address
 * @returns True if user can claim the failed task
 */
export function canClaimFailedTask(task: FormattedTask, userAddress?: string): boolean {
  if (!userAddress || !task) return false;
  
  const isNotOwner = task.creator.toLowerCase() !== userAddress.toLowerCase();
  const isFailed = task.status === 'failed';
  
  return isNotOwner && isFailed;
}