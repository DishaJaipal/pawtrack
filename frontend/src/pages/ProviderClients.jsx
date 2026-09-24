import { useEffect, useState } from "react";
import { ProviderLayout } from "../layouts/ProviderLayout";
import { ApiError, api } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { ErrorBanner } from "../components/Button";
import { UploadRecordForm } from "../components/UploadRecordForm";

export default function ProviderClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api
      .get("/providers/me/clients")
      .then(setClients)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load clients"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProviderLayout active="clients">
      <header className="border-b border-outline-variant/30 bg-surface-container-lowest px-container-padding-mobile py-6 md:px-container-padding-desktop">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Clients</h1>
        <p className="font-body-md text-body-md mt-1 text-on-surface-variant">
          Pets you've completed an appointment with.
        </p>
      </header>

      <main className="grid gap-6 px-container-padding-mobile py-6 md:grid-cols-[320px_1fr] md:px-container-padding-desktop">
        <ErrorBanner message={error} />

        <div className="space-y-3">
          {loading ? (
            <p className="font-body-md text-body-md text-on-surface-variant">Loading...</p>
          ) : clients.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant">
              No clients yet — they'll show up here once you complete an appointment.
            </p>
          ) : (
            clients.map((c) => (
              <button
                key={c.pet.id}
                onClick={() => setSelected(c)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                  selected?.pet.id === c.pet.id
                    ? "border-secondary bg-secondary/5"
                    : "border-outline-variant bg-surface-container-lowest hover:border-secondary/50"
                }`}
              >
                <Avatar name={c.pet.name} size={40} />
                <div>
                  <p className="font-label-md text-label-md text-on-surface">{c.pet.name}</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">{c.owner.name}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {selected && (
          <div className="soft-card-shadow space-y-6 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
            <div className="flex items-center gap-4">
              <Avatar name={selected.pet.name} size={56} />
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">{selected.pet.name}</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {selected.pet.breed || selected.pet.species}
                  {selected.pet.weightKg ? ` · ${selected.pet.weightKg} kg` : ""}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-label-md text-label-md mb-1 text-on-surface-variant">Owner</h3>
              <p className="font-body-md text-body-md text-on-surface">{selected.owner.name}</p>
              <p className="font-body-md text-body-md text-on-surface-variant">{selected.owner.email}</p>
              <p className="font-body-md text-body-md text-on-surface-variant">{selected.owner.phoneNo ?? "No phone on file"}</p>
            </div>

            <div>
              <h3 className="font-label-md text-label-md mb-2 text-on-surface-variant">Appointment History</h3>
              <div className="space-y-2">
                {selected.appointments.map((a) => (
                  <div key={a.id} className="rounded-lg bg-surface-container px-3 py-2 text-sm">
                    {a.serviceName} · {new Date(a.startDatetime).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-label-md text-label-md mb-2 text-on-surface-variant">Upload a record</h3>
              <UploadRecordForm petId={selected.pet.id} onAdded={() => undefined} />
            </div>
          </div>
        )}
      </main>
    </ProviderLayout>
  );
}
