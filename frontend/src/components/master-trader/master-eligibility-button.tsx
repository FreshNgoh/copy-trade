"use client";

import * as React from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useMasterEligibility,
  useVerifyMaster,
} from "@/hooks/use-master-eligibility";
import { MasterEligibilityModal } from "./master-eligibility-modal";
// import { VerifiedMasterBadge } from "./verified-master-badge";

export function MasterEligibilityButton() {
  const { address, isConnected } = useAccount();
  const [open, setOpen] = React.useState(false);
  const eligibilityQuery = useMasterEligibility(address);
  const verifyMutation = useVerifyMaster(address);
  const eligibility = eligibilityQuery.data;
  const isVerifying =
    verifyMutation.isPending || eligibility?.status === "VERIFYING";
  const isVerified = eligibility?.status === "VERIFIED";
  const isEligible = eligibility?.status === "ELIGIBLE";

  React.useEffect(() => {
    if (open && address) {
      eligibilityQuery.refetch();
    }
  }, [open, address]);

  async function handleOpen() {
    setOpen(true);

    if (!isConnected || !address) {
      return;
    }

    await eligibilityQuery.refetch();
  }

  async function handleConfirmVerification() {
    if (!address || verifyMutation.isPending || isVerifying) return;

    try {
      await verifyMutation.mutateAsync();
      toast.success("Verification submitted", {
        description: "Master trader status will refresh after confirmation.",
      });
      await eligibilityQuery.refetch();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Master trader verification failed",
      );
      await eligibilityQuery.refetch();
    }
  }

  const buttonContent = getButtonContent({
    isConnected,
    isLoading: eligibilityQuery.isLoading,
    isVerifying,
    isVerified,
    isEligible,
  });

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      {/* {isVerified && <VerifiedMasterBadge />} */}
      <Button
        type="button"
        onClick={handleOpen}
        disabled={isVerifying}
        className={cn(
          "font-mono text-xs uppercase tracking-wider",
          isEligible && "bg-accent text-black hover:bg-accent/90",
          isVerified &&
            "border-success bg-success/10 text-success hover:bg-success/10",
          !isEligible &&
            !isVerified &&
            "border-border bg-surface text-muted-foreground hover:border-border-focus hover:bg-surface",
        )}
        variant={isEligible ? "default" : "outline"}
      >
        {buttonContent.icon}
        {buttonContent.text}
      </Button>

      {!isConnected && (
        <span className="text-right text-xs text-muted-foreground">
          Connect wallet to check your master trader status.
        </span>
      )}

      {eligibilityQuery.error && (
        <span className="max-w-sm text-right text-xs text-danger">
          {eligibilityQuery.error.message}
        </span>
      )}

      <MasterEligibilityModal
        open={open}
        onOpenChange={setOpen}
        eligibility={eligibility}
        isLoading={eligibilityQuery.isFetching}
        error={eligibilityQuery.error}
        isVerifying={verifyMutation.isPending}
        onConfirm={handleConfirmVerification}
      />
    </div>
  );
}

function getButtonContent({
  isConnected,
  isLoading,
  isVerifying,
  isVerified,
  isEligible,
}: {
  isConnected: boolean;
  isLoading: boolean;
  isVerifying: boolean;
  isVerified?: boolean;
  isEligible?: boolean;
}) {
  if (!isConnected) {
    return {
      text: "Check Master Eligibility",
      icon: <ShieldCheck className="h-4 w-4" aria-hidden="true" />,
    };
  }

  if (isLoading) {
    return {
      text: "Checking Eligibility",
      icon: <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />,
    };
  }

  if (isVerifying) {
    return {
      text: "Verification in Progress",
      icon: <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />,
    };
  }

  if (isVerified) {
    return {
      text: "Verified Master",
      icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
    };
  }

  if (isEligible) {
    return {
      text: "Become a Verified Master",
      icon: <ShieldCheck className="h-4 w-4" aria-hidden="true" />,
    };
  }

  return {
    text: "Check Master Eligibility",
    icon: <ShieldCheck className="h-4 w-4" aria-hidden="true" />,
  };
}
