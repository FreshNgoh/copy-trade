// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title TradeHistory
/// @notice Stores immutable closed trading records after backend/Web2 order finalization.
/// @dev Users do not submit transactions. Only accounts with BACKEND_WRITER_ROLE may add records.
contract TradeHistory is AccessControl {
    /// @notice Role allowed to store closed trade records.
    bytes32 public constant BACKEND_WRITER_ROLE = keccak256("BACKEND_WRITER_ROLE");

    /// @notice Direction value for long trades.
    uint8 public constant DIRECTION_LONG = 0;

    /// @notice Direction value for short trades.
    uint8 public constant DIRECTION_SHORT = 1;

    /// @notice Source value for manually opened trades.
    uint8 public constant SOURCE_OWN = 0;

    /// @notice Source value for copied follower trades.
    uint8 public constant SOURCE_COPY = 1;

    /// @notice Source value for master rewards from copied follower trades.
    uint8 public constant SOURCE_COPY_REWARD = 2;

    /// @notice Final closed trade data stored on-chain.
    /// @dev Values are scaled integers. Display symbols such as "$" and "%" are intentionally not stored.
    /// @param user Wallet address that owns this trade history record.
    /// @param master Master wallet for copied trades or copy rewards. Zero address for own trades.
    /// @param follower Follower wallet for copied trades or copy rewards. Zero address for own trades.
    /// @param openTime Unix timestamp when the trade was opened.
    /// @param closedTime Unix timestamp when the trade was fully closed.
    /// @param direction 0 = long, 1 = short.
    /// @param source 0 = own trade, 1 = copied trade, 2 = copy reward.
    /// @param quantityDecimals Decimal places used by quantity.
    /// @param priceDecimals Decimal places used by entryPrice and closingPrice.
    /// @param pnlDecimals Decimal places used by pnl.
    /// @param roiDecimals Decimal places used by roi.
    /// @param symbol Market symbol encoded as bytes32, for example bytes32("BTC/USDC").
    /// @param quantity Trade quantity as a scaled unsigned integer.
    /// @param entryPrice Entry price as a scaled unsigned integer.
    /// @param closingPrice Closing price as a scaled unsigned integer.
    /// @param pnl Profit or loss as a scaled signed integer.
    /// @param roi Return on investment as a scaled signed integer.
    /// @param grossPnl Gross copied-trade PnL before reward split. Equal to pnl for own trades.
    /// @param masterReward Master share of positive copied-trade PnL.
    /// @param followerReward Follower share of positive copied-trade PnL.
    struct TradeRecord {
        address user;
        address master;
        address follower;
        uint64 openTime;
        uint64 closedTime;
        uint8 direction;
        uint8 source;
        uint8 quantityDecimals;
        uint8 priceDecimals;
        uint8 pnlDecimals;
        uint8 roiDecimals;
        bytes32 symbol;
        uint256 quantity;
        uint256 entryPrice;
        uint256 closingPrice;
        int256 pnl;
        int256 roi;
        int256 grossPnl;
        int256 masterReward;
        int256 followerReward;
    }

    /// @notice Emitted when an authorized backend stores a closed trade record.
    /// @param tradeId Auto-incremented trade identifier.
    /// @param user Wallet address that owns the record.
    /// @param writer Backend/company account that submitted the record.
    /// @param symbol Market symbol encoded as bytes32.
    /// @param pnl Signed scaled profit or loss.
    /// @param roi Signed scaled return on investment.
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

    error UnauthorizedWriter(address account);
    error InvalidUser();
    error InvalidSymbol();
    error InvalidDirection(uint8 direction);
    error InvalidSource(uint8 source);
    error InvalidCopyParticipant();
    error InvalidTimestamp();
    error TradeNotFound(uint256 tradeId);

    uint256 private _nextTradeId = 1;

    mapping(uint256 tradeId => TradeRecord record) private _tradeRecords;
    mapping(address user => uint256[] tradeIds) private _userTradeIds;

    /// @notice Deploys the contract and grants admin plus writer permissions.
    /// @param admin Account that can grant and revoke roles.
    /// @param backendWriter Initial backend/company wallet allowed to store records.
    constructor(address admin, address backendWriter) {
        if (admin == address(0) || backendWriter == address(0)) revert InvalidUser();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(BACKEND_WRITER_ROLE, backendWriter);
    }

    /// @notice Stores a final closed trade record.
    /// @dev Callable only by BACKEND_WRITER_ROLE. Returns the newly assigned trade ID.
    /// @param record Final trade data using scaled integers and Unix timestamps.
    function addTradeRecord(TradeRecord calldata record) external returns (uint256 tradeId) {
        if (!hasRole(BACKEND_WRITER_ROLE, msg.sender)) revert UnauthorizedWriter(msg.sender);
        _validateRecord(record);

        tradeId = _nextTradeId++;
        _tradeRecords[tradeId] = record;
        _userTradeIds[record.user].push(tradeId);

        emit TradeRecordStored(
            tradeId,
            record.user,
            msg.sender,
            record.symbol,
            record.pnl,
            record.roi,
            record.source,
            record.master,
            record.follower
        );
    }

    /// @notice Returns a trade record by ID.
    /// @param tradeId Trade identifier emitted by TradeRecordStored or returned from user trade ID queries.
    function getTradeRecord(uint256 tradeId) external view returns (TradeRecord memory record) {
        record = _tradeRecords[tradeId];
        if (record.user == address(0)) revert TradeNotFound(tradeId);
    }

    /// @notice Returns all trade IDs belonging to a user.
    /// @dev Intended for frontend reads. For very large histories, use getUserTradeIdAt with getUserTradeCount.
    /// @param user Wallet address whose trade IDs should be returned.
    function getUserTradeIds(address user) external view returns (uint256[] memory) {
        return _userTradeIds[user];
    }

    /// @notice Returns the number of stored trades for a user.
    /// @param user Wallet address whose trade count should be returned.
    function getUserTradeCount(address user) external view returns (uint256) {
        return _userTradeIds[user].length;
    }

    /// @notice Returns one trade ID for a user by array index.
    /// @dev Useful for paginated frontend reads when a user has many records.
    /// @param user Wallet address that owns the trade.
    /// @param index Zero-based index in the user's trade ID list.
    function getUserTradeIdAt(address user, uint256 index) external view returns (uint256) {
        return _userTradeIds[user][index];
    }

    /// @notice Returns the ID that will be assigned to the next stored trade.
    function nextTradeId() external view returns (uint256) {
        return _nextTradeId;
    }

    /// @notice Returns the total number of trades stored globally.
    function totalTrades() external view returns (uint256) {
        return _nextTradeId - 1;
    }

    function _validateRecord(TradeRecord calldata record) private pure {
        if (record.user == address(0)) revert InvalidUser();
        if (record.symbol == bytes32(0)) revert InvalidSymbol();
        if (record.direction > DIRECTION_SHORT) revert InvalidDirection(record.direction);
        if (record.source > SOURCE_COPY_REWARD) revert InvalidSource(record.source);
        if (record.source == SOURCE_OWN && (record.master != address(0) || record.follower != address(0))) {
            revert InvalidCopyParticipant();
        }
        if (record.source != SOURCE_OWN && (record.master == address(0) || record.follower == address(0))) {
            revert InvalidCopyParticipant();
        }
        if (record.openTime == 0 || record.closedTime == 0 || record.closedTime < record.openTime) {
            revert InvalidTimestamp();
        }
    }
}
