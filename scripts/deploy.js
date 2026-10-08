const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("==================================================");
  console.log("Deploying ClubTreasuryDAO Contract");
  console.log("Deployer Address:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer Balance:", hre.ethers.formatEther(balance), "ETH");

  const clubName = "Blockchain & Tech Innovation Club";
  const clubDescription =
    "Democratic community treasury for student projects, hackathons, and hardware equipment funding.";
  const quorumPercentage = 30; // 30% of members required to vote
  const initialTreasuryFunding = hre.ethers.parseEther("5.0"); // Seed treasury with 5 ETH

  const ClubTreasuryDAO = await hre.ethers.getContractFactory("ClubTreasuryDAO");
  console.log("Deploying with 5.0 ETH initial funding & 30% quorum...");

  const dao = await ClubTreasuryDAO.deploy(
    clubName,
    clubDescription,
    quorumPercentage,
    { value: initialTreasuryFunding }
  );

  await dao.waitForDeployment();
  const daoAddress = await dao.getAddress();

  console.log("\n>>> ClubTreasuryDAO deployed successfully!");
  console.log(">>> Contract Address:", daoAddress);
  console.log(">>> Initial Treasury Balance:", hre.ethers.formatEther(await dao.getTreasuryBalance()), "ETH");
  console.log("==================================================");

  // Save deployment artifact and address for frontend consumption
  const contractsDir = path.join(__dirname, "..", "frontend", "src", "contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  const contractArtifact = await hre.artifacts.readArtifact("ClubTreasuryDAO");
  const deploymentInfo = {
    address: daoAddress,
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    clubName,
    quorumPercentage,
    abi: contractArtifact.abi,
  };

  fs.writeFileSync(
    path.join(contractsDir, "ClubTreasuryDAO.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("Exported contract ABI and address to frontend/src/contracts/ClubTreasuryDAO.json");

  return dao;
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
