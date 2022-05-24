const { ether } = require("@openzeppelin/test-helpers");
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory, Signer, constants } from "ethers";

import {
  a,
  getCurrentTimestamp,
  setCurrentTime,
  snapshot,
  restore,
} from "./utils/utils";

describe("Pool", async () => {
  const ZERO = 0;
  const VESTING_TYPE = {
    SWAP: 0,
    LINEAR_VESTING: 1,
    INTERVAL_VESTING: 2,
  };

  let poolFactory: ContractFactory;
  let wrappedTokenFactory: ContractFactory;

  let pool: Contract;
  let depositToken: Contract;
  let rewardToken: Contract;

  let owner: Signer;
  let admin: Signer;
  let user1: Signer;
  let user2: Signer;
  let user3: Signer;
  let signer: Signer;
  let otherAccounts: Signer[];

  let snapshotId: any;

  let name = "Arcane V";
  let totalSypply = ether("4375000").toString();
  let initialUnlockPercentage = ether("10").toString();
  let tokenPrice = ether("0.2").toString();
  let minAllocation = ether("500").toString();
  let maxAllocation = ether("3000").toString();
  let periodNumber = 5;
  let periodDuration = 2592000;
  let startBalance = ether("100000000").toString();
  let depositeAmount = ether("3000").toString();

  beforeEach(async () => {
    [owner, admin, signer, user1, user2, user3, ...otherAccounts] =
      await ethers.getSigners();

    poolFactory = await ethers.getContractFactory("Pool");
    wrappedTokenFactory = await ethers.getContractFactory("WrappedToken");

    rewardToken = await wrappedTokenFactory.deploy(
      "Arcane",
      "ARC",
      18,
      ether("100000000").toString()
    );
    depositToken = await wrappedTokenFactory.deploy("USDT", "USDT", 6, ZERO);

    pool = await poolFactory.deploy(
      name,
      rewardToken.address,
      depositToken.address,
      initialUnlockPercentage,
      minAllocation,
      maxAllocation,
      VESTING_TYPE.LINEAR_VESTING
    );

    await rewardToken.approve(pool.address, totalSypply);
    await pool.initializeToken(tokenPrice, totalSypply);
    await pool.setVesting(periodDuration, periodNumber, 0, []);

    await depositToken.approve(pool.address, ether("1000000000").toString());

    await depositToken
      .connect(user1)
      .approve(pool.address, ether("1000000000").toString());

    await depositToken
      .connect(user2)
      .approve(pool.address, ether("1000000000").toString());

    await depositToken.mint(await a(user1), ether("100000000").toString());

    await depositToken.mint(await a(user2), ether("100000000").toString());

    await pool.setTimePoint(
      (await getCurrentTimestamp()) + 1000000,
      (await getCurrentTimestamp()) + 2000000
    );

    await pool.getTimePoint();
    await setCurrentTime((await getCurrentTimestamp()) + 1010000);

    await pool.connect(user1).deposit(depositeAmount);

    snapshotId = await snapshot();
  });

  afterEach(async () => {
    await restore(snapshotId);
  });

  describe("Deposite", async () => {
    describe("Should be fail if incorrect amount", async () => {
      it("if more then max allocation", async () => {
        await expect(
          pool.connect(user2).deposit(ether("5000").toString())
        ).to.be.revertedWith("Invalid amount");
      });
      it("if less then min allocation", async () => {
        await expect(
          pool.connect(user2).deposit(ether("0.5").toString())
        ).to.be.revertedWith("Invalid amount");
      });
      it("if more then remaining allocation", async () => {
        await expect(
          pool.connect(user1).deposit(ether("10").toString())
        ).to.be.revertedWith("Invalid amount");
      });
      it("if more then remaining allocation", async () => {
        let pool = await poolFactory.deploy(
          name,
          rewardToken.address,
          depositToken.address,
          initialUnlockPercentage,
          0,
          ether("100").toString(),
          VESTING_TYPE.LINEAR_VESTING
        );

        await rewardToken.approve(pool.address, totalSypply);

        await pool.initializeToken(
          ether("1").toString(),
          ether("100").toString()
        );

        await depositToken.mint(await a(user1), ether("100000000").toString());

        await depositToken
          .connect(user1)
          .approve(pool.address, ether("100").toString());
        await depositToken
          .connect(user2)
          .approve(pool.address, ether("100").toString());

        await pool.setTimePoint(
          (await getCurrentTimestamp()) + 100,
          (await getCurrentTimestamp()) + 200000
        );

        await setCurrentTime((await getCurrentTimestamp()) + 150000);

        await pool.connect(user1).deposit(ether("100").toString());

        await expect(
          pool.connect(user2).deposit(ether("10").toString())
        ).to.be.revertedWith("Invalid amount");
      });
    });

    it("if reward token decimals are less than staked token", async () => {
      let depositToken = await wrappedTokenFactory.deploy(
        "USDT",
        "USDT",
        30,
        ZERO
      );
      let pool = await poolFactory.deploy(
        name,
        rewardToken.address,
        depositToken.address,
        initialUnlockPercentage,
        0,
        ether("100").toString(),
        VESTING_TYPE.LINEAR_VESTING
      );

      await rewardToken.approve(pool.address, totalSypply);

      await pool.initializeToken(
        ether("1").toString(),
        ether("100").toString()
      );

      await depositToken.mint(
        await a(user1),
        ether("10000000000000000000000").toString()
      );

      await depositToken
        .connect(owner)
        .approve(pool.address, ether("10000000000000000000000").toString());

      await depositToken
        .connect(user1)
        .approve(pool.address, ether("10000000000000000000000").toString());

      await depositToken
        .connect(user2)
        .approve(pool.address, ether("10000000000000000000000").toString());

      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 100,
        (await getCurrentTimestamp()) + 200000
      );

      await setCurrentTime((await getCurrentTimestamp()) + 150000);

      expect(await pool.connect(user1).deposit(ether("100").toString()))
        .to.emit(pool, "Deposit")
        .withArgs(await a(user1), ether("100").toString());
    });

    it("if reward token decimals and staked token decimals are equal", async () => {
      let depositToken = await wrappedTokenFactory.deploy(
        "USDT",
        "USDT",
        18,
        ZERO
      );

      let pool = await poolFactory.deploy(
        name,
        rewardToken.address,
        depositToken.address,
        initialUnlockPercentage,
        0,
        ether("100").toString(),
        VESTING_TYPE.LINEAR_VESTING
      );

      await rewardToken.approve(pool.address, totalSypply);

      await pool.initializeToken(
        ether("1").toString(),
        ether("100").toString()
      );

      await depositToken.mint(await a(user1), ether("100000000").toString());

      await depositToken
        .connect(user1)
        .approve(pool.address, ether("100").toString());
      await depositToken
        .connect(user2)
        .approve(pool.address, ether("100").toString());

      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 100,
        (await getCurrentTimestamp()) + 200000
      );

      await setCurrentTime((await getCurrentTimestamp()) + 150000);

      expect(await pool.connect(user1).deposit(ether("100").toString()))
        .to.emit(pool, "Deposit")
        .withArgs(await a(user1), ether("100").toString());
    });
    it("Should be fail if pool is started", async () => {
      await setCurrentTime((await getCurrentTimestamp()) + 3000000);

      await expect(
        pool.connect(user2).deposit(depositeAmount)
      ).to.be.revertedWith("Sale is closed");
    });

    it("Check correct transfer", async () => {
      expect(await depositToken.balanceOf(await a(user1))).to.be.equal(
        ethers.BigNumber.from(startBalance).sub(
          ethers.BigNumber.from(depositeAmount).div(
            ethers.BigNumber.from("1000000000000")
          )
        )
      );
      expect(await depositToken.balanceOf(pool.address)).to.be.equal(
        ethers.BigNumber.from(depositeAmount).div(
          ethers.BigNumber.from("1000000000000")
        )
      );
    });
    it("Check correct deposited", async () => {
      expect(await pool.deposited(await a(user1))).to.be.equal(
        depositeAmount
      );
    });
    it("Check correct totalDeposited", async () => {
      await pool.connect(user2).deposit(depositeAmount);
      let obj = await pool.getInfo();
      let am = ethers.BigNumber.from(depositeAmount).add(
        ethers.BigNumber.from(depositeAmount)
      );
      expect(obj.totalDeposited).to.be.equal(am);
    });
    it("Check set nonce", async () => {
      expect(await pool.deposited(await a(user1))).to.be.equal(
        depositeAmount
      );
    });
  });

  describe("getAvailAmountToDeposit", async () => {
    it("Should return 0, 0 if all allocation used", async () => {
      let obj = await pool.getAvailAmountToDeposit(await a(user1));
      expect(obj.minAvailAllocation).to.be.equal(0);
      expect(obj.maxAvailAllocation).to.be.equal(0);
    });
    it("Should return 0, 0 if total currency is not bigger than total deposited", async () => {
      await setCurrentTime((await getCurrentTimestamp()) + 100000);
      let pool = await poolFactory.deploy(
        name,
        rewardToken.address,
        depositToken.address,
        initialUnlockPercentage,
        0,
        ether("10000000000").toString(),
        VESTING_TYPE.LINEAR_VESTING
      );

      await rewardToken.approve(pool.address, totalSypply);

      await pool.initializeToken(tokenPrice, totalSypply);

      await pool.setVesting(periodDuration, periodNumber, 0, []);

      await depositToken
        .connect(owner)
        .approve(pool.address, ether("1000000000").toString());
      await depositToken
        .connect(user1)
        .approve(pool.address, ether("1000000000").toString());

      await depositToken.mint(await a(user1), ether("100000000").toString());

      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 10000,
        (await getCurrentTimestamp()) + 200000
      );
      await setCurrentTime((await getCurrentTimestamp()) + 150000);
      let amountInUSD = ethers.BigNumber.from(totalSypply)
        .div(ethers.BigNumber.from(5))
        .toString();
      await pool.connect(user1).deposit(amountInUSD);
      let obj = await pool.getAvailAmountToDeposit(await a(user1));
      expect(obj.minAvailAllocation).to.be.equal(0);
      expect(obj.maxAvailAllocation).to.be.equal(0);

      await rewardToken.approve(pool.address, ether("1000").toString());
      await pool.increaseTotalSupply(ether("1000").toString());

      obj = await pool.getAvailAmountToDeposit(await a(user1));
      expect(obj.minAvailAllocation).to.be.equal(0);
      expect(obj.maxAvailAllocation).to.be.equal(ether("200").toString());
    });
    it("Should get correct if remaning is less the max allocaiton", async () => {
      await pool.connect(user2).deposit(ether("1500").toString());
      await pool.addDepositAmount(
        [await a(user1)],
        [ether("870000").toString()]
      );
      let obj = await pool.getAvailAmountToDeposit(await a(user2));
      expect(obj.minAvailAllocation).to.be.equal(0);
      expect(obj.maxAvailAllocation).to.be.equal(ether("500").toString());
    });
    it("Should success", async () => {
      let obj = await pool.getAvailAmountToDeposit(await a(user2));
      expect(obj.minAvailAllocation).to.be.equal(ether("500").toString());
      expect(obj.maxAvailAllocation).to.be.equal(ether("3000").toString());

      await pool.connect(user2).deposit(ether("1500").toString());

      obj = await pool.getAvailAmountToDeposit(await a(user2));
      expect(obj.minAvailAllocation).to.be.equal(0);
      expect(obj.maxAvailAllocation).to.be.equal(ether("1500").toString());
    });
  });

  describe("setVesting", async () => {
    it("Should revert if pool type is linear but count period of pool and period duration are zero", async () => {
      await expect(
        pool.setVesting(0, 0, 0, [
          [100000, ether("20").toString()],
          [200000, ether("50").toString()],
          [300000, ether("100").toString()],
        ])
      ).to.be.revertedWith("Incorrect linear vesting setup");
    });

    it("Should revert if interval unlocking part is invalid", async () => {
      let pool = await poolFactory.deploy(
        name,
        rewardToken.address,
        depositToken.address,
        initialUnlockPercentage,
        minAllocation,
        ether("10000000000").toString(),
        VESTING_TYPE.INTERVAL_VESTING
      );

      await expect(
        pool.setVesting(0, 0, 0, [
          [100000, ether("101").toString()],
          [200000, ether("50").toString()],
          [300000, ether("100").toString()],
        ])
      ).to.be.revertedWith("Invalid interval unlocking part");
    });

    it("Should set pool correctly", async () => {
      let pool = await poolFactory.deploy(
        name,
        rewardToken.address,
        depositToken.address,
        initialUnlockPercentage,
        minAllocation,
        ether("10000000000").toString(),
        VESTING_TYPE.INTERVAL_VESTING
      );

      await pool.setVesting(0, 0, 0, [
        [100000, ether("20").toString()],
        [200000, ether("50").toString()],
        [300000, ether("100").toString()],
      ]);
    });

    it("Should revert if last interval unlocking part is invalid", async () => {
      let pool = await poolFactory.deploy(
        name,
        rewardToken.address,
        depositToken.address,
        initialUnlockPercentage,
        minAllocation,
        ether("10000000000").toString(),
        VESTING_TYPE.INTERVAL_VESTING
      );

      await expect(
        pool.setVesting(0, 0, 0, [
          [100000, ether("20").toString()],
          [200000, ether("50").toString()],
        ])
      ).to.be.revertedWith("Invalid interval unlocking part");
    });

    it("Should revert if interval starting timestamp is invalid", async () => {
      let pool = await poolFactory.deploy(
        name,
        rewardToken.address,
        depositToken.address,
        initialUnlockPercentage,
        minAllocation,
        ether("10000000000").toString(),
        VESTING_TYPE.INTERVAL_VESTING
      );

      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 1000000,
        (await getCurrentTimestamp()) + 2000000
      );

      await expect(
        pool.setVesting(0, 0, 0, [
          [500000, ether("20").toString()],
          [200000, ether("50").toString()],
          [300000, ether("100").toString()],
        ])
      ).to.be.revertedWith("Invalid interval starting timestamp");
    });
  });

  describe("addDepositAmount", async () => {
    it("Should revert if caller not owner", async () => {
      await expect(
        pool
          .connect(user1)
          .addDepositAmount([await a(user1)], [ether("10000").toString()])
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Should revert if arr length incorrect", async () => {
      await expect(
        pool.addDepositAmount(
          [await a(user1)],
          [ether("10000").toString(), ether("10000").toString()]
        )
      ).to.be.revertedWith("Incorrect array length");
    });
    it("Should revert if pool is started", async () => {
      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 100,
        (await getCurrentTimestamp()) + 2000
      );
      await setCurrentTime((await getCurrentTimestamp()) + 10000);

      await expect(
        pool.addDepositAmount([await a(user1)], [ether("100").toString()])
      ).to.be.revertedWith("Sale is closed");
    });
    it("Should fail if not have enough allocation", async () => {
      await expect(
        pool.addDepositAmount(
          [await a(user1), await a(user2), await a(user3)],
          [
            ether("10000").toString(),
            ether("52000").toString(),
            ether("10000000").toString(),
          ]
        )
      ).to.be.revertedWith("Not enough allocation");
    });
    it("Should correct set amount", async () => {
      await pool.addDepositAmount(
        [await a(user1), await a(user2), await a(user3)],
        [
          ether("10000").toString(),
          ether("10000").toString(),
          ether("52000").toString(),
        ]
      );
      expect(await pool.deposited(await a(user1))).to.be.equal(
        ether("13000").toString()
      );
      expect(await pool.deposited(await a(user2))).to.be.equal(
        ether("10000").toString()
      );
      expect(await pool.deposited(await a(user3))).to.be.equal(
        ether("52000").toString()
      );
    });
    it("Should correct change totalDeposited", async () => {
      await pool.addDepositAmount(
        [await a(user1), await a(user2), await a(user3)],
        [
          ether("10000").toString(),
          ether("50000").toString(),
          ether("50000").toString(),
        ]
      );
      let obj = await pool.getInfo();
      expect(obj.totalDeposited).to.be.equal(ether("113000").toString());
    });
    it("Should success when not enough gas with skip part fo array [skip-on-coverage]", async () => {
      let tx = await pool.addDepositAmount(
        [await a(user1), await a(user2), await a(user3), await a(owner)],
        [
          ether("100").toString(),
          ether("100").toString(),
          ether("100").toString(),
          ether("100").toString(),
        ]
      );
      let obj = await pool.getInfo();
      expect(obj.totalDeposited).to.be.equal(ether("3400").toString());
      expect(await pool.deposited(await a(user1))).to.be.equal(
        ether("3100").toString()
      );
      expect(await pool.deposited(await a(user2))).to.be.equal(
        ether("100").toString()
      );
      expect(await pool.deposited(await a(user3))).to.be.equal(
        ether("100").toString()
      );
      expect(await pool.deposited(await a(owner))).to.be.equal(
        ether("100").toString()
      );
      expect(tx)
        .to.emit(pool, "Deposits")
        .withArgs([
          await a(user1),
          await a(user2),
          await a(user3),
          await a(owner),
        ]);
    });
  });

  it("GetInfo", async () => {
    let obj = await pool.getInfo();
    expect(obj.name).to.be.equal(name);
    expect(obj.stakedToken).to.be.equal(depositToken.address);
    expect(obj.rewardToken).to.be.equal(rewardToken.address);
    expect(obj.minAllocation).to.be.equal(minAllocation);
    expect(obj.totalSupply).to.be.equal(totalSypply);
    expect(obj.maxAllocation).to.be.equal(maxAllocation);
    expect(obj.totalDeposited).to.be.equal(ether("3000").toString());
    expect(obj.tokenPrice).to.be.equal(tokenPrice);
    expect(obj.vestingType).to.be.equal(VESTING_TYPE.LINEAR_VESTING);
    expect(obj.initialUnlockPercentage).to.be.equal(initialUnlockPercentage);
  });

  describe("Deployed", async () => {
    it("Should revert initializing token if was initialized before", async () => {
      expect(
        pool.initializeToken(tokenPrice, totalSypply)
      ).to.be.revertedWith("Is was initialized before");
    });
    it("Should revert if total supply incorrect", async () => {
      let pool = await poolFactory.deploy(
        name,
        rewardToken.address,
        depositToken.address,
        initialUnlockPercentage,
        minAllocation,
        maxAllocation,
        VESTING_TYPE.INTERVAL_VESTING
      );

      await expect(pool.initializeToken(tokenPrice, 0)).to.be.revertedWith(
        "Incorrect amount"
      );
    });
    it("Should revert if rewardToken incorrect", async () => {
      await expect(
        poolFactory.deploy(
          name,
          constants.AddressZero,
          depositToken.address,
          initialUnlockPercentage,
          minAllocation,
          maxAllocation,
          VESTING_TYPE.INTERVAL_VESTING
        )
      ).to.be.revertedWith("Incorrect token address");
    });
    it("Should revert if deposit token incorrect", async () => {
      await expect(
        poolFactory.deploy(
          name,
          rewardToken.address,
          constants.AddressZero,
          initialUnlockPercentage,
          minAllocation,
          maxAllocation,
          VESTING_TYPE.INTERVAL_VESTING
        )
      ).to.be.revertedWith("Incorrect token address");
    });

    it("Should revert if token price incorrect", async () => {
      let pool = await poolFactory.deploy(
        name,
        rewardToken.address,
        depositToken.address,
        initialUnlockPercentage,
        minAllocation,
        maxAllocation,
        VESTING_TYPE.LINEAR_VESTING
      );

      await expect(pool.initializeToken(0, totalSypply)).to.be.revertedWith(
        "Incorrect amount"
      );
    });
    it("Should revert if allocation incorrect", async () => {
      await expect(
        poolFactory.deploy(
          name,
          rewardToken.address,
          depositToken.address,
          initialUnlockPercentage,
          minAllocation,
          0,
          VESTING_TYPE.LINEAR_VESTING
        )
      ).to.be.revertedWith("Incorrect allocation");
      await expect(
        poolFactory.deploy(
          name,
          rewardToken.address,
          depositToken.address,
          initialUnlockPercentage,
          10,
          5,
          VESTING_TYPE.LINEAR_VESTING
        )
      ).to.be.revertedWith("Incorrect allocation");
    });
    it("Should revert if initial percentage incorrect", async () => {
      let initialUnlockPercentage = ether("101").toString();
      await expect(
        poolFactory.deploy(
          name,
          rewardToken.address,
          depositToken.address,
          initialUnlockPercentage,
          minAllocation,
          maxAllocation,
          VESTING_TYPE.LINEAR_VESTING
        )
      ).to.be.revertedWith("Incorrect initial percentage");
    });
  });

  describe("getBalanceInfo", async () => {
    it("Should return zero if zero deposited", async () => {
      let obj = await pool.getBalanceInfo(await a(user3));
      expect(obj.lockedBalance).to.be.equal(0);
      expect(obj.unlockedBalance).to.be.equal(0);
    });
    it("Should return all balance how locked, if pool don't start", async () => {
      let obj = await pool.getBalanceInfo(await a(user1));
      expect(obj.lockedBalance).to.be.equal(ether("15000").toString());
      expect(obj.unlockedBalance).to.be.equal(0);
    });
    it("Should return all unlocked balance if pool started", async () => {
      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 100,
        (await getCurrentTimestamp()) + 200000
      );
      await setCurrentTime((await getCurrentTimestamp()) + 1000000000);
      let obj = await pool.getBalanceInfo(await a(user1));
      expect(obj.lockedBalance).to.be.equal(0);
      expect(obj.unlockedBalance).to.be.equal(ether("15000").toString());
    });
    it("Should return correct after harvest and by month linear", async () => {
      let perMonth = ether("2700").toString();
      let tenPercent = ether("1500").toString();
      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 10,
        (await getCurrentTimestamp()) + 11
      );
      await setCurrentTime((await getCurrentTimestamp()) + 100);

      let obj = await pool.getBalanceInfo(await a(user1));
      expect(obj.unlockedBalance).to.be.equal(tenPercent);
      expect(obj.lockedBalance).to.be.equal(
        ethers.BigNumber.from(ether("15000").toString()).sub(
          ethers.BigNumber.from(tenPercent)
        )
      );

      await pool.connect(user1).harvest();

      await setCurrentTime((await getCurrentTimestamp()) + 2592000);

      obj = await pool.getBalanceInfo(await a(user1));
      expect(obj.unlockedBalance).to.be.equal(perMonth);
      expect(obj.lockedBalance).to.be.equal(
        ethers.BigNumber.from(ether("15000").toString())
          .sub(ethers.BigNumber.from(tenPercent))
          .sub(ethers.BigNumber.from(perMonth))
      );

      await setCurrentTime((await getCurrentTimestamp()) + 2 * 2592000);
      obj = await pool.getBalanceInfo(await a(user1));
      expect(obj.unlockedBalance).to.be.equal(
        ethers.BigNumber.from(perMonth).mul(ethers.BigNumber.from(3))
      );
      expect(obj.lockedBalance).to.be.equal(
        ethers.BigNumber.from(ether("15000").toString())
          .sub(ethers.BigNumber.from(tenPercent))
          .sub(ethers.BigNumber.from(perMonth).mul(ethers.BigNumber.from(3)))
      );
      await pool.connect(user1).harvest();
      await setCurrentTime((await getCurrentTimestamp()) + 5 * 2592000);
      obj = await pool.getBalanceInfo(await a(user1));
      expect(obj.lockedBalance).to.be.equal(0);
      expect(obj.unlockedBalance).to.be.equal(
        ethers.BigNumber.from(perMonth).mul(ethers.BigNumber.from(2))
      );
    });
  });

  describe("increaseTotalSupply", async () => {
    it("Should increase total supply correctly", async () => {
      let amount = ether("300").toString();
      await rewardToken.approve(pool.address, amount);
      expect(await pool.increaseTotalSupply(amount))
        .to.emit(pool, "IncreaseTotalSupply")
        .withArgs(amount);
    });
  });

  describe("setTimePoint", async () => {
    it("Should revert setting if start date will be later than end date", async () => {
      expect(pool.setTimePoint(10, 5)).to.be.revertedWith("Incorrect dates");
    });
  });

  describe("setSpecificAllocation", async () => {
    it("Should set specific allocation correctly", async () => {
      let amount = ether("100").toString();
      let result = await pool.setSpecificAllocation(
        [await a(user1), await a(user2)],
        [amount, amount],
        { gasLimit: 100000 }
      );

      expect(result)
        .to.emit(pool, "SetSpecificAllocation")
        .withArgs([await a(user1), await a(user2)], [amount, amount]);
    });

    it("Check specific allocation for user", async () => {
      let obj = await pool.getAvailAmountToDeposit(await a(user1));
      expect(obj.minAvailAllocation).to.be.equal(0);
      expect(obj.maxAvailAllocation).to.be.equal(0);

      obj = await pool.getAvailAmountToDeposit(await a(user2));
      expect(obj.minAvailAllocation).to.be.equal(minAllocation);
      expect(obj.maxAvailAllocation).to.be.equal(maxAllocation);

      await pool.setSpecificAllocation(
        [await a(user1)],
        [ether("10000").toString()],
        {
          gasLimit: 150000,
        }
      );

      obj = await pool.getAvailAmountToDeposit(await a(user1));
      expect(obj.minAvailAllocation).to.be.equal(0);
      expect(obj.maxAvailAllocation).to.be.equal(ether("7000").toString());

      obj = await pool.getAvailAmountToDeposit(await a(user2));
      expect(obj.minAvailAllocation).to.be.equal(minAllocation);
      expect(obj.maxAvailAllocation).to.be.equal(maxAllocation);
    });

    it("Should revert if arrays have different size", async () => {
      let amount = ether("100").toString();
      await expect(
        pool.setSpecificAllocation(
          [await a(user1), await a(user2), await a(user3)],
          [amount, amount]
        )
      ).to.be.revertedWith("Different array size");
    });
    it("Should fail when not enough gas with skip part fo array [skip-on-coverage]", async () => {
      expect(
        pool.setSpecificAllocation(
          [await a(user1), await a(user2), await a(user3), await a(owner)],
          [
            ether("100").toString(),
            ether("100").toString(),
            ether("100").toString(),
            ether("100").toString(),
          ],
          { gasLimit: 75000 }
        )
      ).to.be.revertedWith("Transaction ran out of gas");
    });
  });

  describe("setSpecificVesting", async () => {
    it("Should set specific pool correctly", async () => {
      let pool = await poolFactory.deploy(
        name,
        rewardToken.address,
        depositToken.address,
        initialUnlockPercentage,
        minAllocation,
        maxAllocation,
        VESTING_TYPE.LINEAR_VESTING
      );

      await pool.setSpecificVesting(
        await a(user3),
        periodDuration,
        periodNumber,
        0,
        []
      );
    });

    it("Should revert if it was initialized before", async () => {
      let pool = await poolFactory.deploy(
        name,
        rewardToken.address,
        depositToken.address,
        initialUnlockPercentage,
        minAllocation,
        maxAllocation,
        VESTING_TYPE.LINEAR_VESTING
      );

      await pool.setSpecificVesting(
        await a(user3),
        periodDuration,
        periodNumber,
        0,
        []
      );
      expect(
        pool.setSpecificVesting(
          await a(user3),
          periodDuration,
          periodNumber,
          0,
          []
        )
      ).to.be.revertedWith("It was initialized before");
    });
  });

  describe("harvest", async () => {
    it("Should revert if pool can't be started", async () => {
      expect(pool.connect(user1).harvest()).to.be.revertedWith(
        "Vesting can't be started"
      );
    });
    it("Should correct transfer amount", async () => {
      let tenPercent = ether("1500").toString();
      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 10,
        (await getCurrentTimestamp()) + 11
      );
      await setCurrentTime((await getCurrentTimestamp()) + 100);
      await pool.connect(user1).harvest();
      expect(await rewardToken.balanceOf(await a(user1))).to.be.equal(
        tenPercent
      );
    });
  });

  describe("completeVesting", async () => {
    it("Should revert if caller not owner", async () => {
      await expect(pool.connect(user1).completeVesting()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("Should revert if pool can't be started", async () => {
      await expect(pool.completeVesting()).to.be.revertedWith(
        "Vesting cannot be started"
      );
    });
    it("Should revert if Withdraw funds was called before", async () => {
      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 100,
        (await getCurrentTimestamp()) + 2000
      );
      await setCurrentTime((await getCurrentTimestamp()) + 10000);
      await pool.completeVesting();
      await expect(pool.completeVesting()).to.be.revertedWith(
        "Completing was called before"
      );
    });
    it("No need to transfer tokens when everything is sold", async () => {
      let pool = await poolFactory.deploy(
        name,
        rewardToken.address,
        depositToken.address,
        initialUnlockPercentage,
        0,
        ether("100").toString(),
        VESTING_TYPE.LINEAR_VESTING
      );

      await rewardToken.approve(pool.address, totalSypply);
      await pool.initializeToken(
        ether("1").toString(),
        ether("100").toString()
      );
      await pool.setVesting(periodDuration, periodNumber, 0, []);
      await depositToken.mint(await a(user1), ether("100000000").toString());
      await depositToken
        .connect(user1)
        .approve(pool.address, ether("100").toString());
      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 100,
        (await getCurrentTimestamp()) + 200000
      );
      await setCurrentTime((await getCurrentTimestamp()) + 150000);
      await pool.connect(user1).deposit(ether("100").toString());

      await setCurrentTime((await getCurrentTimestamp()) + 250000);
      let tokenSupply = await rewardToken.totalSupply();

      await pool.completeVesting();
      expect(await rewardToken.totalSupply()).to.be.equal(tokenSupply);
    });
    it("Should correct transfer amount", async () => {
      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 100,
        (await getCurrentTimestamp()) + 2000
      );
      await setCurrentTime((await getCurrentTimestamp()) + 10000);

      await pool.transferOwnership(await a(user3));
      await pool.connect(user3).completeVesting();
      expect(await depositToken.balanceOf(await a(user3))).to.be.equal(
        ethers.BigNumber.from(ether("3000").toString()).div(
          ethers.BigNumber.from(1000000000000)
        )
      );
      expect(await depositToken.balanceOf(pool.address)).to.be.equal(0);
    });
  });

  describe("harvestFor", async () => {
    it("Should correct transfer amount", async () => {
      let tenPercent = ether("1500").toString();
      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 10,
        (await getCurrentTimestamp()) + 11
      );
      await setCurrentTime((await getCurrentTimestamp()) + 100);
      await pool.harvestFor(await a(user1));
      expect(await rewardToken.balanceOf(await a(user1))).to.be.equal(
        tenPercent
      );
    });
  });

  describe("Test case", async () => {
    it("When VESTING_TYPE is SWAP", async () => {
      await setCurrentTime((await getCurrentTimestamp()) + 100000);
      let pool = await poolFactory.deploy(
        name,
        rewardToken.address,
        depositToken.address,
        initialUnlockPercentage,
        minAllocation,
        ether("10000000000").toString(),
        VESTING_TYPE.SWAP
      );

      await rewardToken.approve(pool.address, totalSypply);
      await pool.initializeToken(ether("0.1").toString(), totalSypply);
      await depositToken.approve(pool.address, ether("1000000000").toString());
      await depositToken
        .connect(user1)
        .approve(pool.address, ether("1000000000").toString());

      await depositToken.mint(await a(user1), ether("100000000").toString());

      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 100000,
        (await getCurrentTimestamp()) + 200000
      );
      await setCurrentTime((await getCurrentTimestamp()) + 150000);

      let amountInUSD = ether("137500").toString(); //  rate 1 : 0.1
      let balTokenBefo = await rewardToken.balanceOf(await a(user1));
      let tx = await pool.connect(user1).deposit(amountInUSD);

      expect(tx)
        .to.emit(pool, "Deposit")
        .withArgs(await a(user1), amountInUSD);

      expect(tx)
        .to.emit(pool, "Harvest")
        .withArgs(
          await a(user1),
          ethers.BigNumber.from(amountInUSD).mul(ethers.BigNumber.from(10))
        );

      expect(await pool.deposited(await a(user1))).to.be.equal(amountInUSD);

      expect(await pool.rewardsPaid(await a(user1))).to.be.equal(
        ethers.BigNumber.from(amountInUSD).mul(ethers.BigNumber.from(10))
      );

      expect(await rewardToken.balanceOf(await a(user1))).to.be.equal(
        ethers.BigNumber.from(balTokenBefo).add(
          ethers.BigNumber.from(amountInUSD).mul(ethers.BigNumber.from(10))
        )
      );

      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 101000,
        (await getCurrentTimestamp()) + 200000
      );
      await setCurrentTime((await getCurrentTimestamp()) + 101100);

      let obj = await pool.getVestingInfo();
      expect(ethers.BigNumber.from(obj.periodDuration)).to.be.equal(ZERO);
      expect(ethers.BigNumber.from(obj.countPeriodOfVesting)).to.be.equal(ZERO);
      expect(obj.intervals).to.be.a("array");
      expect(obj.intervals).to.deep.equal([]);

      await setCurrentTime((await getCurrentTimestamp()) + 210000);

      await expect(pool.connect(user1).harvest()).to.be.revertedWith(
        "Amount is zero"
      );
    });
    it("When VESTING_TYPE is INTERVAL", async () => {
      let pool = await poolFactory.deploy(
        name,
        rewardToken.address,
        depositToken.address,
        initialUnlockPercentage,
        minAllocation,
        ether("10000000000").toString(),
        VESTING_TYPE.INTERVAL_VESTING
      );

      await rewardToken.approve(pool.address, totalSypply);

      await pool.initializeToken(ether("0.1").toString(), totalSypply);

      await pool.setVesting(0, 0, 0, [
        [(await getCurrentTimestamp()) + 100000, ether("20").toString()],
        [(await getCurrentTimestamp()) + 200000, ether("50").toString()],
        [(await getCurrentTimestamp()) + 300000, ether("100").toString()],
      ]);

      await depositToken.approve(pool.address, ether("1000000000")).toString();
      await depositToken
        .connect(user1)
        .approve(pool.address, ether("1000000000").toString());

      await depositToken.mint(await a(user1), ether("1000000").toString());

      let amountInUSD = ether("10000").toString(); //  rate 1 : 0.1
      let balTokenBefo = await rewardToken.balanceOf(await a(user1));
      await depositToken.mint(await a(user1), ether("100").toString());
      await depositToken.mint(await a(owner), ether("100").toString());

      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 10000,
        (await getCurrentTimestamp()) + 200000
      );
      await setCurrentTime((await getCurrentTimestamp()) + 150000);

      await depositToken.connect(user1).approve(pool.address, amountInUSD);

      let tx = await pool.connect(user1).deposit(amountInUSD);

      expect(tx)
        .to.emit(pool, "Deposit")
        .withArgs(await a(user1), amountInUSD);

      expect(await pool.deposited(await a(user1))).to.be.equal(amountInUSD);
      expect(await pool.rewardsPaid(await a(user1))).to.be.equal(ZERO);
      expect(await rewardToken.balanceOf(await a(user1))).to.be.equal(
        balTokenBefo
      );

      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 10000,
        (await getCurrentTimestamp()) + 200000
      );
      await setCurrentTime((await getCurrentTimestamp()) + 150000);

      await depositToken.connect(owner).approve(pool.address, amountInUSD);

      tx = await pool.deposit(amountInUSD);

      let obj = await pool.getVestingInfo();
      expect(ethers.BigNumber.from(obj.periodDuration)).to.be.equal(ZERO);
      expect(ethers.BigNumber.from(obj.countPeriodOfVesting)).to.be.equal(ZERO);
      expect(obj.intervals).to.be.a("array");

      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 10000,
        (await getCurrentTimestamp()) + 20000
      );

      await pool.setVesting(0, 0, 0, [
        [(await getCurrentTimestamp()) + 100000, ether("20").toString()],
        [(await getCurrentTimestamp()) + 200000, ether("50").toString()],
        [(await getCurrentTimestamp()) + 300000, ether("100").toString()],
      ]);

      obj = await pool.getBalanceInfo(await a(user1));
      expect(obj.lockedBalance).to.be.equal(ether("100000").toString());
      expect(obj.unlockedBalance).to.be.equal(ZERO);

      obj = await pool.getBalanceInfo(await a(owner));
      expect(obj.lockedBalance).to.be.equal(ether("100000").toString());
      expect(obj.unlockedBalance).to.be.equal(ZERO);

      await setCurrentTime((await getCurrentTimestamp()) + 20001);
      obj = await pool.getBalanceInfo(await a(user1));
      expect(obj.lockedBalance).to.be.equal(ether("90000").toString());
      expect(obj.unlockedBalance).to.be.equal(ether("10000").toString());

      obj = await pool.getBalanceInfo(await a(owner));
      expect(obj.lockedBalance).to.be.equal(ether("90000").toString());
      expect(obj.unlockedBalance).to.be.equal(ether("10000").toString());

      let balBeforeToken = await rewardToken.balanceOf(await a(user1));

      await pool.connect(user1).harvest();

      expect(await rewardToken.balanceOf(await a(user1))).to.be.equal(
        ethers.BigNumber.from(balBeforeToken).add(
          ethers.BigNumber.from(ether("10000").toString())
        )
      );

      await setCurrentTime((await getCurrentTimestamp()) + 200001);

      obj = await pool.getBalanceInfo(await a(user1));
      expect(obj.lockedBalance).to.be.equal(ether("50000").toString());
      expect(obj.unlockedBalance).to.be.equal(ether("40000").toString());

      obj = await pool.getBalanceInfo(await a(owner));
      expect(obj.lockedBalance).to.be.equal(ether("50000").toString());
      expect(obj.unlockedBalance).to.be.equal(ether("50000").toString());

      balBeforeToken = await rewardToken.balanceOf(await a(user1));

      await pool.connect(user1).harvest();

      expect(await rewardToken.balanceOf(await a(user1))).to.be.equal(
        ethers.BigNumber.from(balBeforeToken).add(
          ethers.BigNumber.from(ether("40000").toString())
        )
      );

      await expect(pool.connect(user1).harvest()).to.be.revertedWith(
        "Amount is zero"
      );

      await setCurrentTime((await getCurrentTimestamp()) + 8000001);

      obj = await pool.getBalanceInfo(await a(user1));
      expect(obj.lockedBalance).to.be.equal(ZERO);
      expect(obj.unlockedBalance).to.be.equal(ether("50000").toString());

      obj = await pool.getBalanceInfo(await a(owner));
      expect(obj.lockedBalance).to.be.equal(ZERO);
      expect(obj.unlockedBalance).to.be.equal(ether("100000").toString());

      balBeforeToken = await rewardToken.balanceOf(await a(user1));
      await pool.connect(user1).harvest();
      expect(await rewardToken.balanceOf(await a(user1))).to.be.equal(
        ethers.BigNumber.from(balBeforeToken).add(
          ethers.BigNumber.from(ether("50000").toString())
        )
      );
      balBeforeToken = await rewardToken.balanceOf(await a(owner));
      await pool.harvest();
      expect(await rewardToken.balanceOf(await a(owner))).to.be.equal(
        ethers.BigNumber.from(balBeforeToken).add(
          ethers.BigNumber.from(ether("100000").toString())
        )
      );

      await setCurrentTime((await getCurrentTimestamp()) + 9000001);

      await expect(pool.harvest()).to.be.revertedWith("Amount is zero");
      await expect(pool.connect(user1).harvest()).to.be.revertedWith(
        "Amount is zero"
      );
    });
    it("When one user bouth all tokens", async () => {
      await setCurrentTime((await getCurrentTimestamp()) + 100000);
      let pool = await poolFactory.deploy(
        name,
        rewardToken.address,
        depositToken.address,
        initialUnlockPercentage,
        minAllocation,
        ether("10000000000").toString(),
        VESTING_TYPE.LINEAR_VESTING
      );

      await rewardToken.approve(pool.address, totalSypply);
      await pool.initializeToken(tokenPrice, totalSypply);
      await pool.setVesting(periodDuration, periodNumber, 2592000, []);

      await depositToken.approve(pool.address, ether("1000000000").toString());
      await depositToken
        .connect(user1)
        .approve(pool.address, ether("1000000000").toString());

      await depositToken.mint(await a(user1), ether("100000000").toString());

      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 10000,
        (await getCurrentTimestamp()) + 200000
      );
      await setCurrentTime((await getCurrentTimestamp()) + 150000);

      let amountInUSD = ethers.BigNumber.from(totalSypply)
        .mul(ethers.BigNumber.from(ether("0.2").toString()))
        .div(ethers.BigNumber.from(ether("1").toString()))
        .toString();

      await pool.connect(user1).deposit(amountInUSD);

      expect(await pool.deposited(await a(user1))).to.be.equal(amountInUSD);

      let date = await getCurrentTimestamp();

      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 100000,
        (await getCurrentTimestamp()) + 200000
      );

      await setCurrentTime((await getCurrentTimestamp()) + 200010);

      await setCurrentTime((await getCurrentTimestamp()) + 2592000);

      await pool.connect(user1).harvest();

      expect(await rewardToken.balanceOf(await a(user1))).to.be.equal(
        ethers.BigNumber.from(totalSypply).div(ethers.BigNumber.from(10))
      );

      expect(await pool.rewardsPaid(await a(user1))).to.be.equal(
        ethers.BigNumber.from(totalSypply).div(ethers.BigNumber.from(10))
      );

      await setCurrentTime((await getCurrentTimestamp()) + 2592000);

      await pool.connect(user1).harvest();

      let perMonth = ether("787500").toString();
      expect(await rewardToken.balanceOf(await a(user1))).to.be.equal(
        ethers.BigNumber.from(totalSypply)
          .div(ethers.BigNumber.from(10))
          .add(ethers.BigNumber.from(perMonth))
      );
      expect(await pool.rewardsPaid(await a(user1))).to.be.equal(
        ethers.BigNumber.from(totalSypply)
          .div(ethers.BigNumber.from(10))
          .add(ethers.BigNumber.from(perMonth))
      );

      await setCurrentTime((await getCurrentTimestamp()) + 2592000);

      await pool.connect(user1).harvest();

      expect(await rewardToken.balanceOf(await a(user1))).to.be.equal(
        ethers.BigNumber.from(totalSypply)
          .div(ethers.BigNumber.from(10))
          .add(ethers.BigNumber.from(perMonth).mul(ethers.BigNumber.from(2)))
      );
      expect(await pool.rewardsPaid(await a(user1))).to.be.equal(
        ethers.BigNumber.from(totalSypply)
          .div(ethers.BigNumber.from(10))
          .add(ethers.BigNumber.from(perMonth).mul(ethers.BigNumber.from(2)))
      );

      await setCurrentTime((await getCurrentTimestamp()) + 2592000);

      await pool.connect(user1).harvest();

      expect(await rewardToken.balanceOf(await a(user1))).to.be.equal(
        ethers.BigNumber.from(totalSypply)
          .div(ethers.BigNumber.from(10))
          .add(ethers.BigNumber.from(perMonth).mul(ethers.BigNumber.from(3)))
      );
      expect(await pool.rewardsPaid(await a(user1))).to.be.equal(
        ethers.BigNumber.from(totalSypply)
          .div(ethers.BigNumber.from(10))
          .add(ethers.BigNumber.from(perMonth).mul(ethers.BigNumber.from(3)))
      );
      await setCurrentTime((await getCurrentTimestamp()) + 12592000 + 12592010);

      await pool.connect(user1).harvest();

      expect(await rewardToken.balanceOf(await a(user1))).to.be.equal(
        totalSypply
      );
      expect(await rewardToken.balanceOf(pool.address)).to.be.equal(0);
      expect(await pool.rewardsPaid(await a(user1))).to.be.equal(totalSypply);

      await setCurrentTime((await getCurrentTimestamp()) + 12592000);

      expect(pool.connect(user1).harvest()).to.be.revertedWith(
        "Amount is zero"
      );

      expect(await rewardToken.balanceOf(await a(user1))).to.be.equal(
        totalSypply
      );

      expect(await rewardToken.balanceOf(pool.address)).to.be.equal(0);

      expect(await pool.rewardsPaid(await a(user1))).to.be.equal(totalSypply);

      let bal = await depositToken.balanceOf(await a(owner));

      await pool.completeVesting();

      expect(await depositToken.balanceOf(await a(owner))).to.be.equal(
        ethers.BigNumber.from(bal).add(
          ethers.BigNumber.from(amountInUSD).div(
            ethers.BigNumber.from(1000000000000)
          )
        )
      );
    });
    it("More user with specific case", async () => {
      let user1Deposit = ether("53000").toString(); //265000
      let user2Deposit = ether("3000").toString(); //15000
      let user3Deposit = ether("3000").toString(); //15000

      await depositToken.mint(await a(user3), ether("100000000").toString());

      await depositToken.approve(pool.address, ether("1000000000").toString());

      await depositToken
        .connect(user1)
        .approve(pool.address, ether("1000000000").toString());

      await depositToken
        .connect(user2)
        .approve(pool.address, ether("1000000000").toString());

      await depositToken
        .connect(user3)
        .approve(pool.address, ether("1000000000").toString());

      await pool.addDepositAmount(
        [await a(user1)],
        [ether("50000").toString()]
      );
      let periodNumber = ethers.BigNumber.from(3);
      await pool.setSpecificVesting(
        await a(user3),
        periodDuration,
        periodNumber,
        0,
        []
      );

      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 10000,
        (await getCurrentTimestamp()) + 200000
      );

      await setCurrentTime((await getCurrentTimestamp()) + 150000);

      await pool.connect(user2).deposit(user2Deposit.toString());

      await pool.connect(user3).deposit(user3Deposit.toString());

      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 10,
        (await getCurrentTimestamp()) + 20
      );

      await setCurrentTime((await getCurrentTimestamp()) + 150000);

      let bal = await depositToken.balanceOf(await a(owner));
      await pool.completeVesting();
      await setCurrentTime((await getCurrentTimestamp()) + 30);

      let obj = await pool.getBalanceInfo(await a(user1));
      expect(obj.unlockedBalance).to.be.equal(ether("26500").toString());
      expect(obj.lockedBalance).to.be.equal(ether("238500").toString());

      await setCurrentTime((await getCurrentTimestamp()) + 5592000);

      obj = await pool.getBalanceInfo(await a(user1));
      expect(obj.unlockedBalance).to.be.equal(ether("121900").toString());
      expect(obj.lockedBalance).to.be.equal(ether("143100").toString());

      obj = await pool.getBalanceInfo(await a(user2));
      expect(obj.unlockedBalance).to.be.equal(ether("6900").toString());
      expect(obj.lockedBalance).to.be.equal(ether("8100").toString());

      obj = await pool.getBalanceInfo(await a(user3));
      expect(obj.unlockedBalance).to.be.equal(ether("10500").toString());
      expect(obj.lockedBalance).to.be.equal(ether("4500").toString());

      await pool.connect(user1).harvest();
      await pool.connect(user2).harvest();
      await pool.connect(user3).harvest();

      await setCurrentTime((await getCurrentTimestamp()) + 15592000);

      obj = await pool.getBalanceInfo(await a(user3));
      expect(obj.unlockedBalance).to.be.equal(ether("4500").toString());
      expect(obj.lockedBalance).to.be.equal(0);

      obj = await pool.getBalanceInfo(await a(user2));
      expect(obj.unlockedBalance).to.be.equal(ether("8100").toString());
      expect(obj.lockedBalance).to.be.equal(0);

      obj = await pool.getBalanceInfo(await a(user1));
      expect(obj.unlockedBalance).to.be.equal(ether("143100").toString());
      expect(obj.lockedBalance).to.be.equal(0);

      await pool.connect(user1).harvest();
      await pool.connect(user2).harvest();
      await pool.connect(user3).harvest();

      expect(await rewardToken.balanceOf(await a(user3))).to.be.equal(
        ether("15000").toString()
      );
      expect(await rewardToken.balanceOf(await a(user2))).to.be.equal(
        ether("15000").toString()
      );
      expect(await rewardToken.balanceOf(await a(user1))).to.be.equal(
        ether("265000").toString()
      );

      expect(await rewardToken.balanceOf(pool.address)).to.be.equal(0);
      expect(await depositToken.balanceOf(pool.address)).to.be.equal(0);
      expect(await depositToken.balanceOf(await a(owner))).to.be.equal(
        ethers.BigNumber.from(bal).add(
          ethers.BigNumber.from(ether("9000").toString()).div(
            ethers.BigNumber.from(1000000000000)
          )
        )
      );

      await rewardToken.approve(pool.address, ether("1000").toString());

      expect(
        pool.increaseTotalSupply(ether("1000").toString())
      ).to.be.revertedWith("Vesting should be not completed");
    });

    it("Sales after increasing total supply", async () => {
      let user1Deposit = ether("275000").toString(); //1375000
      let user2Deposit = ether("300000").toString(); //1500000
      let user3Deposit = ether("300000").toString(); //1500000

      await depositToken.mint(await a(user3), ether("100000000").toString());

      await depositToken.approve(pool.address, ether("1000000000").toString());

      await depositToken
        .connect(user1)
        .approve(pool.address, ether("1000000000").toString());

      await depositToken
        .connect(user2)
        .approve(pool.address, ether("1000000000").toString());

      await depositToken
        .connect(user3)
        .approve(pool.address, ether("1000000000").toString());

      await pool.setSpecificAllocation(
        [await a(user1), await a(user2), await a(user3)],
        [
          ether("275000").toString(),
          ether("300000").toString(),
          ether("300000").toString(),
        ]
      );
      await pool.addDepositAmount(
        [await a(user1)],
        [ether("272000").toString()]
      );

      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 10000,
        (await getCurrentTimestamp()) + 200000
      );
      await setCurrentTime((await getCurrentTimestamp()) + 150000);

      await pool.connect(user2).deposit(user2Deposit.toString());

      await pool.connect(user3).deposit(user3Deposit.toString());

      await setCurrentTime((await getCurrentTimestamp()) + 15592000);

      let obj = await pool.getBalanceInfo(await a(user3));
      expect(obj.unlockedBalance).to.be.equal(ether("1500000").toString());
      expect(obj.lockedBalance).to.be.equal(0);

      obj = await pool.getBalanceInfo(await a(user2));
      expect(obj.unlockedBalance).to.be.equal(ether("1500000").toString());
      expect(obj.lockedBalance).to.be.equal(0);

      obj = await pool.getBalanceInfo(await a(user1));
      expect(obj.unlockedBalance).to.be.equal(ether("1375000").toString());
      expect(obj.lockedBalance).to.be.equal(0);

      await pool.connect(user1).harvest();
      await pool.connect(user2).harvest();
      await pool.connect(user3).harvest();

      expect(await rewardToken.balanceOf(await a(user3))).to.be.equal(
        ether("1500000").toString()
      );
      expect(await rewardToken.balanceOf(await a(user2))).to.be.equal(
        ether("1500000").toString()
      );
      expect(await rewardToken.balanceOf(await a(user1))).to.be.equal(
        ether("1375000").toString()
      );

      expect(await rewardToken.balanceOf(pool.address)).to.be.equal(0);

      await rewardToken.approve(
        pool.address,
        ether("1200000").toString()
      );
      await pool.increaseTotalSupply(ether("1200000").toString());

      user1Deposit = ether("120000").toString(); //600000
      user2Deposit = ether("90000").toString(); //450000
      user3Deposit = ether("30000").toString(); //150000
      await pool.setSpecificAllocation(
        [await a(user1), await a(user2), await a(user3)],
        [
          ether("1000000").toString(),
          ether("1000000").toString(),
          ether("1000000").toString(),
        ]
      );

      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 16592000,
        (await getCurrentTimestamp()) + 16692000
      );
      await setCurrentTime((await getCurrentTimestamp()) + 16600000);

      await pool.connect(user1).deposit(user1Deposit.toString());

      await pool.connect(user2).deposit(user2Deposit.toString());

      await pool.connect(user3).deposit(user3Deposit.toString());

      await setCurrentTime((await getCurrentTimestamp()) + 45592000);

      obj = await pool.getBalanceInfo(await a(user3));
      expect(obj.unlockedBalance).to.be.equal(ether("150000").toString());
      expect(obj.lockedBalance).to.be.equal(0);

      obj = await pool.getBalanceInfo(await a(user2));
      expect(obj.unlockedBalance).to.be.equal(ether("450000").toString());
      expect(obj.lockedBalance).to.be.equal(0);

      obj = await pool.getBalanceInfo(await a(user1));
      expect(obj.unlockedBalance).to.be.equal(ether("600000").toString());
      expect(obj.lockedBalance).to.be.equal(0);

      await pool.connect(user1).harvest();
      await pool.connect(user2).harvest();
      await pool.connect(user3).harvest();

      expect(await rewardToken.balanceOf(await a(user3))).to.be.equal(
        ethers.BigNumber.from(ether("150000").toString()).add(
          ethers.BigNumber.from(ether("1500000").toString())
        )
      );
      expect(await rewardToken.balanceOf(await a(user2))).to.be.equal(
        ethers.BigNumber.from(ether("450000").toString()).add(
          ethers.BigNumber.from(ether("1500000").toString())
        )
      );
      expect(await rewardToken.balanceOf(await a(user1))).to.be.equal(
        ethers.BigNumber.from(ether("600000").toString()).add(
          ethers.BigNumber.from(ether("1375000").toString())
        )
      );

      expect(await rewardToken.balanceOf(pool.address)).to.be.equal(0);

      await pool.completeVesting();

      await rewardToken.approve(pool.address, ether("1000").toString());

      expect(
        pool.increaseTotalSupply(ether("1000").toString())
      ).to.be.revertedWith("Vesting should be not completed");
    });
  });

  describe("With Cliff period, max allocation is zero, and specific allocation", async () => {
    it("Should correct calculate harvest", async () => {
      await setCurrentTime((await getCurrentTimestamp()) + 100000);

      let pool = await poolFactory.deploy(
        name,
        rewardToken.address,
        depositToken.address,
        initialUnlockPercentage,
        0,
        0,
        VESTING_TYPE.LINEAR_VESTING
      );

      await rewardToken.approve(pool.address, totalSypply);

      await pool.initializeToken(ether("0.1").toString(), totalSypply);

      await depositToken.approve(pool.address, ether("1000000000").toString());
      await depositToken
        .connect(user1)
        .approve(pool.address, ether("1000000000").toString());

      await depositToken.mint(await a(user1), ether("100000000").toString());

      await pool.setTimePoint(
        (await getCurrentTimestamp()) + 100000,
        (await getCurrentTimestamp()) + 200000
      );

      await pool.setVesting(100, 100, 10000, []);

      await setCurrentTime((await getCurrentTimestamp()) + 150000);

      let obj = await pool.getAvailAmountToDeposit(await a(user1));
      expect(obj.minAvailAllocation).to.be.equal(ZERO);
      expect(obj.maxAvailAllocation).to.be.equal(ZERO);

      let amountInUSD = ether("137500").toString(); //  rate 1 : 0.1
      let balTokenBefo = await rewardToken.balanceOf(await a(user1));

      await pool.setSpecificAllocation(
        [await a(user1)],
        [ether("137500").toString()]
      );

      obj = await pool.getAvailAmountToDeposit(await a(user1));
      expect(obj.minAvailAllocation).to.be.equal(ZERO);
      expect(obj.maxAvailAllocation).to.be.equal(ether("137500").toString());

      let tx = await pool.connect(user1).deposit(amountInUSD);

      expect(tx)
        .to.emit(pool, "Deposit")
        .withArgs(await a(user1), amountInUSD);

      expect(await pool.deposited(await a(user1))).to.be.equal(amountInUSD);
      expect(await pool.rewardsPaid(await a(user1))).to.be.equal(ZERO);

      obj = await pool.getAvailAmountToDeposit(await a(user1));
      expect(obj.minAvailAllocation).to.be.equal(ZERO);
      expect(obj.maxAvailAllocation).to.be.equal(ZERO);

      await setCurrentTime((await getCurrentTimestamp()) + 50010);

      await pool.setSpecificAllocation(
        [await a(user1), await a(user2)],
        [ether("137500").toString(), ether("137500").toString()]
      );

      obj = await pool.getBalanceInfo(await a(user1));
      expect(obj.lockedBalance).to.be.equal(ether("1375000").toString());
      expect(obj.unlockedBalance).to.be.equal(ZERO);

      await setCurrentTime((await getCurrentTimestamp()) + 10010);

      obj = await pool.getBalanceInfo(await a(user1));
      expect(obj.lockedBalance).to.be.equal(ether("1237500").toString());
      expect(obj.unlockedBalance).to.be.equal(ether("137500").toString());

      await setCurrentTime((await getCurrentTimestamp()) + 110);

      obj = await pool.getBalanceInfo(await a(user1));
      expect(obj.lockedBalance).to.be.equal(ether("1225125").toString());
      expect(obj.unlockedBalance).to.be.equal(ether("149875").toString());

      await pool.connect(user1).harvest();

      obj = await pool.getBalanceInfo(await a(user1));
      expect(obj.lockedBalance).to.be.equal(ether("1225125").toString());
      expect(obj.unlockedBalance).to.be.equal(ZERO);
      await setCurrentTime((await getCurrentTimestamp()) + 250101);

      obj = await pool.getBalanceInfo(await a(user1));
      expect(obj.lockedBalance).to.be.equal(ZERO);
      expect(obj.unlockedBalance).to.be.equal(ether("1225125").toString());

      await pool.connect(user1).harvest();

      obj = await pool.getBalanceInfo(await a(user1));
      expect(obj.lockedBalance).to.be.equal(ZERO);
      expect(obj.unlockedBalance).to.be.equal(ZERO);

      expect(pool.connect(user1).harvest()).to.be.revertedWith(
        "Amount is zero"
      );
    });
  });
});

