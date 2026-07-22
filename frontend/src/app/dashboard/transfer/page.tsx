"use client";

import * as React from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ArrowLeft, ArrowRight, ArrowUpDown, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ensureTraderPortfolioApi,
  getTraderDashboardApi,
  transferCopyWalletToManualApi,
  transferManualWalletToCopyApi,
} from "@/lib/api/trader-dashboard-api";
import type { TraderDashboard } from "@/types/trader-dashboard";
import { addNotification } from "@/lib/notifications";

type Direction = "manual_to_copy" | "copy_to_manual";

export default function WalletTransferPage() {
  const { address } = useAccount();
  const [dashboard, setDashboard] = React.useState<TraderDashboard | null>(null);
  const [direction, setDirection] = React.useState<Direction>("manual_to_copy");
  const [amount, setAmount] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!address) return setDashboard(null);
    await ensureTraderPortfolioApi(address);
    setDashboard(await getTraderDashboardApi(address));
  }, [address]);

  React.useEffect(() => {
    load().catch((error) =>
      toast.error(error instanceof Error ? error.message : "Unable to load wallets"),
    );
  }, [load]);

  const manualAvailable = dashboard?.stats.freeCollateral ?? 0;
  const copyAvailable = dashboard?.stats.copyFreeCollateral ?? 0;
  const available = direction === "manual_to_copy" ? manualAvailable : copyAvailable;
  const from = direction === "manual_to_copy" ? "Manual Wallet" : "Copy Wallet";
  const to = direction === "manual_to_copy" ? "Copy Wallet" : "Manual Wallet";

  const submit = async () => {
    const value = Number(amount);
    if (!address) return toast.error("Connect your wallet first");
    if (!Number.isFinite(value) || value <= 0) return toast.error("Enter a valid amount");
    if (value > available) return toast.error(`Only ${available.toFixed(2)} USDC is available`);
    try {
      setPending(true);
      const input = { traderWalletAddress: address, amount: value };
      if (direction === "manual_to_copy") await transferManualWalletToCopyApi(input);
      else await transferCopyWalletToManualApi(input);
      toast.success(`Transferred $${value.toFixed(2)} to ${to}`);
      addNotification({
        type: "transfer",
        title: "Wallet transfer completed",
        message: `${value.toFixed(2)} USDC moved from ${from} to ${to}.`,
      });
      setAmount("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transfer failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div className="mt-8">
          <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground">▎ Wallet management</div>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight">Transfer funds</h1>
          <p className="mt-2 text-sm text-muted-foreground">Move USDC between trading wallets instantly. Open-position collateral cannot be transferred.</p>
        </div>

        <section className="mt-8 border border-border bg-surface p-5 md:p-8">
          <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
            {[from, to].map((name, index) => {
              const isManual = name === "Manual Wallet";
              const balance = isManual ? dashboard?.stats.walletBalance : dashboard?.stats.copyWalletBalance;
              return (
                <div key={`${name}-${index}`} className={cn("border p-4", index === 0 ? "order-1 border-accent/50 bg-accent/5" : "order-3 border-border bg-background")}>
                  <Wallet className={cn("h-4 w-4", isManual ? "text-white" : "text-accent")} />
                  <div className="mt-5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{index === 0 ? "From" : "To"}</div>
                  <div className="mt-1 text-sm font-medium">{name}</div>
                  <div className="mt-3 font-mono text-lg">${(balance ?? 0).toFixed(2)}</div>
                </div>
              );
            })}
            <button type="button" aria-label="Switch transfer direction" onClick={() => { setDirection((d) => d === "manual_to_copy" ? "copy_to_manual" : "manual_to_copy"); setAmount(""); }} className="order-2 self-center border border-border bg-background p-3 text-muted-foreground hover:border-accent hover:text-accent">
              <ArrowUpDown className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-7">
            <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <label htmlFor="transfer-amount">Amount</label><span>Available ${available.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex border border-border bg-background focus-within:border-accent">
              <span className="px-4 py-3 font-mono text-muted-foreground">$</span>
              <input id="transfer-amount" data-testid="transfer-amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" className="min-w-0 flex-1 bg-transparent py-3 font-mono outline-none" />
              <button type="button" onClick={() => setAmount(available.toFixed(2))} className="px-4 text-xs font-mono text-accent">MAX</button>
            </div>
          </div>
          <button data-testid="confirm-transfer" type="button" disabled={pending || !address} onClick={submit} className="mt-5 flex w-full items-center justify-center gap-2 bg-white px-5 py-3 text-sm font-medium text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50">
            {pending ? "Transferring…" : <>Transfer to {to} <ArrowRight className="h-4 w-4" /></>}
          </button>
          <p className="mt-4 text-center text-xs text-muted-foreground">Copy trades only use the balance in your Copy Wallet.</p>
        </section>
      </div>
    </main>
  );
}
