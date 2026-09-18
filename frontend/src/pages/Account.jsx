import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PetParentLayout } from "../layouts/PetParentLayout";
import { ApiError, api } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { Button, ErrorBanner } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { FormField } from "../components/FormField";
const STATUS_STYLES = {
    PENDING: "bg-surface-container-high text-on-surface-variant",
    CONFIRMED: "bg-secondary-container text-on-secondary-container",
    COMPLETED: "bg-secondary/10 text-secondary",
    CANCELLED: "bg-error-container text-on-error-container",
    NO_SHOW: "bg-error-container text-on-error-container",
};
export default function Account() {
    const { user, profile, logout, setSession } = useAuth();
    const parentProfile = profile;
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [justBooked, setJustBooked] = useState(searchParams.get("booked") === "1");
    useEffect(() => {
        if (searchParams.has("booked"))
            setSearchParams({}, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [pets, setPets] = useState(parentProfile?.pets ?? []);
    const [bookings, setBookings] = useState([]);
    const [petFilter, setPetFilter] = useState("ALL");
    const [loadingBookings, setLoadingBookings] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const [editOpen, setEditOpen] = useState(false);
    const [deletePet, setDeletePet] = useState(null);
    const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const loadBookings = useCallback(async () => {
        const data = await api.get("/bookings");
        setBookings(data);
    }, []);
    useEffect(() => {
        loadBookings().finally(() => setLoadingBookings(false));
    }, [loadBookings]);
    useEffect(() => {
        function handleClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target))
                setMenuOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    async function handleLogout() {
        await logout();
        navigate("/login");
    }
    async function confirmDeletePet() {
        if (!deletePet)
            return;
        setBusy(true);
        setError(null);
        try {
            await api.delete(`/pets/${deletePet.id}`);
            setPets((prev) => prev.filter((p) => p.id !== deletePet.id));
            setDeletePet(null);
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to delete pet");
        }
        finally {
            setBusy(false);
        }
    }
    async function confirmDeleteAccount() {
        setBusy(true);
        setError(null);
        try {
            await api.delete("/auth/me");
            // A full page load rather than router navigate()/logout(): clearing
            // auth state client-side races ProtectedRoute's and PublicOnlyRoute's
            // own redirects (both fire off the same state change), which was
            // clobbering the accountDeleted query param no matter which order
            // the two calls ran in. A hard redirect sidesteps that entirely —
            // the fresh page load re-checks /auth/me itself.
            window.location.href = "/login?accountDeleted=1";
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to delete account");
            setBusy(false);
            setDeleteAccountOpen(false);
        }
    }
    const filteredBookings = petFilter === "ALL" ? bookings : bookings.filter((b) => b.petId === petFilter);
    return (<PetParentLayout active="profile">
      <header className="flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-lowest px-container-padding-mobile py-6 md:px-container-padding-desktop">
        <div className="flex items-center gap-4">
          <Avatar name={user?.name ?? "?"} size={56}/>
          <div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{user?.name}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">{user?.email}</p>
          </div>
        </div>
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen((o) => !o)} className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container" aria-label="Account menu">
            <span className="material-symbols-outlined">more_vert</span>
          </button>
          {menuOpen && (<div className="soft-card-shadow absolute right-0 top-12 z-20 w-56 rounded-xl border border-outline-variant bg-surface-container-lowest py-2">
              <button onClick={() => {
                setMenuOpen(false);
                setEditOpen(true);
            }} className="flex w-full items-center gap-2 px-4 py-2 text-left font-body-md text-body-md text-on-surface hover:bg-surface-container">
                <span className="material-symbols-outlined text-[20px]">edit</span>
                Edit info
              </button>
              <button onClick={() => {
                setMenuOpen(false);
                setDeleteAccountOpen(true);
            }} className="flex w-full items-center gap-2 px-4 py-2 text-left font-body-md text-body-md text-error hover:bg-error-container/30">
                <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                Delete account
              </button>
            </div>)}
        </div>
      </header>

      <main className="flex flex-col gap-section-gap px-container-padding-mobile py-6 md:px-container-padding-desktop">
        {justBooked && (<div className="flex items-center justify-between rounded-lg border border-secondary/30 bg-secondary/10 px-4 py-3 font-body-md text-body-md text-secondary">
            Booking requested! You'll be notified once the provider confirms.
            <button onClick={() => setJustBooked(false)} className="ml-4">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>)}
        <ErrorBanner message={error}/>

        <section>
          <h2 className="font-headline-md text-headline-md mb-4 text-on-surface">Your Pets</h2>
          {pets.length === 0 ? (<p className="font-body-md text-body-md text-on-surface-variant">No pets yet.</p>) : (<div className="grid gap-4 sm:grid-cols-2">
              {pets.map((pet) => (<div key={pet.id} className="soft-card-shadow flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={pet.name} size={44}/>
                    <div>
                      <p className="font-label-md text-label-md text-on-surface">{pet.name}</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        {pet.breed || pet.species}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setDeletePet(pet)} className="font-label-sm text-label-sm text-error">
                    Delete
                  </button>
                </div>))}
            </div>)}
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-headline-md text-headline-md text-on-surface">Booking History</h2>
            {pets.length > 0 && (<select value={petFilter} onChange={(e) => setPetFilter(e.target.value)} className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-body-md text-on-surface">
                <option value="ALL">All pets</option>
                {pets.map((p) => (<option key={p.id} value={p.id}>
                    {p.name}
                  </option>))}
              </select>)}
          </div>
          {loadingBookings ? (<p className="font-body-md text-body-md text-on-surface-variant">Loading...</p>) : filteredBookings.length === 0 ? (<p className="font-body-md text-body-md text-on-surface-variant">
              No bookings yet — once you book a service, it'll show up here.
            </p>) : (<div className="space-y-3">
              {filteredBookings.map((b) => (<div key={b.id} className="soft-card-shadow flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                  <div>
                    <p className="font-label-md text-label-md text-on-surface">
                      {b.service.name} · {b.pet.name}
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      {new Date(b.slot.startDatetime).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                })}
                    </p>
                  </div>
                  <span className={`font-label-sm text-label-sm rounded-full px-3 py-1 ${STATUS_STYLES[b.status]}`}>
                    {b.status}
                  </span>
                </div>))}
            </div>)}
        </section>

        <section>
          <Button variant="secondary" onClick={handleLogout}>
            Logout
          </Button>
        </section>
      </main>

      {editOpen && (<EditAccountModal onClose={() => setEditOpen(false)} onSaved={(u, p) => {
                setSession(u, p);
                setEditOpen(false);
            }}/>)}

      {deletePet && (<ConfirmDialog title={`Delete ${deletePet.name}?`} message="This removes them from your account. Their medical records are kept but the pet profile can't be undone." confirming={busy} onConfirm={confirmDeletePet} onCancel={() => setDeletePet(null)}/>)}

      {deleteAccountOpen && (<ConfirmDialog title="Delete your account?" message="This permanently deletes your account, pets, and records. This can't be undone." confirmLabel="Delete my account" confirming={busy} onConfirm={confirmDeleteAccount} onCancel={() => setDeleteAccountOpen(false)}/>)}
    </PetParentLayout>);
}
function EditAccountModal({ onClose, onSaved, }) {
    const { user, profile } = useAuth();
    const parentProfile = profile;
    const [name, setName] = useState(user?.name ?? "");
    const [phoneNo, setPhoneNo] = useState(parentProfile?.phoneNo ?? "");
    const [address, setAddress] = useState(parentProfile?.address ?? "");
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setSaving(true);
        try {
            const data = await api.patch("/auth/me", {
                name,
                phoneNo: phoneNo || null,
                address: address || null,
            });
            onSaved(data.user, data.profile);
        }
        catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to save changes");
        }
        finally {
            setSaving(false);
        }
    }
    return (<div className="fixed inset-0 z-[60] flex items-center justify-center bg-inverse-surface/40 px-4">
      <div className="soft-card-shadow w-full max-w-sm rounded-xl bg-surface-container-lowest p-6">
        <h2 className="font-headline-md text-headline-md mb-4 text-on-surface">Edit Info</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <ErrorBanner message={error}/>
          <FormField id="name" label="Name" required value={name} onChange={(e) => setName(e.target.value)}/>
          <FormField id="phoneNo" label="Phone number" value={phoneNo} onChange={(e) => setPhoneNo(e.target.value)}/>
          <FormField id="address" label="Address" value={address} onChange={(e) => setAddress(e.target.value)}/>
          <div className="mt-2 flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>);
}
