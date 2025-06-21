import { ethers } from 'ethers';
import TaskFiABI from './TaskFi.json';

// Contract address on Ethereum Sepolia
export const TASKFI_CONTRACT_ADDRESS = '0x559B8F2476C923A418114ABFD3704Abf88d43776';

// Sepolia testnet configuration
export const SEPOLIA_CHAIN_ID = 11155111;

// Free public RPC endpoints for Sepolia (no API key required)
export const SEPOLIA_RPC_URLS = [
  'https://rpc.sepolia.org',
  'https://sepolia.gateway.tenderly.co',
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://1rpc.io/sepolia'
];

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
 * Get read-only contract instance with fallback providers
 * @returns Contract instance for reading data
 */
export function getReadOnlyContract() {
  // Try multiple RPC endpoints for reliability
  for (const rpcUrl of SEPOLIA_RPC_URLS) {
    try {
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      return getTaskFiContract(provider);
    } catch (error) {
      console.warn(`Failed to connect to ${rpcUrl}:`, error);
      continue;
    }
  }
  
  // Fallback to first URL if all fail
  const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC_URLS[0]);
  return getTaskFiContract(provider);
}

/**
 * Format contract task data for UI consumption
 * @param taskData - Raw task data from contract
 * @returns Formatted task object
 */
export function formatTaskData(taskData: ContractTask): FormattedTask {
  const stakeInEth = ethers.utils.formatEther(taskData.deposit);
  const deadlineTimestamp = taskData.deadline.toNumber();
  const taskId = taskData.taskId.toNumber();
  
  // Map contract status to UI status
  let status: FormattedTask['status'];
  switch (taskData.status) {
    case TaskStatus.InProgress:
      // Check if deadline has passed
      const now = Math.floor(Date.now() / 1000);
      if (deadlineTimestamp < now) {
        status = 'failed';
      } else if (taskData.proofOfCompletion && taskData.proofOfCompletion.length > 0) {
        status = 'in-review';
      } else {
        status = 'active';
      }
      break;
    case TaskStatus.Complete:
      status = 'completed';
      break;
    case TaskStatus.Failed:
      status = 'failed';
      break;
    default:
      status = 'active';
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
    createdAt: taskData.createdAt.toNumber()
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
 * Get all task IDs from the contract with retry logic
 * @returns Promise resolving to array of task IDs
 */
export async function getAllTaskIds(): Promise<number[]> {
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const contract = getReadOnlyContract();
      const currentTaskId = await contract.getCurrentTaskId();
      const taskIds: number[] = [];
      
      // Task IDs start from 1
      for (let i = 1; i <= currentTaskId.toNumber(); i++) {
        taskIds.push(i);
      }
      
      console.log(`Found ${taskIds.length} tasks on attempt ${attempt + 1}`);
      return taskIds;
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  
  console.error('All attempts to fetch task IDs failed:', lastError);
  return [];
}

/**
 * Get task data with retry logic and multiple RPC endpoints
 * @param taskId - Task ID to fetch
 * @returns Promise resolving to task data or null
 */
export async function getTaskWithRetry(taskId: number): Promise<ContractTask | null> {
  const maxRetries = 3;
  
  for (let rpcIndex = 0; rpcIndex < SEPOLIA_RPC_URLS.length; rpcIndex++) {
    const rpcUrl = SEPOLIA_RPC_URLS[rpcIndex];
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const contract = getTaskFiContract(provider);
        const taskData = await contract.getTask(taskId);
        return taskData;
      } catch (error) {
        console.error(`Failed to fetch task ${taskId} from ${rpcUrl} on attempt ${attempt + 1}:`, error);
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        }
      }
    }
  }
  
  console.error(`Failed to fetch task ${taskId} from all RPC endpoints`);
  return null;
}