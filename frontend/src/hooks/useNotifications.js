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

// Fetches the notification list once on login, then keeps it live via a
// Server-Sent Events connection — the browser's EventSource reconnects on
// its own if the connection drops, so a missed push just means the next
// GET picks it up on the following page load.
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    let cancelled = false;
    api.get("/notifications").then((data) => {
      if (!cancelled) setNotifications(data);
    });

    const source = new EventSource("/api/notifications/stream", { withCredentials: true });
    source.onmessage = (e) => {
      const notification = JSON.parse(e.data);
      setNotifications((prev) => [notification, ...prev]);
    };

    return () => {
      cancelled = true;
      source.close();
    };
  }, [user]);

  const markRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    await api.patch(`/notifications/${id}/read`);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return { notifications, unreadCount, markRead };
}
