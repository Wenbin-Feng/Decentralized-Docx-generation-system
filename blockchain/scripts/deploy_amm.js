const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const DEPLOYED_FILE = path.join(__dirname, "..", "deployed-addresses.json");
const SZTU_TOKEN_ADDRESS = "0x8Cfefa0C5CB669E329f271e02c94B7eF02a72681";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying AMM with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Verify SZTUToken exists
  const tokenCode = await hre.ethers.provider.getCode(SZTU_TOKEN_ADDRESS);
  if (tokenCode === "0x") {
    throw new Error("SZTUToken not found at " + SZTU_TOKEN_ADDRESS);
  }
  console.log("SZTUToken verified at:", SZTU_TOKEN_ADDRESS);

  // Deploy SZTUSwap
  console.log("\n--- Deploying SZTUSwap (AMM) ---");
  const SZTUSwap = await hre.ethers.getContractFactory("SZTUSwap");
  const swap = await SZTUSwap.deploy(SZTU_TOKEN_ADDRESS);
  await swap.waitForDeployment();
  const swapAddress = await swap.getAddress();
  console.log("SZTUSwap deployed to:", swapAddress);

  // Update deployed-addresses.json
  let deployed = {};
  if (fs.existsSync(DEPLOYED_FILE)) {
    deployed = JSON.parse(fs.readFileSync(DEPLOYED_FILE, "utf-8"));
  }
  deployed.contracts = deployed.contracts || {};
  deployed.contracts.SZTUSwap = {
    address: swapAddress,
    pair: "ETH/SZTU",
    fee: "0.3%",
    lpToken: "SZTU-LP",
  };
  deployed.links = deployed.links || {};
  deployed.links.SZTUSwap = `https://sepolia.etherscan.io/address/${swapAddress}`;
  fs.writeFileSync(DEPLOYED_FILE, JSON.stringify(deployed, null, 2) + "\n");
  console.log("Updated deployed-addresses.json");

  // Summary
  console.log("\n========== AMM Deployment Summary ==========");
  console.log("Network:         ", hre.network.name);
  console.log("SZTUSwap (AMM):  ", swapAddress);
  console.log("SZTUToken:       ", SZTU_TOKEN_ADDRESS);
  console.log("Pair:             ETH / SZTU");
  console.log("Fee:              0.3%");
  console.log("=============================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
