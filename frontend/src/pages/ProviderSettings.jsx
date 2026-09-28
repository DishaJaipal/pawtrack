import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ProviderLayout } from "../layouts/ProviderLayout";
import { ApiError, api } from "../lib/api";
import { Button, ErrorBanner } from "../components/Button";
import { FormField, FormSelect } from "../components/FormField";
const PROVIDER_TYPES = [
    { value: "VET_CLINIC", label: "Vet Clinic" },
    { value: "INDEPENDENT_VET", label: "Independent Vet" },
    { value: "GROOMER", label: "Groomer" },
    { value: "TRAINER", label: "Trainer" },
    { value: "PET_SITTER", label: "Pet Sitter" },
];
// `address` is stored as one joined string ("street, city, state, postal"),
// not as separate columns — this is a best-effort split to pre-fill the four
// edit boxes with something reasonable. It's just a starting point for
// editing, not authoritative: if it splits oddly, the provider can just
// correct the boxes before saving, and re-saving always re-joins correctly.
function splitAddress(address) {
    const parts = (address ?? "").split(",").map((p) => p.trim()).filter(Boolean);
    return {
        street: parts[0] ?? "",
        city: parts[1] ?? "",
        state: parts[2] ?? "",
        postalCode: parts[3] ?? "",
    };
}
export default function ProviderSettings() {
    const { user, profile, setSession } = useAuth();
    const providerProfile = profile;
    const existingAddress = splitAddress(providerProfile?.address);
    const [form, setForm] = useState({
        name: user?.name ?? "",
        phoneNo: providerProfile?.phoneNo ?? "",
        street: existingAddress.street,
        city: existingAddress.city,
        state: existingAddress.state,
        postalCode: existingAddress.postalCode,
        providerType: providerProfile?.providerType ?? PROVIDER_TYPES[0].value,
    });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [saving, setSaving] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setSaving(true);
        try {
            const data = await api.patch("/auth/me", {
                name: form.name,
                phoneNo: form.phoneNo || null,
                street: form.street || null,
                city: form.city || null,
                state: form.state || null,
                postalCode: form.postalCode || null,
                providerType: form.providerType,
            });
            setSession(data.user, data.profile);
            setSuccess(true);
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to save changes");
        }
        finally {
            setSaving(false);
        }
    }
    return (<ProviderLayout active="settings">
      <header className="border-b border-outline-variant/30 bg-surface-container-lowest px-container-padding-mobile py-6 md:px-container-padding-desktop">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Settings</h1>
        <p className="font-body-md text-body-md mt-1 text-on-surface-variant">Manage your business account.</p>
      </header>

      <main className="px-container-padding-mobile py-6 md:px-container-padding-desktop">
        <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
          <ErrorBanner message={error}/>
          {success && (<div className="rounded-lg border border-secondary/30 bg-secondary/10 px-4 py-3 font-body-md text-body-md text-secondary">
              Saved.
            </div>)}
          <FormField id="name" label="Business name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/>
          <FormSelect id="providerType" label="Business type" value={form.providerType} onChange={(e) => setForm({ ...form, providerType: e.target.value })}>
            {PROVIDER_TYPES.map((t) => (<option key={t.value} value={t.value}>
                {t.label}
              </option>))}
          </FormSelect>
          <FormField id="email" label="Email" value={user?.email ?? ""} disabled hint="Contact support to change your email"/>
          <FormField id="phoneNo" label="Phone number" value={form.phoneNo} onChange={(e) => setForm({ ...form, phoneNo: e.target.value })}/>
          <FormField id="street" label="Street address" placeholder="123 MG Road" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })}/>
          <FormField id="city" label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}/>
          <FormField id="state" label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}/>
          <FormField id="postalCode" label="Postal code" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })}/>
          <Button type="submit" disabled={saving} className="mt-2">
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </main>
    </ProviderLayout>);
}
