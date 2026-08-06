// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {CopyTrading} from "../src/CopyTrading.sol";
import {MarginVault} from "../src/MarginVault.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract CopyTradingMockEthUsdPriceFeed {
    uint8 public constant decimals = 8;

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (1, 3_000e8, 0, block.timestamp, 1);
    }
}

contract CopyTradingTest is Test {
    MockUSDC private usdc;
    CopyTradingMockEthUsdPriceFeed private priceFeed;
    MarginVault private vault;
    CopyTrading private copyTrading;

    address private admin = address(0xA11CE);
    address private executor = address(0xE4EC);
    address private follower = address(0xF0110);
    address private trader = address(0x7A3D);
    address private unauthorized = address(0xBAD);

    bytes32 private constant BTC_USDC = "BTC/USDC";
    uint8 private constant DIRECTION_LONG = 0;
    uint8 private constant DIRECTION_SHORT = 1;
    uint256 private constant DEPOSIT = 1_000e6;

    function setUp() public {
        usdc = new MockUSDC();
        priceFeed = new CopyTradingMockEthUsdPriceFeed();
        vault = new MarginVault(address(usdc), admin, address(priceFeed));
        copyTrading = new CopyTrading(admin, executor, address(vault));

        bytes32 marginManagerRole = vault.MARGIN_MANAGER_ROLE();
        vm.prank(admin);
        vault.grantRole(marginManagerRole, address(copyTrading));

        usdc.mint(follower, DEPOSIT);
        vm.startPrank(follower);
        usdc.approve(address(vault), DEPOSIT);
        vault.deposit(DEPOSIT);
        copyTrading.setCopySettings({
            trader: trader,
            maxCopyAmount: 500e6,
            maxAllocationBps: 1_000,
            stopLossBps: 2_000,
            maxDailyTrades: 2,
            enabled: true
        });
        vm.stopPrank();
    }

    function testFollowerCanStoreCopySettings() public view {
        (bool enabled, uint256 maxCopyAmount, uint16 maxAllocationBps, uint16 stopLossBps, uint16 maxDailyTrades) =
            copyTrading.copySettings(follower, trader);

        assertTrue(enabled);
        assertEq(maxCopyAmount, 500e6);
        assertEq(maxAllocationBps, 1_000);
        assertEq(stopLossBps, 2_000);
        assertEq(maxDailyTrades, 2);
    }

    function testExecutorCanStoreCopySettingsForFollower() public {
        vm.prank(executor);
        copyTrading.setCopySettingsFor(follower, trader, 250e6, 1_500, 1_000, 5, true);

        (bool enabled, uint256 maxCopyAmount, uint16 maxAllocationBps, uint16 stopLossBps, uint16 maxDailyTrades) =
            copyTrading.copySettings(follower, trader);

        assertTrue(enabled);
        assertEq(maxCopyAmount, 250e6);
        assertEq(maxAllocationBps, 1_500);
        assertEq(stopLossBps, 1_000);
        assertEq(maxDailyTrades, 5);
    }

    function testUnauthorizedCannotStoreCopySettingsForFollower() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, unauthorized, copyTrading.EXECUTOR_ROLE()
            )
        );
        vm.prank(unauthorized);
        copyTrading.setCopySettingsFor(follower, trader, 250e6, 1_500, 1_000, 5, true);
    }

    function testExecutorCanPauseCopyForFollower() public {
        vm.prank(executor);
        copyTrading.pauseCopyFor(follower, trader);

        (bool enabled,,,,) = copyTrading.copySettings(follower, trader);
        assertFalse(enabled);
    }

    function testExecutorCanOpenCopiedTradeAndLockMargin() public {
        vm.prank(executor);
        uint256 positionId = copyTrading.openCopiedTrade({
            follower: follower,
            trader: trader,
            symbol: BTC_USDC,
            direction: DIRECTION_LONG,
            requestedMargin: 200e6,
            entryPrice: 65_000e2
        });

        assertEq(positionId, 1);
        assertEq(vault.usedMargin(follower), 100e6);
        assertEq(vault.availableBalance(follower), 900e6);
        assertEq(copyTrading.activeCopiedMargin(follower, trader), 100e6);

        (
            address storedFollower,
            address storedTrader,,,
            uint8 direction,
            bool open,
            bytes32 symbol,
            uint256 margin,
            uint256 entryPrice
        ) = copyTrading.copiedPositions(positionId);

        assertEq(storedFollower, follower);
        assertEq(storedTrader, trader);
        assertEq(direction, DIRECTION_LONG);
        assertTrue(open);
        assertEq(symbol, BTC_USDC);
        assertEq(margin, 100e6);
        assertEq(entryPrice, 65_000e2);
    }

    function testExecutorCanCloseCopiedTradeAndReleaseMargin() public {
        vm.startPrank(executor);
        uint256 positionId = copyTrading.openCopiedTrade({
            follower: follower,
            trader: trader,
            symbol: BTC_USDC,
            direction: DIRECTION_SHORT,
            requestedMargin: 50e6,
            entryPrice: 65_000e2
        });

        copyTrading.closeCopiedTrade(positionId);
        vm.stopPrank();

        assertEq(vault.usedMargin(follower), 0);
        assertEq(vault.availableBalance(follower), DEPOSIT);
        assertEq(copyTrading.activeCopiedMargin(follower, trader), 0);

        (,,,,, bool open,,,) = copyTrading.copiedPositions(positionId);
        assertFalse(open);
    }

    function testOnlyExecutorCanOpenCopiedTrade() public {
        bytes32 executorRole = copyTrading.EXECUTOR_ROLE();

        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, unauthorized, executorRole)
        );
        copyTrading.openCopiedTrade({
            follower: follower,
            trader: trader,
            symbol: BTC_USDC,
            direction: DIRECTION_LONG,
            requestedMargin: 100e6,
            entryPrice: 65_000e2
        });
    }

    function testVaultMarginCannotBeLockedDirectlyByUnauthorizedAccount() public {
        bytes32 marginManagerRole = vault.MARGIN_MANAGER_ROLE();

        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, unauthorized, marginManagerRole
            )
        );
        vault.lockMargin(follower, 100e6);
    }

    function testCannotOpenWhenCopyIsPaused() public {
        vm.prank(follower);
        copyTrading.pauseCopy(trader);

        vm.prank(executor);
        vm.expectRevert(abi.encodeWithSelector(CopyTrading.CopyDisabled.selector, follower, trader));
        copyTrading.openCopiedTrade({
            follower: follower,
            trader: trader,
            symbol: BTC_USDC,
            direction: DIRECTION_LONG,
            requestedMargin: 100e6,
            entryPrice: 65_000e2
        });
    }

    function testDailyTradeLimitIsEnforced() public {
        vm.startPrank(executor);
        copyTrading.openCopiedTrade({
            follower: follower,
            trader: trader,
            symbol: BTC_USDC,
            direction: DIRECTION_LONG,
            requestedMargin: 10e6,
            entryPrice: 65_000e2
        });
        copyTrading.openCopiedTrade({
            follower: follower,
            trader: trader,
            symbol: BTC_USDC,
            direction: DIRECTION_LONG,
            requestedMargin: 10e6,
            entryPrice: 65_000e2
        });

        vm.expectRevert(abi.encodeWithSelector(CopyTrading.DailyTradeLimitReached.selector, follower, trader));
        copyTrading.openCopiedTrade({
            follower: follower,
            trader: trader,
            symbol: BTC_USDC,
            direction: DIRECTION_LONG,
            requestedMargin: 10e6,
            entryPrice: 65_000e2
        });
        vm.stopPrank();
    }

    function testNewDayResetsDailyTradeLimit() public {
        vm.startPrank(executor);
        copyTrading.openCopiedTrade({
            follower: follower,
            trader: trader,
            symbol: BTC_USDC,
            direction: DIRECTION_LONG,
            requestedMargin: 10e6,
            entryPrice: 65_000e2
        });
        copyTrading.openCopiedTrade({
            follower: follower,
            trader: trader,
            symbol: BTC_USDC,
            direction: DIRECTION_LONG,
            requestedMargin: 10e6,
            entryPrice: 65_000e2
        });

        vm.warp(block.timestamp + 1 days);

        uint256 positionId = copyTrading.openCopiedTrade({
            follower: follower,
            trader: trader,
            symbol: BTC_USDC,
            direction: DIRECTION_LONG,
            requestedMargin: 10e6,
            entryPrice: 65_000e2
        });
        vm.stopPrank();

        assertEq(positionId, 3);
    }

    function testMaxCopyAmountCapsOpenCopiedMargin() public {
        vm.prank(follower);
        copyTrading.setCopySettings({
            trader: trader,
            maxCopyAmount: 75e6,
            maxAllocationBps: 10_000,
            stopLossBps: 2_000,
            maxDailyTrades: 2,
            enabled: true
        });

        vm.prank(executor);
        uint256 positionId = copyTrading.openCopiedTrade({
            follower: follower,
            trader: trader,
            symbol: BTC_USDC,
            direction: DIRECTION_LONG,
            requestedMargin: 250e6,
            entryPrice: 65_000e2
        });

        (,,,,,,, uint256 margin,) = copyTrading.copiedPositions(positionId);

        assertEq(margin, 75e6);
        assertEq(copyTrading.activeCopiedMargin(follower, trader), 75e6);
    }
}
