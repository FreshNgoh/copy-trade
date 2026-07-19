// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MasterTraderRegistry} from "../src/MasterTraderRegistry.sol";

contract MasterTraderRegistryTest is Test {
    MasterTraderRegistry private registry;

    address private admin = address(0xA11CE);
    address private verifier = address(0xBEEF);
    address private trader = address(0x7A3D);
    address private unauthorized = address(0xBAD);

    event MasterTraderVerified(
        address indexed trader,
        address indexed verifier,
        uint256 totalTrades,
        int256 roi,
        uint256 tradingVolume,
        uint256 verifiedAt
    );

    function setUp() public {
        registry = new MasterTraderRegistry(admin, verifier);
    }

    function testDeployment() public view {
        assertTrue(registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(registry.hasRole(registry.MASTER_VERIFIER_ROLE(), verifier));
        assertFalse(registry.isVerifiedMaster(trader));
    }

    function testVerifierCanVerifyMaster() public {
        vm.prank(verifier);
        registry.verifyMaster(trader, 10, 100_000, 10_000e6);

        assertTrue(registry.isVerifiedMaster(trader));

        MasterTraderRegistry.MasterVerification memory verification = registry.getMasterVerification(trader);
        assertTrue(verification.verified);
        assertEq(verification.verifiedBy, verifier);
        assertEq(verification.totalTrades, 10);
        assertEq(verification.roi, 100_000);
        assertEq(verification.tradingVolume, 10_000e6);
    }

    function testUnauthorizedCannotVerifyMaster() public {
        vm.prank(unauthorized);
        vm.expectRevert(abi.encodeWithSelector(MasterTraderRegistry.UnauthorizedVerifier.selector, unauthorized));
        registry.verifyMaster(trader, 10, 100_000, 10_000e6);
    }

    function testCannotVerifyZeroTrader() public {
        vm.prank(verifier);
        vm.expectRevert(MasterTraderRegistry.InvalidTrader.selector);
        registry.verifyMaster(address(0), 10, 100_000, 10_000e6);
    }

    function testCannotVerifyTwice() public {
        vm.startPrank(verifier);
        registry.verifyMaster(trader, 10, 100_000, 10_000e6);

        vm.expectRevert(abi.encodeWithSelector(MasterTraderRegistry.AlreadyVerified.selector, trader));
        registry.verifyMaster(trader, 10, 100_000, 10_000e6);
        vm.stopPrank();
    }

    function testRejectsInsufficientClosedTrades() public {
        vm.prank(verifier);
        vm.expectRevert(abi.encodeWithSelector(MasterTraderRegistry.InsufficientClosedTrades.selector, 9));
        registry.verifyMaster(trader, 9, 100_000, 10_000e6);
    }

    function testRejectsInsufficientRoi() public {
        vm.prank(verifier);
        vm.expectRevert(abi.encodeWithSelector(MasterTraderRegistry.InsufficientRoi.selector, int256(99_999)));
        registry.verifyMaster(trader, 10, 99_999, 10_000e6);
    }

    function testRejectsInsufficientTradingVolume() public {
        vm.prank(verifier);
        vm.expectRevert(
            abi.encodeWithSelector(MasterTraderRegistry.InsufficientTradingVolume.selector, uint256(9_999e6))
        );
        registry.verifyMaster(trader, 10, 100_000, 9_999e6);
    }

    function testEventEmission() public {
        vm.warp(1_783_456_789);

        vm.prank(verifier);
        vm.expectEmit(true, true, false, true, address(registry));
        emit MasterTraderVerified(trader, verifier, 10, 100_000, 10_000e6, block.timestamp);
        registry.verifyMaster(trader, 10, 100_000, 10_000e6);
    }
}