// import { ethers } from "hardhat";
// import { Signer, Contract, BigNumber } from "ethers";
// import { expect } from "chai";

// describe("Pool", function () {
//   let owner: Signer;
//   let member: Signer;
//   let members: Signer[];
//   let arcaneToken: Contract;
//   let pool: Contract;
//   let rewardToken: Contract;
//   let depositToken: Contract;

//   const TOKEN_NAME: String = "Arcane Token";
//   const TOKEN_SYMBOL: String = "ARC";
//   const POOL_NAME: String = "Arcane Pool";
//   const INITIAL_PERCENTAGE: BigNumber = ethers.utils.parseEther("10");
//   const MIN_ALLOCATION: BigNumber = ethers.utils.parseEther("0"); // ETH
//   const MAX_ALLOCATION: BigNumber = ethers.utils.parseEther("1000"); // ETH
//   const TOKEN_PRICE: Number = 1; // USD
//   const TOTAL_REWARD_SUPPLY: BigNumber = ethers.utils.parseEther("1000000"); // ETH
//   const START_DATE: Number = +(Date.now()/1000 + 86400).toFixed(0);
//   const END_DATE: Number = +(Number(START_DATE) + 86400 * 7).toFixed(0); // + 1 week

//   const VestingType = {
//     SWAP: 0,
//     LINEAR_VESTING: 1,
//     INTERVAL_VESTING: 2
//   }
//   async function setCurrentTime(time: any): Promise<any> {
//     return await ethers.provider.send('evm_mine', [time]);
//   }

