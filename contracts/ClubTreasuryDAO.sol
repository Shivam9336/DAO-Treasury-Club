// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ClubTreasuryDAO
 * @notice A decentralized autonomous organization (DAO) treasury for clubs,
 * student organizations, and communities. Allows members to collectively govern
 * funds with 100% on-chain transparency, 1-member-1-vote democratic voting,
 * quorum requirements, and automatic smart-contract execution without middlemen.
 */
contract ClubTreasuryDAO {
    // -------------------------------------------------------------
    // CONSTANTS & ENUMS
    // -------------------------------------------------------------

    enum ProposalStatus {
        Active,    // Voting is currently ongoing
        Passed,    // Voting ended, majority FOR + quorum met, ready to execute
        Rejected,  // Voting ended, failed majority OR quorum not met
        Executed   // Successfully finalized and funds transferred
    }

    enum VoteType {
        None,
        For,
        Against
    }

    // -------------------------------------------------------------
    // STRUCTS
    // -------------------------------------------------------------

    struct Proposal {
        uint256 id;
        string title;
        string description;
        uint256 amount;           // In wei
        address payable recipient;
        address proposer;
        uint256 createdAt;
        uint256 votingDeadline;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
    }

    struct ProposalView {
        uint256 id;
        string title;
        string description;
        uint256 amount;
        address payable recipient;
        address proposer;
        uint256 createdAt;
        uint256 votingDeadline;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
        ProposalStatus status;
        uint256 totalVotes;
        bool quorumReached;
    }

    // -------------------------------------------------------------
    // STATE VARIABLES
    // -------------------------------------------------------------

    string public clubName;
    string public clubDescription;
    address public immutable admin;

    // Quorum: percentage of registered members required to participate (e.g., 30 for 30%)
    uint256 public immutable quorumPercentage;

    // Minimum voting duration (e.g. 60 seconds for testing/demos)
    uint256 public constant MIN_VOTING_DURATION = 60 seconds;
    // Maximum voting duration (e.g. 30 days)
    uint256 public constant MAX_VOTING_DURATION = 30 days;

    // Membership management
    mapping(address => bool) public isMember;
    address[] public memberList;
    uint256 public memberCount;

    // Proposals storage
    Proposal[] public proposals;

    // proposalId => memberAddress => hasVoted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // proposalId => memberAddress => voteChoice
    mapping(uint256 => mapping(address => VoteType)) public memberVote;

    // Reentrancy lock
    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // -------------------------------------------------------------
    // EVENTS
    // -------------------------------------------------------------

    event FundsDeposited(address indexed sender, uint256 amount, uint256 newBalance);
    event MemberJoined(address indexed member, uint256 totalMembers);
    event MemberAdded(address indexed admin, address indexed member, uint256 totalMembers);
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        uint256 amount,
        uint256 votingDeadline
    );
    event Voted(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 votesFor,
        uint256 votesAgainst
    );
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed recipient,
        uint256 amount
    );

    // -------------------------------------------------------------
    // MODIFIERS
    // -------------------------------------------------------------

    modifier onlyMember() {
        require(isMember[msg.sender], "Access denied: Only club members can call this");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Access denied: Only admin can call this");
        _;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // -------------------------------------------------------------
    // CONSTRUCTOR & RECEIVE
    // -------------------------------------------------------------

    constructor(
        string memory _clubName,
        string memory _clubDescription,
        uint256 _quorumPercentage
    ) payable {
        require(_quorumPercentage > 0 && _quorumPercentage <= 100, "Invalid quorum percentage");
        clubName = _clubName;
        clubDescription = _clubDescription;
        quorumPercentage = _quorumPercentage;
        admin = msg.sender;
        _status = _NOT_ENTERED;

        // Deployer is the initial registered member
        _registerMember(msg.sender);

        if (msg.value > 0) {
            emit FundsDeposited(msg.sender, msg.value, address(this).balance);
        }
    }

    /// @notice Anyone can deposit funds directly into the treasury
    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value, address(this).balance);
    }

    /// @notice Explicit deposit function for web3 wallets
    function deposit() external payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        emit FundsDeposited(msg.sender, msg.value, address(this).balance);
    }

    // -------------------------------------------------------------
    // MEMBERSHIP LOGIC
    // -------------------------------------------------------------

    /// @notice Allows any interested student/individual to join the club
    function joinClub() external {
        require(!isMember[msg.sender], "Already a registered club member");
        _registerMember(msg.sender);
        emit MemberJoined(msg.sender, memberCount);
    }

    /// @notice Allows the admin to onboard a specific member address
    function addMember(address newMember) external onlyAdmin {
        require(newMember != address(0), "Cannot add zero address");
        require(!isMember[newMember], "Address is already a member");
        _registerMember(newMember);
        emit MemberAdded(msg.sender, newMember, memberCount);
    }

    function _registerMember(address account) internal {
        isMember[account] = true;
        memberList.push(account);
        memberCount += 1;
    }

    // -------------------------------------------------------------
    // PROPOSAL CREATION
    // -------------------------------------------------------------

    /**
     * @notice Create a spending proposal
     * @param title Brief title of the proposal
     * @param description Detailed justification or item breakdown
     * @param amount Requested amount in wei
     * @param durationInSeconds Voting window length in seconds
     */
    function createProposal(
        string calldata title,
        string calldata description,
        uint256 amount,
        uint256 durationInSeconds
    ) external onlyMember returns (uint256 proposalId) {
        require(bytes(title).length > 0, "Proposal title cannot be empty");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(amount > 0, "Requested amount must be greater than 0");
        require(amount <= address(this).balance, "Requested amount exceeds current treasury balance");
        require(
            durationInSeconds >= MIN_VOTING_DURATION && durationInSeconds <= MAX_VOTING_DURATION,
            "Duration outside allowable range"
        );

        proposalId = proposals.length;
        uint256 deadline = block.timestamp + durationInSeconds;

        proposals.push(
            Proposal({
                id: proposalId,
                title: title,
                description: description,
                amount: amount,
                recipient: payable(msg.sender),
                proposer: msg.sender,
                createdAt: block.timestamp,
                votingDeadline: deadline,
                votesFor: 0,
                votesAgainst: 0,
                executed: false
            })
        );

        emit ProposalCreated(proposalId, msg.sender, title, amount, deadline);
    }

    // -------------------------------------------------------------
    // VOTING LOGIC
    // -------------------------------------------------------------

    /**
     * @notice Vote on a proposal (1 member = 1 vote)
     * @param proposalId The ID of the proposal
     * @param support True for FOR, False for AGAINST
     */
    function vote(uint256 proposalId, bool support) external onlyMember {
        require(proposalId < proposals.length, "Invalid proposal ID");
        Proposal storage p = proposals[proposalId];

        require(block.timestamp <= p.votingDeadline, "Voting deadline has passed");
        require(!p.executed, "Proposal has already been executed");
        require(!hasVoted[proposalId][msg.sender], "Member has already voted on this proposal");
        require(msg.sender != p.proposer, "Proposer cannot vote on their own proposal");

        hasVoted[proposalId][msg.sender] = true;
        memberVote[proposalId][msg.sender] = support ? VoteType.For : VoteType.Against;

        if (support) {
            p.votesFor += 1;
        } else {
            p.votesAgainst += 1;
        }

        emit Voted(proposalId, msg.sender, support, p.votesFor, p.votesAgainst);
    }

    // -------------------------------------------------------------
    // EXECUTION LOGIC
    // -------------------------------------------------------------

    /**
     * @notice Executes a proposal after its voting deadline has ended,
     * transferring funds directly to the proposer if passed.
     * Can be called by ANY member or participant once criteria are met.
     * @param proposalId The ID of the proposal to execute
     */
    function executeProposal(uint256 proposalId) external nonReentrant {
        require(proposalId < proposals.length, "Invalid proposal ID");
        Proposal storage p = proposals[proposalId];

        require(!p.executed, "Proposal has already been executed");
        require(block.timestamp > p.votingDeadline, "Voting deadline has not passed yet");

        uint256 totalVotes = p.votesFor + p.votesAgainst;
        uint256 requiredVotes = (memberCount * quorumPercentage + 99) / 100; // Ceiling division

        require(totalVotes >= requiredVotes, "Quorum not reached: insufficient voter participation");
        require(p.votesFor > p.votesAgainst, "Proposal rejected: FOR votes must exceed AGAINST votes");
        require(address(this).balance >= p.amount, "Treasury has insufficient balance for payout");

        // Checks-Effects-Interactions
        p.executed = true;

        (bool success, ) = p.recipient.call{value: p.amount}("");
        require(success, "Treasury payout transfer failed");

        emit ProposalExecuted(proposalId, p.recipient, p.amount);
    }

    // -------------------------------------------------------------
    // VIEW FUNCTIONS & HELPERS
    // -------------------------------------------------------------

    function getProposalCount() external view returns (uint256) {
        return proposals.length;
    }

    function getTreasuryBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getProposalStatus(uint256 proposalId) public view returns (ProposalStatus) {
        require(proposalId < proposals.length, "Invalid proposal ID");
        Proposal storage p = proposals[proposalId];

        if (p.executed) {
            return ProposalStatus.Executed;
        }

        if (block.timestamp <= p.votingDeadline) {
            return ProposalStatus.Active;
        }

        uint256 totalVotes = p.votesFor + p.votesAgainst;
        uint256 requiredVotes = (memberCount * quorumPercentage + 99) / 100;

        if (totalVotes >= requiredVotes && p.votesFor > p.votesAgainst) {
            return ProposalStatus.Passed;
        } else {
            return ProposalStatus.Rejected;
        }
    }

    function getProposal(uint256 proposalId) external view returns (ProposalView memory) {
        require(proposalId < proposals.length, "Invalid proposal ID");
        Proposal storage p = proposals[proposalId];

        uint256 totalVotes = p.votesFor + p.votesAgainst;
        uint256 requiredVotes = (memberCount * quorumPercentage + 99) / 100;
        bool quorumMet = totalVotes >= requiredVotes;
        ProposalStatus status = getProposalStatus(proposalId);

        return ProposalView({
            id: p.id,
            title: p.title,
            description: p.description,
            amount: p.amount,
            recipient: p.recipient,
            proposer: p.proposer,
            createdAt: p.createdAt,
            votingDeadline: p.votingDeadline,
            votesFor: p.votesFor,
            votesAgainst: p.votesAgainst,
            executed: p.executed,
            status: status,
            totalVotes: totalVotes,
            quorumReached: quorumMet
        });
    }

    function getAllProposals() external view returns (ProposalView[] memory) {
        uint256 count = proposals.length;
        ProposalView[] memory all = new ProposalView[](count);

        uint256 requiredVotes = (memberCount * quorumPercentage + 99) / 100;

        for (uint256 i = 0; i < count; i++) {
            Proposal storage p = proposals[i];
            uint256 totalVotes = p.votesFor + p.votesAgainst;
            bool quorumMet = totalVotes >= requiredVotes;

            all[i] = ProposalView({
                id: p.id,
                title: p.title,
                description: p.description,
                amount: p.amount,
                recipient: p.recipient,
                proposer: p.proposer,
                createdAt: p.createdAt,
                votingDeadline: p.votingDeadline,
                votesFor: p.votesFor,
                votesAgainst: p.votesAgainst,
                executed: p.executed,
                status: getProposalStatus(i),
                totalVotes: totalVotes,
                quorumReached: quorumMet
            });
        }
        return all;
    }

    function getClubStats() external view returns (
        uint256 treasuryBalance,
        uint256 totalMembers,
        uint256 totalProposals,
        uint256 requiredQuorumPct,
        uint256 minVotesNeeded
    ) {
        treasuryBalance = address(this).balance;
        totalMembers = memberCount;
        totalProposals = proposals.length;
        requiredQuorumPct = quorumPercentage;
        minVotesNeeded = (memberCount * quorumPercentage + 99) / 100;
    }

    function getMemberList() external view returns (address[] memory) {
        return memberList;
    }

    function getVoterInfo(uint256 proposalId, address voter) external view returns (
        bool hasVotedFlag,
        VoteType voteChoice
    ) {
        hasVotedFlag = hasVoted[proposalId][voter];
        voteChoice = memberVote[proposalId][voter];
    }
}
