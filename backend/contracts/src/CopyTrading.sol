// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

interface IMarginVault {
    function availableBalance(address user) external view returns (uint256);
    function lockMargin(address user, uint256 amount) external;
    function releaseMargin(address user, uint256 amount) external;
}

/// @title CopyTrading
/// @notice Stores follower copy settings and lets an authorized executor mirror trader positions.
/// @dev This contract enforces user limits. Price discovery and venue execution stay in the backend/perp engine.
contract CopyTrading is AccessControl {
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    uint8 public constant DIRECTION_LONG = 0;
    uint8 public constant DIRECTION_SHORT = 1;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    struct CopySettings {
        bool enabled;
        uint256 maxCopyAmount;
        uint16 maxAllocationBps;
        uint16 stopLossBps;
        uint16 maxDailyTrades;
    }

    struct CopiedPosition {
        address follower;
        address trader;
        uint64 openedAt;
        uint64 closedAt;
        uint8 direction;
        bool open;
        bytes32 symbol;
        uint256 margin;
        uint256 entryPrice;
    }

    IMarginVault public immutable vault;
    uint256 public nextPositionId = 1;

    mapping(address follower => mapping(address trader => CopySettings settings)) public copySettings;
    mapping(uint256 positionId => CopiedPosition position) public copiedPositions;
    mapping(address follower => mapping(address trader => uint256 margin)) public activeCopiedMargin;
    mapping(address follower => mapping(address trader => mapping(uint256 day => uint256 count))) public
        dailyTradeCounts;

    event CopySettingsUpdated(
        address indexed follower,
        address indexed trader,
        uint256 maxCopyAmount,
        uint16 maxAllocationBps,
        uint16 stopLossBps,
        uint16 maxDailyTrades,
        bool enabled
    );
    event CopyPaused(address indexed follower, address indexed trader);
    event CopiedPositionOpened(
        uint256 indexed positionId,
        address indexed follower,
        address indexed trader,
        bytes32 symbol,
        uint8 direction,
        uint256 margin,
        uint256 entryPrice
    );
    event CopiedPositionClosed(uint256 indexed positionId, address indexed follower, address indexed trader);

    error InvalidAddress();
    error InvalidMaxCopyAmount();
    error InvalidAllocation();
    error InvalidStopLoss();
    error InvalidMaxDailyTrades();
    error CopyDisabled(address follower, address trader);
    error InvalidSymbol();
    error InvalidDirection(uint8 direction);
    error InvalidPrice();
    error NoMarginAvailable();
    error DailyTradeLimitReached(address follower, address trader);
    error PositionNotOpen(uint256 positionId);

    constructor(address admin, address executor, address marginVault) {
        if (admin == address(0) || executor == address(0) || marginVault == address(0)) revert InvalidAddress();

        vault = IMarginVault(marginVault);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(EXECUTOR_ROLE, executor);
    }

    function setCopySettings(
        address trader,
        uint256 maxCopyAmount,
        uint16 maxAllocationBps,
        uint16 stopLossBps,
        uint16 maxDailyTrades,
        bool enabled
    ) external {
        if (trader == address(0) || trader == msg.sender) revert InvalidAddress();
        if (maxCopyAmount == 0) revert InvalidMaxCopyAmount();
        if (maxAllocationBps == 0 || maxAllocationBps > BPS_DENOMINATOR) revert InvalidAllocation();
        if (stopLossBps == 0 || stopLossBps > BPS_DENOMINATOR) revert InvalidStopLoss();
        if (maxDailyTrades == 0) revert InvalidMaxDailyTrades();

        copySettings[msg.sender][trader] = CopySettings({
            enabled: enabled,
            maxCopyAmount: maxCopyAmount,
            maxAllocationBps: maxAllocationBps,
            stopLossBps: stopLossBps,
            maxDailyTrades: maxDailyTrades
        });

        emit CopySettingsUpdated(
            msg.sender, trader, maxCopyAmount, maxAllocationBps, stopLossBps, maxDailyTrades, enabled
        );
    }

    function pauseCopy(address trader) external {
        CopySettings storage settings = copySettings[msg.sender][trader];
        settings.enabled = false;

        emit CopyPaused(msg.sender, trader);
    }

    function openCopiedTrade(
        address follower,
        address trader,
        bytes32 symbol,
        uint8 direction,
        uint256 requestedMargin,
        uint256 entryPrice
    ) external onlyRole(EXECUTOR_ROLE) returns (uint256 positionId) {
        if (follower == address(0) || trader == address(0) || follower == trader) {
            revert InvalidAddress();
        }
        if (symbol == bytes32(0)) revert InvalidSymbol();
        if (direction > DIRECTION_SHORT) revert InvalidDirection(direction);
        if (entryPrice == 0) revert InvalidPrice();

        CopySettings memory settings = copySettings[follower][trader];
        if (!settings.enabled) revert CopyDisabled(follower, trader);

        uint256 margin = _reserveCopiedMargin(follower, trader, requestedMargin, settings);

        positionId = nextPositionId++;
        copiedPositions[positionId] = CopiedPosition({
            follower: follower,
            trader: trader,
            openedAt: uint64(block.timestamp),
            closedAt: 0,
            direction: direction,
            open: true,
            symbol: symbol,
            margin: margin,
            entryPrice: entryPrice
        });

        emit CopiedPositionOpened(positionId, follower, trader, symbol, direction, margin, entryPrice);
    }

    function closeCopiedTrade(uint256 positionId) external onlyRole(EXECUTOR_ROLE) {
        CopiedPosition storage position = copiedPositions[positionId];
        if (!position.open) revert PositionNotOpen(positionId);

        position.open = false;
        position.closedAt = uint64(block.timestamp);

        activeCopiedMargin[position.follower][position.trader] -= position.margin;
        vault.releaseMargin(position.follower, position.margin);

        emit CopiedPositionClosed(positionId, position.follower, position.trader);
    }

    function _reserveCopiedMargin(
        address follower,
        address trader,
        uint256 requestedMargin,
        CopySettings memory settings
    ) private returns (uint256 margin) {
        uint256 currentDay = block.timestamp / 1 days;
        if (dailyTradeCounts[follower][trader][currentDay] >= settings.maxDailyTrades) {
            revert DailyTradeLimitReached(follower, trader);
        }

        uint256 copiedMargin = activeCopiedMargin[follower][trader];
        if (copiedMargin >= settings.maxCopyAmount) revert NoMarginAvailable();

        uint256 maxFollowerMargin = (vault.availableBalance(follower) * settings.maxAllocationBps) / BPS_DENOMINATOR;
        uint256 remainingCopyAmount = settings.maxCopyAmount - copiedMargin;

        margin = requestedMargin < maxFollowerMargin ? requestedMargin : maxFollowerMargin;
        margin = margin < remainingCopyAmount ? margin : remainingCopyAmount;
        if (margin == 0) revert NoMarginAvailable();

        dailyTradeCounts[follower][trader][currentDay] += 1;
        activeCopiedMargin[follower][trader] += margin;
        vault.lockMargin(follower, margin);
    }
}
