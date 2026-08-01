// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MarginVault} from "../src/MarginVault.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract MarginVaultTest is Test {
    MockUSDC private usdc;
    MarginVault private vault;

    address private admin = address(0xA11CE);
    address private user = address(0xCAFE);

    function setUp() public {
        usdc = new MockUSDC();
        vault = new MarginVault(address(usdc), admin);

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
}
