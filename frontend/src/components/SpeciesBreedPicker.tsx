import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface RefItem {
  id: string;
  name: string;
}

// Species/breed always come from these master lists (seeded with a starter
// set, extensible via "Add new") so free-typed casing/spelling ("dog" vs
// "DOG") never makes it into a pet's stored species/breed string.
export function SpeciesBreedPicker({
  species,
  breed,
  onChange,
}: {
  species: string;
  breed: string;
  onChange: (species: string, breed: string) => void;
}) {
  const [speciesList, setSpeciesList] = useState<RefItem[]>([]);
  const [breedList, setBreedList] = useState<RefItem[]>([]);
  const [addingSpecies, setAddingSpecies] = useState(false);
  const [addingBreed, setAddingBreed] = useState(false);
  const [newSpeciesName, setNewSpeciesName] = useState("");
  const [newBreedName, setNewBreedName] = useState("");

  useEffect(() => {
    api.get<RefItem[]>("/species").then(setSpeciesList);
  }, []);

  const currentSpecies = speciesList.find((s) => s.name === species);

  useEffect(() => {
    if (!currentSpecies) {
      setBreedList([]);
      return;
    }
    api.get<RefItem[]>(`/species/${currentSpecies.id}/breeds`).then(setBreedList);
  }, [currentSpecies?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submitNewSpecies() {
    const name = newSpeciesName.trim();
    if (!name) return;
    const created = await api.post<RefItem>("/species", { name });
    setSpeciesList((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    onChange(created.name, "");
    setAddingSpecies(false);
    setNewSpeciesName("");
  }

  async function submitNewBreed() {
    const name = newBreedName.trim();
    if (!name || !currentSpecies) return;
    const created = await api.post<RefItem>("/breeds", { speciesId: currentSpecies.id, name });
    setBreedList((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    onChange(species, created.name);
    setAddingBreed(false);
    setNewBreedName("");
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="font-label-md text-label-md text-on-surface-variant">Species</span>
        {addingSpecies ? (
          <div className="flex gap-2">
            <input
              autoFocus
              className="min-h-[48px] min-w-0 flex-1 rounded-lg border border-secondary bg-surface-container-lowest px-3 py-2 font-body-md text-body-md text-on-surface outline-none"
              placeholder="New species"
              value={newSpeciesName}
              onChange={(e) => setNewSpeciesName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submitNewSpecies())}
            />
            <button
              type="button"
              onClick={submitNewSpecies}
              className="rounded-lg bg-primary px-3 font-label-md text-label-md text-on-primary"
            >
              Add
            </button>
          </div>
        ) : (
          <select
            required
            className="min-h-[48px] rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-body-md text-on-surface outline-none focus:border-secondary"
            value={species}
            onChange={(e) => {
              if (e.target.value === "__add__") {
                setAddingSpecies(true);
                return;
              }
              onChange(e.target.value, "");
            }}
          >
            <option value="" disabled>
              Select species
            </option>
            {speciesList.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
            <option value="__add__">+ Add new...</option>
          </select>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="font-label-md text-label-md text-on-surface-variant">Breed</span>
        {addingBreed ? (
          <div className="flex gap-2">
            <input
              autoFocus
              className="min-h-[48px] min-w-0 flex-1 rounded-lg border border-secondary bg-surface-container-lowest px-3 py-2 font-body-md text-body-md text-on-surface outline-none"
              placeholder="New breed"
              value={newBreedName}
              onChange={(e) => setNewBreedName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submitNewBreed())}
            />
            <button
              type="button"
              onClick={submitNewBreed}
              className="rounded-lg bg-primary px-3 font-label-md text-label-md text-on-primary"
            >
              Add
            </button>
          </div>
        ) : (
          <select
            disabled={!currentSpecies}
            className="min-h-[48px] rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-body-md text-on-surface outline-none focus:border-secondary disabled:opacity-50"
            value={breed}
            onChange={(e) => {
              if (e.target.value === "__add__") {
                setAddingBreed(true);
                return;
              }
              onChange(species, e.target.value);
            }}
          >
            <option value="">Unspecified</option>
            {breedList.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
            <option value="__add__">+ Add new...</option>
          </select>
        )}
      </div>
    </div>
  );
}
