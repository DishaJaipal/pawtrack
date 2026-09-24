import { useState } from "react";
import { ApiError, api } from "../lib/api";
import { Button, ErrorBanner } from "./Button";
import { FormField, FormSelect, FormTextArea } from "./FormField";

const RECORD_TYPES = [
  { value: "VISIT_SUMMARY", label: "Visit Summary" },
  { value: "PRESCRIPTION", label: "Prescription" },
  { value: "LAB_RESULT", label: "Lab Result" },
  { value: "IMAGING", label: "Imaging" },
  { value: "VACCINATION", label: "Vaccination" },
  { value: "DEWORMING", label: "Deworming" },
  { value: "OTHER", label: "Other" },
];

export function UploadRecordForm({ petId, bookingId, onAdded }) {
  const [form, setForm] = useState({
    recordType: "VISIT_SUMMARY",
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
      if (bookingId) formData.set("bookingId", bookingId);
      if (form.description) formData.set("description", form.description);
      if (file) formData.set("file", file);
      const record = await api.upload(`/pets/${petId}/records`, formData);
      onAdded(record);
      setForm({ recordType: "VISIT_SUMMARY", title: "", description: "", recordDate: new Date().toISOString().slice(0, 10) });
      setFile(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add record");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <ErrorBanner message={error} />
      <FormSelect id="recordType" label="Type" value={form.recordType} onChange={(e) => setForm({ ...form, recordType: e.target.value })}>
        {RECORD_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </FormSelect>
      <FormField id="title" label="Title" required placeholder="e.g. Annual checkup notes" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <FormTextArea id="description" label="Notes" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <label className="flex flex-col gap-1.5">
        <span className="font-label-md text-label-md text-on-surface-variant">Attach a file (optional)</span>
        <input type="file" accept="image/png,image/jpeg,image/webp,image/heic,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="font-body-md text-body-md text-on-surface-variant" />
      </label>
      <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add to Pet Record"}</Button>
    </form>
  );
}
