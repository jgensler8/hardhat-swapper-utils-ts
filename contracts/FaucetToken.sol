// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface TokenFaucet {
    function drip(address recipient, uint256 amount) external;
}

contract FaucetToken is ERC20, TokenFaucet {
    constructor(string memory symbol) ERC20("Fake", symbol) {
        // _mint(msg.sender, initialSupply);
    }

    function drip(address recipient, uint256 amount) override external {
        _mint(recipient, amount);
    }
}