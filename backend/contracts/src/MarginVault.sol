// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MarginVault is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant MARGIN_MANAGER_ROLE = keccak256("MARGIN_MANAGER_ROLE");
    uint256 public constant ETH_USDC_PRICE = 3_000e6;
    uint256 public constant USDC_DECIMALS = 1e6;

    IERC20 public immutable usdc;

    mapping(address => uint256) public balances;
    mapping(address => uint256) public usedMargin;

    event Deposited(address indexed user, uint256 amount);
    event EthDeposited(address indexed user, uint256 ethAmount, uint256 usdcAmount);
    event Withdrawn(address indexed user, uint256 amount);
    event EthWithdrawn(address indexed user, uint256 usdcAmount, uint256 ethAmount);
    event MarginLocked(address indexed user, uint256 amount);
    event MarginReleased(address indexed user, uint256 amount);

    error InvalidAddress();

    constructor(address _usdc, address admin) {
        if (_usdc == address(0) || admin == address(0)) revert InvalidAddress();

        usdc = IERC20(_usdc);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Invalid amount");

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        balances[msg.sender] += amount;

        emit Deposited(msg.sender, amount);
    }

    function depositEthAsUsdc() external payable {
        require(msg.value > 0, "Invalid amount");

        uint256 usdcAmount = ethToUsdc(msg.value);
        require(usdcAmount > 0, "Deposit too small");

        balances[msg.sender] += usdcAmount;

        emit EthDeposited(msg.sender, msg.value, usdcAmount);
        emit Deposited(msg.sender, usdcAmount);
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "Invalid amount");
        require(availableBalance(msg.sender) >= amount, "Insufficient balance");

        balances[msg.sender] -= amount;

        usdc.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    function withdrawUsdcAsEth(uint256 amount) external {
        require(amount > 0, "Invalid amount");
        require(availableBalance(msg.sender) >= amount, "Insufficient balance");

        uint256 ethAmount = usdcToEth(amount);
        require(address(this).balance >= ethAmount, "Insufficient vault ETH");

        balances[msg.sender] -= amount;

        (bool success,) = msg.sender.call{value: ethAmount}("");
        require(success, "ETH transfer failed");

        emit EthWithdrawn(msg.sender, amount, ethAmount);
        emit Withdrawn(msg.sender, amount);
    }

    function availableBalance(address user) public view returns (uint256) {
        return balances[user] - usedMargin[user];
    }

    function lockMargin(address user, uint256 amount) external onlyRole(MARGIN_MANAGER_ROLE) {
        require(availableBalance(user) >= amount, "Insufficient margin");

        usedMargin[user] += amount;

        emit MarginLocked(user, amount);
    }

    function releaseMargin(address user, uint256 amount) external onlyRole(MARGIN_MANAGER_ROLE) {
        require(usedMargin[user] >= amount, "Invalid release amount");

        usedMargin[user] -= amount;

        emit MarginReleased(user, amount);
    }

    function ethToUsdc(uint256 ethAmount) public pure returns (uint256) {
        return (ethAmount * ETH_USDC_PRICE) / 1 ether;
    }

    function usdcToEth(uint256 usdcAmount) public pure returns (uint256) {
        return (usdcAmount * 1 ether) / ETH_USDC_PRICE;
    }
}
