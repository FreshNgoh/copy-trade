// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {TradeHistory} from "../src/TradeHistory.sol";

contract TradeHistoryTest is Test {
    TradeHistory private tradeHistory;

    address private admin = address(0xA11CE);
    address private backend = address(0xBEEF);
    address private unauthorized = address(0xBAD);
    address private user = address(0xCAFE);

    bytes32 private constant BTC_USDC = "BTC/USDC";
    uint8 private constant DIRECTION_SHORT = 1;

    event TradeRecordStored(
        uint256 indexed tradeId,
        address indexed user,
        address indexed writer,
        bytes32 symbol,
        int256 pnl,
        int256 roi,
        uint8 source,
        address master,
        address follower
    );

    function setUp() public {
        tradeHistory = new TradeHistory(admin, backend);
    }

    function testDeployment() public view {
        assertEq(tradeHistory.nextTradeId(), 1);
        assertEq(tradeHistory.totalTrades(), 0);
        assertTrue(tradeHistory.hasRole(tradeHistory.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(tradeHistory.hasRole(tradeHistory.BACKEND_WRITER_ROLE(), backend));
    }

    function testOnlyAuthorizedWriterCanAddRecord() public {
        vm.prank(backend);
        uint256 tradeId = tradeHistory.addTradeRecord(_sampleRecord(user));

        assertEq(tradeId, 1);
        assertEq(tradeHistory.totalTrades(), 1);
    }

    function testUnauthorizedUserCannotAddRecord() public {
        vm.prank(unauthorized);
        vm.expectRevert(abi.encodeWithSelector(TradeHistory.UnauthorizedWriter.selector, unauthorized));
        tradeHistory.addTradeRecord(_sampleRecord(user));
    }

    function testUserTradeCountWorks() public {
        vm.startPrank(backend);
        tradeHistory.addTradeRecord(_sampleRecord(user));
        tradeHistory.addTradeRecord(_sampleRecord(user));
        tradeHistory.addTradeRecord(_sampleRecord(address(0xF00D)));
        vm.stopPrank();

        assertEq(tradeHistory.getUserTradeCount(user), 2);
        assertEq(tradeHistory.getUserTradeCount(address(0xF00D)), 1);
    }

    function testUserTradeIdsCanBeRetrieved() public {
        vm.startPrank(backend);
        tradeHistory.addTradeRecord(_sampleRecord(user));
        tradeHistory.addTradeRecord(_sampleRecord(address(0xF00D)));
        tradeHistory.addTradeRecord(_sampleRecord(user));
        vm.stopPrank();

        uint256[] memory tradeIds = tradeHistory.getUserTradeIds(user);

        assertEq(tradeIds.length, 2);
        assertEq(tradeIds[0], 1);
        assertEq(tradeIds[1], 3);
        assertEq(tradeHistory.getUserTradeIdAt(user, 1), 3);
    }

    function testTradeRecordDataIsCorrect() public {
        vm.prank(backend);
        uint256 tradeId = tradeHistory.addTradeRecord(_sampleRecord(user));

        TradeHistory.TradeRecord memory record = tradeHistory.getTradeRecord(tradeId);

        assertEq(record.user, user);
        assertEq(record.master, address(0));
        assertEq(record.follower, address(0));
        assertEq(record.openTime, 1_783_399_785);
        assertEq(record.closedTime, 1_783_400_255);
        assertEq(record.direction, tradeHistory.DIRECTION_SHORT());
        assertEq(record.source, tradeHistory.SOURCE_OWN());
        assertEq(record.quantityDecimals, 6);
        assertEq(record.priceDecimals, 2);
        assertEq(record.pnlDecimals, 2);
        assertEq(record.roiDecimals, 4);
        assertEq(record.symbol, BTC_USDC);
        assertEq(record.quantity, 50_000);
        assertEq(record.entryPrice, 6_364_060);
        assertEq(record.closingPrice, 6_353_045);
        assertEq(record.pnl, 550);
        assertEq(record.roi, 8_600);
        assertEq(record.grossPnl, 550);
        assertEq(record.masterReward, 0);
        assertEq(record.followerReward, 0);
    }

    function testEventEmission() public {
        TradeHistory.TradeRecord memory record = _sampleRecord(user);

        vm.prank(backend);
        vm.expectEmit(true, true, true, true, address(tradeHistory));
        emit TradeRecordStored(1, user, backend, BTC_USDC, 550, 8_600, 0, address(0), address(0));
        tradeHistory.addTradeRecord(record);
    }

    function _sampleRecord(address recordUser) private pure returns (TradeHistory.TradeRecord memory) {
        return TradeHistory.TradeRecord({
            user: recordUser,
            master: address(0),
            follower: address(0),
            openTime: 1_783_399_785,
            closedTime: 1_783_400_255,
            direction: DIRECTION_SHORT,
            source: 0,
            quantityDecimals: 6,
            priceDecimals: 2,
            pnlDecimals: 2,
            roiDecimals: 4,
            symbol: BTC_USDC,
            quantity: 50_000,
            entryPrice: 6_364_060,
            closingPrice: 6_353_045,
            pnl: 550,
            roi: 8_600,
            grossPnl: 550,
            masterReward: 0,
            followerReward: 0
        });
    }
}
