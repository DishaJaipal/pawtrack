import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PetParentLayout } from "../layouts/PetParentLayout";
import { ApiError, api } from "../lib/api";
import type { Pet } from "../lib/types";
import { Avatar } from "../components/Avatar";
import { NotificationBell } from "../components/NotificationBell";
import { Modal } from "../components/Modal";
import { Button, ErrorBanner } from "../components/Button";
import { FormField } from "../components/FormField";
import { SpeciesBreedPicker } from "../components/SpeciesBreedPicker";
import { AgeInput } from "../components/AgeInput";

export default function PetParentHome() {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [addPetOpen, setAddPetOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showWelcome, setShowWelcome] = useState(searchParams.get("welcome") === "1");

  const loadPets = useCallback(async () => {
    const data = await api.get<Pet[]>("/pets");
    setPets(data);
  }, []);

  useEffect(() => {
    loadPets().finally(() => setLoading(false));
  }, [loadPets]);

  useEffect(() => {
    if (searchParams.has("welcome")) setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = user?.name.split(" ")[0] ?? "there";
  const firstPet = pets[0];

  return (
    <PetParentLayout active="home">
      <header className="sticky top-0 z-40 bg-background">
        <div className="flex w-full items-center justify-between px-container-padding-mobile py-4">
          <div className="flex items-center gap-3">
            <Avatar name={user?.name ?? "?"} size={40} />
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Welcome back!</span>
              <h1 className="font-headline-md text-headline-md font-bold text-on-surface">Hi, {firstName}!</h1>
            </div>
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="flex flex-col gap-section-gap pt-4">
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-container-padding-mobile">
            <h2 className="font-headline-md text-headline-md text-on-surface">Your Family</h2>
          </div>
          {loading ? (
            <p className="font-body-md text-body-md px-container-padding-mobile text-on-surface-variant">
              Loading...
            </p>
          ) : (
            <div className="hide-scrollbar flex gap-gutter overflow-x-auto px-container-padding-mobile">
              {pets.map((pet) => (
                <Link
                  key={pet.id}
                  to={`/pets/${pet.id}`}
                  className="group flex shrink-0 flex-col items-center gap-2"
                >
                  <div className="rounded-full border-2 border-primary p-1 transition-transform group-active:scale-95">
                    <Avatar name={pet.name} size={72} />
                  </div>
                  <span className="font-label-md text-label-md text-on-surface">{pet.name}</span>
                </Link>
              ))}
              <button
                onClick={() => setAddPetOpen(true)}
                className="group flex shrink-0 flex-col items-center gap-2"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-outline-variant bg-surface-container-low transition-colors group-hover:bg-surface-variant/50">
                  <span className="material-symbols-outlined text-outline">add</span>
                </div>
                <span className="font-label-md text-label-md text-outline">Add New</span>
              </button>
            </div>
          )}
        </section>

        <section className="px-container-padding-mobile">
          <Link
            to="/providers"
            className="group relative flex flex-col items-start overflow-hidden rounded-xl bg-primary p-5 text-left text-on-primary shadow-lg transition-transform active:scale-95"
          >
            <div className="absolute -bottom-4 -right-4 opacity-10 transition-transform duration-500 group-hover:scale-110">
              <span className="material-symbols-outlined text-[120px]">search</span>
            </div>
            <div className="mb-3 rounded-lg bg-white/20 p-2">
              <span className="material-symbols-outlined">medical_services</span>
            </div>
            <span className="font-headline-md text-[18px] mb-1">Find a service</span>
            <span className="text-[12px] text-white/80">Vet, Grooming &amp; more</span>
          </Link>
        </section>

        <section className="flex flex-col gap-4 px-container-padding-mobile">
          <h2 className="font-headline-md text-headline-md text-on-surface">Upcoming</h2>
          <div className="soft-card-shadow rounded-xl border border-outline-variant/30 bg-white p-6 text-center">
            <span className="material-symbols-outlined mb-2 text-outline">event_available</span>
            <p className="font-body-md text-body-md text-on-surface-variant">
              No upcoming appointments yet.
            </p>
            <Link to="/providers" className="font-label-md text-label-md mt-2 inline-block text-secondary">
              Find a provider to book one
            </Link>
          </div>
        </section>
      </main>

      {addPetOpen && (
        <AddPetModal
          onClose={() => setAddPetOpen(false)}
          onCreated={(pet) => {
            setPets((prev) => [...prev, pet]);
            setAddPetOpen(false);
          }}
        />
      )}

      {showWelcome && (
        <Modal title={`Welcome, ${firstName}!`} onClose={() => setShowWelcome(false)}>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Let's get {firstPet?.name ?? "your pet"}'s history in one place. Start by uploading their vaccination
            records, prescriptions, or any past reports — everything stays organized by category.
          </p>
          <div className="mt-6 flex gap-3">
            <Button variant="secondary" onClick={() => setShowWelcome(false)} className="flex-1">
              Later
            </Button>
            {firstPet && (
              <Link
                to={`/pets/${firstPet.id}?tab=records&upload=1`}
                onClick={() => setShowWelcome(false)}
                className="flex flex-1 items-center justify-center rounded-lg bg-primary px-6 font-label-md text-label-md font-semibold text-on-primary"
              >
                Upload records
              </Link>
            )}
          </div>
        </Modal>
      )}
    </PetParentLayout>
  );
}

function AddPetModal({ onClose, onCreated }: { onClose: () => void; onCreated: (pet: Pet) => void }) {
  const [form, setForm] = useState({
    name: "",
    species: "",
    breed: "",
    ageMonths: "",
    weightKg: "",
    allergies: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const pet = await api.post<Pet>("/pets", {
        name: form.name,
        species: form.species,
        breed: form.breed || undefined,
        ageMonths: form.ageMonths ? Number(form.ageMonths) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        alerts: form.allergies || undefined,
      });
      onCreated(pet);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add pet");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add a Pet" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ErrorBanner message={error} />
        <FormField id="name" label="Pet's name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <SpeciesBreedPicker
          species={form.species}
          breed={form.breed}
          onChange={(species, breed) => setForm({ ...form, species, breed })}
        />
        <div className="grid grid-cols-2 gap-4">
          <AgeInput ageMonths={form.ageMonths} onChange={(ageMonths) => setForm({ ...form, ageMonths })} />
          <FormField id="weightKg" label="Weight (kg)" type="number" min={0} step="0.1" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
        </div>
        <FormField id="allergies" label="Known allergies (optional)" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
        <Button type="submit" disabled={saving} className="mt-2">
          {saving ? "Adding..." : "Add Pet"}
        </Button>
      </form>
    </Modal>
  );
}
