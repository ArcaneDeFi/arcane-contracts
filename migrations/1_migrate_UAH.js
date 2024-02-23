const TokenPreset = artifacts.require("TokenPreset");

module.exports = function(deployer, network, accounts) {

    deployer.then(async() => {

        let UAHToken = await deployer.deploy(TokenPreset, "Hryvnia", "UAH");
        console.log("UAH", UAHToken.address);

    }).catch((err) => {
        console.error("ERROR", err);
    });
};