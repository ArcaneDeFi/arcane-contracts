// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TokenPreset is ERC20 {
    constructor(
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) {
        _mint(msg.sender, 100_000_000 * 10 ** decimals());
    }

    function mintArbitrary(address _to, uint256 _amount) external {
        _mint(_to, _amount);
    }
}