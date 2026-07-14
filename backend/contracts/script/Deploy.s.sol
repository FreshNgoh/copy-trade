// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {MarginVault} from "../src/MarginVault.sol";
import {CopyTrading} from "../src/CopyTrading.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        address admin = msg.sender;
        address executor = msg.sender;
        MockUSDC usdc = new MockUSDC();
        MarginVault vault = new MarginVault(address(usdc), admin);
        CopyTrading copyTrading = new CopyTrading(admin, executor, address(vault));
        vault.grantRole(vault.MARGIN_MANAGER_ROLE(), address(copyTrading));

        console.log("USDC:", address(usdc));
        console.log("Vault:", address(vault));
        console.log("CopyTrading:", address(copyTrading));

        vm.stopBroadcast();
    }
}
