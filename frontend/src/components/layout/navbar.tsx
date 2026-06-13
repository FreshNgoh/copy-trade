"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { cn } from "@/lib/utils";
import { Activity, Bell, Search } from "lucide-react";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/explore", label: "Explore" },
  { href: "/trade", label: "Trade" },
  { href: "/become-trader", label: "Become a Trader" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      data-testid="primary-navbar"
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-border"
    >
      <div className="max-w-[1600px] mx-auto h-16 px-6 flex items-center justify-between gap-6">
        <div className="flex items-center gap-10">
          <Link
            href="/"
            data-testid="nav-logo"
            className="flex items-center gap-2 group"
          >
            <div className="w-7 h-7 bg-accent flex items-center justify-center">
              <Activity className="w-4 h-4 text-black" strokeWidth={2.5} />
            </div>
            <span
              className="font-heading text-base font-bold tracking-tighter"
              style={{ fontFamily: "var(--font-unbounded)" }}
            >
              ALPHAVAULT
            </span>
            <span className="hidden md:inline-flex font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground border border-border px-1.5 py-0.5">
              ON-CHAIN
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={cn(
                    "relative px-3 py-1.5 text-sm font-medium transition-colors hover:text-white",
                    active ? "text-white" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                  {active && (
                    <span className="absolute left-3 right-3 -bottom-[1px] h-px bg-accent" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            data-testid="nav-search-button"
            className="hidden md:flex items-center gap-2 px-3 py-1.5 border border-border hover:border-border-focus transition-colors text-xs text-muted-foreground"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="font-mono">Search traders</span>
            <span className="font-mono text-[10px] border border-border px-1 ml-2">
              ⌘K
            </span>
          </button>
          <button
            data-testid="nav-notifications"
            className="w-9 h-9 border border-border hover:border-border-focus transition-colors flex items-center justify-center relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent rounded-full" />
          </button>
          <div data-testid="connect-wallet-container">
            <ConnectButton
              showBalance={false}
              chainStatus="icon"
              accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
