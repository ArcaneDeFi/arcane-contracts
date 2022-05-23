// import { ethers } from "hardhat";
// import { Signer, Contract, BigNumber } from "ethers";
// import { expect } from "chai";

// describe("TokenPreset", function () {
//   let owner: Signer;
//   let member: Signer;
//   let members: Signer[];
//   let arcaneToken: Contract;

//   const TOKEN_NAME: String = "Arcane Token";
//   const TOKEN_SYMBOL: String = "ARC";
//   const TOTAL_SUPPLY: BigNumber = ethers.utils.parseEther("100000000");

//   beforeEach(async function () {
//     [owner, member, ...members] = await ethers.getSigners();
//     const ArcaneToken = await ethers.getContractFactory("TokenPreset");
//     arcaneToken = await ArcaneToken.deploy(TOKEN_NAME, TOKEN_SYMBOL);
//   });

//   describe("Initialization", function () {
//     it("should deploy with correct token name", async function () {
//       expect(await arcaneToken.name()).to.be.equal(TOKEN_NAME);
//       expect(await arcaneToken.symbol()).to.be.equal(TOKEN_SYMBOL);
//     });
//     it("should mint total supply correctly", async function () {
//       expect(await arcaneToken.balanceOf(owner.getAddress())).to.be.equal(TOTAL_SUPPLY);
//     });
//   });

  
// });