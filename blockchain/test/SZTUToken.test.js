const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SZTUToken", function () {
  let token, owner, addr1;
  const TOTAL_SUPPLY = ethers.parseEther("1000000");

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const SZTUToken = await ethers.getContractFactory("SZTUToken");
    token = await SZTUToken.deploy();
    await token.waitForDeployment();
  });

  it("should have correct name and symbol", async function () {
    expect(await token.name()).to.equal("SZTU");
    expect(await token.symbol()).to.equal("SZTU");
  });

  it("should mint total supply to deployer", async function () {
    expect(await token.totalSupply()).to.equal(TOTAL_SUPPLY);
    expect(await token.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY);
  });

  it("should transfer tokens correctly", async function () {
    const amount = ethers.parseEther("900000");
    await token.transfer(addr1.address, amount);
    expect(await token.balanceOf(addr1.address)).to.equal(amount);
    expect(await token.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY - amount);
  });
});
