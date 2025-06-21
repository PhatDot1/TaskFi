import { ethers } from 'ethers';
import TaskFiABI from './TaskFi.json';

// Contract address on Polygon Amoy
export const TASKFI_CONTRACT_ADDRESS = '0xBB28f99330B5fDffd96a1D1D5D6f94345B6e1229';

// Polygon Amoy testnet configuration
export const AMOY_CHAIN_ID = 80002; // Polygon Amoy testnet
export const SEPOLIA_CHAIN_ID = 11155111; // Ethereum Sepolia (for reference)

// Use Amoy as the expected chain ID
export const EXPECTED_CHAIN_ID = AMOY_CHAIN_ID;

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
  createdAt: ethers.BigNumber;
  claimed?: boolean; // Track if reward has been claimed
}

export interface FormattedTask {
  id: number;
  creator: string;
  description: string;
  stake: string; // Formatted POL amount
  deadline: number; // Unix timestamp
  proof: string; // IPFS hash or proof URL
  status: 'active' | 'completed' | 'failed' | 'in-review';
  deposit: ethers.BigNumber; // Raw BigNumber for calculations
  createdAt: number;
  claimed?: boolean; // Track if reward has been claimed
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
 * Get read-only contract instance with Polygon Amoy RPC fallback
 * @returns Contract instance for reading data
 */
export function getReadOnlyContract() {
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      return getTaskFiContract(provider);
    } catch (error) {
      console.warn('Failed to create Web3Provider, trying fallback RPC...');
    }
  }
  
  // Fallback to Polygon Amoy RPC endpoints
  const rpcEndpoints = [
    'https://rpc-amoy.polygon.technology/',
    'https://polygon-amoy-bor-rpc.publicnode.com',
    'https://polygon-amoy.drpc.org'
  ];
  
  for (const rpc of rpcEndpoints) {
    try {
      const provider = new ethers.providers.JsonRpcProvider(rpc);
      console.log(`Using RPC endpoint: ${rpc}`);
      return getTaskFiContract(provider);
    } catch (error) {
      console.warn(`Failed to connect to ${rpc}:`, error);
      continue;
    }
  }
  
  // Last resort - return a dummy contract that will fail gracefully
  console.error('All RPC endpoints failed, using dummy provider');
  const dummyProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
  return getTaskFiContract(dummyProvider);
}

/**
 * Check if a task has been claimed by querying contract events or state
 * @param taskId - Task ID to check
 * @returns Promise resolving to true if claimed
 */
export async function checkIfTaskClaimed(taskId: number): Promise<boolean> {
  try {
    if (!window.ethereum) return false;
    
    const contract = getReadOnlyContract();
    
    // Try to check if there's a claimed flag or similar
    // This might vary depending on your contract implementation
    try {
      // Method 1: Check if contract has a claimed mapping
      const claimed = await contract.taskClaimed(taskId);
      return claimed;
    } catch (error) {
      // Method 2: Check task deposit - if it's 0, it might have been claimed
      try {
        const taskData = await contract.getTask(taskId);
        // If deposit is 0 and status is complete, it's likely been claimed
        return taskData.status === TaskStatus.Complete && taskData.deposit.eq(0);
      } catch (error2) {
        console.log('Could not determine claim status for task', taskId);
        return false;
      }
    }
  } catch (error) {
    console.error('Error checking claim status:', error);
    return false;
  }
}

/**
 * Format contract task data for UI consumption with enhanced status logic
 * @param taskData - Raw task data from contract
 * @returns Formatted task object
 */
export function formatTaskData(taskData: ContractTask): FormattedTask {
  const stakeInPol = ethers.utils.formatEther(taskData.deposit);
  const deadlineTimestamp = taskData.deadline.toNumber();
  const taskId = taskData.taskId.toNumber();
  const now = Math.floor(Date.now() / 1000);
  const hasProof = taskData.proofOfCompletion && taskData.proofOfCompletion.length > 0;
  const isExpired = deadlineTimestamp < now;
  
  // Check if task has been claimed (deposit is 0 after claiming)
  const isClaimed = taskData.status === TaskStatus.Complete && taskData.deposit.eq(0);
  
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
      status = 'completed'; // Always show as completed, use claimed flag for UI
      canSubmitProof = false;
      canClaim = !isClaimed; // Can claim reward only if not already claimed
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
    stake: stakeInPol,
    deadline: deadlineTimestamp,
    proof: taskData.proofOfCompletion,
    status,
    deposit: taskData.deposit,
    createdAt: taskData.createdAt.toNumber(),
    claimed: isClaimed,
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
 * Check if user is on Polygon Amoy network
 * @param chainId - Current chain ID
 * @returns True if on Polygon Amoy
 */
export function isAmoyNetwork(chainId?: number): boolean {
  return chainId === AMOY_CHAIN_ID;
}

/**
 * Check if user is on Sepolia network (for reference)
 * @param chainId - Current chain ID
 * @returns True if on Sepolia
 */
export function isSepoliaNetwork(chainId?: number): boolean {
  return chainId === SEPOLIA_CHAIN_ID;
}

/**
 * Get minimum deposit amount from contract with retry logic
 * @returns Promise resolving to minimum deposit in POL
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
 * Get all task IDs from the contract with improved error handling
 * @returns Promise resolving to array of task IDs
 */
export async function getAllTaskIds(): Promise<number[]> {
  try {
    if (!window.ethereum) {
      console.warn('No wallet provider available');
      return [];
    }

    const contract = getReadOnlyContract();
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 10000);
    });
    
    const currentTaskId = await Promise.race([
      contract.getCurrentTaskId(),
      timeoutPromise
    ]);
    
    const taskIds: number[] = [];
    
    // Task IDs start from 1
    for (let i = 1; i <= currentTaskId.toNumber(); i++) {
      taskIds.push(i);
    }
    
    console.log(`✅ Found ${taskIds.length} tasks`);
    return taskIds;
  } catch (error) {
    console.error('❌ Error fetching task IDs:', error);
    return [];
  }
}

/**
 * Get task data safely with retry logic
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
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 5000);
    });
    
    const taskData = await Promise.race([
      contract.getTask(taskId),
      timeoutPromise
    ]);
    
    return taskData;
  } catch (error) {
    console.error(`❌ Failed to fetch task ${taskId}:`, error);
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
  const notClaimed = !task.claimed;
  
  return isOwner && isCompleted && notClaimed;
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