import fs from "fs";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { writeAudit } from "../lib/audit";
import { RecordType } from "../lib/enums";
import { notifyNow } from "../lib/notifications";
import { prisma } from "../lib/prisma";
import { absolutePathForRecord, uploadRecordFile } from "../lib/upload";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

function recordToDto(record: { id: string; fileUrl: string | null; [key: string]: unknown }) {
  return {
    ...record,
    fileUrl: record.fileUrl ? `/api/pets/records/${record.id}/file` : null,
  };
}

async function loadOwnedPet(petId: string, ownerId: string) {
  return prisma.pet.findFirst({ where: { id: petId, ownerId, deletedAt: null } });
}

// Read access to a pet/its records extends to a provider who has (or had) a
// booking with that pet — matches the original design's "Owner or
// Provider-with-booking" rule. Write access (edit/delete the pet) stays
// owner-only; that's still gated with loadOwnedPet directly.
async function loadAccessiblePet(petId: string, user: { userId: string; role: string }) {
  const pet = await prisma.pet.findFirst({ where: { id: petId, deletedAt: null } });
  if (!pet) return null;
  if (user.role === "PET_PARENT") {
    return pet.ownerId === user.userId ? pet : null;
  }
  const booking = await prisma.booking.findFirst({ where: { petId, providerId: user.userId } });
  return booking ? pet : null;
}

router.get(
  "/",
  requireAuth,
  requireRole("PET_PARENT"),
  asyncHandler(async (req, res) => {
    const pets = await prisma.pet.findMany({
      where: { ownerId: req.user!.userId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    res.json(pets);
  })
);

const createPetSchema = z.object({
  name: z.string().min(1),
  species: z.string().min(1),
  breed: z.string().optional(),
  ageMonths: z.number().int().nonnegative().optional(),
  weightKg: z.number().positive().optional(),
  gender: z.string().optional(),
  alerts: z.string().optional(),
});

router.post(
  "/",
  requireAuth,
  requireRole("PET_PARENT"),
  asyncHandler(async (req, res) => {
    const parsed = createPetSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
      return;
    }
    const pet = await prisma.pet.create({
      data: { ...parsed.data, ownerId: req.user!.userId },
    });
    res.status(201).json(pet);
  })
);

router.get(
  "/:petId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const pet = await loadAccessiblePet(req.params.petId, req.user!);
    if (!pet) {
      res.status(404).json({ message: "Pet not found" });
      return;
    }
    res.json(pet);
  })
);

const updatePetSchema = z.object({
  name: z.string().min(1).optional(),
  species: z.string().min(1).optional(),
  breed: z.string().nullable().optional(),
  ageMonths: z.number().int().nonnegative().nullable().optional(),
  weightKg: z.number().positive().nullable().optional(),
  gender: z.string().nullable().optional(),
  alerts: z.string().nullable().optional(),
});

router.put(
  "/:petId",
  requireAuth,
  requireRole("PET_PARENT"),
  asyncHandler(async (req, res) => {
    const pet = await loadOwnedPet(req.params.petId, req.user!.userId);
    if (!pet) {
      res.status(404).json({ message: "Pet not found" });
      return;
    }
    const parsed = updatePetSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
      return;
    }
    const updated = await prisma.pet.update({ where: { id: pet.id }, data: parsed.data });
    res.json(updated);
  })
);

router.delete(
  "/:petId",
  requireAuth,
  requireRole("PET_PARENT"),
  asyncHandler(async (req, res) => {
    const pet = await loadOwnedPet(req.params.petId, req.user!.userId);
    if (!pet) {
      res.status(404).json({ message: "Pet not found" });
      return;
    }
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // Deleting a pet is "deactivate", not erase — cancel any active
      // bookings (freeing their slots back up) and soft-delete its records,
      // rather than leaving orphaned appointments or blocking the delete.
      const activeBookings = await tx.booking.findMany({
        where: { petId: pet.id, status: { in: ["PENDING", "CONFIRMED"] } },
      });
      for (const booking of activeBookings) {
        await tx.timeSlot.update({ where: { id: booking.slotId }, data: { status: "AVAILABLE" } });
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: "CANCELLED", updatedByUserId: req.user!.userId },
        });
        await writeAudit(tx, {
          tableName: "bookings",
          recordId: booking.id,
          action: "UPDATE",
          changedBy: req.user!.userId,
          oldValues: { status: booking.status },
          newValues: { status: "CANCELLED", reason: "pet deleted" },
        });
      }

      await tx.petRecord.updateMany({
        where: { petId: pet.id, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.pet.update({ where: { id: pet.id }, data: { deletedAt: now } });
      await writeAudit(tx, {
        tableName: "pets",
        recordId: pet.id,
        action: "DELETE",
        changedBy: req.user!.userId,
        oldValues: pet,
      });
    });
    res.status(204).send();
  })
);

