// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {TradeHistory} from "../src/TradeHistory.sol";

contract DeployTradeHistory is Script {
    function run() external returns (TradeHistory tradeHistory) {
        address admin = vm.envAddress("TRADE_HISTORY_ADMIN");
        address backendWriter = vm.envAddress("TRADE_HISTORY_BACKEND_WRITER");

        vm.startBroadcast();
        tradeHistory = new TradeHistory(admin, backendWriter);
        vm.stopBroadcast();

        console.log("TradeHistory:", address(tradeHistory));
        console.log("Admin:", admin);
        console.log("Backend writer:", backendWriter);
    }
}
