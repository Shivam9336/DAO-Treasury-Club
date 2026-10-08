const hre = require("hardhat");

async function main() {
  const [deployer, member1, member2, member3] = await hre.ethers.getSigners();
  console.log("Seeding initial data for local development...");

  // Load deployed contract address from artifact if exists
  const ClubTreasuryDAO = await hre.ethers.getContractFactory("ClubTreasuryDAO");
  
  // Deploy fresh for seed script if run directly
  const dao = await ClubTreasuryDAO.deploy(
    "Blockchain & Tech Innovation Club",
    "Democratic community treasury for student projects, hackathons, and hardware equipment funding.",
    30,
    { value: hre.ethers.parseEther("8.0") }
  );
  await dao.waitForDeployment();
  const daoAddress = await dao.getAddress();
  console.log("Contract deployed at:", daoAddress);

  // Add members
  console.log("Adding club members...");
  await dao.connect(member1).joinClub();
  await dao.connect(member2).joinClub();
  await dao.connect(member3).joinClub();
  console.log("Registered 4 members (deployer, member1, member2, member3)");

  // Proposal 1: Active proposal with ongoing voting
  console.log("Creating Proposal 1: Hackathon Venue & Catering...");
  await dao.connect(member1).createProposal(
    "Hackathon Venue & Catering Support",
    "Funding required to sponsor lunch, coffee, and energy drinks for 50 attendees during our 36-hour Spring Web3 Hackathon.",
    hre.ethers.parseEther("1.25"),
    86400 // 1 day
  );
  // member2 votes FOR, member3 votes AGAINST
  await dao.connect(member2).vote(0, true);
  await dao.connect(member3).vote(0, false); // against

  // Proposal 2: Robotics & IoT Kit Purchase
  console.log("Creating Proposal 2: Hardware Sensor & Microcontroller Kits...");
  await dao.connect(member2).createProposal(
    "Hardware Sensor & ESP32 Microcontroller Kits",
    "Purchase 10x ESP32 boards, LoRa transceivers, and environmental sensors for club workshop hands-on sessions.",
    hre.ethers.parseEther("0.75"),
    172800 // 2 days
  );
  await dao.connect(deployer).vote(1, true);
  await dao.connect(member1).vote(1, true);

  // Proposal 3: Cloud Compute & RPC Node Cluster
  console.log("Creating Proposal 3: Dedicated RPC Node & Compute Servers...");
  await dao.connect(member3).createProposal(
    "Dedicated RPC Node & High-Performance Cloud VPS",
    "Quarterly subscription for a dedicated Ethereum and Polygon archive RPC endpoint to test dApp smart contract indexing.",
    hre.ethers.parseEther("2.0"),
    259200 // 3 days
  );
  await dao.connect(deployer).vote(2, true);

  console.log("\n>>> Seeding completed successfully!");
  console.log("Treasury Balance:", hre.ethers.formatEther(await dao.getTreasuryBalance()), "ETH");
  console.log("Total Proposals: 3");
  console.log("Total Members:", (await dao.memberCount()).toString());
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
