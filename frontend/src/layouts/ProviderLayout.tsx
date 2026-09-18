import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { key: "calendar", label: "Calendar", icon: "calendar_month", to: "/provider/dashboard" },
  { key: "services", label: "Services", icon: "design_services", to: "/provider/services" },
  { key: "settings", label: "Settings", icon: "settings", to: "/provider/settings" },
] as const;

export function ProviderLayout({
  active,
  children,
}: {
  active: "calendar" | "services" | "settings";
  children: ReactNode;
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface-container-low font-body-md text-body-md text-on-surface">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col gap-2 border-r border-outline-variant bg-surface-container-low p-4 md:flex">
        <div className="mb-8 px-4">
          <h1 className="font-headline-md text-headline-md font-bold text-primary">PawTrack</h1>
          <p className="text-label-sm text-on-surface-variant">Service Provider Portal</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) =>
            active === item.key ? (
              <span
                key={item.key}
                className="flex items-center gap-3 rounded-lg bg-secondary-container px-4 py-3 font-bold text-on-secondary-container"
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </span>
            ) : (
              <Link
                key={item.key}
                to={item.to}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-on-surface-variant transition-all duration-200 hover:bg-surface-variant"
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </Link>
            )
          )}
          <span className="flex cursor-not-allowed items-center gap-3 rounded-lg px-4 py-3 text-on-surface-variant/50">
            <span className="material-symbols-outlined">group</span>
            Clients
          </span>
          <span className="flex cursor-not-allowed items-center gap-3 rounded-lg px-4 py-3 text-on-surface-variant/50">
            <span className="material-symbols-outlined">star</span>
            Reviews
          </span>
        </nav>
        <div className="mt-auto flex flex-col gap-1 border-t border-outline-variant pt-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-on-surface-variant transition-all duration-200 hover:bg-surface-variant"
          >
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="pb-20 md:ml-64 md:pb-0">{children}</div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t border-outline-variant bg-surface px-2 pb-4 pt-2 shadow-[0px_-4px_20px_rgba(74,69,66,0.06)] md:hidden">
        {NAV_ITEMS.map((item) =>
          active === item.key ? (
            <span
              key={item.key}
              className="flex scale-95 flex-col items-center justify-center rounded-full bg-secondary-container px-4 py-1 text-on-secondary-container"
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-label-sm text-label-sm">{item.label}</span>
            </span>
          ) : (
            <Link
              key={item.key}
              to={item.to}
              className="flex flex-col items-center justify-center rounded-2xl p-2 text-on-surface-variant hover:bg-surface-variant/50"
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-label-sm text-label-sm">{item.label}</span>
            </Link>
          )
        )}
        <button onClick={handleLogout} className="flex flex-col items-center justify-center rounded-2xl p-2 text-on-surface-variant hover:bg-surface-variant/50">
          <span className="material-symbols-outlined">logout</span>
          <span className="font-label-sm text-label-sm">Logout</span>
        </button>
      </nav>
    </div>
  );
}
