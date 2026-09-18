import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button, ErrorBanner } from "../../components/Button";
import { FormField, FormSelect } from "../../components/FormField";
import type { AuthUser, ProviderProfile } from "../../lib/types";

const PROVIDER_TYPES = [
  { value: "VET_CLINIC", label: "Vet Clinic" },
  { value: "INDEPENDENT_VET", label: "Independent Vet" },
  { value: "GROOMER", label: "Groomer" },
  { value: "TRAINER", label: "Trainer" },
  { value: "PET_SITTER", label: "Pet Sitter" },
];

export default function SignupProvider() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phoneNo: "",
    address: "",
    providerType: PROVIDER_TYPES[0].value,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { setSession } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await api.post<{ user: AuthUser; profile: ProviderProfile }>("/auth/register", {
        role: "PROVIDER",
        name: form.name,
        email: form.email,
        password: form.password,
        phoneNo: form.phoneNo || undefined,
        address: form.address || undefined,
        providerType: form.providerType,
      });
      setSession(data.user, data.profile);
      navigate("/provider/dashboard?welcome=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-surface px-container-padding-mobile py-12">
      <div className="w-full max-w-md">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
          Set up your business
        </h1>
        <p className="font-body-md text-body-md mt-1 text-on-surface-variant">
          Clinics, groomers, trainers, and pet sitters all sign up here.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <ErrorBanner message={error} />
          <FormField
            id="name"
            label="Business name"
            required
            placeholder="Happy Paws Vet Clinic"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <FormSelect
            id="providerType"
            label="Business type"
            value={form.providerType}
            onChange={(e) => setForm({ ...form, providerType: e.target.value })}
          >
            {PROVIDER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </FormSelect>
          <FormField
            id="email"
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <FormField
            id="password"
            label="Password"
            type="password"
            required
            minLength={8}
            hint="At least 8 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <FormField
            id="phoneNo"
            label="Phone number"
            value={form.phoneNo}
            onChange={(e) => setForm({ ...form, phoneNo: e.target.value })}
          />
          <FormField
            id="address"
            label="Business address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Button type="submit" disabled={submitting} className="mt-2">
            {submitting ? "Creating account..." : "Create business account"}
          </Button>
        </form>

        <p className="font-body-md text-body-md mt-8 text-center text-on-surface-variant">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-secondary">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
