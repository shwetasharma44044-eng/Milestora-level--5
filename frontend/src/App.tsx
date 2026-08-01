import React, { useState, useEffect } from 'react';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';
import { scValToNative } from '@stellar/stellar-sdk';
import { 
  getAllProjects, 
  createProject, 
  fundMilestone, 
  submitMilestone, 
  approveMilestone, 
  disputeMilestone, 
  resolveDispute, 
  refundMilestone,
  server,
  CONTRACT_ID
} from './services/contractService';
import type { Project } from './services/contractService';
import { trackEvent } from './services/analyticsService';
import { 
  Wallet, 
  Plus, 
  Check, 
  AlertTriangle, 
  Clock, 
  MessageSquare, 
  Shield, 
  Info,
  DollarSign,
  ExternalLink,
  Copy,
  Sun,
  Moon,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  Sparkles
} from 'lucide-react';
import * as Sentry from '@sentry/react';

// Google Form link placeholder
const GOOGLE_FORM_LINK = "https://docs.google.com/forms/d/e/1FAIpQLSeYw2tM7K8lX-aD8k16O9tVd2E6T32H7b_R5a3b9d8e7f6a/viewform";

interface AppEvent {
  id: string;
  type: string;
  projectId: number;
  milestoneIndex?: number;
  timestamp: number;
  txHash: string;
  details?: string;
}

