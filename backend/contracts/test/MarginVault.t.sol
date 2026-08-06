// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MarginVault} from "../src/MarginVault.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract MockEthUsdPriceFeed {
    uint8 public constant decimals = 8;

    int256 private _answer = 3_000e8;
    uint256 private _updatedAt;
    uint80 private _roundId = 1;

    constructor() {
        _updatedAt = block.timestamp;
    }

    function setAnswer(int256 answer) external {
        _answer = answer;
        _updatedAt = block.timestamp;
        _roundId++;
    }

    function setUpdatedAt(uint256 updatedAt) external {
        _updatedAt = updatedAt;
        _roundId++;
    }

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (_roundId, _answer, 0, _updatedAt, _roundId);
    }
}

contract MarginVaultTest is Test {
    MockUSDC private usdc;
    MockEthUsdPriceFeed private priceFeed;
    MarginVault private vault;

    address private admin = address(0xA11CE);
    address private user = address(0xCAFE);

    function setUp() public {
        usdc = new MockUSDC();
        priceFeed = new MockEthUsdPriceFeed();
        vault = new MarginVault(address(usdc), admin, address(priceFeed));

        vm.deal(user, 10 ether);
    }

    function testDepositEthAsUsdcCreditsVirtualUsdc() public {
        vm.prank(user);
        vault.depositEthAsUsdc{value: 1 ether}();

        assertEq(vault.balances(user), 3_000e6);
        assertEq(vault.availableBalance(user), 3_000e6);
        assertEq(address(vault).balance, 1 ether);
    }

    function testWithdrawUsdcAsEthReturnsEthAndDebitsVirtualUsdc() public {
        vm.startPrank(user);
        vault.depositEthAsUsdc{value: 1 ether}();
        vault.withdrawUsdcAsEth(1_500e6);
        vm.stopPrank();

        assertEq(vault.balances(user), 1_500e6);
        assertEq(vault.availableBalance(user), 1_500e6);
        assertEq(address(vault).balance, 0.5 ether);
        assertEq(user.balance, 9.5 ether);
    }

    function testDepositUsesLatestOraclePrice() public {
        priceFeed.setAnswer(2_500e8);

        vm.prank(user);
        vault.depositEthAsUsdc{value: 1 ether}();

        assertEq(vault.balances(user), 2_500e6);
    }

    function testRejectsStaleOraclePrice() public {
        vm.warp(2 days);
        priceFeed.setUpdatedAt(block.timestamp - vault.MAX_PRICE_STALENESS() - 1);

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(MarginVault.StaleOraclePrice.selector, block.timestamp - vault.MAX_PRICE_STALENESS() - 1));
        vault.depositEthAsUsdc{value: 1 ether}();
    }

    function testRejectsInvalidOraclePrice() public {
        priceFeed.setAnswer(0);

        vm.prank(user);
        vm.expectRevert(MarginVault.InvalidOraclePrice.selector);
        vault.depositEthAsUsdc{value: 1 ether}();
    }
}
