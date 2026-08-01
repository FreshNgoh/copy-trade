"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export function PairSelector({ pairs, activePair, setActivePair }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex items-center gap-2 font-heading text-xl font-bold tracking-tighter hover:text-accent">
          {activePair.pair}
          <ChevronDown size={16} />
        </button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="w-full sm:max-w-[420px] p-0 bg-surface border-border text-white"
      >
        <div className="border-b border-border px-5 py-4">
          <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground mb-2">
            ▎ Markets
          </div>
          <div className="font-heading text-lg font-bold">Select Pair</div>
        </div>

        <Command className="bg-surface h-[calc(100vh-81px)] rounded-none">
          <CommandInput
            placeholder="Search coin, e.g. BTC or ETH"
            className="h-12"
          />

          <CommandList className="max-h-none flex-1">
            <CommandEmpty>No market found.</CommandEmpty>

            <CommandGroup heading="USDC Perpetuals">
              {pairs.map((p) => (
                <CommandItem
                  key={p.pair}
                  value={p.pair}
                  onSelect={() => {
                    setActivePair(p);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 cursor-pointer transition-colors",
                    "hover:bg-surface-hover data-[selected=true]:bg-surface-hover",
                    activePair?.pair === p.pair &&
                      "bg-accent/10 border-l-2 border-accent",
                  )}
                >
                  <div>
                    <div className="font-mono text-sm text-white">{p.pair}</div>
                    <div className="text-xs text-muted-foreground">{p.vol}</div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-sm text-white">
                      $
                      {p.price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>

                    <div
                      className={cn(
                        "font-mono text-xs",
                        p.change >= 0 ? "text-success" : "text-danger",
                      )}
                    >
                      {p.change >= 0 ? "+" : ""}
                      {p.change}%
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </SheetContent>
    </Sheet>
  );
}
