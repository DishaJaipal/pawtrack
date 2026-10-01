import fs from "fs";
import { z } from "zod";
import { writeAudit } from "../lib/audit";
import { RecordType } from "../lib/enums";
import { HttpError } from "../lib/httpError";
import { notifyNow } from "../lib/notifications";
import { prisma } from "../lib/prisma";
import { absolutePathForRecord } from "../lib/upload";

type AuthUser = { userId: string; role: string };

export const createPetSchema = z.object({
  name: z.string().min(1),
  species: z.string().min(1),
  breed: z.string().optional(),
  ageMonths: z.number().int().nonnegative().optional(),
  weightKg: z.number().positive().optional(),
  gender: z.string().optional(),
  alerts: z.string().optional(),
});

export const updatePetSchema = z.object({
  name: z.string().min(1).optional(),
  species: z.string().min(1).optional(),
  breed: z.string().nullable().optional(),
  ageMonths: z.number().int().nonnegative().nullable().optional(),
  weightKg: z.number().positive().nullable().optional(),
  gender: z.string().nullable().optional(),
  alerts: z.string().nullable().optional(),
});

export const createRecordSchema = z.object({
  recordType: RecordType,
  title: z.string().min(1),
  description: z.string().optional(),
  recordDate: z.string().min(1),
  bookingId: z.string().optional(),
});

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
async function loadAccessiblePet(petId: string, user: AuthUser) {
  const pet = await prisma.pet.findFirst({ where: { id: petId, deletedAt: null } });
  if (!pet) return null;
  if (user.role === "PET_PARENT") {
    return pet.ownerId === user.userId ? pet : null;
  }
  const booking = await prisma.booking.findFirst({ where: { petId, providerId: user.userId } });
  return booking ? pet : null;
}

export async function listPets(ownerId: string) {
  return prisma.pet.findMany({
    where: { ownerId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
}

export async function createPet(ownerId: string, data: z.infer<typeof createPetSchema>) {
  return prisma.pet.create({ data: { ...data, ownerId } });
}

export async function getAccessiblePet(petId: string, user: AuthUser) {
  const pet = await loadAccessiblePet(petId, user);
  if (!pet) throw new HttpError(404, "Pet not found");
  return pet;
}

export async function updatePet(petId: string, ownerId: string, data: z.infer<typeof updatePetSchema>) {
  const pet = await loadOwnedPet(petId, ownerId);
  if (!pet) throw new HttpError(404, "Pet not found");
  return prisma.pet.update({ where: { id: pet.id }, data });
}

export async function deletePet(petId: string, user: AuthUser) {
  const pet = await loadOwnedPet(petId, user.userId);
  if (!pet) throw new HttpError(404, "Pet not found");
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
        data: { status: "CANCELLED", updatedByUserId: user.userId },
      });
      await writeAudit(tx, {
        tableName: "bookings",
        recordId: booking.id,
        action: "UPDATE",
        changedBy: user.userId,
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
      changedBy: user.userId,
      oldValues: pet,
    });
  });
}

// Presets compute a `from` cutoff client-side-friendly; "all" and an explicit
// custom from/to range (for records older than a year) are also accepted directly.
const RANGE_TO_DAYS: Record<string, number | null> = {
  all: null,
  "3m": 90,
  "6m": 180,
  "1y": 365,
};

export async function listRecords(
  petId: string,
  user: AuthUser,
  filters: { category?: string; from?: string; to?: string; range?: string }
) {
  const pet = await loadAccessiblePet(petId, user);
  if (!pet) throw new HttpError(404, "Pet not found");

  const { category, from, to, range = "all" } = filters;
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
  return records.map(recordToDto);
}

export async function createRecord(
  petId: string,
  user: AuthUser,
  data: z.infer<typeof createRecordSchema>,
  file: Express.Multer.File | undefined
) {
  const pet = await loadAccessiblePet(petId, user);
  if (!pet) throw new HttpError(404, "Pet not found");

  const { recordType, title, description, recordDate, bookingId } = data;

  if (bookingId) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, petId: pet.id, providerId: user.userId },
      include: { slot: true },
    });
    if (!booking) throw new HttpError(400, "Invalid appointment for this record");
    if (booking.status === "CANCELLED") {
      throw new HttpError(409, "This appointment was cancelled — no records can be added to it");
    }
    if (booking.slot.startDatetime > new Date()) {
      throw new HttpError(409, "You can't add records before the appointment's start time");
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
        fileUrl: file ? file.filename : null,
        uploadedByUserId: user.userId,
      },
    });
    if (user.role === "PROVIDER") {
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
  return recordToDto(record);
}

export async function getRecordFilePath(recordId: string, user: AuthUser) {
  const record = await prisma.petRecord.findFirst({
    where: { id: recordId, deletedAt: null },
    include: { pet: true },
  });
  if (!record || !record.fileUrl) throw new HttpError(404, "File not found");

  const accessible = await loadAccessiblePet(record.petId, user);
  if (!accessible) throw new HttpError(404, "File not found");

  const filePath = absolutePathForRecord(record.petId, record.fileUrl);
  if (!fs.existsSync(filePath)) throw new HttpError(404, "File not found");
  return filePath;
}

export async function deleteRecord(recordId: string, ownerId: string) {
  const record = await prisma.petRecord.findFirst({
    where: { id: recordId, deletedAt: null },
    include: { pet: true },
  });
  if (!record || record.pet.ownerId !== ownerId) throw new HttpError(404, "Record not found");
  await prisma.petRecord.update({ where: { id: record.id }, data: { deletedAt: new Date() } });
}
