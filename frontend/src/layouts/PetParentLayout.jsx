import { Link } from "react-router-dom";
import { NotificationBell } from "../components/NotificationBell";
const NAV_ITEMS = [
    { key: "home", label: "Home", icon: "home", to: "/" },
    { key: "search", label: "Search", icon: "search", to: "/providers" },
    { key: "profile", label: "Profile", icon: "person", to: "/account" },
];
export function PetParentLayout({ active, children, }) {
    return (<div className="min-h-screen bg-background font-body-md text-on-surface">
      <div className="fixed right-4 top-4 z-50">
        <NotificationBell />
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col gap-2 border-r border-outline-variant bg-surface-container-low p-4 md:flex">
        <div className="mb-8 px-4">
          <h1 className="font-headline-md text-headline-md font-bold text-primary">PawTrack</h1>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => active === item.key ? (<span key={item.key} className="flex items-center gap-3 rounded-lg bg-secondary-container px-4 py-3 font-bold text-on-secondary-container">
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </span>) : (<Link key={item.key} to={item.to} className="flex items-center gap-3 rounded-lg px-4 py-3 text-on-surface-variant transition-all duration-200 hover:bg-surface-variant">
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </Link>))}
        </nav>
      </aside>

      {/* Content */}
      <div className="pb-24 md:ml-64 md:pb-0">{children}</div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around rounded-t-3xl bg-surface px-container-padding-mobile pb-4 pt-2 shadow-[0px_-4px_20px_rgba(74,69,66,0.06)] md:hidden">
        {NAV_ITEMS.map((item) => active === item.key ? (<span key={item.key} className="flex scale-95 flex-col items-center justify-center rounded-full bg-secondary-container px-4 py-1 text-on-secondary-container">
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-label-sm text-label-sm">{item.label}</span>
            </span>) : (<Link key={item.key} to={item.to} className="flex flex-col items-center justify-center rounded-2xl p-2 text-on-surface-variant hover:bg-surface-variant/50">
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-label-sm text-label-sm">{item.label}</span>
            </Link>))}
      </nav>
    </div>);
}
