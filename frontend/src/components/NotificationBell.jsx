import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
export function NotificationBell({ light = false }) {
    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        api.get("/notifications").then(setNotifications).catch(() => undefined);
    }, []);
    useEffect(() => {
        function handleClickOutside(e) {
            if (ref.current && !ref.current.contains(e.target))
                setOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    async function markRead(id) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
        await api.patch(`/notifications/${id}/read`).catch(() => undefined);
    }
    return (<div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors ${light
            ? "bg-white/20 text-white hover:bg-white/30"
            : "bg-surface-container-low text-on-surface-variant hover:bg-surface-variant"}`} aria-label="Notifications">
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (<span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary"/>)}
      </button>
      {open && (<div className="soft-card-shadow absolute right-0 top-12 z-30 w-80 rounded-xl border border-outline-variant bg-surface-container-lowest py-2">
          <div className="border-b border-outline-variant px-4 py-2 font-label-md text-label-md text-on-surface-variant">
            Notifications
          </div>
          {notifications.length === 0 ? (<p className="px-4 py-6 text-center font-body-md text-body-md text-on-surface-variant">
              Nothing yet.
            </p>) : (<div className="max-h-96 overflow-y-auto">
              {notifications.map((n) => (<button key={n.id} onClick={() => markRead(n.id)} className={`flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors hover:bg-surface-container ${n.isRead ? "opacity-60" : ""}`}>
                  <p className="font-label-md text-label-md text-on-surface">
                    {n.payload?.petName ?? "Appointment"} · {n.payload?.serviceName ?? ""}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    Today
                    {n.payload?.startDatetime
                        ? ` at ${new Date(n.payload.startDatetime).toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                        })}`
                        : ""}
                    {n.payload?.providerName ? ` · ${n.payload.providerName}` : ""}
                  </p>
                </button>))}
            </div>)}
        </div>)}
    </div>);
}
