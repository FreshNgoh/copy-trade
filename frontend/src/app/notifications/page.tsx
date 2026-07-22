"use client";

import * as React from "react";
import { AlertTriangle, ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Bell, ShieldAlert } from "lucide-react";
import { getNotifications, markAllNotificationsRead, NOTIFICATIONS_UPDATED_EVENT, type AppNotification } from "@/lib/notifications";

export default function NotificationsPage() {
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);

  React.useEffect(() => {
    const refresh = () => setNotifications(getNotifications());
    refresh();
    markAllNotificationsRead();
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh);
  }, []);

  return <main className="min-h-screen bg-background"><div className="mx-auto max-w-4xl px-6 py-10">
    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">▎ Account activity</div>
    <h1 className="mt-2 font-heading text-3xl font-bold">Notifications</h1>
    <p className="mt-2 text-sm text-muted-foreground">Deposits, withdrawals, and wallet transfers appear here.</p>
    <section className="mt-8 border border-border bg-surface">
      {notifications.map((item) => {
        const Icon = item.type === "deposit" ? ArrowDownToLine : item.type === "withdraw" ? ArrowUpFromLine : item.type === "liquidation_warning" ? AlertTriangle : item.type === "liquidation" ? ShieldAlert : ArrowLeftRight;
        return <article key={item.id} className="flex gap-4 border-b border-border p-5 last:border-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-accent/30 bg-accent/10"><Icon className="h-4 w-4 text-accent" /></div>
          <div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-sm font-medium">{item.title}</h2><time className="font-mono text-[10px] text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</time></div><p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.message}</p></div>
        </article>;
      })}
      {notifications.length === 0 && <div className="flex flex-col items-center px-5 py-20 text-center"><Bell className="h-6 w-6 text-muted-foreground" /><div className="mt-3 text-sm">No notifications yet</div><p className="mt-1 text-xs text-muted-foreground">Your wallet activity will appear here.</p></div>}
    </section>
  </div></main>;
}
