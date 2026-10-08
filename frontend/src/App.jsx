import React, { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import {
  Vote,
  Coins,
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  PlusCircle,
  ArrowUpRight,
  Sparkles,
  Search,
  ExternalLink,
  Info,
  Wallet,
  AlertCircle,
  HelpCircle,
  Check,
  X,
  FastForward,
  Copy,
  ChevronDown
} from 'lucide-react';
import { CONTRACT_ADDRESSES, SUPPORTED_NETWORKS } from './contracts/config';
import contractArtifact from './contracts/ClubTreasuryDAO.json';
import { INITIAL_DEMO_STATE } from './utils/demoData';
import { fireSuccessConfetti } from './utils/confetti';

export default function App() {
  // Mode: 'web3' or 'demo'
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Web3 State
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState(null);
  const [accountBalance, setAccountBalance] = useState('0.00');
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [contractAddress, setContractAddress] = useState(CONTRACT_ADDRESSES.sepolia);

  // Club / Treasury State
  const [clubName, setClubName] = useState('Campus Web3 Innovation Club');
  const [clubDescription, setClubDescription] = useState(
    'Decentralized autonomous treasury for campus projects, hackathons, and research equipment.'
  );
  const [treasuryBalance, setTreasuryBalance] = useState('5.00');
  const [quorumPct, setQuorumPct] = useState(30);
  const [members, setMembers] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, passed, executed, rejected
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Form States
  const [proposalForm, setProposalForm] = useState({
    title: '',
    description: '',
    amount: '',
    durationSeconds: 120, // default 2 minutes for easy testing
  });
  const [depositAmount, setDepositAmount] = useState('0.5');
  const [newMemberAddress, setNewMemberAddress] = useState('');

  // Toast System
  const [toasts, setToasts] = useState([]);

  const addToast = (type, title, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  // Clock ticker for active countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize Demo Mode
  const loadDemoData = () => {
    setClubName(INITIAL_DEMO_STATE.clubName);
    setClubDescription(INITIAL_DEMO_STATE.clubDescription);
    setTreasuryBalance(INITIAL_DEMO_STATE.treasuryBalance);
    setQuorumPct(INITIAL_DEMO_STATE.quorumPercentage);
    setAccount(INITIAL_DEMO_STATE.currentUser.address);
    setAccountBalance(INITIAL_DEMO_STATE.currentUser.balance);
    setIsMember(true);
    setIsAdmin(true);
    setMembers(INITIAL_DEMO_STATE.members);
    setProposals(INITIAL_DEMO_STATE.proposals);
  };

  // Switch between Live Web3 & Demo Simulator
  useEffect(() => {
    if (isDemoMode) {
      loadDemoData();
      addToast('info', 'Demo Simulator Active', 'Interactive test mode enabled. Test all functions with simulated state.');
    } else {
      checkConnectedWallet();
    }
  }, [isDemoMode]);

  // Check connected wallet on load
  const checkConnectedWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        const network = await provider.getNetwork();
        setChainId(Number(network.chainId));

        if (accounts.length > 0) {
          const userAddr = accounts[0].address;
          setAccount(userAddr);
          const bal = await provider.getBalance(userAddr);
          setAccountBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
          await loadContractData(provider, userAddr, Number(network.chainId));
        } else {
          // If not connected, default to demo mode so user sees rich UI right away!
          setIsDemoMode(true);
        }
      } catch (err) {
        console.error('Wallet check failed:', err);
        setIsDemoMode(true);
      }
    } else {
      setIsDemoMode(true);
    }
  };

  // Listen for Ethereum events
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined' && !isDemoMode) {
      const handleAccountsChanged = (accs) => {
        if (accs.length > 0) {
          setAccount(accs[0]);
          checkConnectedWallet();
        } else {
          setAccount('');
          setIsMember(false);
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [isDemoMode]);

  // Connect Wallet
  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      addToast('error', 'MetaMask Not Detected', 'Please install MetaMask or switch to Demo Simulator Mode to test.');
      return;
    }
    try {
      setIsLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const userAddr = accounts[0];
      setAccount(userAddr);
      const network = await provider.getNetwork();
      setChainId(Number(network.chainId));

      const bal = await provider.getBalance(userAddr);
      setAccountBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));

      setIsDemoMode(false);
      await loadContractData(provider, userAddr, Number(network.chainId));
      addToast('success', 'Wallet Connected', `Connected: ${userAddr.slice(0, 6)}...${userAddr.slice(-4)}`);
    } catch (err) {
      console.error(err);
      addToast('error', 'Connection Failed', err.message || 'User rejected request');
    } finally {
      setIsLoading(false);
    }
  };

  // Load On-Chain Data
  const loadContractData = async (provider, userAddr, networkChainId) => {
    try {
      let targetAddress = contractAddress;
      if (networkChainId === 11155111) targetAddress = CONTRACT_ADDRESSES.sepolia;
      else if (networkChainId === 31337) targetAddress = CONTRACT_ADDRESSES.localhost;
      else if (networkChainId === 80002) targetAddress = CONTRACT_ADDRESSES.amoy;
      setContractAddress(targetAddress);

      const contract = new ethers.Contract(targetAddress, contractArtifact.abi, provider);

      // Verify contract deployment
      const code = await provider.getCode(targetAddress);
      if (code === '0x' || code === '') {
        console.warn('Contract not found at address on current network, loading demo view');
        loadDemoData();
        return;
      }

      const [name, desc, adminAddr, stats, memberList, rawProposals] = await Promise.all([
        contract.clubName().catch(() => 'Campus DAO Club'),
        contract.clubDescription().catch(() => 'Club Treasury'),
        contract.admin().catch(() => ethers.ZeroAddress),
        contract.getClubStats().catch(() => [0n, 0n, 0n, 30n, 0n]),
        contract.getMemberList().catch(() => []),
        contract.getAllProposals().catch(() => []),
      ]);

      setClubName(name);
      setClubDescription(desc);
      setTreasuryBalance(parseFloat(ethers.formatEther(stats[0])).toFixed(4));
      setQuorumPct(Number(stats[3]));
      setMembers(memberList);

      const isMem = await contract.isMember(userAddr).catch(() => false);
      setIsMember(isMem);
      setIsAdmin(adminAddr.toLowerCase() === userAddr.toLowerCase());

      // Format proposals
      const formatted = await Promise.all(
        rawProposals.map(async (p) => {
          let userVotedChoice = 0;
          if (userAddr) {
            const voterInfo = await contract.getVoterInfo(p.id, userAddr).catch(() => [false, 0]);
            userVotedChoice = Number(voterInfo[1]);
          }

          return {
            id: Number(p.id),
            title: p.title,
            description: p.description,
            amount: ethers.formatEther(p.amount),
            recipient: p.recipient,
            proposer: p.proposer,
            createdAt: Number(p.createdAt),
            votingDeadline: Number(p.votingDeadline),
            votesFor: Number(p.votesFor),
            votesAgainst: Number(p.votesAgainst),
            totalVotes: Number(p.totalVotes),
            executed: p.executed,
            userVoted: userVotedChoice,
          };
        })
      );

      setProposals(formatted);
    } catch (err) {
      console.error('Error fetching on-chain data:', err);
      loadDemoData();
    }
  };

  // Helper to compute proposal dynamic status
  const getProposalComputedStatus = (p) => {
    if (p.executed) return 'Executed';
    const isVotingActive = currentTime <= p.votingDeadline;
    if (isVotingActive) return 'Active';

    const totalVotes = p.votesFor + p.votesAgainst;
    const totalMem = Math.max(members.length, 1);
    const requiredVotes = Math.ceil((totalMem * quorumPct) / 100);
    const quorumMet = totalVotes >= requiredVotes;
    const passed = p.votesFor > p.votesAgainst;

    if (quorumMet && passed) {
      return 'Passed';
    }
    return 'Rejected';
  };

  // Action: Join Club
  const handleJoinClub = async () => {
    if (isDemoMode) {
      if (members.includes(account)) {
        addToast('info', 'Already a Member', 'You are already registered in the club.');
        return;
      }
      setMembers((prev) => [...prev, account]);
      setIsMember(true);
      addToast('success', 'Welcome to the Club!', 'You are now a registered DAO member with 1-member-1-vote rights.');
      return;
    }

    try {
      setIsLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);

      addToast('loading', 'Transaction Submitted', 'Joining club on-chain...');
      const tx = await contract.joinClub();
      await tx.wait();

      setIsMember(true);
      await loadContractData(provider, account, chainId);
      addToast('success', 'Joined Club', 'You are now an on-chain DAO member!');
    } catch (err) {
      console.error(err);
      addToast('error', 'Join Failed', err.reason || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Action: Deposit Funds
  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      addToast('error', 'Invalid Amount', 'Please enter a valid ETH amount');
      return;
    }

    if (isDemoMode) {
      const added = parseFloat(depositAmount);
      setTreasuryBalance((prev) => (parseFloat(prev) + added).toFixed(2));
      setAccountBalance((prev) => Math.max(0, parseFloat(prev) - added).toFixed(2));
      setShowDepositModal(false);
      addToast('success', 'Funds Deposited', `Successfully deposited ${depositAmount} ETH to treasury!`);
      fireSuccessConfetti();
      return;
    }

    try {
      setIsLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);

      const parsedWei = ethers.parseEther(depositAmount.toString());
      addToast('loading', 'Funding Treasury', 'Sending deposit transaction...');
      const tx = await contract.deposit({ value: parsedWei });
      await tx.wait();

      setShowDepositModal(false);
      await loadContractData(provider, account, chainId);
      addToast('success', 'Deposit Confirmed', `Sent ${depositAmount} ETH to Treasury!`);
      fireSuccessConfetti();
    } catch (err) {
      console.error(err);
      addToast('error', 'Deposit Failed', err.reason || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Action: Create Proposal
  const handleCreateProposal = async (e) => {
    e.preventDefault();
    if (!isMember) {
      addToast('error', 'Action Restricted', 'Only registered club members can submit proposals.');
      return;
    }
    if (!proposalForm.title.trim()) {
      addToast('error', 'Missing Title', 'Please specify a title for the proposal.');
      return;
    }
    if (!proposalForm.description.trim()) {
      addToast('error', 'Missing Purpose', 'Please describe the purpose and fund usage.');
      return;
    }
    const reqAmount = parseFloat(proposalForm.amount);
    if (!reqAmount || reqAmount <= 0) {
      addToast('error', 'Invalid Amount', 'Please enter a valid requested amount.');
      return;
    }
    if (reqAmount > parseFloat(treasuryBalance)) {
      addToast('error', 'Treasury Exceeded', 'Requested amount cannot exceed current treasury balance.');
      return;
    }

    if (isDemoMode) {
      const newId = proposals.length;
      const durationSecs = Number(proposalForm.durationSeconds);
      const newProp = {
        id: newId,
        title: proposalForm.title,
        description: proposalForm.description,
        amount: parseFloat(proposalForm.amount).toFixed(2),
        recipient: account,
        proposer: account,
        createdAt: Math.floor(Date.now() / 1000),
        votingDeadline: Math.floor(Date.now() / 1000) + durationSecs,
        votesFor: 0,
        votesAgainst: 0,
        totalVotes: 0,
        userVoted: 0,
        executed: false,
      };
      setProposals([newProp, ...proposals]);
      setShowCreateModal(false);
      setProposalForm({ title: '', description: '', amount: '', durationSeconds: 120 });
      addToast('success', 'Proposal Created', 'Proposal is now active for club member voting!');
      return;
    }

    try {
      setIsLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);

      const parsedWei = ethers.parseEther(proposalForm.amount.toString());
      addToast('loading', 'Creating Proposal', 'Broadcasting proposal to the blockchain...');

      const tx = await contract.createProposal(
        proposalForm.title,
        proposalForm.description,
        parsedWei,
        BigInt(proposalForm.durationSeconds)
      );
      await tx.wait();

      setShowCreateModal(false);
      setProposalForm({ title: '', description: '', amount: '', durationSeconds: 120 });
      await loadContractData(provider, account, chainId);
      addToast('success', 'Proposal Live', 'Proposal registered on-chain!');
    } catch (err) {
      console.error(err);
      addToast('error', 'Creation Failed', err.reason || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Action: Vote on Proposal
  const handleVote = async (proposalId, support) => {
    if (!isMember) {
      addToast('error', 'Non-Member', 'Only registered club members can cast a vote.');
      return;
    }

    const targetProp = proposals.find((p) => p.id === proposalId);
    if (!targetProp) return;

    if (targetProp.proposer.toLowerCase() === account.toLowerCase()) {
      addToast('error', 'Fairness Rule', 'Proposers may not vote on their own proposal.');
      return;
    }

    if (isDemoMode) {
      setProposals((prev) =>
        prev.map((p) => {
          if (p.id === proposalId) {
            return {
              ...p,
              votesFor: support ? p.votesFor + 1 : p.votesFor,
              votesAgainst: !support ? p.votesAgainst + 1 : p.votesAgainst,
              totalVotes: p.totalVotes + 1,
              userVoted: support ? 1 : 2,
            };
          }
          return p;
        })
      );
      addToast('success', 'Vote Recorded', `You voted ${support ? 'FOR' : 'AGAINST'} this proposal.`);
      return;
    }

    try {
      setIsLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);

      addToast('loading', 'Submitting Vote', `Voting ${support ? 'FOR' : 'AGAINST'}...`);
      const tx = await contract.vote(proposalId, support);
      await tx.wait();

      await loadContractData(provider, account, chainId);
      addToast('success', 'Vote Confirmed', `Your vote (${support ? 'FOR' : 'AGAINST'}) has been mined!`);
    } catch (err) {
      console.error(err);
      addToast('error', 'Voting Failed', err.reason || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Action: Execute Proposal
  const handleExecuteProposal = async (proposalId) => {
    const targetProp = proposals.find((p) => p.id === proposalId);
    if (!targetProp) return;

    if (isDemoMode) {
      const payout = parseFloat(targetProp.amount);
      if (payout > parseFloat(treasuryBalance)) {
        addToast('error', 'Insufficient Treasury Balance', 'Cannot execute: Treasury funds are below requested amount.');
        return;
      }

      setProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? { ...p, executed: true } : p))
      );
      setTreasuryBalance((prev) => Math.max(0, parseFloat(prev) - payout).toFixed(2));

      if (targetProp.recipient.toLowerCase() === account.toLowerCase()) {
        setAccountBalance((prev) => (parseFloat(prev) + payout).toFixed(2));
      }

      fireSuccessConfetti();
      addToast(
        'success',
        'Proposal Executed!',
        `Contract automatically transferred ${targetProp.amount} ETH to ${targetProp.recipient.slice(0, 6)}...`
      );
      return;
    }

    try {
      setIsLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);

      addToast('loading', 'Executing Payout', 'Smart contract verifying quorum & executing fund transfer...');
      const tx = await contract.executeProposal(proposalId);
      await tx.wait();

      fireSuccessConfetti();
      await loadContractData(provider, account, chainId);
      addToast(
        'success',
        'Funds Released!',
        `Proposal #${proposalId} finalized and ${targetProp.amount} ETH transferred!`
      );
    } catch (err) {
      console.error(err);
      addToast('error', 'Execution Failed', err.reason || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fast-Forward Voting Deadline (Demo Simulator Feature)
  const handleFastForward = (proposalId) => {
    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposalId
          ? { ...p, votingDeadline: Math.floor(Date.now() / 1000) - 10 }
          : p
      )
    );
    addToast('info', 'Time Travel Applied', 'Voting deadline passed! Proposal is now ready for execution review.');
  };

  // Add Member by Admin
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberAddress || !ethers.isAddress(newMemberAddress)) {
      addToast('error', 'Invalid Address', 'Please provide a valid Ethereum wallet address.');
      return;
    }

    if (isDemoMode) {
      if (members.includes(newMemberAddress)) {
        addToast('info', 'Already Member', 'Address is already in the club directory.');
        return;
      }
      setMembers((prev) => [...prev, newMemberAddress]);
      setNewMemberAddress('');
      addToast('success', 'Member Added', 'Successfully registered new member in the club.');
      return;
    }

    try {
      setIsLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);

      addToast('loading', 'Adding Member', 'Registering address on-chain...');
      const tx = await contract.addMember(newMemberAddress);
      await tx.wait();

      setNewMemberAddress('');
      await loadContractData(provider, account, chainId);
      addToast('success', 'Member Registered', 'New member added to the smart contract.');
    } catch (err) {
      console.error(err);
      addToast('error', 'Add Member Failed', err.reason || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Switch Network Helper
  const switchNetwork = async (targetChainId) => {
    if (typeof window.ethereum === 'undefined') return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x' + targetChainId.toString(16) }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        addToast('info', 'Network Not Added', 'Please add Sepolia network to MetaMask first.');
      }
    }
  };

  // Filtered Proposals
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const status = getProposalComputedStatus(p);
      if (statusFilter !== 'all' && status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesDesc = p.description.toLowerCase().includes(q);
        const matchesAddr = p.proposer.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesAddr) return false;
      }
      return true;
    });
  }, [proposals, statusFilter, searchQuery, currentTime]);

  // Format Duration Remaining
  const formatCountdown = (deadline) => {
    const diff = deadline - currentTime;
    if (diff <= 0) return 'Voting Ended';
    const d = Math.floor(diff / 86400);
    const h = Math.floor((diff % 86400) / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    if (d > 0) return `${d}d ${h}h remaining`;
    if (h > 0) return `${h}h ${m}m remaining`;
    return `${m}m ${s}s remaining`;
  };

  // Copy to Clipboard Helper
  const copyAddress = (addr) => {
    navigator.clipboard.writeText(addr);
    addToast('info', 'Address Copied', `${addr.slice(0, 8)}... copied to clipboard`);
  };

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <nav className="navbar">
        <div className="nav-inner">
          <div className="brand" onClick={() => setStatusFilter('all')}>
            <div className="brand-icon">
              <Vote size={22} />
            </div>
            <div className="brand-titles">
              <span className="brand-name">ClubDAO Treasury</span>
              <span className="brand-sub">Autonomous Governance</span>
            </div>
          </div>

          <div className="nav-actions">
            {/* Mode Switcher */}
            <div className="mode-toggle" title="Toggle between real MetaMask Web3 and interactive Simulator">
              <div
                className={`mode-toggle-option ${!isDemoMode ? 'active' : ''}`}
                onClick={() => {
                  setIsDemoMode(false);
                  connectWallet();
                }}
              >
                Web3 On-Chain
              </div>
              <div
                className={`mode-toggle-option ${isDemoMode ? 'active' : ''}`}
                onClick={() => setIsDemoMode(true)}
              >
                <Sparkles size={12} style={{ display: 'inline', marginRight: 4 }} />
                Simulator Demo
              </div>
            </div>

            {/* Network Pill */}
            {!isDemoMode && (
              <div className="network-pill">
                <span
                  className={`dot-indicator ${
                    chainId === 11155111 ? 'dot-blue' : chainId === 31337 ? 'dot-green' : 'dot-yellow'
                  }`}
                ></span>
                <span>
                  {SUPPORTED_NETWORKS[chainId]?.name ||
                    (chainId ? `Chain ID: ${chainId}` : 'Network Unknown')}
                </span>
                {chainId !== 11155111 && chainId !== 31337 && (
                  <button
                    className="btn btn-sm btn-outline"
                    style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem' }}
                    onClick={() => switchNetwork(11155111)}
                  >
                    Switch Sepolia
                  </button>
                )}
              </div>
            )}

            {/* Rules / Guide */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowGuideModal(true)}
              title="DAO Architecture and Rules"
            >
              <HelpCircle size={15} />
              <span>Rules</span>
            </button>

            {/* Wallet Button */}
            {account ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  className="address-pill"
                  style={{ cursor: 'pointer', padding: '0.45rem 0.85rem' }}
                  onClick={() => copyAddress(account)}
                  title="Click to copy address"
                >
                  <Wallet size={14} color="#a78bfa" />
                  <span>
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                  <span style={{ color: '#10b981', fontWeight: 600, marginLeft: 4 }}>
                    {accountBalance} ETH
                  </span>
                </div>
              </div>
            ) : (
              <button className="btn btn-primary" onClick={connectWallet}>
                <Wallet size={16} />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {/* Hero Banner */}
        <section className="hero-banner">
          <div className="hero-top">
            <div className="hero-header">
              <div className="hero-tag">
                <ShieldCheck size={14} />
                <span>Zero Middlemen • 100% Smart Contract Enforced</span>
              </div>
              <h1 className="hero-title">{clubName}</h1>
              <p className="hero-desc">{clubDescription}</p>
            </div>

            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={() => setShowCreateModal(true)}>
                <PlusCircle size={18} />
                <span>Create Proposal</span>
              </button>
              <button className="btn btn-secondary btn-lg" onClick={() => setShowDepositModal(true)}>
                <Coins size={18} />
                <span>Deposit Funds</span>
              </button>
            </div>
          </div>

          {/* Membership Notification Bar */}
          <div className="member-banner">
            <div className="member-banner-left">
              <div className="member-avatar">
                {account ? account.slice(2, 4).toUpperCase() : '??'}
              </div>
              <div className="member-info">
                <h4>
                  {isMember ? 'Registered Club Voting Member' : 'Guest / Non-Member Status'}
                  {isAdmin && ' (Deployer Admin)'}
                </h4>
                <p>
                  {isMember
                    ? 'You hold 1-member-1-vote democratic power to propose and vote.'
                    : 'Join the club to participate in proposal voting and fund allocations.'}
                </p>
              </div>
            </div>

            {!isMember ? (
              <button className="btn btn-success" onClick={handleJoinClub}>
                <CheckCircle2 size={16} />
                <span>Join Club Now</span>
              </button>
            ) : (
              <button className="btn btn-outline btn-sm" onClick={() => setShowMembersModal(true)}>
                <Users size={14} />
                <span>View All Members ({members.length})</span>
              </button>
            )}
          </div>
        </section>

        {/* Treasury Stats Grid */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <span>Treasury Balance</span>
              <div className="stat-icon purple">
                <Coins size={18} />
              </div>
            </div>
            <div className="stat-value">{treasuryBalance} ETH</div>
            <div className="stat-footer">
              <span>≈ ${(parseFloat(treasuryBalance) * 2650).toLocaleString()} USD</span>
              <span style={{ color: '#10b981', marginLeft: 'auto' }}>Audited On-Chain</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span>Club Members</span>
              <div className="stat-icon cyan">
                <Users size={18} />
              </div>
            </div>
            <div className="stat-value">{members.length}</div>
            <div className="stat-footer">
              <span>1 Member = 1 Vote Democracy</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span>Proposals Tracked</span>
              <div className="stat-icon green">
                <Vote size={18} />
              </div>
            </div>
            <div className="stat-value">{proposals.length}</div>
            <div className="stat-footer">
              <span>
                {proposals.filter((p) => getProposalComputedStatus(p) === 'Active').length} Active
                Voting Now
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span>Quorum Requirement</span>
              <div className="stat-icon amber">
                <ShieldCheck size={18} />
              </div>
            </div>
            <div className="stat-value">{quorumPct}%</div>
            <div className="stat-footer">
              <span>Min. {Math.ceil((members.length * quorumPct) / 100)} votes to pass</span>
            </div>
          </div>
        </section>

        {/* Proposal Controls & Filter Tabs */}
        <div className="section-header">
          <div className="section-title">
            <h2>Club Spending Proposals</h2>
            <span className="count-pill">{filteredProposals.length}</span>
          </div>

          <div className="controls-bar">
            <div className="tab-list">
              {[
                { key: 'all', label: 'All Proposals' },
                { key: 'active', label: 'Active' },
                { key: 'passed', label: 'Passed (Ready to Execute)' },
                { key: 'executed', label: 'Executed' },
                { key: 'rejected', label: 'Rejected' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={`tab-btn ${statusFilter === tab.key ? 'active' : ''}`}
                  onClick={() => setStatusFilter(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="search-input-wrapper">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search proposals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Proposals Grid */}
        {filteredProposals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Vote size={28} />
            </div>
            <h3 className="empty-title">No proposals found</h3>
            <p className="empty-desc">
              {searchQuery
                ? 'Try adjusting your search criteria.'
                : 'No proposals currently match this status filter. Submit a proposal to kickstart voting!'}
            </p>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <PlusCircle size={16} />
              <span>Create First Proposal</span>
            </button>
          </div>
        ) : (
          <div className="proposals-grid">
            {filteredProposals.map((p) => {
              const status = getProposalComputedStatus(p);
              const isProposer = p.proposer.toLowerCase() === account.toLowerCase();
              const requiredVotes = Math.ceil((Math.max(members.length, 1) * quorumPct) / 100);
              const totalVotes = p.votesFor + p.votesAgainst;
              const quorumMet = totalVotes >= requiredVotes;

              const pctFor = totalVotes > 0 ? (p.votesFor / totalVotes) * 100 : 0;
              const pctAgainst = totalVotes > 0 ? (p.votesAgainst / totalVotes) * 100 : 0;

              return (
                <div key={p.id} className="proposal-card">
                  <div className="proposal-top">
                    <span className="proposal-id">PROPOSAL #{p.id.toString().padStart(3, '0')}</span>
                    <span className={`status-badge ${status.toLowerCase()}`}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'currentColor',
                        }}
                      ></span>
                      {status}
                    </span>
                  </div>

                  <h3 className="proposal-title">{p.title}</h3>
                  <p className="proposal-desc">{p.description}</p>

                  <div className="proposal-meta-row">
                    <div className="meta-item">
                      <span className="meta-label">Requested</span>
                      <div className="meta-val-eth">
                        {p.amount} <span>ETH</span>
                      </div>
                    </div>

                    <div className="meta-item" style={{ textAlign: 'right' }}>
                      <span className="meta-label">Deadline</span>
                      <div className="meta-val-time">
                        <Clock size={13} style={{ display: 'inline', marginRight: 4 }} />
                        {formatCountdown(p.votingDeadline)}
                      </div>
                    </div>
                  </div>

                  <div className="proposer-row">
                    <span>Proposed by:</span>
                    <div
                      className="address-pill"
                      style={{ cursor: 'pointer' }}
                      onClick={() => copyAddress(p.proposer)}
                      title="Copy proposer address"
                    >
                      {p.proposer.slice(0, 6)}...{p.proposer.slice(-4)}
                      {isProposer && ' (You)'}
                      <Copy size={11} style={{ marginLeft: 2 }} />
                    </div>
                  </div>

                  {/* Voting Progress Bar & Quorum Met */}
                  <div className="vote-progress-box">
                    <div className="vote-counts-header">
                      <span className="vote-for-count">
                        ✓ {p.votesFor} For ({pctFor.toFixed(0)}%)
                      </span>
                      <span className="vote-against-count">
                        ✗ {p.votesAgainst} Against ({pctAgainst.toFixed(0)}%)
                      </span>
                    </div>

                    <div className="split-progress-bar">
                      <div className="bar-for" style={{ width: `${pctFor}%` }}></div>
                      <div className="bar-against" style={{ width: `${pctAgainst}%` }}></div>
                    </div>

                    <div className="quorum-status-indicator">
                      <span>
                        Turnout: {totalVotes} / {requiredVotes} votes
                      </span>
                      {quorumMet ? (
                        <span className="quorum-met-tag">
                          <CheckCircle2 size={12} /> Quorum Met ({quorumPct}%)
                        </span>
                      ) : (
                        <span className="quorum-pending-tag">
                          Quorum Needed ({totalVotes}/{requiredVotes})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="card-actions">
                    {/* Voting Controls (When Active) */}
                    {status === 'Active' && (
                      <>
                        {p.userVoted > 0 ? (
                          <div className={`voted-receipt ${p.userVoted === 1 ? 'for' : 'against'}`}>
                            {p.userVoted === 1 ? (
                              <>
                                <Check size={14} /> You voted FOR this proposal
                              </>
                            ) : (
                              <>
                                <X size={14} /> You voted AGAINST this proposal
                              </>
                            )}
                          </div>
                        ) : isProposer ? (
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-dim)',
                              textAlign: 'center',
                              padding: '0.4rem',
                            }}
                          >
                            Proposers cannot vote on their own proposal (Fairness rule)
                          </div>
                        ) : (
                          <div className="vote-buttons-row">
                            <button
                              className="btn btn-success btn-sm"
                              disabled={!isMember || isLoading}
                              onClick={() => handleVote(p.id, true)}
                            >
                              <Check size={14} />
                              <span>Vote FOR</span>
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              disabled={!isMember || isLoading}
                              onClick={() => handleVote(p.id, false)}
                            >
                              <X size={14} />
                              <span>Vote AGAINST</span>
                            </button>
                          </div>
                        )}

                        {/* Demo Fast Forward Button */}
                        {isDemoMode && (
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.725rem' }}
                            onClick={() => handleFastForward(p.id)}
                            title="Simulate voting deadline passing immediately"
                          >
                            <FastForward size={12} />
                            <span>Fast-Forward Voting Deadline (Demo)</span>
                          </button>
                        )}
                      </>
                    )}

                    {/* Execution Button */}
                    {status === 'Passed' && (
                      <button
                        className="btn btn-primary"
                        disabled={isLoading}
                        onClick={() => handleExecuteProposal(p.id)}
                      >
                        <Sparkles size={16} />
                        <span>Execute & Release {p.amount} ETH</span>
                      </button>
                    )}

                    {status === 'Executed' && (
                      <button className="btn btn-outline" disabled>
                        <CheckCircle2 size={16} color="#10b981" />
                        <span>Executed & Funds Transferred</span>
                      </button>
                    )}

                    {status === 'Rejected' && (
                      <button className="btn btn-outline" disabled>
                        <XCircle size={16} color="#f43f5e" />
                        <span>Rejected (Quorum or Majority Failed)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Architecture & Verification Panel */}
        <div className="info-box">
          <div className="info-title">
            <ShieldCheck size={18} color="#8b5cf6" />
            <span>DAO Treasury Architecture & Security Guarantees</span>
          </div>
          <div className="info-grid">
            <div className="info-item">
              <h5>1 Member = 1 Vote Democracy</h5>
              <p>
                Every registered club member receives exactly one vote. Double voting is strictly
                prevented on-chain via immutable hash mappings.
              </p>
            </div>
            <div className="info-item">
              <h5>30% Quorum & Simple Majority</h5>
              <p>
                A proposal requires at least 30% member participation and strictly more FOR than
                AGAINST votes. Unpopular or unreviewed proposals cannot execute.
              </p>
            </div>
            <div className="info-item">
              <h5>Direct Smart-Contract Transfers</h5>
              <p>
                No admin, president, or treasurer can touch or divert treasury funds. Execution
                automatically sends the exact requested amount directly to the proposer.
              </p>
            </div>
            <div className="info-item">
              <h5>Reentrancy & Balance Checks</h5>
              <p>
                Proposals cannot exceed treasury balance, cannot be executed twice, and are protected
                by ReentrancyGuard and Checks-Effects-Interactions.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div>
            <strong>ClubDAO Treasury</strong> • Transparent Fund Allocation for Clubs & Student
            Communities
          </div>
          <div className="footer-links">
            <a href="#" onClick={(e) => { e.preventDefault(); setShowGuideModal(true); }}>
              Governance Guide
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); setShowMembersModal(true); }}>
              Member Registry
            </a>
            <a
              href="https://sepolia.etherscan.io"
              target="_blank"
              rel="noreferrer"
            >
              Sepolia Explorer <ExternalLink size={12} style={{ display: 'inline' }} />
            </a>
          </div>
        </div>
      </footer>

      {/* CREATE PROPOSAL MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Spending Proposal</h3>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateProposal}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Proposal Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Hackathon Catering & Swag"
                    value={proposalForm.title}
                    onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Detailed Purpose / Justification</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Describe how the requested funds will be utilized for the club..."
                    value={proposalForm.description}
                    onChange={(e) =>
                      setProposalForm({ ...proposalForm, description: e.target.value })
                    }
                    required
                  ></textarea>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Requested Amount (ETH)</span>
                    <span className="form-hint">Max Available: {treasuryBalance} ETH</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={treasuryBalance}
                    className="form-input"
                    placeholder="e.g. 0.75"
                    value={proposalForm.amount}
                    onChange={(e) => setProposalForm({ ...proposalForm, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Voting Duration</label>
                  <select
                    className="form-select"
                    value={proposalForm.durationSeconds}
                    onChange={(e) =>
                      setProposalForm({
                        ...proposalForm,
                        durationSeconds: Number(e.target.value),
                      })
                    }
                  >
                    <option value={120}>2 Minutes (Quick Demo / Testing)</option>
                    <option value={3600}>1 Hour</option>
                    <option value={86400}>1 Day (24 Hours)</option>
                    <option value={259200}>3 Days</option>
                    <option value={604800}>7 Days</option>
                  </select>
                </div>

                <div
                  style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    color: '#c4b5fd',
                  }}
                >
                  <Info size={14} style={{ display: 'inline', marginRight: 4 }} />
                  Once passed, funds will be released automatically to your connected address.
                </div>

                <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>
                  <PlusCircle size={18} />
                  <span>Submit Proposal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEPOSIT FUNDS MODAL */}
      {showDepositModal && (
        <div className="modal-overlay" onClick={() => setShowDepositModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Deposit Funds into Treasury</h3>
              <button className="modal-close-btn" onClick={() => setShowDepositModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleDeposit}>
              <div className="modal-body">
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Anyone can fund the club treasury with test ETH. All deposits are held transparently
                  by the smart contract and can only be withdrawn via approved member proposals.
                </p>

                <div className="form-group">
                  <label className="form-label">Deposit Amount (ETH)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-input"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    required
                  />
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['0.1', '0.5', '1.0', '2.5'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => setDepositAmount(amt)}
                    >
                      +{amt} ETH
                    </button>
                  ))}
                </div>

                <button type="submit" className="btn btn-success btn-lg" disabled={isLoading}>
                  <Coins size={18} />
                  <span>Send Deposit Transaction</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEMBERS DIRECTORY MODAL */}
      {showMembersModal && (
        <div className="modal-overlay" onClick={() => setShowMembersModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Club Members Directory ({members.length})</h3>
              <button className="modal-close-btn" onClick={() => setShowMembersModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Registered members have equal voting weight in the club treasury.
              </p>

              <div
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                {members.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.85rem',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.825rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                        #{idx + 1}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>
                        {m.slice(0, 10)}...{m.slice(-8)}
                      </span>
                      {account && m.toLowerCase() === account.toLowerCase() && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            background: 'var(--accent-glow)',
                            color: 'var(--accent-primary)',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                          }}
                        >
                          You
                        </span>
                      )}
                    </div>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ padding: '0.2rem 0.5rem' }}
                      onClick={() => copyAddress(m)}
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Admin Onboard Tool */}
              <div
                style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <h4 style={{ fontSize: '0.9rem', color: '#fff' }}>Add New Member Address</h4>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="0x..."
                    value={newMemberAddress}
                    onChange={(e) => setNewMemberAddress(e.target.value)}
                  />
                  <button className="btn btn-primary" onClick={handleAddMember} disabled={isLoading}>
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DAO GUIDE / RULES MODAL */}
      {showGuideModal && (
        <div className="modal-overlay" onClick={() => setShowGuideModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">DAO Treasury Governance Rules</h3>
              <button className="modal-close-btn" onClick={() => setShowGuideModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ gap: '1rem' }}>
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <h4 style={{ color: '#38bdf8', marginBottom: '0.3rem', fontSize: '0.95rem' }}>
                  1. Transparent Membership
                </h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  Anyone in the community can register as a member with the "Join Club" function. Each
                  registered wallet holds exactly 1 vote.
                </p>
              </div>

              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <h4 style={{ color: '#a855f7', marginBottom: '0.3rem', fontSize: '0.95rem' }}>
                  2. 30% Quorum & Simple Majority
                </h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  To pass, a proposal must receive participation from at least 30% of all registered
                  club members. Among votes cast, FOR votes must strictly exceed AGAINST votes.
                </p>
              </div>

              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <h4 style={{ color: '#10b981', marginBottom: '0.3rem', fontSize: '0.95rem' }}>
                  3. Automated Payouts Without Middlemen
                </h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  Once the voting deadline ends and criteria are satisfied, clicking "Execute"
                  triggers an atomic on-chain transfer of the exact requested ETH to the proposer. No
                  president or treasurer can block or divert the payout.
                </p>
              </div>

              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <h4 style={{ color: '#f43f5e', marginBottom: '0.3rem', fontSize: '0.95rem' }}>
                  4. Security Checks
                </h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  Proposers cannot vote on their own proposals (fairness safeguard). Proposals cannot
                  be executed twice. If a proposal fails or expires without meeting quorum, zero funds
                  can be moved.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST ALERTS */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' && <CheckCircle2 size={18} color="#10b981" />}
            {t.type === 'error' && <AlertCircle size={18} color="#f43f5e" />}
            {t.type === 'loading' && <Clock size={18} color="#8b5cf6" />}
            {t.type === 'info' && <Info size={18} color="#38bdf8" />}
            <div className="toast-content">
              <div className="toast-title">{t.title}</div>
              <div className="toast-message">{t.message}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
