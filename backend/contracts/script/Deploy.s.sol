// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {MarginVault} from "../src/MarginVault.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        MockUSDC usdc = new MockUSDC();
        MarginVault vault = new MarginVault(address(usdc));

        console.log("USDC:", address(usdc));
        console.log("Vault:", address(vault));

        vm.stopBroadcast();
    }
}
