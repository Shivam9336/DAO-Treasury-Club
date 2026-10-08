// Configuration and Contract Definitions
export const CONTRACT_ADDRESSES = {
  // Sepolia Testnet default contract address (can also be updated via UI or env)
  sepolia: "0x39aEc3B41C2955931C2D430b8B007137f8841B9A",
  // Polygon Amoy Testnet
  amoy: "0x7894aBe782a22237D284F94C4c4E9F7fC8933b91",
  // Local Hardhat Node (ChainId 31337)
  localhost: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
};

export const SUPPORTED_NETWORKS = {
  11155111: {
    name: "Sepolia Testnet",
    currency: "SepoliaETH",
    explorer: "https://sepolia.etherscan.io",
    faucet: "https://sepoliafaucet.com",
  },
  80002: {
    name: "Polygon Amoy",
    currency: "MATIC",
    explorer: "https://amoy.polygonscan.com",
    faucet: "https://faucet.polygon.technology",
  },
  31337: {
    name: "Hardhat Localhost",
    currency: "ETH",
    explorer: "#",
    faucet: null,
  },
};
