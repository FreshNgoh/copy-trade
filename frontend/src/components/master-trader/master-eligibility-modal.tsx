"use client";

import * as React from "react";
import { ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EligibilityRequirementRow } from "./eligibility-requirement-row";
import type {
  EligibilityRequirement,
  MasterEligibilityResponse,
} from "@/types/master-trader";

export function MasterEligibilityModal({
  open,
  onOpenChange,
  eligibility,
  isLoading,
  error,
  isVerifying,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eligibility?: MasterEligibilityResponse;
  isLoading: boolean;
  error?: Error | null;
  isVerifying: boolean;
  onConfirm: () => void;
}) {
  const requirements = React.useMemo(
    () => (eligibility ? getRequirementRows(eligibility) : []),
    [eligibility],
  );
  const isEligible = eligibility?.status === "ELIGIBLE";
  const canVerify =
    eligibility?.status === "ELIGIBLE" ||
    (eligibility?.status === "FAILED" && eligibility.eligible);
  const isVerified = eligibility?.status === "VERIFIED";
  const txHash = eligibility?.verificationTxHash;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[640px] overflow-y-auto border-border bg-background p-0 sm:rounded-none">
        <div className="border-b border-border px-5 py-4">
          <DialogHeader className="">
            <DialogTitle className="font-heading text-xl">
              Master Trader Eligibility
            </DialogTitle>
            <DialogDescription>
              Meet all requirements to become a verified master trader and allow
              other users to copy your trades.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-5 py-5">
          {isLoading && (
            <div className="flex items-center gap-2 border border-border bg-surface px-4 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading eligibility
            </div>
          )}

          {error && (
            <div className="border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error.message}
            </div>
          )}

          {!isLoading && !error && !eligibility && (
            <div className="border border-border bg-surface px-4 py-8 text-center text-sm text-muted-foreground">
              No eligibility data found for this wallet.
            </div>
          )}

          {!isLoading && !error && eligibility && (
            <>
              <div className="grid gap-3">
                {requirements.map((requirement) => (
                  <EligibilityRequirementRow
                    key={requirement.key}
                    requirement={requirement}
                  />
                ))}
              </div>

              {isEligible && (
                <div className="border border-accent/50 bg-accent/10 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      className="mt-0.5 h-5 w-5 text-accent"
                      aria-hidden="true"
                    />
                    <div>
                      <div className="text-sm font-medium text-white">
                        This trader meets all requirements.
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Verification will be submitted by the platform backend.
                        The user does not pay gas. Becoming verified enables
                        future copy-trading master features.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {eligibility.status === "VERIFYING" && (
                <div className="border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-warning">
                  Blockchain verification is in progress. This status will
                  refresh automatically.
                </div>
              )}

              {eligibility.status === "FAILED" && (
                <div className="border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">
                  Verification failed. Refetch eligibility, then try again if
                  the requirements are still met.
                  {eligibility.error && (
                    <div className="mt-2 font-mono text-xs">
                      {eligibility.error}
                    </div>
                  )}
                </div>
              )}

              {isVerified && (
                <div className="border border-success/50 bg-success/10 px-4 py-3 text-sm">
                  <div className="font-medium text-success">
                    Verified Master
                  </div>
                  {eligibility.verifiedAt && (
                    <div className="mt-1 text-muted-foreground">
                      Verified{" "}
                      {new Date(eligibility.verifiedAt).toLocaleString()}
                    </div>
                  )}
                  {txHash && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 font-mono text-xs text-accent hover:underline"
                    >
                      View transaction
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="border-t border-border px-5 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {canVerify && (
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isVerifying}
              className="bg-accent text-black hover:bg-accent/90"
            >
              {isVerifying && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {eligibility?.status === "FAILED"
                ? "Retry Verification"
                : "Confirm Verification"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getRequirementRows(
  eligibility: MasterEligibilityResponse,
): EligibilityRequirement[] {
  return [
    {
      key: "totalTrades",
      label: "Total Trades",
      current: String(eligibility.totalTrades.current),
      target: String(eligibility.totalTrades.target),
      met: eligibility.totalTrades.met,
    },
    {
      key: "roi",
      label: "ROI",
      current: eligibility.roi.current,
      target: eligibility.roi.target,
      met: eligibility.roi.met,
    },
    {
      key: "tradingVolume",
      label: "Trading Volume",
      current: eligibility.tradingVolume.current,
      target: eligibility.tradingVolume.target,
      met: eligibility.tradingVolume.met,
    },
  ];
}