//   before(async function () {
//     [owner, member, ...members] = await ethers.getSigners();
//     const ArcaneToken = await ethers.getContractFactory("TokenPreset");
//     const Pool = await ethers.getContractFactory("Pool");
//     arcaneToken = await ArcaneToken.deploy(TOKEN_NAME, TOKEN_SYMBOL);
//     depositToken = await ArcaneToken.deploy("ABC TOKEN", "ABC");
//     rewardToken = arcaneToken;
//     pool = await Pool.deploy(
//       POOL_NAME,
//       rewardToken.address,
//       depositToken.address,
//       INITIAL_PERCENTAGE,
//       MIN_ALLOCATION,
//       MAX_ALLOCATION,
//       VestingType.LINEAR_VESTING
//     );

//     await arcaneToken.approve(pool.address, ethers.utils.parseEther("100000000"));

//     await pool.initializeToken(
//       TOKEN_PRICE,
//       TOTAL_REWARD_SUPPLY
//     );
//   });

//   describe("Initialization", function () {
//     it("should deploy with correct pool name", async function () {
//       expect((await pool.getInfo())[0]).to.be.equal(POOL_NAME);
//     });
//     it("should deploy with correct deposit token address", async function () {
//       expect((await pool.getInfo())[1]).to.be.equal(depositToken.address);
//     });
//     it("should deploy with correct reward token address", async function () {
//       expect((await pool.getInfo())[2]).to.be.equal(rewardToken.address);
//     });
//     it("should deploy with correct minimum allocation to deposit", async function () {
//       expect((await pool.getInfo())[3]).to.be.equal(MIN_ALLOCATION);
//     });
//     it("should deploy with correct maximum allocation to deposit", async function () {
//       expect((await pool.getInfo())[4]).to.be.equal(MAX_ALLOCATION);
//     });
//     it("should deploy with correct total reward supply", async function () {
//       expect((await pool.getInfo())[5]).to.be.equal(TOTAL_REWARD_SUPPLY);
//     });
//     it("should deploy with correct token price", async function () {
//       expect((await pool.getInfo())[7]).to.be.equal(TOKEN_PRICE.toString());
//     });
//     it("should deploy with correct initial unlock percentage", async function () {
//       expect((await pool.getInfo())[8]).to.be.equal(INITIAL_PERCENTAGE);
//     });
//   });

