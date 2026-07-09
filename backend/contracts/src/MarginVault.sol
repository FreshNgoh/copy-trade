// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MarginVault {
    IERC20 public immutable usdc;

    mapping(address => uint256) public balances;
    mapping(address => uint256) public usedMargin;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event MarginLocked(address indexed user, uint256 amount);
    event MarginReleased(address indexed user, uint256 amount);

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Invalid amount");

        bool success = usdc.transferFrom(msg.sender, address(this), amount);

        require(success, "Transfer failed");

        balances[msg.sender] += amount;

        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "Invalid amount");
        require(availableBalance(msg.sender) >= amount, "Insufficient balance");

        balances[msg.sender] -= amount;

        bool success = usdc.transfer(msg.sender, amount);
        require(success, "Transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    function availableBalance(address user) public view returns (uint256) {
        return balances[user] - usedMargin[user];
    }

    function lockMargin(address user, uint256 amount) external {
        require(availableBalance(user) >= amount, "Insufficient margin");

        usedMargin[user] += amount;

        emit MarginLocked(user, amount);
    }

    function releaseMargin(address user, uint256 amount) external {
        require(usedMargin[user] >= amount, "Invalid release amount");

        usedMargin[user] -= amount;

        emit MarginReleased(user, amount);
    }
}
