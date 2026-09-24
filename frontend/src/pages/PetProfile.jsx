import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiError, api } from "../lib/api";
import { PetParentLayout } from "../layouts/PetParentLayout";
import { Modal } from "../components/Modal";
import { Button, ErrorBanner } from "../components/Button";
import { FormField, FormSelect, FormTextArea } from "../components/FormField";
import { SpeciesBreedPicker } from "../components/SpeciesBreedPicker";
import { AgeInput } from "../components/AgeInput";
const CATEGORIES = [
    { value: "ALL", label: "All" },
    { value: "VACCINATION", label: "Vaccines" },
    { value: "DEWORMING", label: "Deworming" },
    { value: "PRESCRIPTION", label: "Prescription" },
    { value: "LAB_RESULT", label: "Lab Results" },
    { value: "VISIT_SUMMARY", label: "Visit Summary" },
    { value: "IMAGING", label: "Imaging" },
    { value: "OTHER", label: "Other" },
];
const RECORD_ICON = {
    VACCINATION: "vaccines",
    DEWORMING: "bug_report",
    LAB_RESULT: "biotech",
    PRESCRIPTION: "medication",
    VISIT_SUMMARY: "description",
    IMAGING: "image",
    OTHER: "more_horiz",
};
const RANGE_OPTIONS = [
    { value: "all", label: "All Time" },
    { value: "3m", label: "Last 3 Months" },
    { value: "6m", label: "Last 6 Months" },
    { value: "1y", label: "Last Year" },
    { value: "custom", label: "Custom..." },
];
function formatAge(ageMonths) {
    if (ageMonths == null)
        return null;
    if (ageMonths < 12)
        return `${ageMonths} mo`;
    const years = Math.floor(ageMonths / 12);
    const months = ageMonths % 12;
    return months === 0 ? `${years} yrs` : `${years} yr ${months} mo`;
}
export default function PetProfile() {
    const { petId } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [pet, setPet] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [activeTab, setActiveTab] = useState(searchParams.get("tab") === "records" ? "records" : "details");
    const [category, setCategory] = useState("ALL");
    const [range, setRange] = useState("all");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");
    const [editOpen, setEditOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(searchParams.get("upload") === "1");
    useEffect(() => {
        if (searchParams.has("tab") || searchParams.has("upload")) {
            setSearchParams({}, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const loadPet = useCallback(async () => {
        if (!petId)
            return;
        const data = await api.get(`/pets/${petId}`);
        setPet(data);
    }, [petId]);
    const loadRecords = useCallback(async () => {
        if (!petId)
            return;
        const params = new URLSearchParams();
        if (category !== "ALL")
            params.set("category", category);
        if (range === "custom") {
            if (customFrom)
                params.set("from", customFrom);
            if (customTo)
                params.set("to", customTo);
        }
        else if (range !== "all") {
            params.set("range", range);
        }
        const query = params.toString();
        const data = await api.get(`/pets/${petId}/records${query ? `?${query}` : ""}`);
        setRecords(data);
    }, [petId, category, range, customFrom, customTo]);
    useEffect(() => {
        setLoading(true);
        setLoadError(null);
        Promise.all([loadPet(), loadRecords()])
            .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Failed to load pet"))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [petId]);
    useEffect(() => {
        if (loading)
            return;
        if (range === "custom" && !customFrom && !customTo)
            return; // wait for at least one bound
        loadRecords().catch(() => undefined);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category, range, customFrom, customTo]);
    if (loading) {
        return (<div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="font-body-md text-body-md text-on-surface-variant">Loading...</p>
      </div>);
    }
    if (loadError || !pet) {
        return (<div className="flex min-h-screen items-center justify-center bg-surface">
        <ErrorBanner message={loadError ?? "Pet not found"}/>
      </div>);
    }
    const alerts = pet.alerts
        ? pet.alerts.split(",").map((a) => a.trim()).filter(Boolean)
        : [];
    const ageLabel = formatAge(pet.ageMonths);
    return (<PetParentLayout active="home">
      <div className="pb-8 font-body-md text-on-surface">
        {/* Hero — no photo storage yet, so a brand-gradient header stands in for the mockup's pet photo */}
        <header className="relative flex h-[280px] w-full flex-col justify-end overflow-hidden bg-gradient-to-br from-primary to-primary-container p-container-padding-mobile">
          <button onClick={() => navigate(-1)} className="absolute left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md active:scale-90">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="z-10 flex items-end justify-between text-white">
            <div>
              <p className="font-label-md text-label-md mb-1 uppercase tracking-widest text-white/80">
                {pet.breed || pet.species}
              </p>
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile mb-1">{pet.name}</h1>
              <p className="font-body-md text-white/80">
                {[pet.species, pet.gender, ageLabel].filter(Boolean).join(" • ")}
              </p>
            </div>
            <button onClick={() => setEditOpen(true)} className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-lg active:scale-95">
              <span className="material-symbols-outlined">edit</span>
            </button>
          </div>
        </header>

        {/* Tabs */}
        <nav className="sticky top-0 z-30 bg-background/80 px-container-padding-mobile py-4 shadow-sm backdrop-blur-xl">
          <div className="flex space-x-1 rounded-2xl bg-surface-container p-1">
            <button onClick={() => setActiveTab("details")} className={`font-label-md text-label-md flex-1 rounded-xl py-3 text-center transition-all ${activeTab === "details" ? "bg-white text-secondary shadow-sm" : "text-on-surface-variant"}`}>
              Details
            </button>
            <button onClick={() => setActiveTab("records")} className={`font-label-md text-label-md flex-1 rounded-xl py-3 text-center transition-all ${activeTab === "records" ? "bg-white text-secondary shadow-sm" : "text-on-surface-variant"}`}>
              Records
            </button>
          </div>
        </nav>

        <main className="px-container-padding-mobile pt-gutter">
          {activeTab === "details" ? (<section className="space-y-gutter">
              <div className="grid grid-cols-2 gap-4">
                <div className="soft-card-shadow flex flex-col items-center rounded-xl border border-outline-variant/30 bg-white p-4 text-center">
                  <span className="material-symbols-outlined mb-2 text-primary">monitor_weight</span>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Weight</p>
                  <p className="font-headline-md text-headline-md text-primary">
                    {pet.weightKg != null ? `${pet.weightKg} kg` : "—"}
                  </p>
                </div>
                <div className="soft-card-shadow flex flex-col items-center rounded-xl border border-outline-variant/30 bg-white p-4 text-center">
                  <span className="material-symbols-outlined mb-2 text-secondary">pets</span>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Species / Breed</p>
                  <p className="font-headline-md text-headline-md text-secondary">
                    {pet.breed || pet.species}
                  </p>
                </div>
              </div>

              <div className="soft-card-shadow rounded-xl border border-outline-variant/30 bg-white p-6">
                <h3 className="font-headline-md text-headline-md mb-4 flex items-center">
                  <span className="material-symbols-outlined mr-2 text-error">warning</span>
                  Health Alerts
                </h3>
                {alerts.length > 0 ? (<div className="flex flex-wrap gap-2">
                    {alerts.map((alert) => (<span key={alert} className="font-label-md text-label-md rounded-full bg-error/10 px-4 py-2 text-error">
                        {alert}
                      </span>))}
                  </div>) : (<p className="font-body-md text-body-md text-on-surface-variant">
                    No known allergies or alerts on file.
                  </p>)}
              </div>
            </section>) : (<section className="space-y-4">
              <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-2">
                {CATEGORIES.map((c) => (<button key={c.value} onClick={() => setCategory(c.value)} className={`font-label-md text-label-md whitespace-nowrap rounded-full px-4 py-2 transition-colors ${category === c.value
                    ? "bg-secondary text-white"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-variant/50"}`}>
                    {c.label}
                  </button>))}
              </div>

              <div className="hide-scrollbar flex gap-4 overflow-x-auto border-b border-outline-variant/20 pb-2">
                {RANGE_OPTIONS.map((r) => (<button key={r.value} onClick={() => setRange(r.value)} className={`text-label-md font-label-md whitespace-nowrap pb-2 transition-colors ${range === r.value
                    ? "border-b-2 border-secondary text-secondary"
                    : "text-on-surface-variant hover:text-secondary"}`}>
                    {r.label}
                  </button>))}
              </div>

              {range === "custom" && (<div className="flex flex-wrap gap-4 rounded-xl bg-surface-container p-4">
                  <FormField id="customFrom" label="From" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}/>
                  <FormField id="customTo" label="To" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}/>
                </div>)}

              {records.length === 0 ? (<p className="font-body-md text-body-md py-8 text-center text-on-surface-variant">
                  No records yet. Upload the first one below.
                </p>) : (<div className="relative space-y-6 pt-4">
                  <div className="absolute bottom-4 left-6 top-4 w-0.5 bg-outline-variant/30"/>
                  {records.map((record) => (<div key={record.id} className="relative flex items-start gap-4">
                      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-container text-on-secondary-container shadow-sm">
                        <span className="material-symbols-outlined">{RECORD_ICON[record.recordType]}</span>
                      </div>
                      <div className="flex-1 rounded-2xl border border-outline-variant/20 bg-white p-4 shadow-sm">
                        <p className="font-label-md text-label-md text-on-surface">{record.title}</p>
                        <p className="font-label-sm text-label-sm mb-1 text-on-surface-variant">
                          {new Date(record.recordDate).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                    })}
                        </p>
                        {record.description && (<p className="font-body-md text-body-md mb-1 text-on-surface-variant">
                            {record.description}
                          </p>)}
                        {record.fileUrl && (<a href={record.fileUrl} target="_blank" rel="noreferrer" className="font-label-sm text-label-sm inline-flex items-center gap-1 text-secondary">
                            <span className="material-symbols-outlined text-[16px]">attach_file</span>
                            View file
                          </a>)}
                      </div>
                    </div>))}
                </div>)}
            </section>)}
        </main>

        <div className="fixed bottom-24 right-6 z-40">
          <button onClick={() => setUploadOpen(true)} className="flex items-center gap-2 rounded-3xl bg-primary py-4 pl-4 pr-6 text-white shadow-lg transition-all active:scale-90">
            <span className="material-symbols-outlined">add</span>
            <span className="font-label-md text-label-md">Upload Record</span>
          </button>
        </div>

        {editOpen && pet && (<EditPetModal pet={pet} onClose={() => setEditOpen(false)} onSaved={(updated) => {
                setPet(updated);
                setEditOpen(false);
            }}/>)}

        {uploadOpen && petId && (<UploadRecordModal petId={petId} onClose={() => setUploadOpen(false)} onUploaded={(record) => {
                setRecords((prev) => [record, ...prev]);
                setUploadOpen(false);
                setActiveTab("records");
            }}/>)}
      </div>
    </PetParentLayout>);
}
function EditPetModal({ pet, onClose, onSaved, }) {
    const [form, setForm] = useState({
        name: pet.name,
        species: pet.species,
        breed: pet.breed ?? "",
        ageMonths: pet.ageMonths?.toString() ?? "",
        weightKg: pet.weightKg?.toString() ?? "",
        gender: pet.gender ?? "",
        alerts: pet.alerts ?? "",
    });
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setSaving(true);
        try {
            const updated = await api.put(`/pets/${pet.id}`, {
                name: form.name,
                species: form.species,
                breed: form.breed || null,
                ageMonths: form.ageMonths ? Number(form.ageMonths) : null,
                weightKg: form.weightKg ? Number(form.weightKg) : null,
                gender: form.gender || null,
                alerts: form.alerts || null,
            });
            onSaved(updated);
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to save changes");
        }
        finally {
            setSaving(false);
        }
    }
    return (<Modal title={`Edit ${pet.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ErrorBanner message={error}/>
        <FormField id="name" label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/>
        <SpeciesBreedPicker species={form.species} breed={form.breed} onChange={(species, breed) => setForm({ ...form, species, breed })}/>
        <div className="grid grid-cols-2 gap-4">
          <AgeInput ageMonths={form.ageMonths} onChange={(ageMonths) => setForm({ ...form, ageMonths })}/>
          <FormField id="weightKg" label="Weight (kg)" type="number" min={0} step="0.1" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })}/>
        </div>
        <FormSelect id="gender" label="Gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
          <option value="">Unspecified</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </FormSelect>
        <FormTextArea id="alerts" label="Allergies / alerts" hint="Comma-separate multiple items" value={form.alerts} onChange={(e) => setForm({ ...form, alerts: e.target.value })}/>
        <Button type="submit" disabled={saving} className="mt-2">
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </Modal>);
}
function UploadRecordModal({ petId, onClose, onUploaded, }) {
    const [form, setForm] = useState({
        recordType: "VACCINATION",
        title: "",
        description: "",
        recordDate: new Date().toISOString().slice(0, 10),
    });
    const [file, setFile] = useState(null);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setSaving(true);
        try {
            const formData = new FormData();
            formData.set("recordType", form.recordType);
            formData.set("title", form.title);
            formData.set("recordDate", form.recordDate);
            if (form.description)
                formData.set("description", form.description);
            if (file)
                formData.set("file", file);
            const record = await api.upload(`/pets/${petId}/records`, formData);
            onUploaded(record);
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to upload record");
        }
        finally {
            setSaving(false);
        }
    }
    return (<Modal title="Upload Record" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ErrorBanner message={error}/>
        <FormSelect id="recordType" label="Category" value={form.recordType} onChange={(e) => setForm({ ...form, recordType: e.target.value })}>
          {CATEGORIES.filter((c) => c.value !== "ALL").map((c) => (<option key={c.value} value={c.value}>
              {c.label}
            </option>))}
        </FormSelect>
        <FormField id="title" label="Title" required placeholder="Rabies Booster" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}/>
        <FormField id="recordDate" label="Date" type="date" required value={form.recordDate} onChange={(e) => setForm({ ...form, recordDate: e.target.value })}/>
        <FormTextArea id="description" label="Notes (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/>
        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface-variant">File (image or PDF, optional)</span>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/heic,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="font-body-md text-body-md text-on-surface-variant"/>
        </label>
        <Button type="submit" disabled={saving} className="mt-2">
          {saving ? "Uploading..." : "Upload"}
        </Button>
      </form>
    </Modal>);
}
