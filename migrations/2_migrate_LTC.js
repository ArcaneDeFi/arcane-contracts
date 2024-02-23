const { ether, BN } = require('@openzeppelin/test-helpers');

const TokenPreset = artifacts.require("TokenPreset");

module.exports = function(deployer, network, accounts) {

    deployer.then(async() => {

        let LTCToken = await deployer.deploy(TokenPreset, "Litecoin", "LTC");
        console.log("LTC", LTCToken.address);

    }).catch((err) => {
        console.error("ERROR", err);
    });
};