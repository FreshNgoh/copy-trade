"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { cn } from "@/lib/utils";
import { Activity, Bell, Search } from "lucide-react";
import * as React from "react";
import {
  getNotifications,
  NOTIFICATIONS_UPDATED_EVENT,
  type AppNotification,
} from "@/lib/notifications";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/explore", label: "Explore" },
  { href: "/trade", label: "Trade" },
  { href: "/trade-history", label: "History" },
  { href: "/become-trader", label: "Become a Trader" },
];

export function Navbar() {
  const pathname = usePathname();
  const { address } = useAccount();
  const [notifications, setNotifications] = React.useState<AppNotification[]>(
    [],
  );

  React.useEffect(() => {
    const refresh = () => setNotifications(getNotifications(address));
    refresh();
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [address]);

  const unread = notifications.filter((item) => !item.read).length;

  return (
    <nav
      data-testid="primary-navbar"
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-border"
    >
      <div className="max-w-[1600px] mx-auto h-16 px-2 flex items-center justify-between gap-6">
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
          {/* <button
            data-testid="nav-search-button"
            className="hidden md:flex items-center gap-2 px-3 py-1.5 border border-border hover:border-border-focus transition-colors text-xs text-muted-foreground"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="font-mono">Search traders</span>
            <span className="font-mono text-[10px] border border-border px-1 ml-2">
              ⌘K
            </span>
          </button> */}
          <Link
            href="/notifications"
            data-testid="nav-notifications"
            aria-label="Notifications"
            className="w-9 h-9 border border-border hover:border-border-focus transition-colors flex items-center justify-center relative"
          >
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-3.5 h-3.5 px-0.5 bg-accent text-black text-[8px] font-mono rounded-full flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
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
