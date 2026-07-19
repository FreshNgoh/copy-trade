"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EligibilityRequirement } from "@/types/master-trader";

export function EligibilityRequirementRow({
  requirement,
}: {
  requirement: EligibilityRequirement;
}) {
  const Icon = requirement.met ? CheckCircle2 : XCircle;

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border px-4 py-3",
        requirement.met
          ? "border-success/50 bg-success/10"
          : "border-danger/50 bg-danger/10",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Icon
          className={cn(
            "mt-0.5 h-4 w-4 flex-shrink-0",
            requirement.met ? "text-success" : "text-danger",
          )}
          aria-label={requirement.met ? "Requirement met" : "Requirement not met"}
        />
        <div>
          <div className="text-sm font-medium">{requirement.label}</div>
          <div
            className={cn(
              "mt-1 font-mono text-[10px] uppercase tracking-wider",
              requirement.met ? "text-success" : "text-danger",
            )}
          >
            {requirement.met ? "Met" : "Not met"}
          </div>
        </div>
      </div>
      <div className="text-right font-mono text-sm">
        <span>{requirement.current}</span>
        <span className="mx-1 text-muted-foreground">/</span>
        <span className="text-muted-foreground">{requirement.target}</span>
      </div>
    </div>
  );
}
