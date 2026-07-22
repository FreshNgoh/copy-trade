export type AppNotification = {
  id: string;
  type: "deposit" | "withdraw" | "transfer" | "liquidation_warning" | "liquidation";
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

const STORAGE_KEY = "alphavault.notifications";
export const NOTIFICATIONS_UPDATED_EVENT = "alphavault:notifications-updated";

function storageKey(walletAddress: string) {
  return `${STORAGE_KEY}.${walletAddress.trim().toLowerCase()}`;
}

export function getNotifications(walletAddress?: string): AppNotification[] {
  if (typeof window === "undefined" || !walletAddress) return [];
  try {
    return JSON.parse(window.localStorage.getItem(storageKey(walletAddress)) || "[]");
  } catch {
    return [];
  }
}

export function addNotification(
  walletAddress: string,
  notification: Omit<AppNotification, "id" | "createdAt" | "read">,
) {
  const next: AppNotification = {
    ...notification,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    read: false,
  };
  window.localStorage.setItem(
    storageKey(walletAddress),
    JSON.stringify([next, ...getNotifications(walletAddress)].slice(0, 30)),
  );
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
}

export function markAllNotificationsRead(walletAddress: string) {
  window.localStorage.setItem(
    storageKey(walletAddress),
    JSON.stringify(getNotifications(walletAddress).map((item) => ({ ...item, read: true }))),
  );
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
}
