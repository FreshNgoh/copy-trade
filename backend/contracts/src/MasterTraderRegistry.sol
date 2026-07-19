// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title MasterTraderRegistry
/// @notice Registry for traders that the backend has verified as eligible master traders.
/// @dev Users cannot verify themselves. Only MASTER_VERIFIER_ROLE may write verification records.
contract MasterTraderRegistry is AccessControl {
    /// @notice Backend/company role allowed to verify master traders.
    bytes32 public constant MASTER_VERIFIER_ROLE = keccak256("MASTER_VERIFIER_ROLE");

    /// @notice Minimum closed trades required for verification.
    uint256 public constant MIN_CLOSED_TRADES = 10;

    /// @notice Minimum average ROI percentage, scaled by ROI_SCALE.
    int256 public constant MIN_ROI = 10 * 10_000;

    /// @notice Minimum total trading volume in USDC, scaled to 6 decimals.
    uint256 public constant MIN_TRADING_VOLUME = 10_000e6;

    /// @notice ROI scale. 10.0000% is stored as 100000.
    uint256 public constant ROI_SCALE = 10_000;

    /// @notice Verification snapshot stored for each master trader.
    /// @param verified Whether the trader is verified.
    /// @param verifiedAt Unix timestamp when the trader was verified.
    /// @param verifiedBy Backend/company verifier wallet.
    /// @param totalTrades Closed trade count at verification time.
    /// @param roi Average ROI percentage scaled by ROI_SCALE.
    /// @param tradingVolume Total trading volume in USDC scaled to 6 decimals.
    struct MasterVerification {
        bool verified;
        uint64 verifiedAt;
        address verifiedBy;
        uint256 totalTrades;
        int256 roi;
        uint256 tradingVolume;
    }

    event MasterTraderVerified(
        address indexed trader,
        address indexed verifier,
        uint256 totalTrades,
        int256 roi,
        uint256 tradingVolume,
        uint256 verifiedAt
    );

    error UnauthorizedVerifier(address account);
    error InvalidTrader();
    error AlreadyVerified(address trader);
    error InsufficientClosedTrades(uint256 totalTrades);
    error InsufficientRoi(int256 roi);
    error InsufficientTradingVolume(uint256 tradingVolume);

    mapping(address trader => MasterVerification verification) private _verifications;

    /// @notice Deploys the registry and grants admin plus verifier permissions.
    /// @param admin Account that can grant and revoke roles.
    /// @param verifier Backend/company wallet allowed to verify master traders.
    constructor(address admin, address verifier) {
        if (admin == address(0) || verifier == address(0)) revert InvalidTrader();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MASTER_VERIFIER_ROLE, verifier);
    }

    /// @notice Verifies a trader as a master trader.
    /// @dev Backend must calculate metrics from trusted closed-trade records before calling.
    /// @param trader Trader wallet address being verified.
    /// @param totalTrades Closed trade count.
    /// @param roi Average ROI percentage scaled by ROI_SCALE.
    /// @param tradingVolume Total trading volume in USDC scaled to 6 decimals.
    function verifyMaster(address trader, uint256 totalTrades, int256 roi, uint256 tradingVolume) external {
        if (!hasRole(MASTER_VERIFIER_ROLE, msg.sender)) revert UnauthorizedVerifier(msg.sender);
        if (trader == address(0)) revert InvalidTrader();
        if (_verifications[trader].verified) revert AlreadyVerified(trader);
        if (totalTrades < MIN_CLOSED_TRADES) revert InsufficientClosedTrades(totalTrades);
        if (roi < MIN_ROI) revert InsufficientRoi(roi);
        if (tradingVolume < MIN_TRADING_VOLUME) revert InsufficientTradingVolume(tradingVolume);

        _verifications[trader] = MasterVerification({
            verified: true,
            verifiedAt: uint64(block.timestamp),
            verifiedBy: msg.sender,
            totalTrades: totalTrades,
            roi: roi,
            tradingVolume: tradingVolume
        });

        emit MasterTraderVerified(trader, msg.sender, totalTrades, roi, tradingVolume, block.timestamp);
    }

    /// @notice Returns whether a trader is verified.
    /// @param trader Trader wallet address.
    function isVerifiedMaster(address trader) external view returns (bool) {
        return _verifications[trader].verified;
    }

    /// @notice Returns the stored verification snapshot for a trader.
    /// @param trader Trader wallet address.
    function getMasterVerification(address trader) external view returns (MasterVerification memory) {
        return _verifications[trader];
    }
}
