const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // --- 1. 部署 SZTUToken ---
  console.log("\n--- Deploying SZTUToken ---");
  const SZTUToken = await hre.ethers.getContractFactory("SZTUToken");
  const token = await SZTUToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("SZTUToken deployed to:", tokenAddress);

  const totalSupply = await token.totalSupply();
  console.log("Total supply:", hre.ethers.formatEther(totalSupply), "SZTU");

  // --- 2. 部署 MedicalService ---
  console.log("\n--- Deploying MedicalService ---");
  const MedicalService = await hre.ethers.getContractFactory("MedicalService");
  const service = await MedicalService.deploy(tokenAddress);
  await service.waitForDeployment();
  const serviceAddress = await service.getAddress();
  console.log("MedicalService deployed to:", serviceAddress);

  // --- 3. 转 100,000 SZTU 到 MedicalService 合约（用于新用户空投） ---
  const airdropPool = hre.ethers.parseEther("100000");
  console.log("\n--- Transferring 100,000 SZTU to MedicalService ---");
  const tx = await token.transfer(serviceAddress, airdropPool);
  await tx.wait();
  console.log("Transfer confirmed. Tx hash:", tx.hash);

  const serviceBalance = await token.balanceOf(serviceAddress);
  console.log("MedicalService balance:", hre.ethers.formatEther(serviceBalance), "SZTU");

  const deployerBalance = await token.balanceOf(deployer.address);
  console.log("Deployer remaining:", hre.ethers.formatEther(deployerBalance), "SZTU");

  const fee = await service.serviceFee();
  console.log("Service fee:", hre.ethers.formatEther(fee), "SZTU");

  const airdrop = await service.airdropAmount();
  console.log("Airdrop per user:", hre.ethers.formatEther(airdrop), "SZTU");

  // --- 汇总 ---
  console.log("\n========== Deployment Summary ==========");
  console.log("Network:            ", hre.network.name);
  console.log("SZTUToken:          ", tokenAddress);
  console.log("MedicalService:     ", serviceAddress);
  console.log("Deployer (owner):   ", deployer.address);
  console.log("Deployer balance:   ", hre.ethers.formatEther(deployerBalance), "SZTU");
  console.log("Contract balance:   ", hre.ethers.formatEther(serviceBalance), "SZTU (airdrop pool)");
  console.log("Service fee:        ", hre.ethers.formatEther(fee), "SZTU per report");
  console.log("Airdrop per user:    100 SZTU");
  console.log("Max airdrop users:   1,000");
  console.log("=========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
