'use client';

import * as React from 'react';
import { formatUnits, type Abi } from 'viem';
import { useAccount, useReadContract, useSignTypedData } from 'wagmi';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { CONTRACTS } from '@/lib/web3/constants/contracts';
import copyTrading from '@/lib/web3/abi/copy-trading-abi.json';
import { WalletAvatar } from '@/components/wallet/wallet-avatar';
import { getTraderDashboardApi } from '@/lib/api/trader-dashboard-api';
import { pauseCopySettingsApi, saveCopySettingsApi } from '@/lib/api/copy-trading-api';
import {
  buildCopySettingsIntentMessage,
  buildPauseCopyIntentMessage,
  copySettingsIntentTypes,
  createIntentDeadline,
  getClientIntentChainId,
  getIntentDomain,
  pauseCopyIntentTypes,
} from '@/lib/web3/eip712-intents';

const copyTradingAbi = copyTrading.abi as Abi;

type CopyTrader = {
  address: `0x${string}`;
  ens: string;
  avatar?: string | null;
  verified: boolean;
};

export function CopySettingsModal({
  open,
  onOpenChange,
  trader,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trader: CopyTrader;
}) {
  const [investment, setInvestment] = React.useState("1000");
  const [allocation, setAllocation] = React.useState([10]);
  const [stopLoss, setStopLoss] = React.useState([20]);
  const [maxTrades, setMaxTrades] = React.useState([10]);
  const [submitting, setSubmitting] = React.useState(false);
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();

  const copyContractReady = Boolean(CONTRACTS.copyTrading && address && trader.address);

  const {
    data: copySettingsData,
    refetch: refetchCopySettings,
    isLoading: copySettingsLoading,
  } = useReadContract({
    address: CONTRACTS.copyTrading,
    abi: copyTradingAbi,
    functionName: 'copySettings',
    args: address ? [address, trader.address] : undefined,
    query: {
      enabled: open && copyContractReady,
    },
  });

  const {
    data: activeCopiedMarginData,
    refetch: refetchActiveCopiedMargin,
  } = useReadContract({
    address: CONTRACTS.copyTrading,
    abi: copyTradingAbi,
    functionName: 'activeCopiedMargin',
    args: address ? [address, trader.address] : undefined,
    query: {
      enabled: open && copyContractReady,
    },
  });

  const currentSettings = React.useMemo(() => {
    if (!copySettingsData || !Array.isArray(copySettingsData)) return null;

    const [enabled, maxCopyAmount, maxAllocationBps, stopLossBps, maxDailyTrades] = copySettingsData as unknown as
      readonly [boolean, bigint, number, number, number];

    return {
      enabled,
      maxCopyAmount,
      maxAllocationBps,
      stopLossBps,
      maxDailyTrades,
    };
  }, [copySettingsData]);

  const activeCopiedMargin = typeof activeCopiedMarginData === 'bigint' ? activeCopiedMarginData : 0n;

  React.useEffect(() => {
    if (!open || !currentSettings || !currentSettings.enabled) return;

    setInvestment(formatUnits(currentSettings.maxCopyAmount, 6));
    setAllocation([currentSettings.maxAllocationBps / 100]);
    setStopLoss([currentSettings.stopLossBps / 100]);
    setMaxTrades([currentSettings.maxDailyTrades]);
  }, [currentSettings, open]);

  const handleConfirm = async () => {
    const investmentAmount = Number(investment);

    if (!CONTRACTS.copyTrading) {
      toast.error('Copy trading contract is not configured');
      return;
    }

    if (!isConnected || !address) {
      toast.error('Wallet not connected');
      return;
    }

    if (!Number.isFinite(investmentAmount) || investmentAmount <= 0) {
      toast.error('Enter valid investment amount');
      return;
    }

    try {
      setSubmitting(true);

      const dashboard = await getTraderDashboardApi(address);
      const currentActiveCap = currentSettings?.enabled
        ? Number(formatUnits(currentSettings.maxCopyAmount, 6))
        : 0;
      const otherActiveAllocation = Math.max(
        Number(dashboard.stats.copyActiveAllocation || 0) - currentActiveCap,
        0,
      );
      const requiredCopyBalance = otherActiveAllocation + investmentAmount;
      if (requiredCopyBalance > Number(dashboard.stats.copyWalletBalance || 0)) {
        throw new Error(
          `Active allocations require ${requiredCopyBalance.toFixed(2)} USDC. Transfer ${(requiredCopyBalance - dashboard.stats.copyWalletBalance).toFixed(2)} USDC to Copy Wallet or pause another master first.`,
        );
      }

      const maxAllocationBps = allocation[0] * 100;
      const stopLossBps = stopLoss[0] * 100;
      const maxDailyTrades = maxTrades[0];
      const deadline = createIntentDeadline();
      const signature = await signTypedDataAsync({
        account: address,
        domain: getIntentDomain({
          chainId: getClientIntentChainId(),
          verifyingContract: CONTRACTS.copyTrading,
        }),
        types: copySettingsIntentTypes,
        primaryType: 'CopySettingsIntent',
        message: buildCopySettingsIntentMessage({
          follower: address,
          trader: trader.address,
          maxCopyAmount: investmentAmount,
          maxAllocationBps,
          stopLossBps,
          maxDailyTrades,
          deadline,
        }),
      });

      await saveCopySettingsApi({
        masterWalletAddress: trader.address,
        followerWalletAddress: address,
        maxCopyAmount: investmentAmount,
        maxAllocationBps,
        stopLossBps,
        maxDailyTrades,
        signature,
        deadline,
      });

      await Promise.all([
        refetchCopySettings(),
        refetchActiveCopiedMargin(),
      ]);

      onOpenChange(false);
      toast.success(`Now copying ${trader.ens}`, {
        description: `$${investmentAmount.toLocaleString()} allocated. ${allocation[0]}% per trade. Stop-loss at ${stopLoss[0]}%.`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Copy settings failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePause = async () => {
    if (!CONTRACTS.copyTrading) {
      toast.error('Copy trading contract is not configured');
      return;
    }

    if (!isConnected || !address) {
      toast.error('Wallet not connected');
      return;
    }

    try {
      setSubmitting(true);

      const deadline = createIntentDeadline();
      const signature = await signTypedDataAsync({
        account: address,
        domain: getIntentDomain({
          chainId: getClientIntentChainId(),
          verifyingContract: CONTRACTS.copyTrading,
        }),
        types: pauseCopyIntentTypes,
        primaryType: 'PauseCopyIntent',
        message: buildPauseCopyIntentMessage({
          follower: address,
          trader: trader.address,
          deadline,
        }),
      });

      await pauseCopySettingsApi({
        masterWalletAddress: trader.address,
        followerWalletAddress: address,
        signature,
        deadline,
      });
      await refetchCopySettings();

      toast.success(`Paused copying ${trader.ens}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Pause copy failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="copy-settings-modal"
        className="bg-surface border border-border rounded-none p-0 max-w-md text-foreground"
      >
        <div className="p-6 border-b border-border">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 overflow-hidden border border-border">
                {trader.avatar ? (
                  <Image src={trader.avatar} alt={trader.ens} fill sizes="40px" className="object-cover" />
                ) : (
                  <WalletAvatar
                    address={trader.address}
                    className="overflow-hidden bg-background"
                  />
                )}
              </div>
              <div>
                <DialogTitle className="font-heading text-base flex items-center gap-1.5">
                  Copy {trader.ens}
                  {trader.verified && <Shield className="w-3.5 h-3.5 text-accent" fill="#00E5FF" stroke="#000" />}
                </DialogTitle>
                <DialogDescription className="text-xs font-mono text-muted-foreground">
                  Non-custodial. You retain full control.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              Copy Allocation Cap (USDC)
            </Label>
            <div className="flex items-center bg-background border border-border focus-within:border-accent">
              <span className="px-3 text-muted-foreground font-mono text-sm">$</span>
              <input
                data-testid="copy-investment-input"
                type="number"
                value={investment}
                min="0"
                step="any"
                onChange={(e) => setInvestment(e.target.value)}
                className="flex-1 bg-transparent py-2.5 outline-none font-mono text-sm"
              />
              <span className="px-3 text-muted-foreground font-mono text-xs">USDC</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                Max Allocation Per Trade
              </Label>
              <span className="font-mono text-sm">{allocation[0]}%</span>
            </div>
            <Slider
              data-testid="copy-allocation-slider"
              value={allocation}
              onValueChange={setAllocation}
              min={1}
              max={100}
              step={1}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                Stop-Loss Threshold
              </Label>
              <span className="font-mono text-sm text-danger">-{stopLoss[0]}%</span>
            </div>
            <Slider
              data-testid="copy-stoploss-slider"
              value={stopLoss}
              onValueChange={setStopLoss}
              min={5}
              max={50}
              step={1}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                Max Daily Trades
              </Label>
              <span className="font-mono text-sm">{maxTrades[0]}</span>
            </div>
            <Slider
              data-testid="copy-max-trades-slider"
              value={maxTrades}
              onValueChange={setMaxTrades}
              min={1}
              max={50}
              step={1}
            />
          </div>

          <div className="bg-warning/5 border border-warning/30 p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              This master can only use funds already transferred to your Copy Wallet. You can pause anytime.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-px bg-border font-mono text-xs">
            <div className="bg-background p-3">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Status</div>
              <div className={currentSettings?.enabled ? 'text-success' : 'text-muted-foreground'}>
                {copySettingsLoading ? 'Loading' : currentSettings?.enabled ? 'Active' : 'Inactive'}
              </div>
            </div>
            <div className="bg-background p-3">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Cap</div>
              <div>{currentSettings?.enabled ? `$${formatUsdc(currentSettings.maxCopyAmount)}` : 'N/A'}</div>
            </div>
            <div className="bg-background p-3">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">In Copy</div>
              <div>${formatUsdc(activeCopiedMargin)}</div>
            </div>
          </div>
        </div>

        <div className="p-6 pt-0 flex gap-2">
          <Button
            data-testid="copy-cancel-button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-none border-border bg-transparent hover:bg-surface-hover"
          >
            Cancel
          </Button>
          {currentSettings?.enabled && (
            <Button
              data-testid="copy-pause-button"
              variant="outline"
              onClick={handlePause}
              disabled={submitting}
              className="flex-1 rounded-none border-warning/50 bg-transparent text-warning hover:bg-warning/10"
            >
              Pause
            </Button>
          )}
          <Button
            data-testid="copy-confirm-button"
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 rounded-none bg-accent text-accent-foreground hover:bg-accent/90 font-medium"
          >
            {submitting ? 'Confirming…' : currentSettings?.enabled ? 'Update Copy' : 'Confirm Copy'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatUsdc(value: bigint) {
  return Number(formatUnits(value, 6)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}