// Presets compute a `from` cutoff client-side-friendly; "all" and an explicit
// custom from/to range (for records older than a year) are also accepted directly.
const RANGE_TO_DAYS: Record<string, number | null> = {
  all: null,
  "3m": 90,
  "6m": 180,
  "1y": 365,
};

router.get(
  "/:petId/records",
  requireAuth,
  asyncHandler(async (req, res) => {
    const pet = await loadAccessiblePet(req.params.petId, req.user!);
    if (!pet) {
      res.status(404).json({ message: "Pet not found" });
      return;
    }

    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    const range = typeof req.query.range === "string" ? req.query.range : "all";
    const days = RANGE_TO_DAYS[range] ?? null;

    let dateFilter: { gte?: Date; lte?: Date } | undefined;
    if (from || to) {
      dateFilter = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) dateFilter.lte = new Date(to);
    } else if (days) {
      dateFilter = { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
    }

    const records = await prisma.petRecord.findMany({
      where: {
        petId: pet.id,
        deletedAt: null,
        ...(category && category !== "ALL" ? { recordType: category } : {}),
        ...(dateFilter ? { recordDate: dateFilter } : {}),
      },
      orderBy: { recordDate: "desc" },
    });
    res.json(records.map(recordToDto));
  })
);

const createRecordSchema = z.object({
  recordType: RecordType,
  title: z.string().min(1),
  description: z.string().optional(),
  recordDate: z.string().min(1),
  bookingId: z.string().optional(),
});

router.post(
  "/:petId/records",
  requireAuth,
  uploadRecordFile.single("file"),
  asyncHandler(async (req, res) => {
    const pet = await loadAccessiblePet(req.params.petId, req.user!);
    if (!pet) {
      res.status(404).json({ message: "Pet not found" });
      return;
    }
    const parsed = createRecordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
      return;
    }
    const { recordType, title, description, recordDate, bookingId } = parsed.data;

    if (bookingId) {
      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, petId: pet.id, providerId: req.user!.userId },
        include: { slot: true },
      });
      if (!booking) {
        res.status(400).json({ message: "Invalid appointment for this record" });
        return;
      }
      if (booking.status === "CANCELLED") {
        res.status(409).json({ message: "This appointment was cancelled — no records can be added to it" });
        return;
      }
      if (booking.slot.startDatetime > new Date()) {
        res.status(409).json({ message: "You can't add records before the appointment's start time" });
        return;
      }
    }

    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.petRecord.create({
        data: {
          petId: pet.id,
          bookingId: bookingId ?? null,
          recordType,
          title,
          description,
          recordDate: new Date(recordDate),
          fileUrl: req.file ? req.file.filename : null,
          uploadedByUserId: req.user!.userId,
        },
      });
      if (req.user!.role === "PROVIDER") {
        await notifyNow(tx, {
          userId: pet.ownerId,
          type: "RECORD_UPLOADED",
          payload: {
            petId: pet.id,
            petName: pet.name,
            recordId: created.id,
            title: created.title,
            message: `New record added for ${pet.name}: ${created.title}`,
          },
        });
      }
      return created;
    });
    res.status(201).json(recordToDto(record));
  })
);

router.get(
  "/records/:recordId/file",
  requireAuth,
  asyncHandler(async (req, res) => {
    const record = await prisma.petRecord.findFirst({
      where: { id: req.params.recordId, deletedAt: null },
      include: { pet: true },
    });
    if (!record || !record.fileUrl) {
      res.status(404).json({ message: "File not found" });
      return;
    }
    const accessible = await loadAccessiblePet(record.petId, req.user!);
    if (!accessible) {
      res.status(404).json({ message: "File not found" });
      return;
    }
    const filePath = absolutePathForRecord(record.petId, record.fileUrl);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: "File not found" });
      return;
    }
    res.sendFile(filePath);
  })
);

router.delete(
  "/records/:recordId",
  requireAuth,
  requireRole("PET_PARENT"),
  asyncHandler(async (req, res) => {
    const record = await prisma.petRecord.findFirst({
      where: { id: req.params.recordId, deletedAt: null },
      include: { pet: true },
    });
    if (!record || record.pet.ownerId !== req.user!.userId) {
      res.status(404).json({ message: "Record not found" });
      return;
    }
    await prisma.petRecord.update({ where: { id: record.id }, data: { deletedAt: new Date() } });
    res.status(204).send();
  })
);

export default router;