//   describe("increaseTotalSupply", function () {
//     it("should increase total supply correctly", async function () {
//       const increaseAmount: BigNumber = ethers.utils.parseEther("10");
//       const totalSupplyBefore: BigNumber = (await pool.getInfo())[5];
//       await pool.increaseTotalSupply(increaseAmount);
//       const totalSupplyAter: BigNumber = (await pool.getInfo())[5];
//       expect(totalSupplyAter).to.be.equal(totalSupplyBefore.add(increaseAmount));
//     });
//     it("should emit event", async function () {
//       expect(await pool.increaseTotalSupply("0")).to.emit(pool, "IncreaseTotalSupply").withArgs("0");
//     });
//   });

//   describe("setTimePoint", function () {
//     it("should revert if dates are incorrect", async function () {
//       await expect(pool.setTimePoint(END_DATE, START_DATE)).to.be.revertedWith("Incorrect dates");
//     });
//     it("should set dates of sale correctly", async function () {
//       await pool.setTimePoint(START_DATE, END_DATE);
//       expect((await pool.getTimePoint()).startDate).to.be.equal(START_DATE);
//       expect((await pool.getTimePoint()).endDate).to.be.equal(END_DATE);
//     });
//     it("should emit event", async function () {
//       expect(await pool.setTimePoint(START_DATE, END_DATE)).to.emit(pool, "SetTimePoint").withArgs(START_DATE, END_DATE);
//     });
//   });

