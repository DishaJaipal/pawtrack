import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

const MESSAGE_BUILDERS = {
  BOOKING_STATUS: (p) => p.message ?? "A booking was updated",
  BOOKING_REMINDER: (p) => p.message ?? `Upcoming appointment: ${p.serviceName ?? ""}`,
  RECORD_UPLOADED: (p) => p.message ?? "A new record was added",
};

export function notificationText(n) {
  const build = MESSAGE_BUILDERS[n.type];
  return build ? build(n.payload ?? {}) : "New notification";
}

const POLL_INTERVAL_MS = 20000;

// Fetches the notification list on login, then just asks again every 20
// seconds for as long as you're logged in — the same GET request either
// way, just repeated on a timer instead of pushed over a live connection.
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    let cancelled = false;
    async function poll() {
      const data = await api.get("/notifications");
      if (!cancelled) setNotifications(data);
    }
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  const markRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    await api.patch(`/notifications/${id}/read`);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return { notifications, unreadCount, markRead };
}
