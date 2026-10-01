import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { uploadRecordFile } from "../lib/upload";
import { requireAuth, requireRole } from "../middleware/auth";
import * as petsService from "../services/pets.service";

const router = Router();

router.get(
  "/",
  requireAuth,
  requireRole("PET_PARENT"),
  asyncHandler(async (req, res) => {
    const pets = await petsService.listPets(req.user!.userId);
    res.json(pets);
  })
);

router.post(
  "/",
  requireAuth,
  requireRole("PET_PARENT"),
  asyncHandler(async (req, res) => {
    const parsed = petsService.createPetSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
      return;
    }
    const pet = await petsService.createPet(req.user!.userId, parsed.data);
    res.status(201).json(pet);
  })
);

router.get(
  "/:petId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const pet = await petsService.getAccessiblePet(req.params.petId, req.user!);
    res.json(pet);
  })
);

router.put(
  "/:petId",
  requireAuth,
  requireRole("PET_PARENT"),
  asyncHandler(async (req, res) => {
    const parsed = petsService.updatePetSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
      return;
    }
    const updated = await petsService.updatePet(req.params.petId, req.user!.userId, parsed.data);
    res.json(updated);
  })
);

router.delete(
  "/:petId",
  requireAuth,
  requireRole("PET_PARENT"),
  asyncHandler(async (req, res) => {
    await petsService.deletePet(req.params.petId, req.user!);
    res.status(204).send();
  })
);

router.get(
  "/:petId/records",
  requireAuth,
  asyncHandler(async (req, res) => {
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    const range = typeof req.query.range === "string" ? req.query.range : "all";
    const records = await petsService.listRecords(req.params.petId, req.user!, { category, from, to, range });
    res.json(records);
  })
);

router.post(
  "/:petId/records",
  requireAuth,
  uploadRecordFile.single("file"),
  asyncHandler(async (req, res) => {
    const parsed = petsService.createRecordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
      return;
    }
    const record = await petsService.createRecord(req.params.petId, req.user!, parsed.data, req.file);
    res.status(201).json(record);
  })
);

router.get(
  "/records/:recordId/file",
  requireAuth,
  asyncHandler(async (req, res) => {
    const filePath = await petsService.getRecordFilePath(req.params.recordId, req.user!);
    res.sendFile(filePath);
  })
);

router.delete(
  "/records/:recordId",
  requireAuth,
  requireRole("PET_PARENT"),
  asyncHandler(async (req, res) => {
    await petsService.deleteRecord(req.params.recordId, req.user!.userId);
    res.status(204).send();
  })
);

export default router;
