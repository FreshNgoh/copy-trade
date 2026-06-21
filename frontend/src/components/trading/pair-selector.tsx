"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 font-heading text-xl font-bold tracking-tighter hover:text-accent">
          {activePair.pair}
          <ChevronDown size={16} />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={30}
        className="w-[420px] h-[640px] p-0 bg-surface border-border text-white"
      >
        <Command className="bg-surface h-[640px]">
          <CommandInput placeholder="Search coin, e.g. BTC or ETH" />

          <CommandList>
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
                      {p.price < 1
                        ? p.price.toFixed(6)
                        : p.price.toLocaleString()}
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
      </PopoverContent>
    </Popover>
  );
}
