// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";
import "../src/MarginVault.sol";

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