import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PetParentLayout } from "../layouts/PetParentLayout";
import { ApiError, api } from "../lib/api";
import { Button, ErrorBanner } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { RescheduleModal } from "../components/RescheduleModal";

const STATUS_STYLES = {
  PENDING: "bg-surface-container-high text-on-surface-variant",
  CONFIRMED: "bg-secondary-container text-on-secondary-container",
  COMPLETED: "bg-secondary/10 text-secondary",
  CANCELLED: "bg-error-container text-on-error-container",
  NO_SHOW: "bg-error-container text-on-error-container",
};

const RECORD_TYPE_LABELS = {
  VISIT_SUMMARY: "Visit Summary",
  PRESCRIPTION: "Prescription",
  LAB_RESULT: "Lab Result",
  IMAGING: "Imaging",
  VACCINATION: "Vaccination",
  DEWORMING: "Deworming",
  OTHER: "Other",
};

export default function BookingDetails() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const b = await api.get(`/bookings/${bookingId}`);
    setBooking(b);
  }, [bookingId]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load appointment"))
      .finally(() => setLoading(false));
  }, [load]);

  async function handleCancel() {
    setBusy(true);
    try {
      const updated = await api.patch(`/bookings/${bookingId}/cancel`);
      setBooking((prev) => ({ ...prev, ...updated }));
      setCancelOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to cancel");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <PetParentLayout active="profile">
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="font-body-md text-body-md text-on-surface-variant">Loading...</p>
        </div>
      </PetParentLayout>
    );
  }

  if (!booking) {
    return (
      <PetParentLayout active="profile">
        <div className="p-6">
          <ErrorBanner message={error ?? "Appointment not found"} />
        </div>
      </PetParentLayout>
    );
  }

  const canManage = booking.status === "PENDING" || booking.status === "CONFIRMED";

  return (
    <PetParentLayout active="profile">
      <header className="flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-lowest px-container-padding-mobile py-4 md:px-container-padding-desktop">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface">
              {booking.service.name} · {booking.pet.name}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {new Date(booking.slot.startDatetime).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              {" · with "}
              {booking.staff.name}
            </p>
          </div>
        </div>
        <span className={`font-label-md text-label-md rounded-full px-3 py-1.5 ${STATUS_STYLES[booking.status]}`}>
          {booking.status}
        </span>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-container-padding-mobile py-6 md:px-container-padding-desktop">
        <ErrorBanner message={error} />

        <section className="soft-card-shadow rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
          <h2 className="font-headline-md text-headline-md mb-2 text-on-surface">Provider</h2>
          <p className="font-body-md text-body-md text-on-surface">{booking.provider.user.name}</p>
        </section>

        {canManage && (
          <section className="soft-card-shadow rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
            <h2 className="font-headline-md text-headline-md mb-3 text-on-surface">Manage</h2>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => setRescheduleOpen(true)}>Reschedule</Button>
              <Button variant="secondary" onClick={() => setCancelOpen(true)}>Cancel Appointment</Button>
            </div>
          </section>
        )}

        <section className="soft-card-shadow rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
          <h2 className="font-headline-md text-headline-md mb-4 text-on-surface">Records from this visit</h2>
          {!booking.records || booking.records.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant">
              {booking.status === "COMPLETED"
                ? "The provider hasn't added any notes or files for this visit yet."
                : "Nothing yet — records will show up here once the appointment happens."}
            </p>
          ) : (
            <div className="space-y-3">
              {booking.records.map((r) => (
                <div key={r.id} className="rounded-xl border border-outline-variant/30 p-3">
                  <p className="font-label-md text-label-md text-on-surface">{r.title}</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {RECORD_TYPE_LABELS[r.recordType] ?? r.recordType} · {new Date(r.recordDate).toLocaleDateString()}
                  </p>
                  {r.description && <p className="font-body-md text-body-md mt-1 text-on-surface-variant">{r.description}</p>}
                  {r.fileUrl && (
                    <a href={r.fileUrl} target="_blank" rel="noreferrer" className="font-label-sm text-label-sm text-secondary">
                      View file
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {rescheduleOpen && (
        <RescheduleModal
          booking={booking}
          onClose={() => setRescheduleOpen(false)}
          onRescheduled={(updated) => {
            setBooking((prev) => ({ ...prev, ...updated }));
            setRescheduleOpen(false);
          }}
        />
      )}
      {cancelOpen && (
        <ConfirmDialog
          title="Cancel this appointment?"
          message="This frees up the time slot and notifies the provider."
          confirming={busy}
          onConfirm={handleCancel}
          onCancel={() => setCancelOpen(false)}
        />
      )}
    </PetParentLayout>
  );
}
