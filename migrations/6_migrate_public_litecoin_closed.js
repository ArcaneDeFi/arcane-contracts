const { ether, BN } = require('@openzeppelin/test-helpers');

const Pool = artifacts.require("Pool");
const ERC20 = artifacts.require("ERC20");

module.exports = function(deployer, network, accounts) {
    const VESTING_TYPE = {
        SWAP: new BN(0),
        LINEAR_VESTING: new BN(1),
        INTERVAL_VESTING: new BN(2)
    };

    const depositTokenAddress = "0x6582B7C8176A114bE6fEDb269d13C034627696c0";

    let name = "Harvest Litecoin";
    let totalSupply = ether("300000");
    let tokenPrice = ether("0.075");
    let vestingType = VESTING_TYPE.LINEAR_VESTING;
    let periodDuration = 1;
    let countPeriod = 3000000;
    let cliffDuration = 0;
    let initialUnlockPercentage = ether('0');
    let maxAllocation = ether("7500");
    let minAllocation = ether("0");
    let intervals = [];
    let startDate = 1653937200; // Mon May 30 2022 19:00:00 GMT+0000
    let endDate = 1653944400; //   Mon May 30 2022 21:00:00 GMT+0000

    deployer.then(async() => {

        rewardToken = await ERC20.at("0x97FAAB5525E9Ea166d227bd7d7d6F1893145208d");

        let vest = await deployer.deploy(Pool, name, rewardToken.address, depositTokenAddress, initialUnlockPercentage,
            minAllocation, maxAllocation, vestingType);

        console.log("Deployed!");
        console.log(name, vest.address);

        await vest.setTimePoint(startDate, endDate);
        console.log("Time Points!");

        await vest.setVesting(periodDuration, countPeriod, cliffDuration, intervals);
        console.log("Vesting setted!");

        await rewardToken.approve(vest.address, totalSupply);
        console.log("Approved!");

        await vest.initializeToken(tokenPrice, totalSupply);
        console.log("Token initialized!");

    }).catch((err) => {
        console.error("ERROR", err);
    });
};