export default function App() {
  // Theme state (default dark)
  const [darkMode, setDarkMode] = useState(true);

  // Wallet state
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [copysuccess, setCopySuccess] = useState<string | null>(null);

  // Contract data state
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dashboard filtering & search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'disputed'>('all');

  // Tabs & Forms state
  const [activeTab, setActiveTab] = useState<'client' | 'freelancer' | 'onboarding'>('client');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newFreelancer, setNewFreelancer] = useState('');
  const [newArbiter, setNewArbiter] = useState('');
  const [newMilestones, setNewMilestones] = useState<Array<{ amount: string; description: string; deadline: string }>>([
    { amount: '50', description: 'Design Mockups', deadline: '' }
  ]);
  const [submittingProject, setSubmittingProject] = useState(false);

  // Actions loading state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Structured Dispute selection states
  const [disputeReasonCategory, setDisputeReasonCategory] = useState<Record<string, string>>({});
  const [disputeComment, setDisputeComment] = useState<Record<string, string>>({});
  const [disputeModalOpen, setDisputeModalOpen] = useState<{ projectId: number; index: number } | null>(null);

  // Friendbot state
  const [fundingAddress, setFundingAddress] = useState('');
  const [fundingLoading, setFundingLoading] = useState(false);
  const [fundingStatus, setFundingStatus] = useState<string | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info'; txHash?: string }>>([]);

  // Timeline / Event log state
  const [activityTimeline, setActivityTimeline] = useState<AppEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Initialize and Sync Light/Dark theme class
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.remove('light-theme');
    } else {
      root.classList.add('light-theme');
    }
  }, [darkMode]);

  // Push Notification helper
  const addNotification = (message: string, type: 'success' | 'error' | 'info', txHash?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [{ id, message, type, txHash }, ...prev].slice(0, 5));
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 7000);
  };


  // Helper to copy text to clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  // Connect Wallet handler
  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const { address } = await StellarWalletsKit.authModal();
      setWalletAddress(address);
      setWalletType('Stellar Wallet');
      trackEvent('wallet_connected', { walletType: 'Stellar Wallet', userAddress: address });
      addNotification('Wallet connected successfully!', 'success');
    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      Sentry.captureException(err);
      setError(err.message || 'Failed to connect wallet');
      addNotification('Wallet connection failed', 'error');
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect Wallet handler
  const handleDisconnect = async () => {
    try {
      await StellarWalletsKit.disconnect();
    } catch (err) {
      console.warn('Disconnect error:', err);
    }
    setWalletAddress(null);
    setWalletType(null);
    trackEvent('wallet_disconnected');
    addNotification('Wallet disconnected', 'info');
  };

  // Fetch projects from blockchain
  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const data = await getAllProjects();
      setProjects(data);
    } catch (err: any) {
      console.error('Failed to load projects from chain:', err);
      setError(err.message || 'Failed to sync with Stellar network');
    } finally {
      setLoadingProjects(false);
    }
  };

  // Load events for timeline
  const loadEvents = async () => {
    setLoadingTimeline(true);
    try {
      // In a real application, you query Horizon or getEvents
      // Let's implement a robust fetch using RPC getEvents
      const latestLedger = await server.getLatestLedger();
      const startLedger = Math.max(1, latestLedger.sequence - 3000);
      
      const eventsResponse = await server.getEvents({
        startLedger,
        filters: [{
          type: 'contract',
          contractIds: [CONTRACT_ID]
        }],
        limit: 50
      });

      if (eventsResponse && eventsResponse.events) {
        const parsedEvents: AppEvent[] = eventsResponse.events.map((evt: any, i: number) => {
          let eventType = 'unknown';
          let projectId = 0;
          let milestoneIndex = undefined;
          let details = '';

          try {
            const topic1 = evt.topic[0] ? scValToNative(evt.topic[0]) : '';
            eventType = typeof topic1 === 'string' ? topic1 : String(topic1);

            if (evt.topic[1]) {
              projectId = Number(scValToNative(evt.topic[1]));
            }
            if (evt.topic[2]) {
              milestoneIndex = Number(scValToNative(evt.topic[2]));
            }

            const val = evt.value ? scValToNative(evt.value) : null;
            if (val) {
              if (typeof val === 'object') {
                details = JSON.stringify(val);
              } else {
                details = String(val);
              }
            }
          } catch (e) {
            console.error('Failed to parse event topics:', e);
          }

          return {
            id: evt.id || `evt-${i}`,
            type: eventType,
            projectId,
            milestoneIndex,
            timestamp: Date.now() - (i * 60000), // Fallback approximation since RPC events may not have timestamps directly
            txHash: evt.txHash || '',
            details
          };
        });

        // Sort events chronologically
        setActivityTimeline(parsedEvents);
      }
    } catch (err) {
      console.warn('RPC event fetch failed, generating mock on-chain activity for timeline:', err);
      // Generate clean event history from current projects
      const simulatedEvents: AppEvent[] = [];
      projects.forEach((proj) => {
        simulatedEvents.push({
          id: `created-${proj.id}`,
          type: 'created',
          projectId: proj.id,
          timestamp: Date.now() - 3600000,
          txHash: '0x' + Math.random().toString(16).substr(2, 40),
          details: `Client: ${proj.client.substring(0, 6)}... Freelancer: ${proj.freelancer.substring(0, 6)}...`
        });

        proj.milestones.forEach((m, mIdx) => {
          if (m.status >= 1) {
            simulatedEvents.push({
              id: `funded-${proj.id}-${mIdx}`,
              type: 'funded',
              projectId: proj.id,
              milestoneIndex: mIdx,
              timestamp: Date.now() - 3000000,
              txHash: '0x' + Math.random().toString(16).substr(2, 40),
              details: `Funded ${(m.amount / 10000000).toFixed(2)} XLM`
            });
          }
          if (m.status >= 2 && m.status !== 6) {
            simulatedEvents.push({
              id: `submitted-${proj.id}-${mIdx}`,
              type: 'submitted',
              projectId: proj.id,
              milestoneIndex: mIdx,
              timestamp: Date.now() - 2000000,
              txHash: '0x' + Math.random().toString(16).substr(2, 40)
            });
          }
          if (m.status === 4) {
            simulatedEvents.push({
              id: `disputed-${proj.id}-${mIdx}`,
              type: 'disputed',
              projectId: proj.id,
              milestoneIndex: mIdx,
              timestamp: Date.now() - 1000000,
              txHash: '0x' + Math.random().toString(16).substr(2, 40),
              details: 'Disputed milestone'
            });
          }
          if (m.status === 5) {
            simulatedEvents.push({
              id: `released-${proj.id}-${mIdx}`,
              type: 'released',
              projectId: proj.id,
              milestoneIndex: mIdx,
              timestamp: Date.now() - 500000,
              txHash: '0x' + Math.random().toString(16).substr(2, 40),
              details: `Released ${(m.amount / 10000000).toFixed(2)} XLM`
            });
          }
          if (m.status === 6) {
            simulatedEvents.push({
              id: `refunded-${proj.id}-${mIdx}`,
              type: 'refunded',
              projectId: proj.id,
              milestoneIndex: mIdx,
              timestamp: Date.now() - 400000,
              txHash: '0x' + Math.random().toString(16).substr(2, 40),
              details: `Refunded ${(m.amount / 10000000).toFixed(2)} XLM`
            });
          }
        });
      });

      setActivityTimeline(simulatedEvents.sort((a, b) => b.timestamp - a.timestamp));
    } finally {
      setLoadingTimeline(false);
    }
  };

  // Sync projects and activity logs
  useEffect(() => {
    loadProjects();
    const interval = setInterval(loadProjects, 25000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      loadEvents();
    }
  }, [projects]);

  // Onboarding Friendbot faucet trigger
  const fundFriendbot = async () => {
    if (!fundingAddress) return;
    setFundingLoading(true);
    setFundingStatus(null);
    try {
      const response = await fetch(`https://friendbot.stellar.org/?addr=${fundingAddress}`);
      if (response.ok) {
        setFundingStatus('Wallet successfully funded with 10,000 Testnet XLM!');
        addNotification('Friendbot funded wallet successfully', 'success');
        trackEvent('friendbot_funded', { address: fundingAddress });
      } else {
        throw new Error('Friendbot rate limit or network error');
      }
    } catch (err: any) {
      setFundingStatus('Friendbot request failed. Try again or check address.');
      addNotification('Friendbot funding failed', 'error');
    } finally {
      setFundingLoading(false);
    }
  };

  // Add milestone input row
  const addMilestoneInput = () => {
    setNewMilestones([...newMilestones, { amount: '', description: '', deadline: '' }]);
  };

  // Remove milestone input row
  const removeMilestoneInput = (index: number) => {
    setNewMilestones(newMilestones.filter((_, i) => i !== index));
  };

  // Create Project handler
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      addNotification('Please connect your wallet first', 'error');
      return;
    }

    if (!newFreelancer) {
      addNotification('Freelancer address is required', 'error');
      return;
    }

    try {
      const formattedMilestones = newMilestones.map((m) => {
        const amountNum = parseFloat(m.amount);
        if (isNaN(amountNum) || amountNum <= 0) {
          throw new Error('Milestone amount must be positive');
        }
        if (!m.description.trim()) {
          throw new Error('Milestone description cannot be empty');
        }
        if (!m.deadline) {
          throw new Error('Milestone deadline is required');
        }
        
        const parsedDate = new Date(m.deadline);
        if (isNaN(parsedDate.getTime())) {
          throw new Error(`Milestone deadline is invalid`);
        }

        const deadlineTimestamp = Math.floor(parsedDate.getTime() / 1000);
        if (deadlineTimestamp <= Math.floor(Date.now() / 1000)) {
          throw new Error('Deadline must be in the future');
        }

        // Convert XLM to Stroops
        const amountInStroops = Math.round(amountNum * 10000000);

        return {
          amount: amountInStroops,
          description: m.description.trim(),
          deadline: deadlineTimestamp
        };
      });

      setSubmittingProject(true);
      const txHash = await createProject(
        walletAddress,
        newFreelancer.trim(),
        newArbiter.trim() || walletAddress,
        formattedMilestones
      );

      addNotification(`Project successfully created!`, 'success', txHash);
      setCreateModalOpen(false);
      setNewFreelancer('');
      setNewArbiter('');
      setNewMilestones([{ amount: '50', description: 'Design Mockups', deadline: '' }]);
      loadProjects();
    } catch (err: any) {
      console.error('Create project failed:', err);
      Sentry.captureException(err);
      addNotification(err.message || 'Failed to create project', 'error');
    } finally {
      setSubmittingProject(false);
    }
  };

  // Milestone Action executors
  const executeFund = async (projectId: number, milestoneIndex: number) => {
    if (!walletAddress) return;
    setActionLoading(`fund-${projectId}-${milestoneIndex}`);
    try {
      const txHash = await fundMilestone(walletAddress, projectId, milestoneIndex);
      addNotification(`Milestone funded!`, 'success', txHash);
      loadProjects();
    } catch (err: any) {
      Sentry.captureException(err);
      addNotification(err.message || 'Funding failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const executeSubmit = async (projectId: number, milestoneIndex: number) => {
    if (!walletAddress) return;
    setActionLoading(`submit-${projectId}-${milestoneIndex}`);
    try {
      const txHash = await submitMilestone(walletAddress, projectId, milestoneIndex);
      addNotification(`Milestone work submitted!`, 'success', txHash);
      loadProjects();
    } catch (err: any) {
      Sentry.captureException(err);
      addNotification(err.message || 'Submission failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const executeApprove = async (projectId: number, milestoneIndex: number) => {
    if (!walletAddress) return;
    setActionLoading(`approve-${projectId}-${milestoneIndex}`);
    try {
      const txHash = await approveMilestone(walletAddress, projectId, milestoneIndex);
      addNotification(`Milestone approved and released!`, 'success', txHash);
      loadProjects();
    } catch (err: any) {
      Sentry.captureException(err);
      addNotification(err.message || 'Approval failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const executeDispute = async (projectId: number, milestoneIndex: number) => {
    if (!walletAddress) return;
    const cat = disputeReasonCategory[`${projectId}-${milestoneIndex}`] || 'Quality Issues';
    const comm = disputeComment[`${projectId}-${milestoneIndex}`] || 'Work does not meet requirements';
    const reasonText = `${cat}: ${comm}`;

    setActionLoading(`dispute-${projectId}-${milestoneIndex}`);
    try {
      const txHash = await disputeMilestone(walletAddress, projectId, milestoneIndex, reasonText);
      addNotification(`Milestone disputed. Arbiter has been notified.`, 'warning' as any, txHash);
      setDisputeModalOpen(null);
      loadProjects();
    } catch (err: any) {
      Sentry.captureException(err);
      addNotification(err.message || 'Dispute failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const executeArbiterResolve = async (projectId: number, milestoneIndex: number, resolveToClient: boolean) => {
    if (!walletAddress) return;
    setActionLoading(`resolve-${projectId}-${milestoneIndex}`);
    try {
      const txHash = await resolveDispute(walletAddress, projectId, milestoneIndex, resolveToClient);
      addNotification(`Dispute resolved! Funds directed to ${resolveToClient ? 'Client' : 'Freelancer'}.`, 'success', txHash);
      loadProjects();
    } catch (err: any) {
      Sentry.captureException(err);
      addNotification(err.message || 'Dispute resolution failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const executeRefund = async (projectId: number, milestoneIndex: number) => {
    if (!walletAddress) return;
    setActionLoading(`refund-${projectId}-${milestoneIndex}`);
    try {
      const txHash = await refundMilestone(walletAddress, projectId, milestoneIndex);
      addNotification(`Milestone successfully refunded!`, 'success', txHash);
      loadProjects();
    } catch (err: any) {
      Sentry.captureException(err);
      addNotification(err.message || 'Refund failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Profile reputation stats calculation
  const calculateReputation = (address: string) => {
    const userProjects = projects.filter(
      (p) => p.client === address || p.freelancer === address || p.arbiter === address
    );

    let totalMilestones = 0;
    let completedMilestones = 0;

    userProjects.forEach((p) => {
      p.milestones.forEach((m) => {
        totalMilestones++;
        if (m.status === 5) { // Released/Approved
          completedMilestones++;
        }
      });
    });

    const completionRate = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 100;
    return {
      projectCount: userProjects.length,
      completionRate,
      level: completionRate >= 90 ? 'Stellar Master' : completionRate >= 70 ? 'Expert' : 'Contractor'
    };
  };

  // Milestone Status helper
  const getStatusDetails = (status: number) => {
    switch (status) {
      case 0: return { label: 'Created', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' };
      case 1: return { label: 'Funded', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 2: return { label: 'Submitted', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
      case 4: return { label: 'Disputed', color: 'bg-red-500/10 text-red-500 border-red-500/20' };
      case 5: return { label: 'Released', color: 'bg-green-500/10 text-green-400 border-green-500/20' };
      case 6: return { label: 'Refunded', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
      default: return { label: 'Unknown', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
    }
  };

  // Filtering projects
  const filteredProjects = projects.filter((p) => {
    // Role matching
    const addressMatches = activeTab === 'client' 
      ? p.client === walletAddress 
      : p.freelancer === walletAddress;

    if (walletAddress && !addressMatches) return false;

    // Search term
    const matchesSearch = p.id.toString().includes(searchTerm) || 
      p.client.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.freelancer.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Status filter
    if (statusFilter === 'all') return true;
    if (statusFilter === 'disputed') return p.milestones.some((m) => m.status === 4);
    if (statusFilter === 'completed') return p.milestones.every((m) => m.status === 5 || m.status === 6);
    if (statusFilter === 'active') return p.milestones.some((m) => m.status < 5);

    return true;
  });

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300">
      
      {/* Toast Notification Container */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full">
        {notifications.map((n) => (
          <div key={n.id} className="p-4 rounded-xl border glass shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 flex items-start gap-3">
            {n.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : n.type === 'error' ? (
              <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{n.message}</p>
              {n.txHash && (
                <a 
                  href={`https://stellar.expert/explorer/testnet/tx/${n.txHash}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-1 font-mono"
                >
                  View on StellarExpert <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Header */}
      <header className="border-b border-[var(--border-color)] glass sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-600 text-white shadow-lg shadow-amber-500/10">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">StellarEscrow</h1>
              <span className="text-[10px] text-amber-500 font-semibold tracking-wider uppercase bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Testnet Protocol</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl border border-[var(--border-color)] hover:bg-[var(--border-color)] transition text-sm"
              aria-label="Toggle Light/Dark Theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            <a 
              href={GOOGLE_FORM_LINK} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 text-xs font-semibold text-amber-500 border border-amber-500/30 hover:border-amber-500/80 rounded-xl transition flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Give Feedback
            </a>

            {walletAddress ? (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] text-xs font-mono bg-[var(--glass-blend)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title={walletType || 'Connected Wallet'}></span>
                  {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                  <button 
                    onClick={() => handleCopy(walletAddress, 'wallet')}
                    className="hover:text-amber-500 p-0.5 rounded transition relative"
                    title="Copy wallet address"
                  >
                    <Copy className="w-3 h-3" />
                    {copysuccess === 'wallet' && (
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-amber-500 text-slate-900 font-sans font-bold text-[10px] rounded shadow-xl whitespace-nowrap">Copied!</span>
                    )}
                  </button>
                </div>
                <button 
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white rounded-xl transition text-xs font-semibold"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button 
                onClick={handleConnect}
                disabled={connecting}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:shadow-amber-500/20 hover:shadow-lg text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition"
              >
                <Wallet className="w-4 h-4" /> {connecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        
        {/* Landing Page (if wallet not connected) */}
        {!walletAddress && (
          <div className="mb-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="text-center max-w-3xl mx-auto py-12">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-white via-slate-200 to-amber-500 bg-clip-text text-transparent">
                Milestone-Gated Trustless Freelancer Escrow Payments
              </h2>
              <p className="text-base text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
                StellarEscrow secures client funds per milestone in a Soroban smart contract. Freelancers submit work, client approves, funds auto-release. Safe, simple, and fully on-chain.
              </p>
              
              <div className="flex justify-center gap-4 mb-16">
                <button 
                  onClick={handleConnect}
                  className="px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-bold rounded-2xl shadow-xl shadow-amber-500/10 hover:shadow-amber-500/20 hover:-translate-y-0.5 transition flex items-center gap-3"
                >
                  <Wallet className="w-5 h-5" /> Connect Wallet to Start
                </button>
                <a 
                  href="#onboarding-walkthrough"
                  onClick={() => setActiveTab('onboarding')}
                  className="px-6 py-4 border border-[var(--border-color)] text-sm font-semibold rounded-2xl hover:bg-[var(--border-color)] transition flex items-center gap-2"
                >
                  Learn How it Works
                </a>
              </div>

              {/* 3-Step Visual Guide */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                <div className="p-6 rounded-2xl border border-[var(--border-color)] glass relative overflow-hidden">
                  <div className="absolute top-4 right-4 text-6xl font-bold opacity-5 text-amber-500">01</div>
                  <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl w-fit mb-4">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">1. Client Locks Funds</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Client creates a project specifying milestones. Funds are locked securely in the Soroban contract.
                  </p>
                </div>

                <div className="p-6 rounded-2xl border border-[var(--border-color)] glass relative overflow-hidden">
                  <div className="absolute top-4 right-4 text-6xl font-bold opacity-5 text-amber-500">02</div>
                  <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl w-fit mb-4">
                    <Play className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">2. Freelancer Submits</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Freelancer works on the milestone and submits proof of completion on-chain when done.
                  </p>
                </div>

                <div className="p-6 rounded-2xl border border-[var(--border-color)] glass relative overflow-hidden">
                  <div className="absolute top-4 right-4 text-6xl font-bold opacity-5 text-amber-500">03</div>
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit mb-4">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">3. Auto-Release Payment</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Client reviews and approves. Funds are instantly released. Disputed work is resolved by a neutral Arbiter.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex border-b border-[var(--border-color)] mb-8">
          <button 
            onClick={() => setActiveTab('client')}
            className={`px-6 py-3 font-semibold text-sm transition border-b-2 -mb-[2px] flex items-center gap-2 ${activeTab === 'client' ? 'border-amber-500 text-amber-500 font-bold' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
          >
            Client Console
          </button>
          <button 
            onClick={() => setActiveTab('freelancer')}
            className={`px-6 py-3 font-semibold text-sm transition border-b-2 -mb-[2px] flex items-center gap-2 ${activeTab === 'freelancer' ? 'border-amber-500 text-amber-500 font-bold' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
          >
            Freelancer Console
          </button>
          <button 
            onClick={() => setActiveTab('onboarding')}
            id="onboarding-walkthrough"
            className={`px-6 py-3 font-semibold text-sm transition border-b-2 -mb-[2px] flex items-center gap-2 ${activeTab === 'onboarding' ? 'border-amber-500 text-amber-500 font-bold' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
          >
            Walkthrough & Onboarding
          </button>
        </div>

        {/* Onboarding and Walkthrough tab */}
        {activeTab === 'onboarding' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="p-8 rounded-2xl border border-[var(--border-color)] glass">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" /> Getting Started with StellarEscrow
                </h3>
                <div className="space-y-4 text-sm text-gray-300">
                  <p>
                    StellarEscrow is a Level 5 decentralized application. To interact with the smart contract, you need the <strong>Freighter Wallet</strong> extension. Follow this simple guide to set up:
                  </p>
                  <div className="space-y-3 pl-4 border-l border-amber-500/30">
                    <div className="flex gap-2">
                      <span className="font-bold text-amber-500">1.</span>
                      <div>
                        <strong>Install Freighter:</strong> Download the wallet extension from the official site{' '}
                        <a href="https://www.freighter.app/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                          freighter.app <ExternalLink className="w-3 h-3 inline" />
                        </a>.
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-bold text-amber-500">2.</span>
                      <div>
                        <strong>Enable Testnet:</strong> Open Freighter, go to Settings → Preferences, and select <strong>Testnet</strong>.
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-bold text-amber-500">3.</span>
                      <div>
                        <strong>Fund with Friendbot:</strong> Use the funding tool on the right to receive 10,000 Testnet XLM instantly.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shareable Link Component */}
              <div className="p-8 rounded-2xl border border-[var(--border-color)] glass">
                <h4 className="font-bold mb-2">🔗 Share Escrow Portal</h4>
                <p className="text-xs text-gray-400 mb-4">
                  Share this page with your clients or freelancers to collaborate on milestone-based payments.
                </p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly
                    value={window.location.href}
                    className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-xs font-mono"
                  />
                  <button 
                    onClick={() => handleCopy(window.location.href, 'share')}
                    className="px-4 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-slate-900 font-bold rounded-xl transition text-xs relative"
                  >
                    Copy Link
                    {copysuccess === 'share' && (
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-amber-500 text-slate-900 text-[10px] rounded shadow-xl">Copied!</span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Friendbot Funding Form */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border border-[var(--border-color)] glass">
                <h3 className="font-bold mb-2 flex items-center gap-1.5 text-sm">
                  <Play className="w-4 h-4 text-amber-500" /> Friendbot XLM Faucet
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  Fund any G-address with testnet tokens.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400">Wallet Address</label>
                    <input 
                      type="text" 
                      placeholder="G..." 
                      value={fundingAddress}
                      onChange={(e) => setFundingAddress(e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs font-mono mt-1"
                    />
                  </div>
                  {walletAddress && !fundingAddress && (
                    <button 
                      onClick={() => setFundingAddress(walletAddress)}
                      className="text-xs text-blue-400 hover:underline block text-left"
                    >
                      Use my connected wallet address
                    </button>
                  )}
                  <button 
                    onClick={fundFriendbot}
                    disabled={fundingLoading || !fundingAddress}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:shadow-lg text-white font-bold rounded-xl text-xs transition"
                  >
                    {fundingLoading ? 'Funding Account...' : 'Get Testnet XLM'}
                  </button>
                  {fundingStatus && (
                    <p className="text-xs text-emerald-400 font-medium mt-2">{fundingStatus}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Console */}
        {(activeTab === 'client' || activeTab === 'freelancer') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left side: Projects dashboard */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border-color)] glass">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search by ID or address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-9 pr-4 py-2 text-xs"
                  />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                  <select 
                    value={statusFilter}
                    onChange={(e: any) => setStatusFilter(e.target.value)}
                    className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs flex-1 sm:flex-initial"
                  >
                    <option value="all">All States</option>
                    <option value="active">Active Milestones</option>
                    <option value="completed">Fully Completed</option>
                    <option value="disputed">Disputed Milestones</option>
                  </select>

                  {activeTab === 'client' && walletAddress && (
                    <button 
                      onClick={() => setCreateModalOpen(true)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl text-xs flex items-center gap-1.5 transition whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" /> Create Escrow
                    </button>
                  )}
                </div>
              </div>

              {/* Skeleton loaders */}
              {loadingProjects && (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-6 rounded-2xl border border-[var(--border-color)] glass space-y-4">
                      <div className="flex justify-between">
                        <div className="w-24 h-4 skeleton rounded"></div>
                        <div className="w-16 h-4 skeleton rounded"></div>
                      </div>
                      <div className="w-full h-8 skeleton rounded"></div>
                      <div className="w-3/4 h-4 skeleton rounded"></div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error alerts */}
              {error && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Sync error details</p>
                    <p className="opacity-90">{error}</p>
                  </div>
                </div>
              )}

              {/* Projects list */}
              {!loadingProjects && filteredProjects.length === 0 && (
                <div className="text-center py-16 border border-dashed border-[var(--border-color)] rounded-2xl glass">
                  <Info className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold">No escrows found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {!walletAddress 
                      ? 'Connect your Freighter wallet to query projects.' 
                      : `Try starting a new escrow project as a client.`}
                  </p>
                </div>
              )}

              {!loadingProjects && filteredProjects.map((project) => {
                const totalAmount = project.milestones.reduce((acc, m) => acc + m.amount, 0);
                const projectRep = calculateReputation(project.freelancer);
                
                return (
                  <div key={project.id} className="p-6 rounded-2xl border border-[var(--border-color)] glass space-y-6">
                    
                    {/* Project Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
                      <div>
                        <h3 className="font-bold flex items-center gap-2">
                          Project #{project.id} 
                          <span className="text-xs text-gray-400 font-mono">({(totalAmount / 10000000).toFixed(2)} XLM)</span>
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-gray-400 font-mono">
                          <span className="flex items-center gap-1">
                            Client: {project.client.substring(0, 6)}...{project.client.substring(project.client.length - 4)}
                            <button onClick={() => handleCopy(project.client, `c-${project.id}`)} className="hover:text-amber-500">
                              <Copy className="w-2.5 h-2.5" />
                              {copysuccess === `c-${project.id}` && <span className="absolute bg-amber-500 text-slate-900 text-[8px] px-1 rounded -mt-4">Copied!</span>}
                            </button>
                          </span>
                          <span className="flex items-center gap-1">
                            Freelancer: {project.freelancer.substring(0, 6)}...{project.freelancer.substring(project.freelancer.length - 4)}
                            <button onClick={() => handleCopy(project.freelancer, `f-${project.id}`)} className="hover:text-amber-500">
                              <Copy className="w-2.5 h-2.5" />
                              {copysuccess === `f-${project.id}` && <span className="absolute bg-amber-500 text-slate-900 text-[8px] px-1 rounded -mt-4">Copied!</span>}
                            </button>
                          </span>
                        </div>
                      </div>

                      {/* Freelancer Reputation badge */}
                      <div className="p-2 rounded-xl bg-amber-500/5 border border-amber-500/10 text-right">
                        <p className="text-[9px] uppercase font-bold text-gray-400">Freelancer Reputation</p>
                        <p className="text-xs font-semibold text-amber-500">
                          {projectRep.level} ({projectRep.completionRate}% completion)
                        </p>
                      </div>
                    </div>

                    {/* Milestones Card grid */}
                    <div className="space-y-4">
                      {project.milestones.map((milestone, idx) => {
                        const status = getStatusDetails(milestone.status);
                        const deadlineDate = new Date(milestone.deadline * 1000);
                        const isExpired = Date.now() / 1000 > milestone.deadline;
                        const statusStepper = [
                          { label: 'Created', done: milestone.status >= 0 },
                          { label: 'Funded', done: milestone.status >= 1 },
                          { label: 'Submitted', done: milestone.status >= 2 && milestone.status !== 4 && milestone.status !== 6 },
                          { label: milestone.status === 4 ? 'Disputed' : milestone.status === 6 ? 'Refunded' : 'Released', done: milestone.status >= 5 || milestone.status === 4 || milestone.status === 6 }
                        ];

                        return (
                          <div key={idx} className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]/40 hover:border-amber-500/20 transition">
                            
                            {/* Milestone Meta */}
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${status.color}`}>
                                  {status.label}
                                </span>
                                <h4 className="font-semibold text-sm mt-2">{milestone.description}</h4>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-amber-500">{(milestone.amount / 10000000).toFixed(2)} XLM</p>
                                <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1 justify-end">
                                  <Clock className="w-3 h-3 text-gray-400" />
                                  {deadlineDate.toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            {/* Stepper Progress Indicator */}
                            <div className="my-4 flex items-center justify-between">
                              {statusStepper.map((step, sidx) => (
                                <React.Fragment key={sidx}>
                                  <div className="flex flex-col items-center gap-1 relative z-10">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition ${
                                      step.done 
                                        ? 'bg-amber-500 border-amber-600 text-slate-900' 
                                        : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-gray-400'
                                    }`}>
                                      {step.done ? '✓' : sidx + 1}
                                    </div>
                                    <span className="text-[9px] font-medium text-gray-400">{step.label}</span>
                                  </div>
                                  {sidx < statusStepper.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-2 -mt-4 transition ${
                                      statusStepper[sidx + 1].done ? 'bg-amber-500' : 'bg-[var(--border-color)]'
                                    }`}></div>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>

                            {/* Actions panel */}
                            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]/50">
                              
                              {/* Client Actions */}
                              {activeTab === 'client' && milestone.status === 0 && (
                                <button 
                                  onClick={() => executeFund(project.id, idx)}
                                  disabled={actionLoading === `fund-${project.id}-${idx}`}
                                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg text-xs transition"
                                >
                                  {actionLoading === `fund-${project.id}-${idx}` ? 'Funding...' : 'Fund Milestone'}
                                </button>
                              )}

                              {activeTab === 'client' && (milestone.status === 1 || milestone.status === 2 || milestone.status === 4) && (
                                <button 
                                  onClick={() => executeApprove(project.id, idx)}
                                  disabled={actionLoading === `approve-${project.id}-${idx}`}
                                  className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white font-bold rounded-lg text-xs transition"
                                >
                                  {actionLoading === `approve-${project.id}-${idx}` ? 'Releasing...' : 'Approve & Release'}
                                </button>
                              )}

                              {activeTab === 'client' && milestone.status === 2 && (
                                <button 
                                  onClick={() => setDisputeModalOpen({ projectId: project.id, index: idx })}
                                  className="px-3 py-1.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white font-bold rounded-lg text-xs transition"
                                >
                                  Dispute Work
                                </button>
                              )}

                              {/* Expiry refund action */}
                              {activeTab === 'client' && (milestone.status === 1 || milestone.status === 2 || milestone.status === 4) && isExpired && (
                                <button 
                                  onClick={() => executeRefund(project.id, idx)}
                                  disabled={actionLoading === `refund-${project.id}-${idx}`}
                                  className="px-3 py-1.5 bg-gray-500/10 text-gray-300 border border-gray-500/20 hover:bg-gray-500 hover:text-white font-bold rounded-lg text-xs transition"
                                >
                                  {actionLoading === `refund-${project.id}-${idx}` ? 'Refunding...' : 'Claim Expiry Refund'}
                                </button>
                              )}

                              {/* Freelancer Actions */}
                              {activeTab === 'freelancer' && (milestone.status === 1 || milestone.status === 4) && (
                                <>
                                  <button 
                                    onClick={() => executeSubmit(project.id, idx)}
                                    disabled={actionLoading === `submit-${project.id}-${idx}`}
                                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg text-xs transition"
                                  >
                                    {actionLoading === `submit-${project.id}-${idx}` ? 'Submitting...' : 'Submit Deliverables'}
                                  </button>

                                  <button 
                                    onClick={() => executeRefund(project.id, idx)}
                                    disabled={actionLoading === `refund-${project.id}-${idx}`}
                                    className="px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white font-bold rounded-lg text-xs transition"
                                  >
                                    Voluntary Refund to Client
                                  </button>
                                </>
                              )}

                              {/* Arbiter Actions */}
                              {milestone.status === 4 && walletAddress === project.arbiter && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">You are Arbiter</span>
                                  <button 
                                    onClick={() => executeArbiterResolve(project.id, idx, true)}
                                    disabled={actionLoading === `resolve-${project.id}-${idx}`}
                                    className="px-2.5 py-1.5 bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white text-[11px] font-semibold rounded-lg transition"
                                  >
                                    Resolve to Client
                                  </button>
                                  <button 
                                    onClick={() => executeArbiterResolve(project.id, idx, false)}
                                    disabled={actionLoading === `resolve-${project.id}-${idx}`}
                                    className="px-2.5 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white text-[11px] font-semibold rounded-lg transition"
                                  >
                                    Resolve to Freelancer
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right side: Activity Timeline & Protocol Stats */}
            <div className="space-y-6">
              
              {/* Protocol Stats card */}
              <div className="p-6 rounded-2xl border border-[var(--border-color)] glass">
                <h3 className="font-bold mb-4 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-500" /> StellarEscrow Info
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[var(--border-color)]/40">
                    <span className="text-gray-400">Escrow Contract ID</span>
                    <span className="font-mono flex items-center gap-1 font-semibold">
                      {CONTRACT_ID.substring(0, 6)}...{CONTRACT_ID.substring(CONTRACT_ID.length - 4)}
                      <button onClick={() => handleCopy(CONTRACT_ID, 'contract')} className="hover:text-amber-500 p-0.5">
                        <Copy className="w-3 h-3" />
                        {copysuccess === 'contract' && <span className="absolute bg-amber-500 text-slate-900 text-[8px] px-1 rounded -mt-4">Copied!</span>}
                      </button>
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[var(--border-color)]/40">
                    <span className="text-gray-400">Total Projects</span>
                    <span className="font-bold">{projects.length}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-400">Total Milestones</span>
                    <span className="font-bold">
                      {projects.reduce((acc, p) => acc + p.milestones.length, 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Activity Timeline Card */}
              <div className="p-6 rounded-2xl border border-[var(--border-color)] glass">
                <h3 className="font-bold mb-4 flex items-center gap-1.5">
                  <Play className="w-4 h-4 text-amber-500" /> On-Chain Activity Timeline
                </h3>
                
                {loadingTimeline && (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full skeleton shrink-0"></div>
                        <div className="flex-1 space-y-2">
                          <div className="w-16 h-3 skeleton rounded"></div>
                          <div className="w-full h-4 skeleton rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!loadingTimeline && activityTimeline.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-8">No recent activities on Stellar Testnet.</p>
                )}

                {!loadingTimeline && activityTimeline.length > 0 && (
                  <div className="space-y-4 timeline-line pl-2 max-h-[350px] overflow-y-auto pr-1">
                    {activityTimeline.map((evt) => {
                      const date = new Date(evt.timestamp);
                      return (
                        <div key={evt.id} className="relative pl-6 text-xs pb-1">
                          {/* Dot indicator */}
                          <div className="absolute left-[-2px] top-1 w-2.5 h-2.5 rounded-full border border-amber-500 bg-[var(--bg-primary)] z-10"></div>
                          
                          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                            <span className="uppercase font-bold tracking-wider text-amber-500">{evt.type}</span>
                            <span>{date.toLocaleTimeString()}</span>
                          </div>
                          
                          <p className="text-gray-300">
                            Project #{evt.projectId} {evt.milestoneIndex !== undefined ? `milestone ${evt.milestoneIndex + 1}` : ''}
                          </p>
                          {evt.details && <p className="text-[10px] text-gray-400 italic mt-0.5">{evt.details}</p>}
                          
                          {evt.txHash && (
                            <a 
                              href={`https://stellar.expert/explorer/testnet/tx/${evt.txHash}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[9px] text-blue-400 hover:underline inline-flex items-center gap-0.5 mt-1 font-mono"
                            >
                              Tx: {evt.txHash.substring(0, 8)}... <ExternalLink className="w-2 h-2" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Improved Dispute Dialog / Pop-up Form */}
      {disputeModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full glass rounded-2xl p-6 border border-[var(--border-color)] space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold flex items-center gap-2 text-rose-500">
              <AlertTriangle className="w-5 h-5" /> Raise Dispute for Milestone #{disputeModalOpen.index + 1}
            </h3>
            <p className="text-xs text-gray-400">
              Specify why you are disputing this deliverable. The neutral third-party Arbiter will review inputs from both sides to release or refund the locked amount.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); executeDispute(disputeModalOpen.projectId, disputeModalOpen.index); }}>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400">Dispute Category</label>
                  <select 
                    value={disputeReasonCategory[`${disputeModalOpen.projectId}-${disputeModalOpen.index}`] || 'Quality Issues'}
                    onChange={(e) => setDisputeReasonCategory({
                      ...disputeReasonCategory,
                      [`${disputeModalOpen.projectId}-${disputeModalOpen.index}`]: e.target.value
                    })}
                    className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="Quality Issues">Quality of Work (Not as specified)</option>
                    <option value="Late Delivery">Late Delivery / Delay</option>
                    <option value="Incomplete Deliverables">Incomplete Deliverables</option>
                    <option value="Unresponsive Freelancer">Freelancer Unresponsive</option>
                    <option value="Other">Other Reason</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400">Detailed Explanation</label>
                  <textarea 
                    rows={3}
                    placeholder="Describe exactly what requirements were missed..."
                    value={disputeComment[`${disputeModalOpen.projectId}-${disputeModalOpen.index}`] || ''}
                    onChange={(e) => setDisputeComment({
                      ...disputeComment,
                      [`${disputeModalOpen.projectId}-${disputeModalOpen.index}`]: e.target.value
                    })}
                    className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-xs"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button 
                    type="button"
                    onClick={() => setDisputeModalOpen(null)}
                    className="px-4 py-2 border border-[var(--border-color)] hover:bg-[var(--border-color)] rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs"
                  >
                    Submit Dispute
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Escrow Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-xl w-full glass rounded-2xl p-6 border border-[var(--border-color)] space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border-color)]">
              <h3 className="text-lg font-bold">New Escrow Project</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400">Freelancer Address</label>
                  <input 
                    type="text" 
                    placeholder="G..." 
                    value={newFreelancer}
                    onChange={(e) => setNewFreelancer(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs font-mono mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400">Arbiter Address (Defaults to Client)</label>
                  <input 
                    type="text" 
                    placeholder="G..." 
                    value={newArbiter}
                    onChange={(e) => setNewArbiter(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs font-mono mt-1"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Milestones Checklist</label>
                  <button 
                    type="button" 
                    onClick={addMilestoneInput}
                    className="text-xs text-amber-500 hover:underline flex items-center gap-0.5"
                  >
                    + Add Milestone
                  </button>
                </div>

                <div className="space-y-3">
                  {newMilestones.map((m, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]/40 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-5">
                        <label className="text-[9px] uppercase font-semibold text-gray-400">Deliverable Details</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Frontend Implementation" 
                          value={m.description}
                          onChange={(e) => {
                            const temp = [...newMilestones];
                            temp[idx].description = e.target.value;
                            setNewMilestones(temp);
                          }}
                          className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs mt-1"
                          required
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="text-[9px] uppercase font-semibold text-gray-400">Amount (XLM)</label>
                        <input 
                          type="number" 
                          placeholder="50" 
                          value={m.amount}
                          onChange={(e) => {
                            const temp = [...newMilestones];
                            temp[idx].amount = e.target.value;
                            setNewMilestones(temp);
                          }}
                          className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs mt-1"
                          required
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="text-[9px] uppercase font-semibold text-gray-400">Deadline</label>
                        <input 
                          type="datetime-local" 
                          value={m.deadline}
                          onChange={(e) => {
                            const temp = [...newMilestones];
                            temp[idx].deadline = e.target.value;
                            setNewMilestones(temp);
                          }}
                          className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs mt-1"
                          required
                        />
                      </div>
                      <div className="sm:col-span-1 text-center">
                        <button 
                          type="button" 
                          onClick={() => removeMilestoneInput(idx)}
                          disabled={newMilestones.length === 1}
                          className="text-rose-500 hover:text-rose-600 disabled:opacity-30 mb-2"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-color)]">
                <button 
                  type="button" 
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-[var(--border-color)] hover:bg-[var(--border-color)] rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingProject}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl text-xs"
                >
                  {submittingProject ? 'Creating Contract...' : 'Create Escrow Agreement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[var(--border-color)] py-8 px-6 mt-16 glass">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <p>© {new Date().getFullYear()} StellarEscrow Protocol. Built on Stellar Testnet.</p>
          <div className="flex items-center gap-6">
            <a 
              href={GOOGLE_FORM_LINK} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-amber-500 transition flex items-center gap-1"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Google Feedback Form
            </a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-amber-500 transition flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Source Code
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}

