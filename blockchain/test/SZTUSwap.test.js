const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SZTUSwap", function () {
  let token, swap, owner, alice, bob;
  const INITIAL_ETH = ethers.parseEther("10");
  const INITIAL_SZTU = ethers.parseEther("100000");

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    const SZTUToken = await ethers.getContractFactory("SZTUToken");
    token = await SZTUToken.deploy();
    await token.waitForDeployment();

    const SZTUSwap = await ethers.getContractFactory("SZTUSwap");
    swap = await SZTUSwap.deploy(await token.getAddress());
    await swap.waitForDeployment();

    // Give alice and bob some SZTU
    await token.transfer(alice.address, ethers.parseEther("200000"));
    await token.transfer(bob.address, ethers.parseEther("200000"));
  });

  describe("Add Liquidity", function () {
    it("should add initial liquidity and mint LP tokens", async function () {
      await token.connect(alice).approve(await swap.getAddress(), INITIAL_SZTU);
      await swap.connect(alice).addLiquidity(INITIAL_SZTU, { value: INITIAL_ETH });

      const [ethRes, sztuRes] = await swap.getReserves();
      expect(ethRes).to.equal(INITIAL_ETH);
      expect(sztuRes).to.equal(INITIAL_SZTU);

      const lpBalance = await swap.balanceOf(alice.address);
      expect(lpBalance).to.be.gt(0);
    });

    it("should add subsequent liquidity proportionally", async function () {
      await token.connect(alice).approve(await swap.getAddress(), INITIAL_SZTU);
      await swap.connect(alice).addLiquidity(INITIAL_SZTU, { value: INITIAL_ETH });

      const addEth = ethers.parseEther("5");
      const addSztu = ethers.parseEther("50000");
      await token.connect(bob).approve(await swap.getAddress(), addSztu);
      await swap.connect(bob).addLiquidity(addSztu, { value: addEth });

      const [ethRes, sztuRes] = await swap.getReserves();
      expect(ethRes).to.equal(INITIAL_ETH + addEth);
      expect(sztuRes).to.equal(INITIAL_SZTU + addSztu);

      expect(await swap.balanceOf(bob.address)).to.be.gt(0);
    });

    it("should revert with zero ETH", async function () {
      await token.connect(alice).approve(await swap.getAddress(), INITIAL_SZTU);
      await expect(
        swap.connect(alice).addLiquidity(INITIAL_SZTU, { value: 0 })
      ).to.be.revertedWith("ETH required");
    });

    it("should revert with zero SZTU", async function () {
      await expect(
        swap.connect(alice).addLiquidity(0, { value: INITIAL_ETH })
      ).to.be.revertedWith("SZTU required");
    });
  });

  describe("Remove Liquidity", function () {
    beforeEach(async function () {
      await token.connect(alice).approve(await swap.getAddress(), INITIAL_SZTU);
      await swap.connect(alice).addLiquidity(INITIAL_SZTU, { value: INITIAL_ETH });
    });

    it("should remove liquidity and return ETH + SZTU", async function () {
      const lpBalance = await swap.balanceOf(alice.address);
      const sztuBefore = await token.balanceOf(alice.address);

      await swap.connect(alice).removeLiquidity(lpBalance);

      expect(await swap.balanceOf(alice.address)).to.equal(0);
      const sztuAfter = await token.balanceOf(alice.address);
      expect(sztuAfter).to.be.gt(sztuBefore);
    });

    it("should revert with zero LP amount", async function () {
      await expect(
        swap.connect(alice).removeLiquidity(0)
      ).to.be.revertedWith("LP amount required");
    });

    it("should revert if user has insufficient LP", async function () {
      await expect(
        swap.connect(bob).removeLiquidity(ethers.parseEther("1"))
      ).to.be.revertedWith("Insufficient LP");
    });
  });

  describe("Swap ETH for SZTU", function () {
    beforeEach(async function () {
      await token.connect(alice).approve(await swap.getAddress(), INITIAL_SZTU);
      await swap.connect(alice).addLiquidity(INITIAL_SZTU, { value: INITIAL_ETH });
    });

    it("should swap ETH for SZTU", async function () {
      const swapAmount = ethers.parseEther("1");
      const expectedOut = await swap.getAmountOut(swapAmount, INITIAL_ETH, INITIAL_SZTU);

      const sztuBefore = await token.balanceOf(bob.address);
      await swap.connect(bob).swapETHForSZTU(0, { value: swapAmount });
      const sztuAfter = await token.balanceOf(bob.address);

      expect(sztuAfter - sztuBefore).to.equal(expectedOut);
    });

    it("should revert on slippage exceeded", async function () {
      const swapAmount = ethers.parseEther("1");
      const tooHighMin = ethers.parseEther("999999");
      await expect(
        swap.connect(bob).swapETHForSZTU(tooHighMin, { value: swapAmount })
      ).to.be.revertedWith("Slippage exceeded");
    });

    it("should revert with zero ETH", async function () {
      await expect(
        swap.connect(bob).swapETHForSZTU(0, { value: 0 })
      ).to.be.revertedWith("ETH required");
    });

    it("should update reserves after swap", async function () {
      const swapAmount = ethers.parseEther("1");
      await swap.connect(bob).swapETHForSZTU(0, { value: swapAmount });

      const [ethRes, sztuRes] = await swap.getReserves();
      expect(ethRes).to.equal(INITIAL_ETH + swapAmount);
      expect(sztuRes).to.be.lt(INITIAL_SZTU);
    });
  });

  describe("Swap SZTU for ETH", function () {
    beforeEach(async function () {
      await token.connect(alice).approve(await swap.getAddress(), INITIAL_SZTU);
      await swap.connect(alice).addLiquidity(INITIAL_SZTU, { value: INITIAL_ETH });
    });

    it("should swap SZTU for ETH", async function () {
      const sztuIn = ethers.parseEther("10000");
      const expectedOut = await swap.getAmountOut(sztuIn, INITIAL_SZTU, INITIAL_ETH);

      await token.connect(bob).approve(await swap.getAddress(), sztuIn);
      const ethBefore = await ethers.provider.getBalance(bob.address);
      const tx = await swap.connect(bob).swapSZTUForETH(sztuIn, 0);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const ethAfter = await ethers.provider.getBalance(bob.address);

      const ethReceived = ethAfter - ethBefore + gasUsed;
      expect(ethReceived).to.equal(expectedOut);
    });

    it("should revert on slippage exceeded", async function () {
      const sztuIn = ethers.parseEther("10000");
      const tooHighMin = ethers.parseEther("999");
      await token.connect(bob).approve(await swap.getAddress(), sztuIn);
      await expect(
        swap.connect(bob).swapSZTUForETH(sztuIn, tooHighMin)
      ).to.be.revertedWith("Slippage exceeded");
    });

    it("should revert with zero SZTU", async function () {
      await expect(
        swap.connect(bob).swapSZTUForETH(0, 0)
      ).to.be.revertedWith("SZTU required");
    });
  });

  describe("View Functions", function () {
    it("should return correct price", async function () {
      await token.connect(alice).approve(await swap.getAddress(), INITIAL_SZTU);
      await swap.connect(alice).addLiquidity(INITIAL_SZTU, { value: INITIAL_ETH });

      const price = await swap.getPrice();
      // 100000 SZTU / 10 ETH = 10000 SZTU per ETH
      expect(price).to.equal(ethers.parseEther("10000"));
    });

    it("should return zero price when no liquidity", async function () {
      expect(await swap.getPrice()).to.equal(0);
    });
  });

  describe("Edge Cases", function () {
    it("should reject direct ETH transfers", async function () {
      await expect(
        bob.sendTransaction({ to: await swap.getAddress(), value: ethers.parseEther("1") })
      ).to.be.revertedWith("Use swapETHForSZTU or addLiquidity");
    });

    it("should revert swap when no liquidity", async function () {
      await expect(
        swap.connect(bob).swapETHForSZTU(0, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("No liquidity");
    });
  });
});
