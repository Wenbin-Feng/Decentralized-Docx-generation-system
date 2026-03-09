const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MedicalService", function () {
  let token, service, owner, user, user2;
  const SERVICE_FEE = ethers.parseEther("10");
  const AIRDROP_AMOUNT = ethers.parseEther("100");
  const CONTRACT_POOL = ethers.parseEther("100000"); // 10W 空投池

  beforeEach(async function () {
    [owner, user, user2] = await ethers.getSigners();

    const SZTUToken = await ethers.getContractFactory("SZTUToken");
    token = await SZTUToken.deploy();
    await token.waitForDeployment();

    const MedicalService = await ethers.getContractFactory("MedicalService");
    service = await MedicalService.deploy(await token.getAddress());
    await service.waitForDeployment();

    // 模拟部署脚本：转 10W SZTU 到合约作为空投池
    await token.transfer(await service.getAddress(), CONTRACT_POOL);
  });

  // ========== 注册空投测试 ==========

  describe("User Registration & Airdrop", function () {
    it("should airdrop 100 SZTU to new user", async function () {
      await expect(service.registerUser(user.address))
        .to.emit(service, "UserRegistered")
        .withArgs(user.address, AIRDROP_AMOUNT);

      expect(await token.balanceOf(user.address)).to.equal(AIRDROP_AMOUNT);
      expect(await service.isRegistered(user.address)).to.be.true;
    });

    it("should not allow double registration", async function () {
      await service.registerUser(user.address);
      await expect(
        service.registerUser(user.address)
      ).to.be.revertedWith("User already registered");
    });

    it("should only allow owner to register users", async function () {
      await expect(
        service.connect(user).registerUser(user2.address)
      ).to.be.reverted;
    });

    it("should fail if airdrop pool is empty", async function () {
      // 先把合约余额全部提走
      await service.withdrawTokens(owner.address, CONTRACT_POOL);
      await expect(
        service.registerUser(user.address)
      ).to.be.revertedWith("Insufficient airdrop balance");
    });
  });

  // ========== 报告生成测试 ==========

  describe("Report Generation", function () {
    beforeEach(async function () {
      // 注册用户，用户获得 100 SZTU
      await service.registerUser(user.address);
    });

    it("should have correct initial fee", async function () {
      expect(await service.serviceFee()).to.equal(SERVICE_FEE);
    });

    it("should generate report and deduct 10 SZTU", async function () {
      await token.connect(user).approve(await service.getAddress(), SERVICE_FEE);

      await expect(
        service.connect(user).generateReport("QmTestHash123")
      )
        .to.emit(service, "ReportRequested")
        .withArgs(0, user.address, "QmTestHash123", SERVICE_FEE, (v) => v > 0);

      expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("90"));
      expect(await service.totalReports()).to.equal(1);
    });

    it("should fail without approval", async function () {
      await expect(
        service.connect(user).generateReport("QmTestHash123")
      ).to.be.reverted;
    });

    it("should fail with empty report hash", async function () {
      await token.connect(user).approve(await service.getAddress(), SERVICE_FEE);
      await expect(
        service.connect(user).generateReport("")
      ).to.be.revertedWith("Report hash required");
    });

    it("should track user reports", async function () {
      await token.connect(user).approve(await service.getAddress(), ethers.parseEther("20"));

      await service.connect(user).generateReport("hash1");
      await service.connect(user).generateReport("hash2");

      const reports = await service.getUserReports(user.address);
      expect(reports.length).to.equal(2);
      expect(reports[0]).to.equal(0);
      expect(reports[1]).to.equal(1);
    });
  });

  // ========== 管理功能测试 ==========

  describe("Admin Functions", function () {
    it("should allow owner to update fee", async function () {
      const newFee = ethers.parseEther("20");
      await expect(service.updateServiceFee(newFee))
        .to.emit(service, "ServiceFeeUpdated")
        .withArgs(SERVICE_FEE, newFee);
      expect(await service.serviceFee()).to.equal(newFee);
    });

    it("should not allow non-owner to update fee", async function () {
      await expect(
        service.connect(user).updateServiceFee(ethers.parseEther("20"))
      ).to.be.reverted;
    });

    it("should allow owner to update airdrop amount", async function () {
      const newAmount = ethers.parseEther("200");
      await expect(service.updateAirdropAmount(newAmount))
        .to.emit(service, "AirdropAmountUpdated")
        .withArgs(AIRDROP_AMOUNT, newAmount);
      expect(await service.airdropAmount()).to.equal(newAmount);
    });

    it("should allow owner to withdraw tokens", async function () {
      // 先注册一个用户，产生一笔报告费
      await service.registerUser(user.address);
      await token.connect(user).approve(await service.getAddress(), SERVICE_FEE);
      await service.connect(user).generateReport("QmTestHash");

      const contractBalance = await service.getContractBalance();
      const ownerBefore = await token.balanceOf(owner.address);

      await service.withdrawTokens(owner.address, contractBalance);

      expect(await service.getContractBalance()).to.equal(0);
      expect(await token.balanceOf(owner.address)).to.equal(ownerBefore + contractBalance);
    });

    it("should not allow non-owner to withdraw", async function () {
      await expect(
        service.connect(user).withdrawTokens(user.address, ethers.parseEther("1"))
      ).to.be.reverted;
    });
  });
});
