import bcrypt from "bcrypt";
import { z } from "zod";
import { writeAudit } from "../lib/audit";
import { ProviderType } from "../lib/enums";
import { HttpError } from "../lib/httpError";
import { signToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";

// Collected as separate fields (street/city/state/postal) purely for a
// cleaner entry form, then joined into one line for storage/display —
// `address` itself stays a single string column with no coordinates behind it.
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

export const registerSchema = z.discriminatedUnion("role", [
  petParentRegisterSchema,
  providerRegisterSchema,
]);
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateMeSchema = z.object({
  name: z.string().min(1).optional(),
  phoneNo: z.string().nullable().optional(),
  street: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  providerType: ProviderType.optional(),
});
export type UpdateMeInput = z.infer<typeof updateMeSchema>;

function toPublicUser(user: { id: string; email: string; name: string; role: string }) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
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

export async function registerUser(data: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new HttpError(409, "An account with this email already exists");

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

  const token = signToken({ userId: user.id, role: user.role as "PET_PARENT" | "PROVIDER" });
  const profile = await loadProfile(user.id, user.role);
  return { user: toPublicUser(user), profile, token };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new HttpError(401, "Invalid email or password");
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new HttpError(401, "Invalid email or password");

  const token = signToken({ userId: user.id, role: user.role as "PET_PARENT" | "PROVIDER" });
  const profile = await loadProfile(user.id, user.role);
  return { user: toPublicUser(user), profile, token };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(401, "Not authenticated");
  const profile = await loadProfile(user.id, user.role);
  return { user: toPublicUser(user), profile };
}

export async function updateCurrentUser(
  userId: string,
  role: "PET_PARENT" | "PROVIDER",
  data: UpdateMeInput
) {
  const { name, phoneNo, street, city, state, postalCode, providerType } = data;
  // Only rebuild `address` when the request actually touched one of its
  // pieces — the settings form always sends all four together, so a partial
  // PATCH (e.g. just `name`) can't accidentally wipe the address.
  const addressTouched = street !== undefined || city !== undefined || state !== undefined || postalCode !== undefined;
  const address = addressTouched ? joinAddress({ street, city, state, postalCode }) : undefined;

  await prisma.$transaction(async (tx) => {
    if (name !== undefined) {
      await tx.user.update({ where: { id: userId }, data: { name } });
    }
    if (role === "PET_PARENT") {
      await tx.petParentProfile.update({ where: { userId }, data: { phoneNo, ...(addressTouched ? { address } : {}) } });
    } else {
      await tx.providerProfile.update({ where: { userId }, data: { phoneNo, providerType, ...(addressTouched ? { address } : {}) } });
    }
    await writeAudit(tx, {
      tableName: "users",
      recordId: userId,
      action: "UPDATE",
      changedBy: userId,
      newValues: data,
    });
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const profile = await loadProfile(userId, user.role);
  return { user: toPublicUser(user), profile };
}

export async function deleteCurrentUser(userId: string) {
  const [bookingAsParent, bookingAsProvider] = await Promise.all([
    prisma.booking.findFirst({ where: { petParentId: userId } }),
    prisma.booking.findFirst({ where: { providerId: userId } }),
  ]);
  if (bookingAsParent || bookingAsProvider) {
    throw new HttpError(409, "This account has booking history and can't be deleted. Please contact support.");
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
}
