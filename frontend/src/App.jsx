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
  UserPlus,
  Trash2,
  Rocket,
  Crown
} from 'lucide-react';
import { CONTRACT_ADDRESSES, SUPPORTED_NETWORKS } from './contracts/config';
import contractArtifact from './contracts/ClubTreasuryDAO.json';
import { INITIAL_DEMO_STATE } from './utils/demoData';
import { fireSuccessConfetti } from './utils/confetti';

export default function App() {
  // Mode: 'web3' or 'demo'
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Web3 & Wallet State (Real connected wallet)
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState(null);
  const [accountBalance, setAccountBalance] = useState('0.00');
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminAddress, setAdminAddress] = useState('');
  const [contractAddress, setContractAddress] = useState(CONTRACT_ADDRESSES.sepolia);
  const [isContractDeployed, setIsContractDeployed] = useState(false);

  // Club / Treasury State
  const [clubName, setClubName] = useState('Campus Web3 Innovation Club');
  const [clubDescription, setClubDescription] = useState(
    'Decentralized autonomous treasury for campus projects, hackathons, and research equipment.'
  );
  const [treasuryBalance, setTreasuryBalance] = useState('0.00');
  const [quorumPct, setQuorumPct] = useState(30);
  const [members, setMembers] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);

  // Forms
  const [proposalForm, setProposalForm] = useState({
    title: '',
    description: '',
    amount: '',
    durationSeconds: 120, // 2 mins for quick testing
  });
  const [depositAmount, setDepositAmount] = useState('0.1');
  const [newMemberAddress, setNewMemberAddress] = useState('');
  const [deployForm, setDeployForm] = useState({
    clubName: 'Campus Web3 Innovation Club',
    clubDescription: 'Autonomous student DAO treasury for hackathons and projects.',
    quorumPct: 30,
    initialFunding: '0.01',
  });

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = (type, title, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  // Live timer for proposal deadlines
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check connected wallet on mount
  useEffect(() => {
    checkConnectedWallet();
  }, []);

  // Check connected wallet
  const checkConnectedWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        const network = await provider.getNetwork();
        const cId = Number(network.chainId);
        setChainId(cId);

        if (accounts.length > 0) {
          const userAddr = accounts[0].address;
          setAccount(userAddr);
          const bal = await provider.getBalance(userAddr);
          setAccountBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
          setIsDemoMode(false);
          await loadAppState(provider, userAddr, cId);
        } else {
          // No wallet connected yet
          setAccount('');
        }
      } catch (err) {
        console.error('Wallet check failed:', err);
      }
    }
  };

  // Listen for MetaMask account and chain changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = async (accs) => {
        if (accs.length > 0) {
          const newAddr = accs[0];
          setAccount(newAddr);
          const provider = new ethers.BrowserProvider(window.ethereum);
          const bal = await provider.getBalance(newAddr);
          setAccountBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
          if (chainId) {
            await loadAppState(provider, newAddr, chainId);
          }
          addToast('info', 'Account Switched', `Active: ${newAddr.slice(0, 6)}...${newAddr.slice(-4)}`);
        } else {
          setAccount('');
          setIsAdmin(false);
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
  }, [chainId, adminAddress]);

  // Connect Wallet
  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      addToast('error', 'MetaMask Required', 'Please install MetaMask extension to connect your wallet.');
      return;
    }
    try {
      setIsLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const userAddr = accounts[0];
      setAccount(userAddr);

      const network = await provider.getNetwork();
      const cId = Number(network.chainId);
      setChainId(cId);

      const bal = await provider.getBalance(userAddr);
      setAccountBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));

      setIsDemoMode(false);
      await loadAppState(provider, userAddr, cId);
      addToast('success', 'Wallet Connected', `Connected: ${userAddr.slice(0, 6)}...${userAddr.slice(-4)}`);
    } catch (err) {
      console.error(err);
      addToast('error', 'Connection Failed', err.message || 'User rejected request');
    } finally {
      setIsLoading(false);
    }
  };

  // Load App State for connected wallet
  const loadAppState = async (provider, userAddr, networkChainId) => {
    try {
      // Determine contract address for network
      let targetAddress = localStorage.getItem(`dao_contract_${networkChainId}`) || CONTRACT_ADDRESSES.sepolia;
      if (networkChainId === 31337) targetAddress = CONTRACT_ADDRESSES.localhost;
      else if (networkChainId === 80002) targetAddress = CONTRACT_ADDRESSES.amoy;
      setContractAddress(targetAddress);

      // Check if contract has bytecode deployed at this address
      let code = '0x';
      try {
        code = await provider.getCode(targetAddress);
      } catch (e) {
        code = '0x';
      }

      if (code && code !== '0x' && code !== '') {
        // Contract is deployed live on-chain!
        setIsContractDeployed(true);
        const contract = new ethers.Contract(targetAddress, contractArtifact.abi, provider);

        const [name, desc, onChainAdmin, stats, memberList, rawProposals] = await Promise.all([
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
        setAdminAddress(onChainAdmin);

        const userIsAdmin = onChainAdmin.toLowerCase() === userAddr.toLowerCase();
        setIsAdmin(userIsAdmin);

        const isMem = await contract.isMember(userAddr).catch(() => false);
        setIsMember(isMem || userIsAdmin);

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
      } else {
        // Contract not yet deployed on this network
        setIsContractDeployed(false);

        // Core Requirement: First connected wallet becomes the ADMIN!
        let storedAdmin = localStorage.getItem('dao_first_admin');
        if (!storedAdmin) {
          storedAdmin = userAddr;
          localStorage.setItem('dao_first_admin', userAddr);
        }
        setAdminAddress(storedAdmin);

        const userIsAdmin = storedAdmin.toLowerCase() === userAddr.toLowerCase();
        setIsAdmin(userIsAdmin);
        setIsMember(true); // Admin is automatically a member

        // Core Requirement: Start with ONLY the Admin and NO pre-filled members!
        const savedMembers = JSON.parse(localStorage.getItem('dao_user_members') || '[]');
        if (savedMembers.length > 0) {
          setMembers(savedMembers);
        } else {
          // Initialize with ONLY the admin
          const initialMembers = [storedAdmin];
          setMembers(initialMembers);
          localStorage.setItem('dao_user_members', JSON.stringify(initialMembers));
        }

        // Load custom user proposals
        const savedProposals = JSON.parse(localStorage.getItem('dao_user_proposals') || '[]');
        setProposals(savedProposals);

        // Load saved treasury balance
        const savedBalance = localStorage.getItem('dao_user_treasury') || '0.50';
        setTreasuryBalance(savedBalance);
      }
    } catch (err) {
      console.error('Error in loadAppState:', err);
    }
  };

  // Toggle Simulator Demo
  const toggleDemoMode = () => {
    if (!isDemoMode) {
      setIsDemoMode(true);
      setClubName(INITIAL_DEMO_STATE.clubName);
      setClubDescription(INITIAL_DEMO_STATE.clubDescription);
      setTreasuryBalance(INITIAL_DEMO_STATE.treasuryBalance);
      setQuorumPct(INITIAL_DEMO_STATE.quorumPercentage);
      setMembers(INITIAL_DEMO_STATE.members);
      setProposals(INITIAL_DEMO_STATE.proposals);
      setIsAdmin(true);
      setIsMember(true);
      addToast('info', 'Simulator Demo Active', 'Simulated demo state loaded for review and demonstration.');
    } else {
      setIsDemoMode(false);
      checkConnectedWallet();
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

  // Action: Add Member (ADMIN ONLY)
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      addToast('error', 'Admin Only', 'Only the Club Admin can add new members.');
      return;
    }
    if (!newMemberAddress || !ethers.isAddress(newMemberAddress.trim())) {
      addToast('error', 'Invalid Address', 'Please provide a valid Ethereum wallet address (0x...).');
      return;
    }

    const addrToAdd = ethers.getAddress(newMemberAddress.trim());

    if (members.some((m) => m.toLowerCase() === addrToAdd.toLowerCase())) {
      addToast('info', 'Already a Member', 'This address is already registered in the club directory.');
      return;
    }

    if (isContractDeployed && !isDemoMode) {
      try {
        setIsLoading(true);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);

        addToast('loading', 'Transaction Submitted', 'Adding member to on-chain smart contract...');
        const tx = await contract.addMember(addrToAdd);
        await tx.wait();

        setNewMemberAddress('');
        await loadAppState(provider, account, chainId);
        addToast('success', 'Member Added On-Chain', `${addrToAdd.slice(0, 6)}...${addrToAdd.slice(-4)} granted voting rights!`);
      } catch (err) {
        console.error(err);
        addToast('error', 'Failed to Add Member', err.reason || err.message);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Local / Offline mode
      const updatedMembers = [...members, addrToAdd];
      setMembers(updatedMembers);
      localStorage.setItem('dao_user_members', JSON.stringify(updatedMembers));
      setNewMemberAddress('');
      addToast('success', 'Member Added', `${addrToAdd.slice(0, 6)}...${addrToAdd.slice(-4)} granted 1-member-1-vote rights!`);
    }
  };

  // Action: Remove Member (ADMIN ONLY)
  const handleRemoveMember = (addrToRemove) => {
    if (!isAdmin) return;
    if (addrToRemove.toLowerCase() === adminAddress.toLowerCase()) {
      addToast('error', 'Cannot Remove Admin', 'The admin cannot remove themselves.');
      return;
    }
    const updated = members.filter((m) => m.toLowerCase() !== addrToRemove.toLowerCase());
    setMembers(updated);
    localStorage.setItem('dao_user_members', JSON.stringify(updated));
    addToast('info', 'Member Removed', `Removed ${addrToRemove.slice(0, 6)}...`);
  };

  // Action: Deploy Smart Contract to Sepolia / Localhost
  const handleDeployContract = async (e) => {
    e.preventDefault();
    if (!account) {
      addToast('error', 'Connect Wallet', 'Please connect MetaMask first to deploy the contract.');
      return;
    }
    try {
      setIsLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      addToast('loading', 'Deploying Contract', 'Please confirm the deployment transaction in MetaMask...');

      const factory = new ethers.ContractFactory(
        contractArtifact.abi,
        contractArtifact.bytecode,
        signer
      );

      const parsedFunding = ethers.parseEther(deployForm.initialFunding || '0.01');
      const deployedContract = await factory.deploy(
        deployForm.clubName,
        deployForm.clubDescription,
        deployForm.quorumPct,
        { value: parsedFunding }
      );

      addToast('loading', 'Mining Transaction', 'Waiting for contract deployment to be mined on-chain...');
      await deployedContract.waitForDeployment();
      const newAddress = await deployedContract.getAddress();

      setContractAddress(newAddress);
      localStorage.setItem(`dao_contract_${chainId}`, newAddress);
      localStorage.setItem('dao_first_admin', account);
      setIsContractDeployed(true);
      setShowDeployModal(false);

      fireSuccessConfetti();
      addToast('success', 'Contract Deployed!', `Contract live at: ${newAddress.slice(0, 8)}... (You are on-chain Admin)`);

      await loadAppState(provider, account, chainId);
    } catch (err) {
      console.error(err);
      addToast('error', 'Deployment Failed', err.reason || err.message);
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

    if (isContractDeployed && !isDemoMode) {
      try {
        setIsLoading(true);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);

        const parsedWei = ethers.parseEther(depositAmount.toString());
        addToast('loading', 'Funding Treasury', 'Sending deposit transaction to smart contract...');
        const tx = await contract.deposit({ value: parsedWei });
        await tx.wait();

        setShowDepositModal(false);
        await loadAppState(provider, account, chainId);
        addToast('success', 'Deposit Confirmed', `Sent ${depositAmount} ETH to Treasury!`);
        fireSuccessConfetti();
      } catch (err) {
        console.error(err);
        addToast('error', 'Deposit Failed', err.reason || err.message);
      } finally {
        setIsLoading(false);
      }
    } else {
      const added = parseFloat(depositAmount);
      const newBal = (parseFloat(treasuryBalance) + added).toFixed(2);
      setTreasuryBalance(newBal);
      localStorage.setItem('dao_user_treasury', newBal);
      setShowDepositModal(false);
      addToast('success', 'Funds Deposited', `Successfully funded ${depositAmount} ETH into the Treasury!`);
      fireSuccessConfetti();
    }
  };

  // Action: Create Proposal
  const handleCreateProposal = async (e) => {
    e.preventDefault();
    if (!isMember) {
      addToast('error', 'Restricted', 'Only registered members can submit proposals.');
      return;
    }
    if (!proposalForm.title.trim()) {
      addToast('error', 'Missing Title', 'Please specify a title.');
      return;
    }
    if (!proposalForm.description.trim()) {
      addToast('error', 'Missing Purpose', 'Please specify the proposal purpose.');
      return;
    }
    const reqAmount = parseFloat(proposalForm.amount);
    if (!reqAmount || reqAmount <= 0) {
      addToast('error', 'Invalid Amount', 'Please enter a valid requested amount.');
      return;
    }
    if (reqAmount > parseFloat(treasuryBalance)) {
      addToast('error', 'Exceeds Treasury', `Requested amount (${reqAmount} ETH) cannot exceed Treasury Balance (${treasuryBalance} ETH).`);
      return;
    }

    if (isContractDeployed && !isDemoMode) {
      try {
        setIsLoading(true);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);

        const parsedWei = ethers.parseEther(proposalForm.amount.toString());
        addToast('loading', 'Creating Proposal', 'Broadcasting proposal to blockchain...');

        const tx = await contract.createProposal(
          proposalForm.title,
          proposalForm.description,
          parsedWei,
          BigInt(proposalForm.durationSeconds)
        );
        await tx.wait();

        setShowCreateModal(false);
        setProposalForm({ title: '', description: '', amount: '', durationSeconds: 120 });
        await loadAppState(provider, account, chainId);
        addToast('success', 'Proposal Live', 'Proposal registered on-chain!');
      } catch (err) {
        console.error(err);
        addToast('error', 'Creation Failed', err.reason || err.message);
      } finally {
        setIsLoading(false);
      }
    } else {
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
      const updated = [newProp, ...proposals];
      setProposals(updated);
      localStorage.setItem('dao_user_proposals', JSON.stringify(updated));
      setShowCreateModal(false);
      setProposalForm({ title: '', description: '', amount: '', durationSeconds: 120 });
      addToast('success', 'Proposal Created', 'Proposal is now active for member voting!');
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
      addToast('error', 'Fairness Rule', 'Proposers cannot vote on their own proposal.');
      return;
    }

    if (isContractDeployed && !isDemoMode) {
      try {
        setIsLoading(true);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);

        addToast('loading', 'Submitting Vote', `Voting ${support ? 'FOR' : 'AGAINST'}...`);
        const tx = await contract.vote(proposalId, support);
        await tx.wait();

        await loadAppState(provider, account, chainId);
        addToast('success', 'Vote Confirmed', `Your vote has been mined on-chain!`);
      } catch (err) {
        console.error(err);
        addToast('error', 'Voting Failed', err.reason || err.message);
      } finally {
        setIsLoading(false);
      }
    } else {
      const updated = proposals.map((p) => {
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
      });
      setProposals(updated);
      localStorage.setItem('dao_user_proposals', JSON.stringify(updated));
      addToast('success', 'Vote Recorded', `You voted ${support ? 'FOR' : 'AGAINST'} this proposal.`);
    }
  };

  // Action: Execute Proposal
  const handleExecuteProposal = async (proposalId) => {
    const targetProp = proposals.find((p) => p.id === proposalId);
    if (!targetProp) return;

    if (isContractDeployed && !isDemoMode) {
      try {
        setIsLoading(true);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);

        addToast('loading', 'Executing Payout', 'Verifying quorum and executing fund transfer...');
        const tx = await contract.executeProposal(proposalId);
        await tx.wait();

        fireSuccessConfetti();
        await loadAppState(provider, account, chainId);
        addToast('success', 'Funds Released!', `Proposal #${proposalId} finalized and ${targetProp.amount} ETH transferred!`);
      } catch (err) {
        console.error(err);
        addToast('error', 'Execution Failed', err.reason || err.message);
      } finally {
        setIsLoading(false);
      }
    } else {
      const payout = parseFloat(targetProp.amount);
      if (payout > parseFloat(treasuryBalance)) {
        addToast('error', 'Insufficient Treasury', 'Cannot execute: Treasury funds are below requested amount.');
        return;
      }
      const updated = proposals.map((p) => (p.id === proposalId ? { ...p, executed: true } : p));
      setProposals(updated);
      localStorage.setItem('dao_user_proposals', JSON.stringify(updated));

      const newBal = Math.max(0, parseFloat(treasuryBalance) - payout).toFixed(2);
      setTreasuryBalance(newBal);
      localStorage.setItem('dao_user_treasury', newBal);

      fireSuccessConfetti();
      addToast('success', 'Proposal Executed!', `Contract automatically transferred ${targetProp.amount} ETH to proposer!`);
    }
  };

  // Action: Join Club (Non-Members)
  const handleJoinClub = async () => {
    if (!account) {
      connectWallet();
      return;
    }
    if (isContractDeployed && !isDemoMode) {
      try {
        setIsLoading(true);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);

        addToast('loading', 'Joining Club', 'Calling joinClub() on smart contract...');
        const tx = await contract.joinClub();
        await tx.wait();

        await loadAppState(provider, account, chainId);
        addToast('success', 'Welcome!', 'You are now an on-chain DAO member!');
      } catch (err) {
        console.error(err);
        addToast('error', 'Join Failed', err.reason || err.message);
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!members.includes(account)) {
        const updated = [...members, account];
        setMembers(updated);
        localStorage.setItem('dao_user_members', JSON.stringify(updated));
      }
      setIsMember(true);
      addToast('success', 'Welcome!', 'You are now a registered voting member!');
    }
  };

  // Fast-Forward voting deadline helper
  const handleFastForward = (proposalId) => {
    const updated = proposals.map((p) =>
      p.id === proposalId ? { ...p, votingDeadline: Math.floor(Date.now() / 1000) - 10 } : p
    );
    setProposals(updated);
    if (!isContractDeployed) {
      localStorage.setItem('dao_user_proposals', JSON.stringify(updated));
    }
    addToast('info', 'Time Travel Applied', 'Voting deadline passed! Proposal is now ready for execution.');
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
        addToast('info', 'Add Network', 'Please add Sepolia to MetaMask first.');
      }
    }
  };

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

  const copyAddress = (addr) => {
    navigator.clipboard.writeText(addr);
    addToast('info', 'Copied', `${addr.slice(0, 8)}... copied to clipboard`);
  };

  // Quorum calculations
  const requiredVotes = Math.ceil((Math.max(members.length, 1) * quorumPct) / 100);

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
            <div className="mode-toggle">
              <div
                className={`mode-toggle-option ${!isDemoMode ? 'active' : ''}`}
                onClick={() => {
                  if (isDemoMode) toggleDemoMode();
                }}
              >
                Web3 Active
              </div>
              <div
                className={`mode-toggle-option ${isDemoMode ? 'active' : ''}`}
                onClick={toggleDemoMode}
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
                  {SUPPORTED_NETWORKS[chainId]?.name || (chainId ? `Chain ID: ${chainId}` : 'Not Connected')}
                </span>
                {chainId && chainId !== 11155111 && chainId !== 31337 && (
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

            {/* Real Connected Wallet Display */}
            {account ? (
              <div
                className="address-pill"
                style={{ cursor: 'pointer', padding: '0.45rem 0.85rem' }}
                onClick={() => copyAddress(account)}
                title="Click to copy your address"
              >
                <Wallet size={14} color="#a78bfa" />
                <span style={{ fontWeight: 600 }}>
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
                <span style={{ color: '#10b981', fontWeight: 600, marginLeft: 6 }}>
                  {accountBalance} ETH
                </span>
                {isAdmin && (
                  <span
                    style={{
                      background: 'rgba(245, 158, 11, 0.2)',
                      color: '#fbbf24',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      marginLeft: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <Crown size={10} /> Admin
                  </span>
                )}
              </div>
            ) : (
              <button className="btn btn-primary" onClick={connectWallet}>
                <Wallet size={16} />
                <span>Connect MetaMask</span>
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

              {/* Deployment Status Pill */}
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {isContractDeployed ? (
                  <div
                    style={{
                      fontSize: '0.775rem',
                      color: '#34d399',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '0.25rem 0.65rem',
                      borderRadius: 'var(--radius-full)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <CheckCircle2 size={13} />
                    <span>Live Smart Contract: {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}</span>
                  </div>
                ) : (
                  <button
                    className="btn btn-sm btn-outline"
                    style={{ borderStyle: 'dashed', borderColor: '#8b5cf6', color: '#c4b5fd' }}
                    onClick={() => setShowDeployModal(true)}
                  >
                    <Rocket size={13} color="#a78bfa" />
                    <span>Deploy DAO Smart Contract to Sepolia</span>
                  </button>
                )}
              </div>
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

          {/* Membership Status Bar */}
          <div className="member-banner">
            <div className="member-banner-left">
              <div className="member-avatar">
                {isAdmin ? <Crown size={18} color="#fbbf24" /> : account ? account.slice(2, 4).toUpperCase() : '??'}
              </div>
              <div className="member-info">
                <h4>
                  {isAdmin
                    ? '👑 Club Admin (Deployer / President)'
                    : isMember
                    ? 'Registered Club Voting Member'
                    : 'Guest / Non-Member'}
                </h4>
                <p>
                  {isAdmin
                    ? 'You are the Club Admin. You have full control to manually add club members by wallet address below.'
                    : isMember
                    ? 'You hold 1-member-1-vote democratic power to propose and vote.'
                    : 'Connect your wallet or join to participate in democratic treasury spending.'}
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
                <span>View Directory ({members.length})</span>
              </button>
            )}
          </div>
        </section>

        {/* ADMIN CONTROLS: MANUALLY ADD MEMBERS */}
        {isAdmin && (
          <section
            style={{
              background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.6) 0%, rgba(15, 23, 42, 0.7) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(245, 158, 11, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fbbf24',
                  }}
                >
                  <Crown size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                    Admin Controls — Add & Manage Club Members
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Add trusted members using their wallet address. Only added members get 1-member-1-vote rights.
                  </p>
                </div>
              </div>

              <div
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--accent-cyan)',
                  background: 'rgba(6, 182, 212, 0.1)',
                  padding: '0.35rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                }}
              >
                <strong>{members.length}</strong> Registered {members.length === 1 ? 'Member' : 'Members'} (Quorum: {requiredVotes} votes needed)
              </div>
            </div>

            {/* Quick Add Member Form */}
            <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '280px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Paste member wallet address (e.g. 0x3C44CdDdB6a900fa2b585dd299e...)"
                  value={newMemberAddress}
                  onChange={(e) => setNewMemberAddress(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                <UserPlus size={16} />
                <span>+ Add Member</span>
              </button>
            </form>

            {/* Added Members List preview */}
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
              {members.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.775rem',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                    {m.slice(0, 6)}...{m.slice(-4)}
                  </span>
                  {adminAddress && m.toLowerCase() === adminAddress.toLowerCase() ? (
                    <span style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.7rem' }}>
                      (Admin)
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Remove member"
                    >
                      <Trash2 size={12} color="#fb7185" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

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
              <span style={{ color: '#10b981', marginLeft: 'auto' }}>
                {isContractDeployed ? 'On-Chain' : 'Local Pool'}
              </span>
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
              <span>Proposals</span>
              <div className="stat-icon green">
                <Vote size={18} />
              </div>
            </div>
            <div className="stat-value">{proposals.length}</div>
            <div className="stat-footer">
              <span>
                {proposals.filter((p) => getProposalComputedStatus(p) === 'Active').length} Active Voting
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
              <span>Min. {requiredVotes} votes to pass</span>
            </div>
          </div>
        </section>

        {/* Proposal Controls & Filter Tabs */}
        <div className="section-header">
          <div className="section-title">
            <h2>Spending Proposals</h2>
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
            <h3 className="empty-title">No proposals yet</h3>
            <p className="empty-desc">
              {searchQuery
                ? 'Try adjusting your search criteria.'
                : 'No proposals currently match this status filter. Submit a proposal to start democratic voting!'}
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
              const isProposer = account && p.proposer.toLowerCase() === account.toLowerCase();
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

                        {/* Fast Forward for testing */}
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.725rem' }}
                          onClick={() => handleFastForward(p.id)}
                          title="Simulate voting deadline passing immediately"
                        >
                          <FastForward size={12} />
                          <span>Fast-Forward Voting Deadline (Testing)</span>
                        </button>
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

        {/* Security & Rules Card */}
        <div className="info-box">
          <div className="info-title">
            <ShieldCheck size={18} color="#8b5cf6" />
            <span>DAO Treasury Architecture & Security Guarantees</span>
          </div>
          <div className="info-grid">
            <div className="info-item">
              <h5>1 Member = 1 Vote Democracy</h5>
              <p>
                Every registered club member receives exactly one vote. Double voting is strictly prevented.
              </p>
            </div>
            <div className="info-item">
              <h5>30% Quorum & Simple Majority</h5>
              <p>
                A proposal requires at least 30% member participation and strictly more FOR than AGAINST votes.
              </p>
            </div>
            <div className="info-item">
              <h5>Direct Smart-Contract Transfers</h5>
              <p>
                No officer or treasurer can move funds directly. Execution releases money automatically to the proposer.
              </p>
            </div>
            <div className="info-item">
              <h5>Safety Checks</h5>
              <p>
                Amount cannot exceed treasury balance, proposals can execute only once, and failed proposals never move funds.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div>
            <strong>ClubDAO Treasury</strong> • Transparent Fund Allocation for Clubs & Communities
          </div>
          <div className="footer-links">
            <a href="#" onClick={(e) => { e.preventDefault(); setShowGuideModal(true); }}>
              Governance Guide
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); setShowMembersModal(true); }}>
              Member Registry
            </a>
            <a href="https://sepolia.etherscan.io" target="_blank" rel="noreferrer">
              Sepolia Explorer <ExternalLink size={12} style={{ display: 'inline' }} />
            </a>
          </div>
        </div>
      </footer>

      {/* MODAL: DEPLOY SMART CONTRACT TO SEPOLIA */}
      {showDeployModal && (
        <div className="modal-overlay" onClick={() => setShowDeployModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🚀 Deploy DAO Smart Contract</h3>
              <button className="modal-close-btn" onClick={() => setShowDeployModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleDeployContract}>
              <div className="modal-body">
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Deploy your club's own <code>ClubTreasuryDAO.sol</code> smart contract using your connected MetaMask wallet.
                  Your wallet will automatically be the immutable <strong>Admin</strong> on-chain!
                </p>

                <div className="form-group">
                  <label className="form-label">Club Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={deployForm.clubName}
                    onChange={(e) => setDeployForm({ ...deployForm, clubName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Club Purpose / Description</label>
                  <textarea
                    className="form-textarea"
                    value={deployForm.clubDescription}
                    onChange={(e) => setDeployForm({ ...deployForm, clubDescription: e.target.value })}
                    required
                  ></textarea>
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Treasury Funding (ETH)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    className="form-input"
                    value={deployForm.initialFunding}
                    onChange={(e) => setDeployForm({ ...deployForm, initialFunding: e.target.value })}
                    required
                  />
                  <span className="form-hint">Seed your treasury with test ETH during deployment (e.g. 0.01 ETH).</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Quorum Percentage</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="form-input"
                    value={deployForm.quorumPct}
                    onChange={(e) => setDeployForm({ ...deployForm, quorumPct: Number(e.target.value) })}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>
                  <Rocket size={18} />
                  <span>Deploy to Blockchain Now</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    placeholder="e.g. Hackathon Catering & Refreshments"
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
                    onChange={(e) => setProposalForm({ ...proposalForm, description: e.target.value })}
                    required
                  ></textarea>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Requested Amount (ETH)</span>
                    <span className="form-hint">Treasury Balance: {treasuryBalance} ETH</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-input"
                    placeholder="e.g. 0.25"
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
                    onChange={(e) => setProposalForm({ ...proposalForm, durationSeconds: Number(e.target.value) })}
                  >
                    <option value={120}>2 Minutes (Quick Demo / Testing)</option>
                    <option value={3600}>1 Hour</option>
                    <option value={86400}>1 Day (24 Hours)</option>
                    <option value={259200}>3 Days</option>
                    <option value={604800}>7 Days</option>
                  </select>
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
                  and can only be withdrawn via approved member proposals.
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
                  <span>Send Deposit</span>
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
              <div
                style={{
                  maxHeight: '280px',
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
                      {adminAddress && m.toLowerCase() === adminAddress.toLowerCase() && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            background: 'rgba(245, 158, 11, 0.2)',
                            color: '#fbbf24',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                          }}
                        >
                          Admin
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
            </div>
          </div>
        </div>
      )}

      {/* DAO GUIDE MODAL */}
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
                  The deployer/admin onboards members using their wallet address. Each member has equal voting weight.
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
                  At least 30% of registered members must vote, and FOR votes must strictly exceed AGAINST votes to pass.
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
                  3. Automated Payouts
                </h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  Once the voting deadline passes and criteria are met, "Execute" triggers an atomic transfer of the exact requested ETH directly to the proposer.
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
