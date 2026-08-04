// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {CopyTrading} from "../src/CopyTrading.sol";
import {MarginVault} from "../src/MarginVault.sol";

contract DeployCopyTrading is Script {
    function run() external {
        address vaultAddress = vm.envAddress("VAULT_CONTRACT_ADDRESS");

        vm.startBroadcast();

        address admin = msg.sender;
        address executor = msg.sender;
        CopyTrading copyTrading = new CopyTrading(admin, executor, vaultAddress);
        MarginVault(vaultAddress).grantRole(MarginVault(vaultAddress).MARGIN_MANAGER_ROLE(), address(copyTrading));

        console.log("CopyTrading:", address(copyTrading));

        vm.stopBroadcast();
    }
}
