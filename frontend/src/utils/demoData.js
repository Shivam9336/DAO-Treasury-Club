export const INITIAL_DEMO_STATE = {
  clubName: "Campus Web3 & Tech Innovation Club",
  clubDescription:
    "Decentralized autonomous treasury for campus hackathons, open-source projects, and research equipment. Governed 100% democratically by students.",
  treasuryBalance: "6.50", // ETH
  quorumPercentage: 30,
  adminAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  currentUser: {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    balance: "12.45",
    isMember: true,
  },
  members: [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Admin (Deployer)
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Member 1 (Current User)
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Member 2 (Alex)
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // Member 3 (Sarah)
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", // Member 4 (David)
  ],
  proposals: [
    {
      id: 0,
      title: "Spring Hackathon Refreshments & Cloud VPS Credits",
      description:
        "Sponsorship for lunch, energy drinks, and cloud GPU compute credits for 60 participants in our 36-hour Web3 AI Hackathon.",
      amount: "1.25", // ETH
      recipient: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      proposer: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      createdAt: Math.floor(Date.now() / 1000) - 3600 * 20,
      votingDeadline: Math.floor(Date.now() / 1000) + 3600 * 28, // Active (ends in 28h)
      votesFor: 2,
      votesAgainst: 1,
      totalVotes: 3,
      userVoted: 1, // Current user voted FOR
      executed: false,
    },
    {
      id: 1,
      title: "IoT Robotics Lab: 10x ESP32 & LoRa Development Kits",
      description:
        "Hardware purchase for 10 microcontrollers, environmental sensors, and solder stations to support smart campus IoT student research projects.",
      amount: "0.85", // ETH
      recipient: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      proposer: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      createdAt: Math.floor(Date.now() / 1000) - 3600 * 48,
      votingDeadline: Math.floor(Date.now() / 1000) - 600, // Ended 10 mins ago -> Ready to execute!
      votesFor: 3,
      votesAgainst: 0,
      totalVotes: 3,
      userVoted: 1, // Voted FOR
      executed: false, // Passed, waiting to execute
    },
    {
      id: 2,
      title: "Ethereum Argentina Devcon Student Travel Grant",
      description:
        "Travel subsidy for 2 core contributors selected to present their zero-knowledge proofs research paper at Devcon.",
      amount: "2.00", // ETH
      recipient: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
      proposer: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
      createdAt: Math.floor(Date.now() / 1000) - 3600 * 96,
      votingDeadline: Math.floor(Date.now() / 1000) - 3600 * 24,
      votesFor: 4,
      votesAgainst: 0,
      totalVotes: 4,
      userVoted: 1,
      executed: true, // Already executed and transferred
    },
    {
      id: 3,
      title: "Exclusive Office VIP Chair Purchase",
      description:
        "Proposal to purchase luxury ergonomic leather chairs for the club executive council room.",
      amount: "3.50", // ETH
      recipient: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      proposer: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      createdAt: Math.floor(Date.now() / 1000) - 3600 * 72,
      votingDeadline: Math.floor(Date.now() / 1000) - 3600 * 12,
      votesFor: 1,
      votesAgainst: 3,
      totalVotes: 4,
      userVoted: 2, // Voted AGAINST
      executed: false, // Rejected by majority
    },
  ],
};
