// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MasterTraderRegistry} from "../src/MasterTraderRegistry.sol";

contract DeployMasterTraderRegistry is Script {
    function run() external returns (MasterTraderRegistry registry) {
        address admin = vm.envAddress("MASTER_REGISTRY_ADMIN");
        address verifier = vm.envAddress("MASTER_VERIFIER_ADDRESS");

        vm.startBroadcast();
        registry = new MasterTraderRegistry(admin, verifier);
        vm.stopBroadcast();

        console.log("MasterTraderRegistry:", address(registry));
        console.log("Admin:", admin);
        console.log("Verifier:", verifier);
    }
}
