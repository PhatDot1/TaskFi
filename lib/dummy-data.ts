import { DummyTask, ClaimScore } from './types';

export const dummyTasks: DummyTask[] = [
  {
    id: 1,
    creator: '0x123...abc',
    description: 'Write a comprehensive blog post about Web3 development best practices',
    stake: '0.3',
    deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    proof: '',
    completed: false,
    claimed: false,
    status: 'active',
    aiReviewed: false,
    approved: false
  },
  {
    id: 2,
    creator: '0x456...def',
    description: 'Complete a 5km morning run and track progress',
    stake: '0.5',
    deadline: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (failed)
    proof: '',
    completed: false,
    claimed: false,
    status: 'failed',
    isClaimable: true,
    aiReviewed: false,
    approved: false
  },
  {
    id: 3,
    creator: '0x123...abc',
    description: 'Design and prototype a new portfolio website mockup',
    stake: '0.25',
    deadline: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
    proof: 'https://imgur.com/exampleproof',
    completed: true,
    claimed: false,
    status: 'completed',
    aiReviewed: true,
    approved: true
  },
  {
    id: 4,
    creator: '0x789...ghi',
    description: 'Learn and practice TypeScript advanced patterns for 2 hours',
    stake: '0.4',
    deadline: Math.floor(Date.now() / 1000) + 7200, // 2 hours from now
    proof: '',
    completed: false,
    claimed: false,
    status: 'active',
    aiReviewed: false,
    approved: false
  },
  {
    id: 5,
    creator: '0xabc...123',
    description: 'Complete weekly meal prep and document recipes',
    stake: '0.2',
    deadline: Math.floor(Date.now() / 1000) - 1800, // 30 minutes ago (failed)
    proof: '',
    completed: false,
    claimed: false,
    status: 'failed',
    isClaimable: true,
    aiReviewed: false,
    approved: false
  },
  {
    id: 6,
    creator: '0xdef...456',
    description: 'Finish reading "The Pragmatic Programmer" and write summary',
    stake: '0.6',
    deadline: Math.floor(Date.now() / 1000) - 43200, // 12 hours ago
    proof: 'https://notion.so/book-summary-example',
    completed: true,
    claimed: true,
    status: 'completed',
    aiReviewed: true,
    approved: true
  },
  {
    id: 101,
    creator: '0x823F76401544005FCeb7f7c441976bdE683F84f1',
    description: 'Run 5km without stopping',
    stake: '1.0',
    deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    proof: '',
    completed: false,
    claimed: false,
    status: 'active',
    aiReviewed: false,
    approved: false
  }
];

export const claimScores: ClaimScore[] = [
  { address: '0x123...abc', claimScore: 84.6 },
  { address: '0x456...def', claimScore: 62.3 },
  { address: '0x789...ghi', claimScore: 91.2 },
  { address: '0xabc...123', claimScore: 45.8 },
  { address: '0xdef...456', claimScore: 78.9 },
  { address: '0x823F76401544005FCeb7f7c441976bdE683F84f1', claimScore: 72.4 }
];

export const getCurrentUserTasks = (userAddress?: string) => {
  if (!userAddress) return [];
  return dummyTasks.filter(task => 
    task.creator.toLowerCase() === userAddress.toLowerCase()
  );
};

export const getPublicTasks = () => {
  return dummyTasks;
};

export const getClaimableTasks = () => {
  return dummyTasks.filter(task => task.isClaimable);
};

export const getClaimScore = (userAddress?: string): number => {
  if (!userAddress) return 0;
  const score = claimScores.find(score => 
    score.address.toLowerCase() === userAddress.toLowerCase()
  );
  return score?.claimScore || 0;
};

export const calculateClaimableAmount = (stake: string, claimScore: number): number => {
  const MAX_CLAIM_PERCENTAGE = 0.25;
  const claimablePercentage = (claimScore / 100) * MAX_CLAIM_PERCENTAGE;
  return parseFloat(stake) * claimablePercentage;
};

export const getClaimablePercentage = (claimScore: number): number => {
  const MAX_CLAIM_PERCENTAGE = 0.25;
  return (claimScore / 100) * MAX_CLAIM_PERCENTAGE * 100;
};