import { useState } from "react";
import { notificationText, useNotifications } from "../hooks/useNotifications";

export function NotificationBell() {
  const { notifications, unreadCount, markRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="soft-card-shadow relative flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant hover:bg-surface-variant"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="soft-card-shadow absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-2xl border border-outline-variant bg-surface-container-lowest">
            {notifications.length === 0 ? (
              <p className="font-body-md text-body-md p-4 text-on-surface-variant">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.isRead && markRead(n.id)}
                  className={`block w-full border-b border-outline-variant/20 p-3 text-left last:border-0 ${
                    n.isRead ? "" : "bg-secondary/5"
                  }`}
                >
                  <p className="font-label-md text-label-md text-on-surface">{notificationText(n)}</p>
                  <p className="font-label-sm text-label-sm mt-0.5 text-on-surface-variant">
                    {new Date(n.sentAt ?? n.createdAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
