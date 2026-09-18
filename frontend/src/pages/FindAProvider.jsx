import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PetParentLayout } from "../layouts/PetParentLayout";
import { api } from "../lib/api";
const PROVIDER_TYPES = [
    { value: "VET_CLINIC", label: "Vet Clinic" },
    { value: "INDEPENDENT_VET", label: "Independent Vet" },
    { value: "GROOMER", label: "Groomer" },
    { value: "TRAINER", label: "Trainer" },
    { value: "PET_SITTER", label: "Pet Sitter" },
];
export default function FindAProvider() {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState(null);
    const load = useCallback(async () => {
        const params = new URLSearchParams();
        if (search.trim())
            params.set("search", search.trim());
        if (category)
            params.set("category", category);
        const query = params.toString();
        const data = await api.get(`/providers${query ? `?${query}` : ""}`);
        setProviders(data);
    }, [search, category]);
    useEffect(() => {
        setLoading(true);
        load().finally(() => setLoading(false));
    }, [load]);
    useEffect(() => {
        const t = setTimeout(() => load(), 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);
    return (<PetParentLayout active="search">
      <div className="mx-auto max-w-4xl px-container-padding-mobile py-6 md:px-container-padding-desktop">
        <h1 className="font-headline-lg text-headline-lg mb-4 text-on-surface">Find a Provider</h1>

        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input className="h-14 w-full rounded-2xl border-none bg-surface-container-low pl-12 pr-4 font-body-md text-body-md shadow-sm outline-none placeholder:text-on-surface-variant/60 focus:ring-2 focus:ring-secondary" placeholder="Search by business name..." value={search} onChange={(e) => setSearch(e.target.value)}/>
        </div>

        <div className="hide-scrollbar mt-4 flex gap-2 overflow-x-auto pb-2">
          <button onClick={() => setCategory(null)} className={`font-label-md text-label-md whitespace-nowrap rounded-full px-4 py-2 transition-colors ${category === null ? "bg-secondary text-white" : "bg-surface-container text-on-surface-variant"}`}>
            All
          </button>
          {PROVIDER_TYPES.map((t) => (<button key={t.value} onClick={() => setCategory(t.value)} className={`font-label-md text-label-md whitespace-nowrap rounded-full px-4 py-2 transition-colors ${category === t.value ? "bg-secondary text-white" : "bg-surface-container text-on-surface-variant"}`}>
              {t.label}
            </button>))}
        </div>

        <p className="font-label-md text-label-md mt-6 mb-4 uppercase tracking-wider text-on-surface-variant">
          {loading ? "Loading..." : `${providers.length} result${providers.length === 1 ? "" : "s"} found`}
        </p>

        <div className="flex flex-col gap-4">
          {!loading && providers.length === 0 && (<p className="font-body-md text-body-md py-8 text-center text-on-surface-variant">
              No providers found. Try a different search or category.
            </p>)}
          {providers.map((p) => {
            const categories = [...new Set(p.services.map((s) => s.category))];
            return (<Link key={p.id} to={`/providers/${p.id}`} className="soft-card-shadow flex gap-4 rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-5 transition-all hover:-translate-y-1">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-secondary-container text-on-secondary-container">
                  <span className="material-symbols-outlined text-[32px]">storefront</span>
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="font-headline-md text-body-lg font-semibold text-on-surface">{p.name}</h3>
                      <div className="flex items-center gap-1 rounded-lg bg-secondary-container/40 px-2 py-1 text-secondary">
                        <span className="material-symbols-outlined text-[16px]">star</span>
                        <span className="font-label-md text-label-md">
                          {p.rating != null ? p.rating.toFixed(1) : "New"}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {PROVIDER_TYPES.find((t) => t.value === p.providerType)?.label ?? p.providerType}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {categories.slice(0, 3).map((c) => (<span key={c} className="font-label-sm text-label-sm rounded-full bg-secondary/10 px-3 py-1 text-secondary">
                        {c}
                      </span>))}
                    {categories.length === 0 && (<span className="font-label-sm text-label-sm text-on-surface-variant">No services listed yet</span>)}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-on-surface-variant">
                      <span className="material-symbols-outlined text-[18px]">location_on</span>
                      <span className="font-label-md text-label-md">{p.address ?? "Address not listed"}</span>
                    </div>
                    <span className="font-label-md text-label-md font-bold text-primary">Book Now</span>
                  </div>
                </div>
              </Link>);
        })}
        </div>
      </div>
    </PetParentLayout>);
}
