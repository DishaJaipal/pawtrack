import { useCallback, useEffect, useState } from "react";
import { ProviderLayout } from "../layouts/ProviderLayout";
import { ApiError, api } from "../lib/api";
import { Modal } from "../components/Modal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Button, ErrorBanner } from "../components/Button";
import { FormField, FormSelect, FormTextArea } from "../components/FormField";
const SERVICE_CATEGORIES = [
    "CHECKUP",
    "VACCINATION",
    "SURGERY",
    "GROOMING",
    "BOARDING",
    "TRAINING",
    "EMERGENCY",
];
const STAFF_ROLES = ["VET", "GROOMER", "TRAINER", "ASSISTANT", "RECEPTIONIST"];
const WEEKDAYS = [
    { value: 0, label: "Sun" },
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
];
export default function ProviderServices() {
    const [tab, setTab] = useState("services");
    const [services, setServices] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [addServiceOpen, setAddServiceOpen] = useState(false);
    const [editService, setEditService] = useState(null);
    const [deleteService, setDeleteService] = useState(null);
    const [addStaffOpen, setAddStaffOpen] = useState(false);
    const [editStaff, setEditStaff] = useState(null);
    const [deleteStaff, setDeleteStaff] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const loadAll = useCallback(async () => {
        const [s, st] = await Promise.all([
            api.get("/providers/me/services"),
            api.get("/providers/me/staff"),
        ]);
        setServices(s);
        setStaff(st);
    }, []);
    useEffect(() => {
        setLoading(true);
        loadAll()
            .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"))
            .finally(() => setLoading(false));
    }, [loadAll]);
    async function toggleServiceActive(service) {
        setBusyId(service.id);
        try {
            const action = service.isActive ? "deactivate" : "activate";
            const updated = await api.patch(`/providers/me/services/${service.id}/${action}`);
            setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, ...updated } : s)));
        }
        finally {
            setBusyId(null);
        }
    }
    async function confirmDeleteService() {
        if (!deleteService)
            return;
        setBusyId(deleteService.id);
        try {
            await api.delete(`/providers/me/services/${deleteService.id}`);
            setServices((prev) => prev.filter((s) => s.id !== deleteService.id));
            setDeleteService(null);
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to delete service");
        }
        finally {
            setBusyId(null);
        }
    }
    async function toggleStaffActive(member) {
        setBusyId(member.id);
        try {
            const action = member.isActive ? "deactivate" : "activate";
            const updated = await api.patch(`/providers/me/staff/${member.id}/${action}`);
            setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, ...updated } : s)));
        }
        finally {
            setBusyId(null);
        }
    }
    async function confirmDeleteStaff() {
        if (!deleteStaff)
            return;
        setBusyId(deleteStaff.id);
        try {
            await api.delete(`/providers/me/staff/${deleteStaff.id}`);
            setStaff((prev) => prev.filter((s) => s.id !== deleteStaff.id));
            setDeleteStaff(null);
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to delete staff member");
        }
        finally {
            setBusyId(null);
        }
    }
    if (loading) {
        return (<ProviderLayout active="services">
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="font-body-md text-body-md text-on-surface-variant">Loading...</p>
        </div>
      </ProviderLayout>);
    }
    return (<ProviderLayout active="services">
      <header className="border-b border-outline-variant/30 bg-surface-container-lowest px-container-padding-mobile py-6 md:px-container-padding-desktop">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">My Services</h1>
        <p className="font-body-md text-body-md mt-1 text-on-surface-variant">
          Set up what you offer, who performs it, and when they're available.
        </p>
      </header>

      <nav className="sticky top-0 z-10 bg-background/90 px-container-padding-mobile py-4 backdrop-blur-xl md:px-container-padding-desktop">
        <div className="flex max-w-md space-x-1 rounded-2xl bg-surface-container p-1">
          {["services", "staff", "slots"].map((t) => (<button key={t} onClick={() => setTab(t)} className={`font-label-md text-label-md flex-1 rounded-xl py-3 text-center capitalize transition-all ${tab === t ? "bg-white text-secondary shadow-sm" : "text-on-surface-variant"}`}>
              {t}
            </button>))}
        </div>
      </nav>

      <main className="px-container-padding-mobile pb-12 md:px-container-padding-desktop">
        <ErrorBanner message={error}/>

        {tab === "services" && (<section className="max-w-2xl space-y-4">
            <Button onClick={() => setAddServiceOpen(true)}>+ Add Service</Button>
            {services.length === 0 ? (<p className="font-body-md text-body-md py-8 text-on-surface-variant">
                No services yet. Add your first one to start building your team and schedule.
              </p>) : (<div className="grid gap-4 sm:grid-cols-2">
                {services.map((s) => {
                    const inactiveReason = !s.isActive ? "Deactivated" : !s.effectiveActive ? "No staff assigned" : null;
                    return (<div key={s.id} className="soft-card-shadow rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-headline-md text-body-lg font-semibold text-on-surface">{s.name}</p>
                          <p className="font-label-sm text-label-sm text-on-surface-variant">{s.category}</p>
                        </div>
                        {inactiveReason && (<span className="font-label-sm text-label-sm rounded-full bg-surface-container-high px-3 py-1 text-on-surface-variant">
                            {inactiveReason}
                          </span>)}
                      </div>
                      {s.description && (<p className="font-body-md text-body-md mt-2 text-on-surface-variant">{s.description}</p>)}
                      <p className="font-label-md text-label-md mt-3 text-on-surface">
                        ${s.basePrice.toFixed(2)} · {s.durationMinutes} min
                      </p>
                      <div className="mt-3 flex flex-wrap gap-4">
                        <button onClick={() => setEditService(s)} className="font-label-sm text-label-sm text-secondary">
                          Edit
                        </button>
                        <button onClick={() => toggleServiceActive(s)} disabled={busyId === s.id} className="font-label-sm text-label-sm text-on-surface-variant disabled:opacity-50">
                          {s.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button onClick={() => setDeleteService(s)} className="font-label-sm text-label-sm text-error">
                          Delete
                        </button>
                      </div>
                    </div>);
                })}
              </div>)}
          </section>)}

        {tab === "staff" && (<section className="max-w-2xl space-y-4">
            {services.filter((s) => s.isActive).length === 0 ? (<p className="font-body-md text-body-md rounded-xl bg-surface-container p-4 text-on-surface-variant">
                Add a service first — staff members are assigned to the services they can perform.
              </p>) : (<Button onClick={() => setAddStaffOpen(true)}>+ Add Staff</Button>)}
            {staff.length === 0 ? (<p className="font-body-md text-body-md py-8 text-on-surface-variant">No staff added yet.</p>) : (<div className="grid gap-4 sm:grid-cols-2">
                {staff.map((member) => (<div key={member.id} className="soft-card-shadow rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-headline-md text-body-lg font-semibold text-on-surface">{member.name}</p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">{member.role}</p>
                      </div>
                      {!member.isActive && (<span className="font-label-sm text-label-sm rounded-full bg-surface-container-high px-3 py-1 text-on-surface-variant">
                          Inactive
                        </span>)}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {member.staffServices?.map(({ service }) => (<span key={service.id} className="font-label-sm text-label-sm rounded-full bg-secondary/10 px-3 py-1 text-secondary">
                          {service.name}
                        </span>))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4">
                      <button onClick={() => setEditStaff(member)} className="font-label-sm text-label-sm text-secondary">
                        Edit
                      </button>
                      <button onClick={() => toggleStaffActive(member)} disabled={busyId === member.id} className="font-label-sm text-label-sm text-on-surface-variant disabled:opacity-50">
                        {member.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={() => setDeleteStaff(member)} className="font-label-sm text-label-sm text-error">
                        Delete
                      </button>
                    </div>
                  </div>))}
              </div>)}
          </section>)}

        {tab === "slots" && <SlotsTab staff={staff}/>}
      </main>

      {addServiceOpen && (<ServiceFormModal onClose={() => setAddServiceOpen(false)} onSaved={(service) => {
                setServices((prev) => [...prev, service]);
                setAddServiceOpen(false);
            }}/>)}

      {editService && (<ServiceFormModal service={editService} onClose={() => setEditService(null)} onSaved={(service) => {
                setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, ...service } : s)));
                setEditService(null);
            }}/>)}

      {deleteService && (<ConfirmDialog title={`Delete "${deleteService.name}"?`} message="This can't be undone. If this service has ever been booked, you'll need to deactivate it instead." confirming={busyId === deleteService.id} onConfirm={confirmDeleteService} onCancel={() => setDeleteService(null)}/>)}

      {addStaffOpen && (<StaffFormModal services={services.filter((s) => s.isActive)} onClose={() => setAddStaffOpen(false)} onSaved={(member) => {
                setStaff((prev) => [...prev, member]);
                setAddStaffOpen(false);
            }}/>)}

      {editStaff && (<StaffFormModal staff={editStaff} services={services.filter((s) => s.isActive || editStaff.staffServices?.some((ss) => ss.service.id === s.id))} onClose={() => setEditStaff(null)} onSaved={(member) => {
                setStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, ...member } : s)));
                setEditStaff(null);
            }}/>)}

      {deleteStaff && (<ConfirmDialog title={`Delete ${deleteStaff.name}?`} message="This can't be undone. If this staff member has ever been booked, deactivate them instead." confirming={busyId === deleteStaff.id} onConfirm={confirmDeleteStaff} onCancel={() => setDeleteStaff(null)}/>)}
    </ProviderLayout>);
}
function ServiceFormModal({ service, onClose, onSaved, }) {
    const isEdit = !!service;
    const [form, setForm] = useState({
        name: service?.name ?? "",
        description: service?.description ?? "",
        category: service?.category ?? SERVICE_CATEGORIES[0],
        basePrice: service?.basePrice?.toString() ?? "",
        durationMinutes: service?.durationMinutes?.toString() ?? "30",
    });
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setSaving(true);
        try {
            const payload = {
                name: form.name,
                description: form.description || undefined,
                category: form.category,
                basePrice: Number(form.basePrice),
                durationMinutes: Number(form.durationMinutes),
            };
            const saved = isEdit
                ? await api.put(`/providers/me/services/${service.id}`, payload)
                : await api.post("/providers/me/services", payload);
            onSaved(saved);
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to save service");
        }
        finally {
            setSaving(false);
        }
    }
    return (<Modal title={isEdit ? "Edit Service" : "Add Service"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ErrorBanner message={error}/>
        <FormField id="name" label="Service name" required placeholder="Full Groom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/>
        <FormSelect id="category" label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {SERVICE_CATEGORIES.map((c) => (<option key={c} value={c}>
              {c}
            </option>))}
        </FormSelect>
        <div className="grid grid-cols-2 gap-4">
          <FormField id="basePrice" label="Price ($)" type="number" min={0} step="0.01" required value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })}/>
          <FormField id="durationMinutes" label="Duration (min)" type="number" min={1} required value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}/>
        </div>
        <FormTextArea id="description" label="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/>
        <Button type="submit" disabled={saving} className="mt-2">
          {saving ? "Saving..." : isEdit ? "Save changes" : "Add Service"}
        </Button>
      </form>
    </Modal>);
}
function StaffFormModal({ staff, services, onClose, onSaved, }) {
    const isEdit = !!staff;
    const [name, setName] = useState(staff?.name ?? "");
    const [role, setRole] = useState(staff?.role ?? STAFF_ROLES[0]);
    const [serviceIds, setServiceIds] = useState(staff?.staffServices?.map((ss) => ss.service.id) ?? []);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    function toggleService(id) {
        setServiceIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
    }
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        if (serviceIds.length === 0) {
            setError("Select at least one service");
            return;
        }
        setSaving(true);
        try {
            const saved = isEdit
                ? await api.put(`/providers/me/staff/${staff.id}`, { name, role, serviceIds })
                : await api.post("/providers/me/staff", { name, role, serviceIds });
            onSaved(saved);
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to save staff member");
        }
        finally {
            setSaving(false);
        }
    }
    return (<Modal title={isEdit ? "Edit Staff" : "Add Staff"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ErrorBanner message={error}/>
        <FormField id="staffName" label="Name" required value={name} onChange={(e) => setName(e.target.value)}/>
        <FormSelect id="staffRole" label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
          {STAFF_ROLES.map((r) => (<option key={r} value={r}>
              {r}
            </option>))}
        </FormSelect>
        <div className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface-variant">Can perform</span>
          <div className="flex flex-col gap-2 rounded-lg border border-outline-variant p-3">
            {services.map((s) => (<label key={s.id} className="flex items-center gap-2 font-body-md text-body-md">
                <input type="checkbox" checked={serviceIds.includes(s.id)} onChange={() => toggleService(s.id)}/>
                {s.name}
              </label>))}
          </div>
        </div>
        <Button type="submit" disabled={saving} className="mt-2">
          {saving ? "Saving..." : isEdit ? "Save changes" : "Add Staff"}
        </Button>
      </form>
    </Modal>);
}
function SlotsTab({ staff }) {
    const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
    const [slots, setSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const [form, setForm] = useState({
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        dailyStart: "09:00",
        dailyEnd: "17:00",
        slotMinutes: "30",
        daysOfWeek: [1, 2, 3, 4, 5],
    });
    const [generating, setGenerating] = useState(false);
    const loadSlots = useCallback(async (id) => {
        if (!id) {
            setSlots([]);
            return;
        }
        setLoadingSlots(true);
        try {
            const data = await api.get(`/providers/me/staff/${id}/slots`);
            setSlots(data);
        }
        finally {
            setLoadingSlots(false);
        }
    }, []);
    useEffect(() => {
        loadSlots(staffId);
    }, [staffId, loadSlots]);
    function toggleDay(day) {
        setForm((prev) => ({
            ...prev,
            daysOfWeek: prev.daysOfWeek.includes(day)
                ? prev.daysOfWeek.filter((d) => d !== day)
                : [...prev.daysOfWeek, day],
        }));
    }
    async function handleGenerate(e) {
        e.preventDefault();
        setError(null);
        setResult(null);
        setGenerating(true);
        try {
            const res = await api.post(`/providers/me/staff/${staffId}/slots`, {
                ...form,
                slotMinutes: Number(form.slotMinutes),
            });
            setResult(`Created ${res.created} slot${res.created === 1 ? "" : "s"} (${res.skipped} already existed).`);
            loadSlots(staffId);
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to generate slots");
        }
        finally {
            setGenerating(false);
        }
    }
    async function removeSlot(id) {
        await api.delete(`/providers/me/slots/${id}`);
        setSlots((prev) => prev.filter((s) => s.id !== id));
    }
    if (staff.length === 0) {
        return (<p className="font-body-md text-body-md max-w-2xl py-8 text-on-surface-variant">
        Add a staff member first — slots belong to a specific staff member's schedule.
      </p>);
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
    return (<section className="max-w-2xl space-y-6">
      <FormSelect id="staffSelect" label="Staff member" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
        {staff.map((s) => (<option key={s.id} value={s.id}>
            {s.name} ({s.role})
          </option>))}
      </FormSelect>

      <form onSubmit={handleGenerate} className="soft-card-shadow flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
        <p className="font-headline-md text-body-lg font-semibold text-on-surface">Generate slots</p>
        <ErrorBanner message={error}/>
        {result && <p className="font-body-md text-body-md text-secondary">{result}</p>}
        <div className="grid grid-cols-2 gap-4">
          <FormField id="startDate" label="Start date" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}/>
          <FormField id="endDate" label="End date" type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}/>
          <FormField id="dailyStart" label="Daily start" type="time" required value={form.dailyStart} onChange={(e) => setForm({ ...form, dailyStart: e.target.value })}/>
          <FormField id="dailyEnd" label="Daily end" type="time" required value={form.dailyEnd} onChange={(e) => setForm({ ...form, dailyEnd: e.target.value })}/>
          <FormField id="slotMinutes" label="Slot length (min)" type="number" min={5} required value={form.slotMinutes} onChange={(e) => setForm({ ...form, slotMinutes: e.target.value })}/>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface-variant">Repeat on</span>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => (<button type="button" key={d.value} onClick={() => toggleDay(d.value)} className={`font-label-md text-label-md rounded-full px-3 py-1.5 transition-colors ${form.daysOfWeek.includes(d.value)
                ? "bg-secondary text-white"
                : "bg-surface-container text-on-surface-variant"}`}>
                {d.label}
              </button>))}
          </div>
        </div>
        <Button type="submit" disabled={generating || !staffId} className="mt-2">
          {generating ? "Generating..." : "Generate Slots"}
        </Button>
      </form>

      <div>
        <p className="font-headline-md text-headline-md mb-3 text-on-surface">Upcoming slots</p>
        {loadingSlots ? (<p className="font-body-md text-body-md text-on-surface-variant">Loading...</p>) : slots.length === 0 ? (<p className="font-body-md text-body-md text-on-surface-variant">No upcoming slots yet.</p>) : (<div className="space-y-4">
            {Object.entries(grouped).map(([day, daySlots]) => (<div key={day}>
                <p className="font-label-md text-label-md mb-2 text-on-surface-variant">{day}</p>
                <div className="flex flex-wrap gap-2">
                  {daySlots.map((slot) => (<span key={slot.id} className={`font-label-sm text-label-sm flex items-center gap-1 rounded-full px-3 py-1.5 ${slot.status === "AVAILABLE"
                        ? "bg-secondary-container text-on-secondary-container"
                        : "bg-surface-container-high text-on-surface-variant"}`}>
                      {new Date(slot.startDatetime).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                    })}
                      {slot.status === "AVAILABLE" && (<button onClick={() => removeSlot(slot.id)} className="ml-1 text-on-surface-variant">
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>)}
                    </span>))}
                </div>
              </div>))}
          </div>)}
      </div>
    </section>);
}
