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

    let name = "Arcane Simple Swap";
    let totalSupply = ether("750");
    let tokenPrice = ether("100");
    let vestingType = VESTING_TYPE.SWAP;
    let periodDuration = 86400;
    let countPeriod = 100;
    let cliffDuration = 0;
    let initialUnlockPercentage = ether('0');
    let maxAllocation = ether("500");
    let minAllocation = ether("0");
    let intervals = [];
    let startDate = 1653933600; // Mon May 30 2022 18:00:00 GMT+0000
    let endDate = 1656612000; //   Thu Jun 30 2022 18:00:00 GMT+0000

    deployer.then(async() => {

        rewardToken = await ERC20.at("0x31c43c8Adee697c9608FF77dE8fd408B6Ec52945");

        let vest = await deployer.deploy(Pool, name, rewardToken.address, depositTokenAddress, initialUnlockPercentage,
            minAllocation, maxAllocation, vestingType);
        console.log("Deployed!");

        console.log(name, vest.address);

        await vest.setTimePoint(startDate, endDate);
        console.log("Time Points!");

        await rewardToken.approve(vest.address, totalSupply);
        console.log("Approved!");

        await vest.initializeToken(tokenPrice, totalSupply);
        console.log("Token initialized!");

    }).catch((err) => {
        console.error("ERROR", err);
    });
};