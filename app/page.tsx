'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Header } from '@/components/layout/Header';
import { TaskCard } from '@/components/tasks/TaskCard';
import { AddTaskModal } from '@/components/modals/AddTaskModal';
import { CompleteTaskModal } from '@/components/modals/CompleteTaskModal';
import { ClaimModal } from '@/components/modals/ClaimModal';
import { ViewProofModal } from '@/components/modals/ViewProofModal';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { useTaskFiContract } from '@/hooks/useTaskFiContract';
import { Plus, Trophy, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AMOY_CHAIN_ID } from '@/lib/contract'; // Changed from SEPOLIA_CHAIN_ID

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { userTasks, allTasks, isRefreshing, isCorrectNetwork, refreshTasks } = useTaskFiContract();
  const [mounted, setMounted] = useState(false);
  
  // Modal states
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [completeTaskOpen, setCompleteTaskOpen] = useState(false);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [viewProofOpen, setViewProofOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  
  // Modal data
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [claimType, setClaimType] = useState<'own' | 'failed'>('own');
  
  // Filters
  const [showOnlyClaimable, setShowOnlyClaimable] = useState(false);
  const [showActiveTasks, setShowActiveTasks] = useState(true);

  // Set mounted to true after component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Group user tasks by status
  const activeTasks = userTasks.filter(task => task.status === 'active');
  const completedTasks = userTasks.filter(task => task.status === 'completed');
  const failedTasks = userTasks.filter(task => task.status === 'failed');
  const inReviewTasks = userTasks.filter(task => task.status === 'in-review');
  
  // Filter tasks based on toggle
  const activeTasksToShow = [...activeTasks, ...inReviewTasks];
  const endedTasksToShow = [...completedTasks, ...failedTasks];
  const tasksToShow = showActiveTasks ? activeTasksToShow : endedTasksToShow;

  // Filter public tasks
  const publicTasks = showOnlyClaimable 
    ? allTasks.filter(task => task.status === 'failed')
    : allTasks;

  const handleCompleteTask = (task: any) => {
    setSelectedTask(task);
    setCompleteTaskOpen(true);
  };

  const handleClaim = (task: any, type: 'own' | 'failed') => {
    setSelectedTask(task);
    setClaimType(type);
    setClaimModalOpen(true);
  };

  const handleViewProof = (task: any) => {
    setSelectedTask(task);
    setViewProofOpen(true);
  };

  const handleSwitchToAmoy = async () => { // Renamed function
    try {
      await switchChain({ chainId: AMOY_CHAIN_ID }); // Changed to AMOY_CHAIN_ID
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  const handleRefresh = () => {
    refreshTasks();
  };

  const getTaskStats = () => {
    const total = userTasks.length;
    const active = activeTasks.length;
    const completed = completedTasks.length;
    const failed = failedTasks.length;
    // Only count stakes from active and in-review tasks as "currently staked"
    const currentlyStaked = [...activeTasks, ...inReviewTasks].reduce((sum, task) => sum + parseFloat(task.stake), 0);
    
    return { total, active, completed, failed, currentlyStaked };
  };

  const stats = getTaskStats();

  // Don't render wallet-dependent content until mounted
  if (!mounted) {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] to-[#1c1f2e]">
          <Header />
          <main className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-pulse">
                <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading TaskFi...</p>
              </div>
            </div>
          </main>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] to-[#1c1f2e]">
        <Header />
        
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Network Warning */}
          {mounted && isConnected && !isCorrectNetwork && (
            <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-400" />
                  <div>
                    <h3 className="font-semibold text-orange-400">Wrong Network</h3>
                    <p className="text-sm text-orange-400/80">
                      Please switch to Amoy testnet to use TaskFi. Current network: {chainId}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleSwitchToAmoy} // Updated function call
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Switch to Amoy
                </Button>
              </div>
            </div>
          )}

          {/* Connection Status */}
          {mounted && isConnected && isCorrectNetwork && (
            <div className="mb-6 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400">
                    Connected to Polygon Amoy testnet • Ready to create tasks
                  </span>
                </div>
                <div className="text-xs text-green-400/80">
                  {userTasks.length} user tasks • {allTasks.length} total tasks
                </div>
              </div>
            </div>
          )}

          {/* Stats Overview */}
          {mounted && isConnected && isCorrectNetwork && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Total Tasks</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-muted-foreground">Active</span>
                </div>
                <p className="text-2xl font-bold text-blue-400">{stats.active}</p>
              </div>
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium text-muted-foreground">Completed</span>
                </div>
                <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
              </div>
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <span className="text-sm font-medium text-muted-foreground">Failed</span>
                </div>
                <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
              </div>
              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Currently Staked</span>
                </div>
                <p className="text-2xl font-bold text-primary">{stats.currentlyStaked.toFixed(3)} POL</p>
              </div>
            </div>
          )}

          {/* Your Tasks Section */}
          {mounted && isConnected && isCorrectNetwork && (
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-foreground">Your Tasks</h2>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Switch
                        checked={showActiveTasks}
                        onCheckedChange={setShowActiveTasks}
                      />
                      {showActiveTasks ? 'Active Tasks' : 'Ended Tasks'}
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleRefresh}
                    variant="outline"
                    size="sm"
                    disabled={isRefreshing}
                    className="bg-secondary hover:bg-secondary/80 border-border"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    onClick={() => setAddTaskOpen(true)}
                    className="btn-primary"
                    disabled={!isCorrectNetwork}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </div>

              {userTasks.length === 0 ? (
                <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl p-8 text-center">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No tasks yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first task to start building productive habits with Web3 accountability.
                  </p>
                  <Button 
                    onClick={() => setAddTaskOpen(true)} 
                    className="btn-primary"
                    disabled={!isCorrectNetwork}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Task
                  </Button>
                </div>
              ) : tasksToShow.length === 0 ? (
                <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl p-8 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No {showActiveTasks ? 'active' : 'ended'} tasks
                  </h3>
                  <p className="text-muted-foreground">
                    {showActiveTasks 
                      ? 'All your tasks have been completed or failed. Create a new task to get started!'
                      : 'You don\'t have any completed or failed tasks yet.'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {showActiveTasks ? (
                    <>
                      {/* Active Tasks */}
                      {activeTasks.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Active Tasks ({activeTasks.length})
                          </h3>
                          <div className="grid gap-4">
                            {activeTasks.map(task => (
                              <TaskCard
                                key={task.id}
                                task={task}
                                isOwn={true}
                                onComplete={handleCompleteTask}
                                onClaim={handleClaim}
                                onViewProof={handleViewProof}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* In Review Tasks */}
                      {inReviewTasks.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Under Admin Review ({inReviewTasks.length})
                          </h3>
                          <div className="grid gap-4">
                            {inReviewTasks.map(task => (
                              <TaskCard
                                key={task.id}
                                task={task}
                                isOwn={true}
                                onComplete={handleCompleteTask}
                                onClaim={handleClaim}
                                onViewProof={handleViewProof}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Completed Tasks */}
                      {completedTasks.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" />
                            Completed Tasks ({completedTasks.length})
                          </h3>
                          <div className="grid gap-4">
                            {completedTasks.map(task => (
                              <TaskCard
                                key={task.id}
                                task={task}
                                isOwn={true}
                                onComplete={handleCompleteTask}
                                onClaim={handleClaim}
                                onViewProof={handleViewProof}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Failed Tasks */}
                      {failedTasks.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                            <XCircle className="h-5 w-5" />
                            Failed Tasks ({failedTasks.length})
                          </h3>
                          <div className="grid gap-4">
                            {failedTasks.map(task => (
                              <TaskCard
                                key={task.id}
                                task={task}
                                isOwn={true}
                                onComplete={handleCompleteTask}
                                onClaim={handleClaim}
                                onViewProof={handleViewProof}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>
          )}

          {/* All Tasks Section */}
          {mounted && isConnected && isCorrectNetwork && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">All Tasks</h2>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Switch
                      checked={showOnlyClaimable}
                      onCheckedChange={setShowOnlyClaimable}
                    />
                    Show Only Claimable
                  </label>
                </div>
              </div>

              <div className="grid gap-4">
                {publicTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isOwn={task.creator.toLowerCase() === address?.toLowerCase()}
                    onComplete={handleCompleteTask}
                    onClaim={handleClaim}
                    onViewProof={handleViewProof}
                  />
                ))}
              </div>

              {publicTasks.length === 0 && showOnlyClaimable && (
                <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl p-8 text-center">
                  <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No claimable tasks</h3>
                  <p className="text-muted-foreground">
                    There are currently no failed tasks available for claiming.
                  </p>
                </div>
              )}

              {allTasks.length === 0 && !showOnlyClaimable && (
                <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl p-8 text-center">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No tasks found</h3>
                  <p className="text-muted-foreground">
                    {isRefreshing ? 'Loading tasks...' : 'No tasks have been created yet. Be the first!'}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Connect Wallet CTA */}
          {mounted && !isConnected && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full text-center">
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Trophy className="h-8 w-8 text-primary" />
                    <h2 className="text-2xl font-bold text-foreground">Welcome to TaskFi</h2>
                  </div>
                  <p className="text-muted-foreground">
                    Connect your wallet to start staking POL on your productivity goals.
                  </p>
                </div>
                <w3m-button />
                <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/30">
                  <p className="text-xs text-primary">
                    <strong>Polygon Amoy Testnet</strong><br />
                    Make sure you're connected to the correct network to interact with tasks.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Admin Panel */}
        <AdminPanel 
          isVisible={adminPanelOpen} 
          onToggle={() => setAdminPanelOpen(!adminPanelOpen)} 
        />

        {/* Modals */}
        <AddTaskModal
          open={addTaskOpen}
          onOpenChange={setAddTaskOpen}
        />
        
        <CompleteTaskModal
          open={completeTaskOpen}
          onOpenChange={setCompleteTaskOpen}
          task={selectedTask}
        />
        
        <ClaimModal
          open={claimModalOpen}
          onOpenChange={setClaimModalOpen}
          task={selectedTask}
          claimType={claimType}
        />
        
        <ViewProofModal
          open={viewProofOpen}
          onOpenChange={setViewProofOpen}
          task={selectedTask}
        />
      </div>
    </TooltipProvider>
  );
}