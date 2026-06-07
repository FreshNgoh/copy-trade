'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Trader } from '@/lib/mock-data';
import { Shield, AlertTriangle } from 'lucide-react';
import Image from 'next/image';

export function CopySettingsModal({
  open,
  onOpenChange,
  trader,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trader: Trader;
}) {
  const [investment, setInvestment] = React.useState(1000);
  const [allocation, setAllocation] = React.useState([10]);
  const [stopLoss, setStopLoss] = React.useState([20]);
  const [maxTrades, setMaxTrades] = React.useState([10]);
  const [submitting, setSubmitting] = React.useState(false);

  const handleConfirm = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onOpenChange(false);
      toast.success(`Now copying ${trader.ens}`, {
        description: `$${investment.toLocaleString()} allocated. ${allocation[0]}% per trade. Stop-loss at ${stopLoss[0]}%.`,
      });
    }, 800);
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
                <Image src={trader.avatar} alt={trader.ens} fill sizes="40px" className="object-cover" />
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
              Investment Amount (USDC)
            </Label>
            <div className="flex items-center bg-background border border-border focus-within:border-accent">
              <span className="px-3 text-muted-foreground font-mono text-sm">$</span>
              <input
                data-testid="copy-investment-input"
                type="number"
                value={investment}
                onChange={(e) => setInvestment(Number(e.target.value))}
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
              Funds remain in your wallet vault. Smart contracts execute mirrored trades only when this trader opens new positions. You can pause anytime.
            </p>
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
          <Button
            data-testid="copy-confirm-button"
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 rounded-none bg-accent text-accent-foreground hover:bg-accent/90 font-medium"
          >
            {submitting ? 'Signing…' : 'Confirm Copy'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
