// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {MarginVault} from "../src/MarginVault.sol";
import {CopyTrading} from "../src/CopyTrading.sol";

contract Deploy is Script {
    address private constant SEPOLIA_ETH_USD_PRICE_FEED = 0x694AA1769357215DE4FAC081bf1f309aDC325306;

    function run() external {
        vm.startBroadcast();

        address admin = msg.sender;
        address executor = msg.sender;
        MockUSDC usdc = new MockUSDC();
        address ethUsdPriceFeed = vm.envOr("ETH_USD_PRICE_FEED", SEPOLIA_ETH_USD_PRICE_FEED);
        MarginVault vault = new MarginVault(address(usdc), admin, ethUsdPriceFeed);
        CopyTrading copyTrading = new CopyTrading(admin, executor, address(vault));
        vault.grantRole(vault.MARGIN_MANAGER_ROLE(), address(copyTrading));

        console.log("USDC:", address(usdc));
        console.log("Vault:", address(vault));
        console.log("CopyTrading:", address(copyTrading));
        console.log("ETH/USD Price Feed:", ethUsdPriceFeed);

        vm.stopBroadcast();
    }
}
