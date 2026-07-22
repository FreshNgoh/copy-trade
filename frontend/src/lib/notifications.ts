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

export function getNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addNotification(
  notification: Omit<AppNotification, "id" | "createdAt" | "read">,
) {
  const next: AppNotification = {
    ...notification,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    read: false,
  };
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([next, ...getNotifications()].slice(0, 30)),
  );
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
}

export function markAllNotificationsRead() {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(getNotifications().map((item) => ({ ...item, read: true }))),
  );
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
}
