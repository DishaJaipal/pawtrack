import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button, ErrorBanner } from "../../components/Button";
import { FormField } from "../../components/FormField";
import { SpeciesBreedPicker } from "../../components/SpeciesBreedPicker";
import { AgeInput } from "../../components/AgeInput";
const emptyAccount = { name: "", email: "", password: "", phoneNo: "", address: "" };
const emptyPet = { name: "", species: "", breed: "", ageMonths: "", weightKg: "", allergies: "" };
export default function SignupPetParent() {
    const [step, setStep] = useState(1);
    const [account, setAccount] = useState(emptyAccount);
    const [pet, setPet] = useState(emptyPet);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const { setSession } = useAuth();
    const navigate = useNavigate();
    function handleNext(e) {
        e.preventDefault();
        setError(null);
        setStep(2);
    }
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const data = await api.post("/auth/register", {
                role: "PET_PARENT",
                name: account.name,
                email: account.email,
                password: account.password,
                phoneNo: account.phoneNo || undefined,
                address: account.address || undefined,
                pet: {
                    name: pet.name,
                    species: pet.species,
                    breed: pet.breed || undefined,
                    ageMonths: pet.ageMonths ? Number(pet.ageMonths) : undefined,
                    weightKg: pet.weightKg ? Number(pet.weightKg) : undefined,
                    allergies: pet.allergies || undefined,
                },
            });
            setSession(data.user, data.profile);
            navigate("/?welcome=1");
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
        }
        finally {
            setSubmitting(false);
        }
    }
    return (<div className="flex min-h-screen flex-col items-center bg-surface px-container-padding-mobile py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2">
          <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-surface-container-high"}`}/>
          <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-surface-container-high"}`}/>
        </div>

        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
          {step === 1 ? "Create your account" : "Tell us about your pet"}
        </h1>
        <p className="font-body-md text-body-md mt-1 text-on-surface-variant">
          {step === 1 ? "Step 1 of 2 — your details" : "Step 2 of 2 — we'll set up their profile"}
        </p>

        {step === 1 ? (<form onSubmit={handleNext} className="mt-6 flex flex-col gap-4">
            <FormField id="name" label="Your name" required value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })}/>
            <FormField id="email" label="Email" type="email" required value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })}/>
            <FormField id="password" label="Password" type="password" required minLength={8} hint="At least 8 characters" value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })}/>
            <FormField id="phoneNo" label="Phone number" value={account.phoneNo} onChange={(e) => setAccount({ ...account, phoneNo: e.target.value })}/>
            <FormField id="address" label="Address" value={account.address} onChange={(e) => setAccount({ ...account, address: e.target.value })}/>
            <Button type="submit" className="mt-2">
              Continue
            </Button>
          </form>) : (<form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <ErrorBanner message={error}/>
            <FormField id="petName" label="Pet's name" required value={pet.name} onChange={(e) => setPet({ ...pet, name: e.target.value })}/>
            <SpeciesBreedPicker species={pet.species} breed={pet.breed} onChange={(species, breed) => setPet({ ...pet, species, breed })}/>
            <div className="grid grid-cols-2 gap-4">
              <AgeInput ageMonths={pet.ageMonths} onChange={(ageMonths) => setPet({ ...pet, ageMonths })}/>
              <FormField id="weightKg" label="Weight (kg)" type="number" min={0} step="0.1" value={pet.weightKg} onChange={(e) => setPet({ ...pet, weightKg: e.target.value })}/>
            </div>
            <FormField id="allergies" label="Known allergies (optional)" value={pet.allergies} onChange={(e) => setPet({ ...pet, allergies: e.target.value })}/>
            <div className="mt-2 flex gap-3">
              <Button type="button" variant="secondary" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? "Creating account..." : "Finish"}
              </Button>
            </div>
          </form>)}

        <p className="font-body-md text-body-md mt-8 text-center text-on-surface-variant">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-secondary">
            Log in
          </Link>
        </p>
      </div>
    </div>);
}
