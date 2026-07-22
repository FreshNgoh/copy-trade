"use client";

import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerifiedMasterBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border border-accent bg-accent/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-accent",
        className,
      )}
    >
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      {/* Verified Master */}
    </span>
  );
}
