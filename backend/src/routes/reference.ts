import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { prisma } from "../lib/prisma";

const router = Router();

router.get(
  "/species",
  asyncHandler(async (_req, res) => {
    const species = await prisma.species.findMany({ orderBy: { name: "asc" } });
    res.json(species);
  })
);

const createSpeciesSchema = z.object({ name: z.string().trim().min(1) });

// Case-insensitive find-or-create — this is the "add it if it doesn't exist
// yet" escape hatch for the species/breed pickers, keeping casing/spelling
// consistent (the canonical stored name wins on repeat submissions) without
// blocking a pet parent whose species/breed just isn't in the starter list.
// No auth required — this must be reachable from the pet-parent signup form,
// step 2, before an account (and therefore a session) exists yet. It's a
// shared lookup table, not sensitive data, so that's an acceptable trade.
router.post(
  "/species",
  asyncHandler(async (req, res) => {
    const parsed = createSpeciesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input" });
      return;
    }
    const name = parsed.data.name;
    // SQLite's Prisma connector doesn't support `mode: "insensitive"`, so the
    // dedupe check is done in JS instead.
    const all = await prisma.species.findMany();
    const existing = all.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      res.json(existing);
      return;
    }
    const created = await prisma.species.create({ data: { name } });
    res.status(201).json(created);
  })
);

router.get(
  "/species/:speciesId/breeds",
  asyncHandler(async (req, res) => {
    const breeds = await prisma.breed.findMany({
      where: { speciesId: req.params.speciesId },
      orderBy: { name: "asc" },
    });
    res.json(breeds);
  })
);

const createBreedSchema = z.object({
  speciesId: z.string().min(1),
  name: z.string().trim().min(1),
});

// Same reasoning as POST /species — reachable from the signup form pre-auth.
router.post(
  "/breeds",
  asyncHandler(async (req, res) => {
    const parsed = createBreedSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input" });
      return;
    }
    const { speciesId, name } = parsed.data;
    const species = await prisma.species.findUnique({ where: { id: speciesId } });
    if (!species) {
      res.status(404).json({ message: "Species not found" });
      return;
    }
    const candidates = await prisma.breed.findMany({ where: { speciesId } });
    const existing = candidates.find((b) => b.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      res.json(existing);
      return;
    }
    const created = await prisma.breed.create({ data: { speciesId, name } });
    res.status(201).json(created);
  })
);

export default router;
