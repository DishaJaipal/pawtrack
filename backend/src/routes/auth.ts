import bcrypt from "bcrypt";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { writeAudit } from "../lib/audit";
import { ProviderType } from "../lib/enums";
import { geocodeStructured } from "../lib/geocode";
import { signToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Collected as separate fields (street/city/state/postal) so they can be
// geocoded accurately, then joined into one line for storage/display —
// `address` itself stays a single string column, nothing about how it's
// stored or read changes.
function joinAddress(parts: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
}): string | null {
  const joined = [parts.street, parts.city, parts.state, parts.postalCode].filter(Boolean).join(", ");
  return joined || null;
}

const baseUserFields = {
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1),
  phoneNo: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
};

const petParentRegisterSchema = z.object({
  ...baseUserFields,
  role: z.literal("PET_PARENT"),
  pet: z.object({
    name: z.string().min(1),
    species: z.string().min(1),
    breed: z.string().optional(),
    ageMonths: z.number().int().nonnegative().optional(),
    weightKg: z.number().positive().optional(),
    allergies: z.string().optional(),
  }),
});

const providerRegisterSchema = z.object({
  ...baseUserFields,
  role: z.literal("PROVIDER"),
  providerType: ProviderType,
});

const registerSchema = z.discriminatedUnion("role", [
  petParentRegisterSchema,
  providerRegisterSchema,
]);

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

function setAuthCookie(res: import("express").Response, userId: string, role: "PET_PARENT" | "PROVIDER") {
  const token = signToken({ userId, role });
  res.cookie("token", token, COOKIE_OPTIONS);
}

async function loadProfile(userId: string, role: string) {
  if (role === "PET_PARENT") {
    return prisma.petParentProfile.findUnique({
      where: { userId },
      include: { pets: { where: { deletedAt: null } } },
    });
  }
  return prisma.providerProfile.findUnique({ where: { userId } });
}

router.post("/register", asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
    return;
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    res.status(409).json({ message: "An account with this email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        role: data.role,
      },
    });

    const address = joinAddress(data);

    if (data.role === "PET_PARENT") {
      await tx.petParentProfile.create({
        data: {
          userId: createdUser.id,
          phoneNo: data.phoneNo,
          address,
        },
      });
      await tx.pet.create({
        data: {
          ownerId: createdUser.id,
          name: data.pet.name,
          species: data.pet.species,
          breed: data.pet.breed,
          ageMonths: data.pet.ageMonths,
          weightKg: data.pet.weightKg,
          alerts: data.pet.allergies,
        },
      });
    } else {
      await tx.providerProfile.create({
        data: {
          userId: createdUser.id,
          providerType: data.providerType,
          phoneNo: data.phoneNo,
          address,
        },
      });
    }

    return createdUser;
  });

  setAuthCookie(res, user.id, user.role as "PET_PARENT" | "PROVIDER");

  // Best-effort, after the transaction commits — a slow/failed geocode call
  // should never block or fail account creation. Uses the structured fields
  // directly (more accurate than geocoding the joined string).
  if (user.role === "PROVIDER") {
    const coords = await geocodeStructured(data);
    if (coords) {
      await prisma.providerProfile.update({ where: { userId: user.id }, data: coords });
    }
  }

  const profile = await loadProfile(user.id, user.role);
  res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    profile,
  });
}));

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  setAuthCookie(res, user.id, user.role as "PET_PARENT" | "PROVIDER");
  const profile = await loadProfile(user.id, user.role);
  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    profile,
  });
}));

router.post("/logout", (_req, res) => {
  res.clearCookie("token", { ...COOKIE_OPTIONS, maxAge: undefined });
  res.status(204).send();
});

router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
  const profile = await loadProfile(user.id, user.role);
  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    profile,
  });
}));

const updateMeSchema = z.object({
  name: z.string().min(1).optional(),
  phoneNo: z.string().nullable().optional(),
  street: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  providerType: ProviderType.optional(),
});

router.patch("/me", requireAuth, asyncHandler(async (req, res) => {
  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
    return;
  }
  const { name, phoneNo, street, city, state, postalCode, providerType } = parsed.data;
  const userId = req.user!.userId;
  // Only rebuild `address` when the request actually touched one of its
  // pieces — the settings form always sends all four together, so a partial
  // PATCH (e.g. just `name`) can't accidentally wipe the address.
  const addressTouched = street !== undefined || city !== undefined || state !== undefined || postalCode !== undefined;
  const address = addressTouched ? joinAddress({ street, city, state, postalCode }) : undefined;

  await prisma.$transaction(async (tx) => {
    if (name !== undefined) {
      await tx.user.update({ where: { id: userId }, data: { name } });
    }
    if (req.user!.role === "PET_PARENT") {
      await tx.petParentProfile.update({ where: { userId }, data: { phoneNo, ...(addressTouched ? { address } : {}) } });
    } else {
      await tx.providerProfile.update({ where: { userId }, data: { phoneNo, providerType, ...(addressTouched ? { address } : {}) } });
    }
    await writeAudit(tx, {
      tableName: "users",
      recordId: userId,
      action: "UPDATE",
      changedBy: userId,
      newValues: parsed.data,
    });
  });

  if (req.user!.role === "PROVIDER" && addressTouched) {
    const coords = address ? await geocodeStructured({ street, city, state, postalCode }) : null;
    await prisma.providerProfile.update({
      where: { userId },
      data: { latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null },
    });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const profile = await loadProfile(userId, user.role);
  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    profile,
  });
}));

router.delete("/me", requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.userId;

  const [bookingAsParent, bookingAsProvider] = await Promise.all([
    prisma.booking.findFirst({ where: { petParentId: userId } }),
    prisma.booking.findFirst({ where: { providerId: userId } }),
  ]);
  if (bookingAsParent || bookingAsProvider) {
    res.status(409).json({
      message: "This account has booking history and can't be deleted. Please contact support.",
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await writeAudit(tx, {
      tableName: "users",
      recordId: userId,
      action: "DELETE",
      changedBy: userId,
    });
    // These two references have no cascade action defined (deliberately —
    // audit/booking history shouldn't vanish with the account), so they're
    // cleared explicitly before the cascading user delete below.
    await tx.auditLog.updateMany({ where: { changedBy: userId }, data: { changedBy: null } });
    await tx.petRecord.updateMany({ where: { updatedByUserId: userId }, data: { updatedByUserId: null } });
    // Records this user uploaded belong to pets that cascade-delete with the
    // user anyway; deleting them explicitly first avoids relying on SQLite's
    // cross-path cascade ordering for the direct uploadedByUserId FK.
    await tx.petRecord.deleteMany({ where: { uploadedByUserId: userId } });
    await tx.user.delete({ where: { id: userId } });
  });

  res.clearCookie("token", { ...COOKIE_OPTIONS, maxAge: undefined });
  res.status(204).send();
}));

export default router;
