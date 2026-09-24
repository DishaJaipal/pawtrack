import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ProviderLayout } from "../layouts/ProviderLayout";
import { ApiError, api } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { Button, ErrorBanner } from "../components/Button";
import { RescheduleModal } from "../components/RescheduleModal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { UploadRecordForm } from "../components/UploadRecordForm";

const STATUS_STYLES = {
  PENDING: "bg-surface-container-high text-on-surface-variant",
  CONFIRMED: "bg-secondary-container text-on-secondary-container",
  COMPLETED: "bg-secondary/10 text-secondary",
  CANCELLED: "bg-error-container text-on-error-container",
  NO_SHOW: "bg-error-container text-on-error-container",
};

const RECORD_TYPES = [
  { value: "VISIT_SUMMARY", label: "Visit Summary" },
  { value: "PRESCRIPTION", label: "Prescription" },
  { value: "LAB_RESULT", label: "Lab Result" },
  { value: "IMAGING", label: "Imaging" },
  { value: "VACCINATION", label: "Vaccination" },
  { value: "DEWORMING", label: "Deworming" },
  { value: "OTHER", label: "Other" },
];

export default function ProviderAppointment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const b = await api.get(`/bookings/${bookingId}`);
    setBooking(b);
    const r = await api.get(`/pets/${b.petId}/records`);
    setRecords(r);
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

  async function handleComplete() {
    setBusy(true);
    try {
      await api.patch(`/bookings/${bookingId}/complete`);
      navigate("/provider/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to end appointment");
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <ProviderLayout active="calendar">
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="font-body-md text-body-md text-on-surface-variant">Loading...</p>
        </div>
      </ProviderLayout>
    );
  }

  if (!booking) {
    return (
      <ProviderLayout active="calendar">
        <div className="p-6">
          <ErrorBanner message={error ?? "Appointment not found"} />
        </div>
      </ProviderLayout>
    );
  }

  const canManage = booking.status === "PENDING" || booking.status === "CONFIRMED";
  const pet = booking.pet;
  const owner = booking.petParent?.user;

  return (
    <ProviderLayout active="calendar">
      <header className="flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-lowest px-container-padding-mobile py-4 md:px-container-padding-desktop">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface">
              {booking.service.name} · {pet.name}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {new Date(booking.slot.startDatetime).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
        </div>
        <span className={`font-label-md text-label-md rounded-full px-3 py-1.5 ${STATUS_STYLES[booking.status]}`}>
          {booking.status}
        </span>
      </header>

      <main className="grid gap-6 px-container-padding-mobile py-6 md:grid-cols-2 md:px-container-padding-desktop">
        <ErrorBanner message={error} />

        {booking.status === "CANCELLED" && booking.updatedByUser && (
          <div className="md:col-span-2 rounded-xl bg-error-container px-4 py-3 font-label-md text-label-md text-on-error-container">
            Cancelled by {booking.updatedByUser.name}
            {booking.updatedByUser.role === "PET_PARENT" ? " (pet parent)" : " (you)"}
          </div>
        )}

        <section className="soft-card-shadow space-y-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
          <h2 className="font-headline-md text-headline-md text-on-surface">Pet</h2>
          <div className="flex items-center gap-3">
            <Avatar name={pet.name} size={48} />
            <div>
              <p className="font-label-md text-label-md text-on-surface">{pet.name}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">{pet.breed || pet.species}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <p><span className="text-on-surface-variant">Species:</span> {pet.species}</p>
            <p><span className="text-on-surface-variant">Gender:</span> {pet.gender ?? "—"}</p>
            <p><span className="text-on-surface-variant">Weight:</span> {pet.weightKg ? `${pet.weightKg} kg` : "—"}</p>
            <p><span className="text-on-surface-variant">Alerts:</span> {pet.alerts ?? "None"}</p>
          </div>

          <h3 className="font-label-md text-label-md mt-4 text-on-surface-variant">Owner</h3>
          <p className="font-body-md text-body-md text-on-surface">{owner?.name}</p>
          <p className="font-body-md text-body-md text-on-surface-variant">{owner?.email}</p>
          <p className="font-body-md text-body-md text-on-surface-variant">{booking.petParent?.phoneNo ?? "No phone on file"}</p>
        </section>

        <section className="soft-card-shadow space-y-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
          <h2 className="font-headline-md text-headline-md text-on-surface">Actions</h2>
          <div className="flex flex-wrap gap-3">
            {canManage && (
              <>
                <Button variant="secondary" onClick={() => setRescheduleOpen(true)}>Reschedule</Button>
                <Button variant="secondary" onClick={() => setCancelOpen(true)}>Cancel Appointment</Button>
                <Button onClick={() => setCompleteOpen(true)}>End Appointment</Button>
              </>
            )}
            {!canManage && (
              <p className="font-body-md text-body-md text-on-surface-variant">
                This appointment is {booking.status.toLowerCase()} — no further actions available.
              </p>
            )}
          </div>

          <h3 className="font-label-md text-label-md mt-4 text-on-surface-variant">Add a note or file</h3>
          <UploadRecordForm petId={pet.id} bookingId={booking.id} onAdded={(r) => setRecords((prev) => [r, ...prev])} />
        </section>

        <section className="soft-card-shadow rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 md:col-span-2">
          <h2 className="font-headline-md text-headline-md mb-4 text-on-surface">Pet Records</h2>
          {records.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant">No records yet.</p>
          ) : (
            <div className="space-y-3">
              {records.map((r) => (
                <div key={r.id} className="rounded-xl border border-outline-variant/30 p-3">
                  <p className="font-label-md text-label-md text-on-surface">{r.title}</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {r.recordType} · {new Date(r.recordDate).toLocaleDateString()}
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
          message="This frees up the time slot and notifies both sides."
          confirming={busy}
          onConfirm={handleCancel}
          onCancel={() => setCancelOpen(false)}
        />
      )}
      {completeOpen && (
        <ConfirmDialog
          title="End this appointment?"
          message="Marks it as completed. Make sure you've added any notes first."
          confirmLabel="End Appointment"
          danger={false}
          confirming={busy}
          onConfirm={handleComplete}
          onCancel={() => setCompleteOpen(false)}
        />
      )}
    </ProviderLayout>
  );
}
