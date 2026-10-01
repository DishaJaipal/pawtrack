import { HttpError } from "../lib/httpError";
import { prisma } from "../lib/prisma";

export async function listSpecies() {
  return prisma.species.findMany({ orderBy: { name: "asc" } });
}

// Case-insensitive find-or-create — this is the "add it if it doesn't exist
// yet" escape hatch for the species/breed pickers, keeping casing/spelling
// consistent (the canonical stored name wins on repeat submissions) without
// blocking a pet parent whose species/breed just isn't in the starter list.
export async function findOrCreateSpecies(name: string) {
  // SQLite's Prisma connector doesn't support `mode: "insensitive"`, so the
  // dedupe check is done in JS instead.
  const all = await prisma.species.findMany();
  const existing = all.find((s) => s.name.toLowerCase() === name.toLowerCase());
  if (existing) return { species: existing, created: false };
  const created = await prisma.species.create({ data: { name } });
  return { species: created, created: true };
}

export async function listBreeds(speciesId: string) {
  return prisma.breed.findMany({
    where: { speciesId },
    orderBy: { name: "asc" },
  });
}

// Same reasoning as findOrCreateSpecies.
export async function findOrCreateBreed(speciesId: string, name: string) {
  const species = await prisma.species.findUnique({ where: { id: speciesId } });
  if (!species) throw new HttpError(404, "Species not found");

  const candidates = await prisma.breed.findMany({ where: { speciesId } });
  const existing = candidates.find((b) => b.name.toLowerCase() === name.toLowerCase());
  if (existing) return { breed: existing, created: false };
  const created = await prisma.breed.create({ data: { speciesId, name } });
  return { breed: created, created: true };
}
