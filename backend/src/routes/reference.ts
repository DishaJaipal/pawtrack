import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import * as referenceService from "../services/reference.service";

const router = Router();

router.get(
  "/species",
  asyncHandler(async (_req, res) => {
    const species = await referenceService.listSpecies();
    res.json(species);
  })
);

const createSpeciesSchema = z.object({ name: z.string().trim().min(1) });

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
    const { species, created } = await referenceService.findOrCreateSpecies(parsed.data.name);
    res.status(created ? 201 : 200).json(species);
  })
);

router.get(
  "/species/:speciesId/breeds",
  asyncHandler(async (req, res) => {
    const breeds = await referenceService.listBreeds(req.params.speciesId);
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
    const { breed, created } = await referenceService.findOrCreateBreed(speciesId, name);
    res.status(created ? 201 : 200).json(breed);
  })
);

export default router;
