import { useEffect, useState } from "react";
import { ApiError, api } from "../lib/api";
import { Modal } from "./Modal";
import { Button, ErrorBanner } from "./Button";

export function RescheduleModal({ booking, onClose, onRescheduled }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get(`/providers/${booking.providerId}/services/${booking.serviceId}/slots`)
      .then((data) => setSlots(data.filter((s) => s.staffId === booking.staffId)))
      .finally(() => setLoading(false));
  }, [booking]);

  async function handleConfirm() {
    if (!selected) {
      setError("Pick a new time first");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const updated = await api.patch(`/bookings/${booking.id}/reschedule`, { newSlotId: selected });
      onRescheduled(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reschedule");
    } finally {
      setSaving(false);
    }
  }

  const grouped = slots.reduce((acc, slot) => {
    const day = new Date(slot.startDatetime).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    (acc[day] ??= []).push(slot);
    return acc;
  }, {});

  return (
    <Modal title="Reschedule Appointment" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <ErrorBanner message={error} />
        {loading ? (
          <p className="font-body-md text-body-md text-on-surface-variant">Loading available times...</p>
        ) : slots.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">No other times available right now.</p>
        ) : (
          <div className="max-h-80 space-y-4 overflow-y-auto">
            {Object.entries(grouped).map(([day, daySlots]) => (
              <div key={day}>
                <p className="font-label-md text-label-md mb-2 text-on-surface-variant">{day}</p>
                <div className="flex flex-wrap gap-2">
                  {daySlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelected(slot.id)}
                      className={`rounded-full border px-4 py-2 font-label-md text-label-md transition-colors ${
                        selected === slot.id
                          ? "border-secondary bg-secondary text-white"
                          : "border-outline-variant/50 bg-white text-on-surface hover:border-secondary"
                      }`}
                    >
                      {new Date(slot.startDatetime).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <Button onClick={handleConfirm} disabled={saving || !selected} className="mt-2">
          {saving ? "Saving..." : "Confirm New Time"}
        </Button>
      </div>
    </Modal>
  );
}
