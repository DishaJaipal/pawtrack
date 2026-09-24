import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PetParentLayout } from "../layouts/PetParentLayout";
import { ApiError, api } from "../lib/api";
import { Modal } from "../components/Modal";
import { Button, ErrorBanner } from "../components/Button";
import { FormSelect } from "../components/FormField";
const PROVIDER_TYPE_LABELS = {
    VET_CLINIC: "Vet Clinic",
    INDEPENDENT_VET: "Independent Vet",
    GROOMER: "Groomer",
    TRAINER: "Trainer",
    PET_SITTER: "Pet Sitter",
};
export default function ProviderProfile() {
    const { providerId } = useParams();
    const navigate = useNavigate();
    const [provider, setProvider] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [selectedService, setSelectedService] = useState(null);
    const [slots, setSlots] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [bookingSlot, setBookingSlot] = useState(null);
    useEffect(() => {
        if (!providerId)
            return;
        setLoading(true);
        api
            .get(`/providers/${providerId}`)
            .catch((err) => {
            setLoadError(err instanceof ApiError ? err.message : "Failed to load provider");
            return null;
        })
            .then((data) => data && setProvider(data))
            .finally(() => setLoading(false));
    }, [providerId]);
    const loadSlots = useCallback(async (service) => {
        if (!providerId)
            return;
        setSlotsLoading(true);
        try {
            const data = await api.get(`/providers/${providerId}/services/${service.id}/slots`);
            setSlots(data);
        }
        finally {
            setSlotsLoading(false);
        }
    }, [providerId]);
    function selectService(service) {
        setSelectedService(service);
        loadSlots(service);
    }
    if (loading) {
        return (<PetParentLayout active="search">
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="font-body-md text-body-md text-on-surface-variant">Loading...</p>
        </div>
      </PetParentLayout>);
    }
    if (loadError || !provider) {
        return (<PetParentLayout active="search">
        <div className="p-6">
          <ErrorBanner message={loadError ?? "Provider not found"}/>
        </div>
      </PetParentLayout>);
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
    return (<PetParentLayout active="search">
      <div className="mx-auto max-w-2xl pb-16">
        <header className="flex items-center gap-3 px-container-padding-mobile py-4">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md text-primary font-bold">Provider Profile</h1>
        </header>

        <section className="px-container-padding-mobile">
          <div className="flex flex-col items-center text-center">
            <div className="soft-card-shadow mb-4 flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-white bg-secondary-container text-on-secondary-container">
              <span className="material-symbols-outlined text-[56px]">storefront</span>
            </div>
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{provider.name}</h2>
            <p className="font-label-md text-label-md mt-1 text-secondary">
              {PROVIDER_TYPE_LABELS[provider.providerType] ?? provider.providerType}
            </p>
            {provider.address && (<div className="mt-3 flex items-center gap-1 text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">location_on</span>
                <p className="font-body-md text-body-md">{provider.address}</p>
              </div>)}
            {provider.phoneNo && (<div className="mt-1 flex items-center gap-1 text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">call</span>
                <p className="font-body-md text-body-md">{provider.phoneNo}</p>
              </div>)}
          </div>
        </section>

        <section className="mt-section-gap px-container-padding-mobile">
          <h3 className="font-headline-md text-headline-md mb-4 text-on-surface">Available Services</h3>
          {provider.services.length === 0 ? (<p className="font-body-md text-body-md text-on-surface-variant">No services listed yet.</p>) : (<div className="space-y-3">
              {provider.services.map((s) => (<button key={s.id} onClick={() => selectService(s)} className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors ${selectedService?.id === s.id
                    ? "border-secondary bg-secondary/5"
                    : "border-outline-variant/30 bg-white hover:border-secondary/50"}`}>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-container/30 text-secondary">
                      <span className="material-symbols-outlined">health_and_safety</span>
                    </div>
                    <div>
                      <h4 className="font-label-md text-label-md text-on-surface">{s.name}</h4>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        {s.durationMinutes} mins · {s.category}
                      </p>
                    </div>
                  </div>
                  <span className="font-headline-md text-headline-md text-primary">${s.basePrice.toFixed(0)}</span>
                </button>))}
            </div>)}
        </section>

        {selectedService && (<section className="mt-section-gap px-container-padding-mobile">
            <h3 className="font-headline-md text-headline-md mb-4 text-on-surface">
              Available Slots — {selectedService.name}
            </h3>
            {slotsLoading ? (<p className="font-body-md text-body-md text-on-surface-variant">Loading...</p>) : slots.length === 0 ? (<p className="font-body-md text-body-md text-on-surface-variant">
                No upcoming availability for this service right now.
              </p>) : (<div className="space-y-4">
                {Object.entries(grouped).map(([day, daySlots]) => (<div key={day}>
                    <p className="font-label-md text-label-md mb-2 text-on-surface-variant">{day}</p>
                    <div className="flex flex-wrap gap-2">
                      {daySlots.map((slot) => (<button key={slot.id} onClick={() => setBookingSlot(slot)} className="flex flex-col items-center rounded-2xl border border-outline-variant/50 bg-white px-4 py-2 transition-colors hover:border-secondary">
                          <span className="font-label-md text-label-md text-on-surface">
                            {new Date(slot.startDatetime).toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                        })}
                          </span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">{slot.staffName}</span>
                        </button>))}
                    </div>
                  </div>))}
              </div>)}
          </section>)}
      </div>

      {bookingSlot && selectedService && (<ConfirmBookingModal service={selectedService} slot={bookingSlot} onClose={() => setBookingSlot(null)} onBooked={() => {
                setBookingSlot(null);
                setSlots((prev) => prev.filter((s) => s.id !== bookingSlot.id));
                navigate("/account?booked=1");
            }}/>)}
    </PetParentLayout>);
}
function ConfirmBookingModal({ service, slot, onClose, onBooked, }) {
    const [pets, setPets] = useState([]);
    const [petId, setPetId] = useState("");
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        api.get("/pets").then((data) => {
            setPets(data);
            if (data[0])
                setPetId(data[0].id);
        });
    }, []);
    async function handleConfirm() {
        if (!petId) {
            setError("Select a pet");
            return;
        }
        setError(null);
        setSaving(true);
        try {
            await api.post("/bookings", {
                petId,
                serviceId: service.id,
                staffId: slot.staffId,
                slotId: slot.id,
            });
            onBooked();
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to book this slot");
        }
        finally {
            setSaving(false);
        }
    }
    return (<Modal title="Confirm Booking" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <ErrorBanner message={error}/>
        <div className="rounded-xl bg-surface-container p-4">
          <p className="font-label-md text-label-md text-on-surface">{service.name}</p>
          <p className="font-body-md text-body-md text-on-surface-variant">with {slot.staffName}</p>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {new Date(slot.startDatetime).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          </p>
          <p className="font-label-md text-label-md mt-2 text-primary">${service.basePrice.toFixed(2)}</p>
        </div>
        {pets.length === 0 ? (<p className="font-body-md text-body-md text-on-surface-variant">
            Add a pet before booking a service.
          </p>) : (<FormSelect id="pet" label="Booking for" value={petId} onChange={(e) => setPetId(e.target.value)}>
            {pets.map((p) => (<option key={p.id} value={p.id}>
                {p.name}
              </option>))}
          </FormSelect>)}
        <Button onClick={handleConfirm} disabled={saving || pets.length === 0} className="mt-2">
          {saving ? "Booking..." : "Confirm Booking"}
        </Button>
      </div>
    </Modal>);
}
