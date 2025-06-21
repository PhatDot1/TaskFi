import { ethers } from 'ethers';
import TaskFiABI from './TaskFi.json';

// Contract address on Ethereum Sepolia
export const TASKFI_CONTRACT_ADDRESS = '0x559B8F2476C923A418114ABFD3704Abf88d43776';

// Sepolia testnet configuration
export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_RPC_URL = 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';

// Task status enum mapping (matches smart contract)
export enum TaskStatus {
  InProgress = 0,
  Complete = 1,
  Failed = 2
}

// Type definitions for contract data
export interface ContractTask {
  creator: string;
  description: string;
  deposit: ethers.BigNumber;
  deadline: ethers.BigNumber;
  ipfsHash: string;
  status: TaskStatus;
}

export interface FormattedTask {
  id: number;
  creator: string;
  description: string;
  stake: string; // Formatted ETH amount
  deadline: number; // Unix timestamp
  proof: string; // IPFS hash
  status: 'active' | 'completed' | 'failed' | 'in-review';
  deposit: ethers.BigNumber; // Raw BigNumber for calculations
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
 * Get read-only contract instance with default provider
 * @returns Contract instance for reading data
 */
export function getReadOnlyContract() {
  const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC_URL);
  return getTaskFiContract(provider);
}

/**
 * Format contract task data for UI consumption
 * @param taskData - Raw task data from contract
 * @param taskId - Task ID
 * @returns Formatted task object
 */
export function formatTaskData(taskData: ContractTask, taskId: number): FormattedTask {
  const stakeInEth = ethers.utils.formatEther(taskData.deposit);
  const deadlineTimestamp = taskData.deadline.toNumber();
  
  // Map contract status to UI status
  let status: FormattedTask['status'];
  switch (taskData.status) {
    case TaskStatus.InProgress:
      // Check if deadline has passed
      const now = Math.floor(Date.now() / 1000);
      status = deadlineTimestamp < now ? 'failed' : 'active';
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
    creator: taskData.creator,
    description: taskData.description,
    stake: stakeInEth,
    deadline: deadlineTimestamp,
    proof: taskData.ipfsHash,
    status,
    deposit: taskData.deposit
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