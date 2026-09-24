import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ProviderLayout } from "../layouts/ProviderLayout";
import { api } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { NotificationBell } from "../components/NotificationBell";
import { Modal } from "../components/Modal";
import { RescheduleModal } from "../components/RescheduleModal";
import { ConfirmDialog } from "../components/ConfirmDialog";
const GRID_START_HOUR = 8;
const GRID_END_HOUR = 19; // exclusive
const ROW_HEIGHT_PX = 80;
const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
function startOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // week starts Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}
function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}
function isSameDay(a, b) {
    return a.toDateString() === b.toDateString();
}
const FILTERS = [
    { value: "UPCOMING", label: "Upcoming" },
    { value: "COMPLETED", label: "Completed" },
    { value: "CANCELLED", label: "Cancelled" },
];
export default function ProviderDashboard() {
    const { user, profile } = useAuth();
    const providerProfile = profile;
    const [searchParams, setSearchParams] = useSearchParams();
    const [showWelcome, setShowWelcome] = useState(searchParams.get("welcome") === "1");
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("UPCOMING");
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
    const [agendaDay, setAgendaDay] = useState(null);
    const navigate = useNavigate();
    const loadBookings = useCallback(async () => {
        const data = await api.get("/bookings");
        setBookings(data);
    }, []);
    useEffect(() => {
        loadBookings().finally(() => setLoading(false));
    }, [loadBookings]);
    useEffect(() => {
        if (searchParams.has("welcome"))
            setSearchParams({}, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const today = new Date();
    const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
    const hours = useMemo(() => Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => GRID_START_HOUR + i), []);
    const filteredBookings = useMemo(() => {
        return bookings.filter((b) => {
            if (filter === "UPCOMING")
                return b.status === "PENDING" || b.status === "CONFIRMED";
            if (filter === "COMPLETED")
                return b.status === "COMPLETED";
            return b.status === "CANCELLED" || b.status === "NO_SHOW";
        });
    }, [bookings, filter]);
    const todaysBookings = useMemo(() => bookings
        .filter((b) => isSameDay(new Date(b.slot.startDatetime), today) && b.status !== "CANCELLED")
        .sort((a, b) => new Date(a.slot.startDatetime).getTime() - new Date(b.slot.startDatetime).getTime()), [bookings] // eslint-disable-line react-hooks/exhaustive-deps
    );
    function bookingsForDay(day) {
        return filteredBookings.filter((b) => isSameDay(new Date(b.slot.startDatetime), day));
    }
    function handleBookingChanged(updated) {
        setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    }
    return (<ProviderLayout active="calendar">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant bg-surface px-4 md:px-8">
        <div className="flex items-center gap-6">
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Dashboard</h2>
          <div className="ml-4 hidden items-center gap-2 sm:flex">
            {FILTERS.map((f) => (<button key={f.value} onClick={() => setFilter(f.value)} className={`text-label-md rounded-full px-4 py-1.5 transition-all ${filter === f.value
                ? "bg-secondary text-on-secondary shadow-sm"
                : "bg-surface-container-highest text-on-surface-variant hover:bg-outline-variant"}`}>
                {f.label}
              </button>))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <div className="mx-2 hidden h-8 w-px bg-outline-variant sm:block"/>
          <div className="hidden items-center gap-3 pl-2 sm:flex">
            <div className="text-right">
              <p className="text-label-md font-bold text-on-surface">{user?.name}</p>
              <p className="text-xs text-on-surface-variant">{providerProfile?.providerType.replace("_", " ")}</p>
            </div>
            <Avatar name={user?.name ?? "?"} size={40}/>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h3 className="font-headline-md text-headline-md text-on-surface">
              {weekStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </h3>
            <div className="flex overflow-hidden rounded-lg border border-outline-variant">
              <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="border-r border-outline-variant bg-surface p-2 text-on-surface-variant transition-colors hover:bg-surface-variant">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="text-label-md bg-surface px-4 py-2 font-bold transition-colors hover:bg-surface-variant">
                Today
              </button>
              <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="border-l border-outline-variant bg-surface p-2 text-on-surface-variant transition-colors hover:bg-surface-variant">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="grid overflow-x-auto border-b border-outline-variant bg-surface-container" style={{ gridTemplateColumns: "80px repeat(7, minmax(90px, 1fr))" }}>
            <div className="h-14"/>
            {weekDays.map((day) => {
            const isToday = isSameDay(day, today);
            return (<button key={day.toISOString()} onClick={() => setAgendaDay(day)} title="View all appointments this day" className={`flex h-14 flex-col items-center justify-center border-l border-outline-variant transition-colors hover:bg-surface-variant/50 ${isToday ? "bg-primary-container/20" : ""}`}>
                  <span className={`text-xs font-bold ${isToday ? "text-primary" : "text-on-surface-variant"}`}>
                    {DAY_LABELS[day.getDay()]}
                  </span>
                  {isToday ? (<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-body-lg font-bold text-on-primary">
                      {day.getDate()}
                    </div>) : (<span className="text-body-lg font-bold">{day.getDate()}</span>)}
                </button>);
        })}
          </div>

          <div className="custom-scrollbar flex-1 overflow-auto">
            <div className="grid" style={{ gridTemplateColumns: "80px repeat(7, minmax(90px, 1fr))" }}>
              <div className="flex flex-col">
                {hours.map((h) => (<div key={h} className="flex items-start justify-center border-b border-outline-variant pt-2" style={{ height: ROW_HEIGHT_PX }}>
                    <span className="text-xs font-bold text-on-surface-variant">{`${h.toString().padStart(2, "0")}:00`}</span>
                  </div>))}
              </div>
              {weekDays.map((day) => (<div key={day.toISOString()} className="relative border-l border-outline-variant">
                  {hours.map((h) => (<div key={h} className="border-b border-outline-variant" style={{ height: ROW_HEIGHT_PX }}/>))}
                  {bookingsForDay(day).map((booking) => {
                const start = new Date(booking.slot.startDatetime);
                const end = new Date(booking.slot.endDatetime);
                const startOffset = start.getHours() + start.getMinutes() / 60 - GRID_START_HOUR;
                const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                return (<div key={booking.id} onClick={() => navigate(`/provider/appointments/${booking.id}`)} className="absolute left-1 right-1 z-20 cursor-pointer rounded-xl border border-white/20 bg-primary-container p-3 text-on-primary-container shadow-md transition-transform hover:scale-[1.02]" style={{ top: startOffset * ROW_HEIGHT_PX, height: durationHours * ROW_HEIGHT_PX }}>
                        <p className="text-xs font-bold">{booking.service.name}</p>
                        <p className="text-body-md font-bold">{booking.pet.name}</p>
                        <p className="text-xs opacity-90">
                          {start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} -{" "}
                          {end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>);
            })}
                </div>))}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card fixed bottom-24 right-4 z-40 w-72 rounded-2xl border border-outline-variant/50 bg-white/80 p-6 shadow-2xl backdrop-blur-md sm:bottom-8 sm:right-8 sm:w-80 md:right-8">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="font-bold text-primary">Daily Overview</h4>
          <span className="rounded-full bg-primary-container px-2 py-1 text-xs font-bold text-on-primary-container">
            {todaysBookings.length} today
          </span>
        </div>
        {loading ? (<p className="font-body-md text-body-md text-on-surface-variant">Loading...</p>) : todaysBookings.length === 0 ? (<p className="font-body-md text-body-md text-on-surface-variant">No appointments today.</p>) : (<div className="space-y-4">
            {todaysBookings.map((b) => (<div key={b.id} className="flex items-center gap-3">
                <Avatar name={b.pet.name} size={40}/>
                <div>
                  <p className="text-sm font-bold">
                    {b.pet.name} ({b.pet.species})
                  </p>
                  <p className="text-xs text-on-surface-variant">{b.service.name}</p>
                </div>
                <span className="ml-auto text-xs font-bold text-on-surface-variant">
                  {new Date(b.slot.startDatetime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>))}
          </div>)}
      </div>

      {showWelcome && (<div className="fixed inset-0 z-[60] flex items-center justify-center bg-inverse-surface/40">
          <div className="soft-card-shadow w-full max-w-md rounded-xl bg-surface-container-lowest p-6">
            <h2 className="font-headline-md text-headline-md text-on-surface">Welcome to PawTrack!</h2>
            <p className="font-body-md text-body-md mt-2 text-on-surface-variant">
              Let's get your business ready to take bookings. Start by adding the services you offer, then your
              staff, and finally their available time slots.
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowWelcome(false)} className="min-h-[48px] flex-1 rounded-lg border border-outline-variant bg-surface-container px-6 font-label-md text-label-md font-semibold text-on-surface">
                Later
              </button>
              <Link to="/provider/services" onClick={() => setShowWelcome(false)} className="flex min-h-[48px] flex-1 items-center justify-center rounded-lg bg-primary px-6 font-label-md text-label-md font-semibold text-on-primary">
                Set up services
              </Link>
            </div>
          </div>
        </div>)}

      {agendaDay && (
        <DayAgendaModal
          day={agendaDay}
          bookings={bookings.filter((b) => isSameDay(new Date(b.slot.startDatetime), agendaDay))}
          onClose={() => setAgendaDay(null)}
          onChanged={handleBookingChanged}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ddc1b7; border-radius: 10px; }
      `}</style>
    </ProviderLayout>);
}

function DayAgendaModal({ day, bookings, onClose, onChanged }) {
  const [cancellingId, setCancellingId] = useState(null);
  const [reschedulingBooking, setReschedulingBooking] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const sorted = [...bookings].sort(
    (a, b) => new Date(a.slot.startDatetime).getTime() - new Date(b.slot.startDatetime).getTime()
  );

  async function handleCancel() {
    const booking = cancelTarget;
    setCancellingId(booking.id);
    try {
      const updated = await api.patch(`/bookings/${booking.id}/cancel`);
      onChanged(updated);
      setCancelTarget(null);
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <Modal title={day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} onClose={onClose}>
      {sorted.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant">No appointments this day.</p>
      ) : (
        <div className="max-h-[60vh] space-y-3 overflow-y-auto">
          {sorted.map((b) => {
            const canManage = b.status === "PENDING" || b.status === "CONFIRMED";
            return (
              <div key={b.id} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-3">
                <Link to={`/provider/appointments/${b.id}`} className="block">
                  <p className="font-label-md text-label-md text-on-surface">
                    {new Date(b.slot.startDatetime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    {" — "}
                    {b.service.name} · {b.pet.name}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">{b.status}</p>
                </Link>
                {canManage && (
                  <div className="mt-2 flex gap-4">
                    <button
                      onClick={() => setReschedulingBooking(b)}
                      className="font-label-sm text-label-sm text-secondary"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => setCancelTarget(b)}
                      disabled={cancellingId === b.id}
                      className="font-label-sm text-label-sm text-error disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {reschedulingBooking && (
        <RescheduleModal
          booking={reschedulingBooking}
          onClose={() => setReschedulingBooking(null)}
          onRescheduled={(updated) => {
            onChanged(updated);
            setReschedulingBooking(null);
          }}
        />
      )}
      {cancelTarget && (
        <ConfirmDialog
          title="Cancel this appointment?"
          message="This frees up the time slot and notifies the pet parent."
          confirmLabel="Cancel Appointment"
          confirming={cancellingId === cancelTarget.id}
          onConfirm={handleCancel}
          onCancel={() => setCancelTarget(null)}
        />
      )}
    </Modal>
  );
}
