"use client";

import * as React from "react";
import { formatEther, formatUnits, parseEther, type Abi } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  ArrowLeft,
  CircleDollarSign,
  Coins,
  Network,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { wagmiConfig } from "@/lib/wagmi";
import { addTraderDepositApi } from "@/lib/api/trader-dashboard-api";
import { CONTRACTS } from "@/lib/web3/constants/contracts";
import vault from "@/lib/web3/abi/vault-abi.json";
import { addNotification } from "@/lib/notifications";

const vaultAbi = vault.abi as Abi;
const DEMO_ETH_USDC_PRICE = 3000;

export function DepositUSDC({ onSuccess }: { onSuccess?: () => void }) {
  const { address, isConnected, chain } = useAccount();
  const [amount, setAmount] = React.useState("");
  const [step, setStep] = React.useState<"method" | "amount">("method");

  const { writeContractAsync, isPending } = useWriteContract();
  const amountNumber = Number(amount);
  const ethCost =
    Number.isFinite(amountNumber) && amountNumber > 0
      ? amountNumber / DEMO_ETH_USDC_PRICE
      : 0;

  const { data: vaultBalance, refetch: refetchVaultBalance } = useReadContract({
    address: CONTRACTS.vault,
    abi: vaultAbi,
    functionName: "balances",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
    },
  });

  const { data: availableBalance, refetch: refetchAvailableBalance } =
    useReadContract({
      address: CONTRACTS.vault,
      abi: vaultAbi,
      functionName: "availableBalance",
      args: address ? [address] : undefined,
      query: {
        enabled: Boolean(address),
      },
    });

  const handleDeposit = async () => {
    if (!isConnected || !address) {
      toast.error("Wallet not connected");
      return;
    }

    if (!chain) {
      toast.error("Wallet chain not detected");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      toast.error("Enter valid amount");
      return;
    }

    try {
      toast.info("Depositing Sepolia ETH...");

      const depositHash = await writeContractAsync({
        address: CONTRACTS.vault,
        abi: vaultAbi,
        functionName: "depositEthAsUsdc",
        args: [],
        account: address,
        chain,
        value: parseEther(ethCost.toFixed(18)),
      });

      await waitForTransactionReceipt(wagmiConfig, { hash: depositHash });

      await addTraderDepositApi({
        traderWalletAddress: address,
        amount: Number(amount),
      });

      toast.success("Deposit successful");
      addNotification({
        type: "deposit",
        title: "Deposit completed",
        message: `${Number(amount).toFixed(2)} USDC was added to your Manual Wallet.`,
      });

      setAmount("");
      setStep("method");
      onSuccess?.();

      await refetchVaultBalance();
      await refetchAvailableBalance();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Deposit failed");
    }
  };

  if (step === "method") {
    return (
      <div className="flex min-h-screen flex-col px-6 py-8 sm:px-8">
        <div className="">
          <div className="mb-3 text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground">
            ▎ Vault Funding
          </div>
          <h2 className="font-heading text-xl font-bold">Deposit Asset</h2>
        </div>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={() => setStep("amount")}
            className="w-full border border-border bg-background p-4 text-left hover:border-accent hover:bg-surface-hover transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border border-accent/30 bg-accent/10 text-accent">
                <ArrowDownToLine className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm text-white">
                  Deposit Sepolia ETH
                </div>
                <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Pay Sepolia ETH and receive virtual USDC trading balance.
                </div>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-accent">
                Select
              </div>
            </div>
          </button>
        </div>

        <div className="mt-auto border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
          Demo rate: 1 Sepolia ETH = {DEMO_ETH_USDC_PRICE.toLocaleString()} virtual USDC.
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col px-6 py-8 sm:px-8">
      <div className="flex items-start gap-4 pr-10">
        <button
          type="button"
          onClick={() => setStep("method")}
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center border border-border text-muted-foreground hover:border-border-focus hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <div className="mb-3 text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground">
            ▎ Deposit Sepolia ETH
          </div>
          <h2 className="font-heading text-2xl font-bold">Deposit Virtual USDC</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Enter the virtual USDC amount. Your wallet pays the Sepolia ETH equivalent.
          </p>
        </div>
      </div>

      <div className="mt-9 grid grid-cols-[28px_1fr] gap-x-4 gap-y-7">
        <div className="flex flex-col items-center">
          <div className="flex h-7 w-7 items-center justify-center border border-accent bg-accent/10 font-mono text-[10px] text-accent">
            1
          </div>
          <div className="h-full w-px bg-border" />
        </div>
        <div>
          <div className="mb-3 text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            Select Asset
          </div>
          <div className="inline-flex min-w-36 items-center gap-2 border border-border bg-background px-3 py-2">
            <CircleDollarSign className="h-4 w-4 text-accent" />
            <span className="font-mono text-sm">Virtual USDC</span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex h-7 w-7 items-center justify-center border border-accent bg-accent/10 font-mono text-[10px] text-accent">
            2
          </div>
          <div className="h-full w-px bg-border" />
        </div>
        <div>
          <div className="mb-3 text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            Network
          </div>
          <div className="inline-flex min-w-48 items-center gap-2 border border-border bg-background px-3 py-2">
            <Network className="h-4 w-4 text-accent" />
            <span className="font-mono text-sm">
              {chain?.name || "Connected Wallet"}
            </span>
          </div>
        </div>

        <div className="flex h-7 w-7 items-center justify-center border border-accent bg-accent/10 font-mono text-[10px] text-accent">
          3
        </div>
        <div className="space-y-3">
          <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            Amount
          </div>
          <div className="flex min-h-14 border border-border bg-background focus-within:border-accent">
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-10 border-0 bg-transparent font-mono text-base focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="flex items-center gap-2 border-l border-border px-3 font-mono text-sm">
              <Coins className="h-4 w-4 text-accent" />
              USDC
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Estimated wallet debit:{" "}
            <span className="font-mono text-white">
              {ethCost > 0 ? `${ethCost.toFixed(6)} Sepolia ETH` : "0 Sepolia ETH"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-10">
        <Button
          onClick={handleDeposit}
          disabled={isPending}
          className={cn(
            "h-12 w-full font-mono uppercase tracking-wider",
            "bg-white text-black hover:bg-neutral-200",
          )}
        >
          {isPending ? "Processing..." : "Process Deposit"}
        </Button>

        <div className="mt-7 border-t border-border pt-6 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Demo Rate</span>
            <span className="font-mono text-right">
              1 ETH = {DEMO_ETH_USDC_PRICE.toLocaleString()} USDC
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">ETH Required</span>
            <span className="font-mono text-right">
              {ethCost > 0 ? formatEther(parseEther(ethCost.toFixed(18))) : "0"} ETH
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Vault Balance</span>
            <span className="font-mono text-right">
              {vaultBalance ? formatUnits(vaultBalance as bigint, 6) : "0"} USDC
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Available Balance</span>
            <span className="font-mono text-right">
              {availableBalance
                ? formatUnits(availableBalance as bigint, 6)
                : "0"}{" "}
              USDC
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
