# 🏛️ DAO Treasury: Transparent Fund Allocation for Clubs & Student Organizations

> A fully decentralized application (dApp) where a club's treasury is governed entirely by on-chain smart contract logic and democratic member voting. Zero middlemen, zero private chat disputes, 100% transparent.

![DAO Treasury](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)
![Hardhat](https://img.shields.io/badge/Built%20With-Hardhat-yellow?logo=ethereum)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61dafb?logo=react)
![Ethers.js](https://img.shields.io/badge/Web3-Ethers.js%20v6-blue)
![Tests](https://img.shields.io/badge/Tests-24%20Passing-brightgreen)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📖 Table of Contents
1. [The Problem & The Solution](#-the-problem--the-the-solution)
2. [Key Features & Core Requirements](#-key-features--core-requirements)
3. [Architecture & Governance Rules](#-architecture--governance-rules)
4. [Smart Contract Overview](#-smart-contract-overview)
5. [Frontend dApp Overview](#-frontend-dapp-overview)
6. [Test Suite (24 Passing Tests)](#-test-suite)
7. [Getting Started & Local Setup](#-getting-started--local-setup)
8. [Testnet Deployment Guide (Sepolia / Polygon Amoy)](#-testnet-deployment-guide)
9. [Design Rationale & Security Safeguards](#-design-rationale--security-safeguards)

---

## 🎯 The Problem & The Solution

### 🔻 The Problem
Clubs, student organisations, and hackathon teams often manage a shared fund. Spending decisions typically occur in private messaging groups or are decided arbitrarily by a few office-bearers. This creates:
- **Lack of Transparency**: Members never see real-time treasury balances or pending expenditures.
- **Favouritism & Bias**: Funds are granted based on friendships rather than merit.
- **Disputes & Broken Trust**: Conflict over who approved what payout, leading to organizational friction.

### 🌟 The Solution: ClubDAO Treasury
An autonomous, immutable on-chain treasury:
- **1 Member = 1 Vote Democracy**: Every registered club member gets equal voting power.
- **Open Member Onboarding**: Any student/member can self-register or be onboarded by admin.
- **Proposal Submissions**: Members request funds with a stated title, purpose, amount, and deadline.
- **30% Quorum & Majority**: Payouts require genuine member turnout (≥ 30%) and strictly more FOR votes than AGAINST votes.
- **Automated Payouts Without Middlemen**: If a proposal passes, calling execution triggers the smart contract to transfer ETH directly to the proposer. No officer can block, tamper with, or redirect the funds.

---

## 🚀 Key Features & Core Requirements

| Requirement | Implementation in ClubDAO Treasury |
| :--- | :--- |
| **1. Smart Contract Treasury** | Holds native funds (ETH). Accepts deposits via `receive()` and `deposit()`. |
| **2. Membership System** | `isMember` mapping, `memberCount`, `memberList`. Anyone can join via `joinClub()`, or be added via `addMember(address)`. |
| **3. Proposal Creation** | `createProposal(title, description, amount, duration)`. Amount cannot exceed treasury balance. |
| **4. Democratic Voting** | `vote(proposalId, support)`. 1 member = 1 vote. Double voting prevented. Proposers cannot vote on their own proposal. |
| **5. Automated Execution** | `executeProposal(proposalId)`. Checks deadline passed, quorum met (30%), simple majority (`votesFor > votesAgainst`). Funds sent via atomic call. |
| **6. Security Safeguards** | Reentrancy guard, balance validation at creation and execution, single-execution enforcement (`executed == true`). |
| **7. Modern Frontend** | React + Vite with dark obsidian glassmorphic aesthetic, countdown timers, live progress bars, toast alerts, and confetti. |
| **8. Dual Mode Engine** | Seamless **Web3 Mode** (MetaMask, Sepolia, Localhost) + **Simulator Mode** (for instant 1-click evaluation). |

---

## 📐 Architecture & Governance Rules

```
                      +-----------------------------+
                      |       Anyone / Donors       |
                      +-----------------------------+
                                     |
                                     | deposit() / receive()
                                     v
                       +---------------------------+
                       |   ClubTreasuryDAO.sol     |
                       |      (Holds ETH)          |
                       +---------------------------+
                        ^            |            |
           joinClub()   |            |            |  createProposal()
           vote()       |            |            |
                        |            |            v
    +------------------------+       |     +-------------------------+
    |   Registered Members   |       |     |   Spending Proposals    |
    | (1 Member = 1 Vote)    |       |     | (Title, Amount, Expiry) |
    +------------------------+       |     +-------------------------+
                                     |                  |
                                     | executeProposal()| (Deadline passed
                                     |                  |  Quorum >= 30%
                                     |                  |  VotesFor > VotesAgainst)
                                     v                  v
                       +---------------------------+
                       |    Automatic Payout to    |
                       |    Proposer's Address     |
                       +---------------------------+
```

### Governance Rules:
1. **One Member = One Vote**: No plutocracy or token weighting. Equal voice for every club participant.
2. **Quorum Requirement (30%)**: At least 30% of registered club members must cast a vote (`(votesFor + votesAgainst) * 100 / memberCount >= 30`).
3. **Simple Majority**: `votesFor > votesAgainst`. A tie does not pass.
4. **Proposer Impartiality**: Proposers cannot vote on their own proposals to eliminate conflict of interest.
5. **Irreversible Execution**: A proposal can be executed only once. Executing a rejected or expired proposal reverts and cannot move funds.

---

## 🛠️ Smart Contract Overview

Contract file: [`contracts/ClubTreasuryDAO.sol`](file:///c:/Users/Shivam%20Yadav/Desktop/BIB_event/contracts/ClubTreasuryDAO.sol)

### Core Functions:
- `joinClub()`: Registers caller as a club voting member.
- `addMember(address newMember)`: Admin manual onboarding.
- `deposit() payable`: Direct funding of the club treasury.
- `createProposal(string title, string description, uint256 amount, uint256 durationInSeconds)`: Registers a new funding request.
- `vote(uint256 proposalId, bool support)`: Casts 1 member vote (FOR or AGAINST).
- `executeProposal(uint256 proposalId)`: Enforces rules and transfers ETH directly to proposer.
- `getProposalStatus(uint256 id)`: Returns dynamic status (`Active`, `Passed`, `Rejected`, `Executed`).
- `getClubStats()`: Returns treasury balance, member count, proposals, and quorum threshold in a single call.

---

## 💻 Frontend dApp Overview

The frontend is built with **React**, **Vite**, **Ethers.js v6**, and **Vanilla CSS** featuring:
- **Obsidian Glassmorphism Theme**: Cyber-luxury aesthetic with deep navy gradients, glowing borders, and clean typography (`Inter`, `Outfit`, `JetBrains Mono`).
- **Live Countdown Timers**: Real-time ticker counting down until the voting deadline.
- **Turnout & Quorum Indicators**: Visual split progress bar (% FOR vs % AGAINST) and live quorum threshold tracker.
- **Dual Engine (Web3 + Simulator)**:
  - **Web3 Mode**: Connects with MetaMask, queries the blockchain, and executes real transactions.
  - **Simulator Mode**: Allows reviewers/judges without testnet ETH to immediately test all actions (joining, proposing, voting, fast-forwarding time, executing, donating) with live feedback and celebration animations!
- **Modals & Toast Feedback**: Rich feedback for every pending, confirmed, or rejected transaction.

---

## 🧪 Test Suite

The test suite covers 24 comprehensive scenarios with 100% pass rate:

```bash
npx hardhat test
```

### Test Results:
```
  ClubTreasuryDAO Smart Contract
    Deployment & Initial State
      √ should initialize club metadata and admin correctly
      √ should set deployer as the first member with initial funding
    Membership Management
      √ should allow any user to join the club
      √ should prevent a member from joining twice
      √ should allow admin to manually add a member
      √ should prevent non-admin from adding members
    Treasury Funding & Deposits
      √ should accept direct ETH deposits via receive()
      √ should accept deposits via deposit() function
    Proposal Creation
      √ should allow a registered member to create a valid proposal
      √ should reject proposal creation from non-members
      √ should reject proposal requesting more than treasury balance
      √ should reject proposal with empty title or invalid duration
    Voting Mechanics
      √ should allow members to vote FOR and AGAINST
      √ should prevent proposer from voting on their own proposal
      √ should prevent double voting by the same member
      √ should prevent non-members from voting
      √ should prevent voting after the deadline has expired
    Execution & Fund Transfer
      √ should execute proposal and transfer ETH automatically when passed
      √ should prevent execution before the deadline
      √ should revert execution if quorum is not reached
      √ should revert execution if proposal was rejected by majority
      √ should prevent executing an already executed proposal
    Club Statistics & Batch Getters
      √ should return accurate club overview stats
      √ should list all registered members

  24 passing (1s)
```

---

## 🏁 Getting Started & Local Setup

### Prerequisites
- Node.js (v18+ or v20+)
- npm or yarn
- MetaMask browser extension (optional for live Web3 mode)

### 1. Clone & Install Dependencies
```bash
# Install root (Hardhat) dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Run the Unit Tests
```bash
npm test
```

### 3. Start Local Blockchain & Deploy
In Terminal 1:
```bash
npx hardhat node
```

In Terminal 2:
```bash
# Deploy contract to local node and seed sample proposals
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/seed.js --network localhost
```

### 4. Start the Frontend
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🌐 Testnet Deployment Guide

### Deploying to Sepolia Testnet
1. Create a `.env` file in the project root:
   ```env
   SEPOLIA_RPC_URL="https://rpc.sepolia.org" # or Alchemy/Infura endpoint
   PRIVATE_KEY="your_wallet_private_key_here"
   ```
2. Fund your wallet with test Sepolia ETH (e.g. via [Sepolia PoW Faucet](https://sepolia-faucet.pk910.de/) or [Google Cloud Web3 Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)).
3. Run the deployment script:
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   ```
4. The deployment script will automatically update [`frontend/src/contracts/ClubTreasuryDAO.json`](file:///c:/Users/Shivam%20Yadav/Desktop/BIB_event/frontend/src/contracts/ClubTreasuryDAO.json) with the live contract address and ABI!

---

## 🛡️ Design Rationale & Security Safeguards

1. **Checks-Effects-Interactions Pattern**:
   Before initiating external transfers in `executeProposal`, `p.executed = true` is committed to storage to block reentrancy attacks.
2. **ReentrancyGuard**:
   The contract incorporates a custom lightweight gas-optimized reentrancy lock.
3. **No Direct Admin Withdrawals**:
   The `admin` address has zero authority to withdraw funds without an approved proposal. Funds can only leave the treasury via the consensus-governed `executeProposal` function.
4. **Balance Safety**:
   Proposals cannot request more than the contract balance at creation time, and execution ensures the balance is still sufficient before executing payout.
5. **Decoupled Quorum Calculation**:
   Quorum is calculated dynamically using ceiling division `(memberCount * quorumPercentage + 99) / 100` so that small clubs with fractional member counts are strictly safeguarded against under-representation.