//   describe("setSpecificAllocation", function () {
//     let allocationTx: any;
//     it("should revert if arrays have different lengths", async function () {
//       await expect(pool.setSpecificAllocation([ethers.constants.AddressZero], [0, 0]))
//         .to.be.revertedWith("Different array size");
//     });
//     it("should set specific allocations for some recipient correctly", async function () {
//       allocationTx = await pool.setSpecificAllocation([member.getAddress()], [ethers.utils.parseEther("100")]);
//       expect(await pool.specificAllocation(member.getAddress())).to.be.equal(ethers.utils.parseEther("100"));
//     });
//     it("should emit event", async function () {
//       expect(allocationTx).to.emit(pool, "SetSpecificAllocation").withArgs([member.getAddress()], [ethers.utils.parseEther("100")]);
//     });
//   });

//   describe("setVesting", function () {
//     describe("[LINEAR_VESTING]", function () {
//       it("should revert if period count or period durations is zero", async function () {
//         await expect(pool.setVesting(0, 0, 86400, []))
//           .to.be.revertedWith("Incorrect linear pool setup");
//       });
//       it("should set specific allocations for some recipient correctly", async function () {
//         await pool.setVesting(86400, 7, 86400, []);
//         expect((await pool.getVestingInfo()).periodDuration).to.be.equal(86400);
//         expect((await pool.getVestingInfo()).countPeriodOfVesting).to.be.equal(7);
//         expect((await pool.getVestingInfo()).intervals).to.deep.equal([]);
//       });
//     });
//   });

//   describe("deposit", function () {

//   });
// });
