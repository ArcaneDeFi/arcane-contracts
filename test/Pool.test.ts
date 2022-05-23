import { ethers } from "hardhat";
import { Signer, Contract, BigNumber } from "ethers";
import { expect } from "chai";

describe("Pool", function () {
  let owner: Signer;
  let member: Signer;
  let members: Signer[];
  let arcaneToken: Contract;
  let pool: Contract;
  let rewardToken: Contract;
  let depositToken: Contract;

  const TOKEN_NAME: String = "Arcane Token";
  const TOKEN_SYMBOL: String = "ARC";
  const POOL_NAME: String = "Arcane Pool";
  const INITIAL_PERCENTAGE: BigNumber = ethers.utils.parseEther("10");
  const MIN_ALLOCATION: BigNumber = ethers.utils.parseEther("0"); // ETH
  const MAX_ALLOCATION: BigNumber = ethers.utils.parseEther("1000"); // ETH
  const TOKEN_PRICE: Number = 1; // USD
  const TOTAL_REWARD_SUPPLY: BigNumber = ethers.utils.parseEther("1000000"); // ETH
  const START_DATE: Number = +(Date.now()/1000 + 86400).toFixed(0);
  const END_DATE: Number = +(Number(START_DATE) + 86400 * 7).toFixed(0); // + 1 week
  
  const VestingType = {
    SWAP: 0,
    LINEAR_VESTING: 1,
    INTERVAL_VESTING: 2
  }
  async function setCurrentTime(time: any): Promise<any> {
    return await ethers.provider.send('evm_mine', [time]);
  }

  before(async function () {
    [owner, member, ...members] = await ethers.getSigners();
    const ArcaneToken = await ethers.getContractFactory("TokenPreset");
    const Pool = await ethers.getContractFactory("Pool");
    arcaneToken = await ArcaneToken.deploy(TOKEN_NAME, TOKEN_SYMBOL);
    depositToken = await ArcaneToken.deploy("ABC TOKEN", "ABC");
    rewardToken = arcaneToken;
    pool = await Pool.deploy(
      POOL_NAME,
      rewardToken.address,
      depositToken.address,
      INITIAL_PERCENTAGE,
      MIN_ALLOCATION,
      MAX_ALLOCATION,
      VestingType.LINEAR_VESTING
    );

    await arcaneToken.approve(pool.address, ethers.utils.parseEther("100000000"));

    await pool.initializeToken(
      TOKEN_PRICE,
      TOTAL_REWARD_SUPPLY
    );
  });

  describe("Initialization", function () {
    it("should deploy with correct pool name", async function () {
      expect((await pool.getInfo())[0]).to.be.equal(POOL_NAME);
    });
    it("should deploy with correct deposite token address", async function () {
      expect((await pool.getInfo())[1]).to.be.equal(depositToken.address);
    });
    it("should deploy with correct reward token address", async function () {
      expect((await pool.getInfo())[2]).to.be.equal(rewardToken.address);
    });
    it("should deploy with correct minimum allocation to deposit", async function () {
      expect((await pool.getInfo())[3]).to.be.equal(MIN_ALLOCATION);
    });
    it("should deploy with correct maximum allocation to deposit", async function () {
      expect((await pool.getInfo())[4]).to.be.equal(MAX_ALLOCATION);
    });
    it("should deploy with correct total reward supply", async function () {
      expect((await pool.getInfo())[5]).to.be.equal(TOTAL_REWARD_SUPPLY);
    });
    it("should deploy with correct token price", async function () {
      expect((await pool.getInfo())[7]).to.be.equal(TOKEN_PRICE.toString());
    });
    it("should deploy with correct initial unlock percentage", async function () {
      expect((await pool.getInfo())[8]).to.be.equal(INITIAL_PERCENTAGE);
    });
  });

  describe("increaseTotalSupply", function () {
    it("should increase total supply correctly", async function () {
      const increaseAmount: BigNumber = ethers.utils.parseEther("10");
      const totalSupplyBefore: BigNumber = (await pool.getInfo())[5];
      await pool.increaseTotalSupply(increaseAmount);
      const totalSupplyAter: BigNumber = (await pool.getInfo())[5];
      expect(totalSupplyAter).to.be.equal(totalSupplyBefore.add(increaseAmount));
    });
    it("should emit event", async function () {
      expect(await pool.increaseTotalSupply("0")).to.emit(pool, "IncreaseTotalSupply").withArgs("0");
    });
  });

  describe("setTimePoint", function () {
    it("should revert if dates are incorrect", async function () {
      await expect(pool.setTimePoint(END_DATE, START_DATE)).to.be.revertedWith("Incorrect dates");
    });
    it("should set dates of sale correctly", async function () {
      await pool.setTimePoint(START_DATE, END_DATE);
      expect((await pool.getTimePoint()).startDate).to.be.equal(START_DATE);
      expect((await pool.getTimePoint()).endDate).to.be.equal(END_DATE);
    });
    it("should emit event", async function () {
      expect(await pool.setTimePoint(START_DATE, END_DATE)).to.emit(pool, "SetTimePoint").withArgs(START_DATE, END_DATE);
    });
  });

  describe("setSpecificAllocation", function () {
    let allocationTx: any;
    it("should revert if arrays have different lengths", async function () {
      await expect(pool.setSpecificAllocation([ethers.constants.AddressZero], [0, 0]))
        .to.be.revertedWith("Different array size");
    });
    it("should set specific allocations for some recipient correctly", async function () {
      allocationTx = await pool.setSpecificAllocation([member.getAddress()], [ethers.utils.parseEther("100")]);
      expect(await pool.specificAllocation(member.getAddress())).to.be.equal(ethers.utils.parseEther("100"));
    });
    it("should emit event", async function () {
      expect(allocationTx).to.emit(pool, "SetSpecificAllocation").withArgs([member.getAddress()], [ethers.utils.parseEther("100")]);
    });
  });

  describe("setVesting", function () {
    describe("[LINEAR_VESTING]", function () {
      it("should revert if period count or period durations is zero", async function () {
        await expect(pool.setVesting(0, 0, 86400, []))
          .to.be.revertedWith("Incorrect linear vesting setup");
      });
      it("should set specific allocations for some recipient correctly", async function () {
        await pool.setVesting(86400, 7, 86400, []);
        expect((await pool.getVestingInfo()).periodDuration).to.be.equal(86400);
        expect((await pool.getVestingInfo()).countPeriodOfVesting).to.be.equal(7);
        expect((await pool.getVestingInfo()).intervals).to.deep.equal([]);
      });
    });
  });

  describe("deposit", function () {
    
  });
});