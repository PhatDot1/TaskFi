export interface Task {
  id: number;
  creator: string;
  description: string;
  stake: string; // In ETH
  deadline: number; // Unix timestamp
  proof: string;
  completed: boolean;
  claimed: boolean;
  aiReviewed: boolean;
  approved: boolean;
}

export interface DummyTask extends Task {
  // Additional frontend-only properties
  timeRemaining?: number;
  status: 'active' | 'completed' | 'failed' | 'in-review';
  isClaimable?: boolean;
}

export type TaskStatus = 'active' | 'completed' | 'failed' | 'in-review';

export interface CreateTaskFormData {
  description: string;
  duration: string;
  stake: string;
}

export interface CompleteTaskFormData {
  proofImage: File | null;
}

export interface ClaimScore {
  address: string;
  claimScore: number;
}