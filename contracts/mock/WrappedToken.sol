// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WrappedToken is ERC20, Ownable {
  uint8 private _decimals;

  constructor(
    string memory name_,
    string memory symbol_,
    uint8 decimals_,
    uint256 mintAmount_
  ) ERC20(name_, symbol_) {
    _decimals = decimals_;
    _mint(msg.sender, mintAmount_);
  }

  function mint(address recipient_, uint256 amount_) external onlyOwner {
    _mint(recipient_, amount_);
  }

  function burn(address recipient_, uint256 amount_) external onlyOwner {
    _burn(recipient_, amount_);
  }

  function decimals() public view virtual override returns (uint8) {
    return _decimals;
  }
}
