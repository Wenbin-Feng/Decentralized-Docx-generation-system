// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SZTUToken is ERC20, Ownable {
    uint256 public constant TOTAL_SUPPLY = 1_000_000 * 10 ** 18;

    constructor() ERC20("SZTU", "SZTU") Ownable(msg.sender) {
        _mint(msg.sender, TOTAL_SUPPLY);
    }
}
