import { z } from "zod";
import { writeAudit } from "../lib/audit";
import { ServiceCategory, StaffRole } from "../lib/enums";
import { HttpError } from "../lib/httpError";
import { prisma } from "../lib/prisma";

export const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: ServiceCategory,
  basePrice: z.number().min(0),
  durationMinutes: z.number().int().positive(),
});

export const staffSchema = z.object({
  name: z.string().min(1),
  role: StaffRole,
  serviceIds: z.array(z.string()).min(1, "Select at least one service"),
});

export const bulkSlotSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  dailyStart: z.string().regex(/^\d{2}:\d{2}$/),
  dailyEnd: z.string().regex(/^\d{2}:\d{2}$/),
  slotMinutes: z.number().int().positive(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).optional(),
});

// ---- Public discovery ----

export async function searchProviders(filters: { category?: string; search?: string; location?: string }) {
  const { category, search, location } = filters;

  const providers = await prisma.providerProfile.findMany({
    where: category ? { providerType: category } : {},
    include: { user: { select: { id: true, name: true } }, services: { where: { isActive: true } } },
  });
  let filtered = search ? providers.filter((p) => p.user.name.toLowerCase().includes(search)) : providers;
  if (location) {
    filtered = filtered.filter((p) => p.address?.toLowerCase().includes(location));
  }

  return filtered.map((p) => ({
    id: p.userId,
    name: p.user.name,
    providerType: p.providerType,
    address: p.address,
    services: p.services,
  }));
}

export async function getProviderProfile(providerId: string) {
  const provider = await prisma.providerProfile.findUnique({
    where: { userId: providerId },
    include: { user: { select: { id: true, name: true } }, services: { where: { isActive: true } } },
  });
  if (!provider) throw new HttpError(404, "Provider not found");
  return {
    id: provider.userId,
    name: provider.user.name,
    providerType: provider.providerType,
    address: provider.address,
    phoneNo: provider.phoneNo,
    services: provider.services,
  };
}

export async function listPublicSlots(providerId: string, serviceId: string) {
  const service = await prisma.service.findFirst({
    where: { id: serviceId, providerId, isActive: true },
  });
  if (!service) throw new HttpError(404, "Service not found");

  const qualified = await prisma.staffService.findMany({
    where: { serviceId: service.id, staff: { isActive: true } },
    select: { staffId: true },
  });
  const staffIds = qualified.map((q) => q.staffId);
  if (staffIds.length === 0) return [];

  const slots = await prisma.timeSlot.findMany({
    where: { staffId: { in: staffIds }, status: "AVAILABLE", startDatetime: { gte: new Date() } },
    include: { staff: true },
    orderBy: { startDatetime: "asc" },
  });
  return slots.map((s) => ({
    id: s.id,
    staffId: s.staffId,
    staffName: s.staff.name,
    startDatetime: s.startDatetime,
    endDatetime: s.endDatetime,
  }));
}

// A service with isActive=true but nobody left to perform it can't actually
// be booked — surfaced to the UI as `effectiveActive` rather than changing
// the stored isActive flag, since re-assigning staff should bring it back
// without the provider having to remember to reactivate it themselves.
function withEffectiveActive<T extends { isActive: boolean; staffServices: { staff: { isActive: boolean } }[] }>(
  service: T
) {
  return {
    ...service,
    effectiveActive: service.isActive && service.staffServices.some((ss) => ss.staff.isActive),
  };
}

// ---- Services (owned by the authenticated provider) ----

export async function listMyServices(providerId: string) {
  const services = await prisma.service.findMany({
    where: { providerId },
    include: { staffServices: { include: { staff: true } } },
    orderBy: { createdAt: "asc" },
  });
  return services.map(withEffectiveActive);
}

export async function createService(providerId: string, data: z.infer<typeof serviceSchema>) {
  const service = await prisma.$transaction(async (tx) => {
    const created = await tx.service.create({ data: { ...data, providerId } });
    await writeAudit(tx, {
      tableName: "services",
      recordId: created.id,
      action: "INSERT",
      changedBy: providerId,
      newValues: created,
    });
    return created;
  });
  return { ...service, effectiveActive: false };
}

async function loadOwnedService(id: string, providerId: string) {
  return prisma.service.findFirst({ where: { id, providerId } });
}

export async function updateService(id: string, providerId: string, data: Partial<z.infer<typeof serviceSchema>>) {
  const existing = await loadOwnedService(id, providerId);
  if (!existing) throw new HttpError(404, "Service not found");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.service.update({ where: { id: existing.id }, data });
    await writeAudit(tx, {
      tableName: "services",
      recordId: existing.id,
      action: "UPDATE",
      changedBy: providerId,
      oldValues: existing,
      newValues: updated,
    });
    return updated;
  });
}

export async function setServiceActive(id: string, providerId: string, isActive: boolean) {
  const existing = await loadOwnedService(id, providerId);
  if (!existing) throw new HttpError(404, "Service not found");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.service.update({ where: { id: existing.id }, data: { isActive } });
    await writeAudit(tx, {
      tableName: "services",
      recordId: existing.id,
      action: "UPDATE",
      changedBy: providerId,
      oldValues: { isActive: existing.isActive },
      newValues: { isActive },
    });
    return updated;
  });
}

export async function deleteService(id: string, providerId: string) {
  const existing = await loadOwnedService(id, providerId);
  if (!existing) throw new HttpError(404, "Service not found");

  const hasBookings = await prisma.booking.findFirst({ where: { serviceId: existing.id } });
  if (hasBookings) throw new HttpError(409, "This service has booking history — deactivate it instead of deleting");

  await prisma.$transaction(async (tx) => {
    await tx.service.delete({ where: { id: existing.id } });
    await writeAudit(tx, {
      tableName: "services",
      recordId: existing.id,
      action: "DELETE",
      changedBy: providerId,
      oldValues: existing,
    });
  });
}

// ---- Staff ----

export async function listMyStaff(providerId: string) {
  return prisma.staffMember.findMany({
    where: { providerId },
    include: { staffServices: { include: { service: true } } },
    orderBy: { createdAt: "asc" },
  });
}

async function assertOwnedServices(serviceIds: string[], providerId: string) {
  const owned = await prisma.service.findMany({ where: { id: { in: serviceIds }, providerId }, select: { id: true } });
  return owned.length === serviceIds.length;
}

export async function createStaffMember(providerId: string, data: z.infer<typeof staffSchema>) {
  const { name, role, serviceIds } = data;

  if (!(await assertOwnedServices(serviceIds, providerId))) {
    throw new HttpError(400, "One or more services are invalid");
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.staffMember.create({
      data: {
        name,
        role,
        providerId,
        staffServices: { create: serviceIds.map((serviceId) => ({ serviceId })) },
      },
      include: { staffServices: { include: { service: true } } },
    });
    await writeAudit(tx, {
      tableName: "staff_members",
      recordId: created.id,
      action: "INSERT",
      changedBy: providerId,
      newValues: created,
    });
    return created;
  });
}

async function loadOwnedStaffMember(id: string, providerId: string) {
  return prisma.staffMember.findFirst({ where: { id, providerId } });
}

export async function updateStaffMember(id: string, providerId: string, data: z.infer<typeof staffSchema>) {
  const existing = await loadOwnedStaffMember(id, providerId);
  if (!existing) throw new HttpError(404, "Staff member not found");

  const { name, role, serviceIds } = data;
  if (!(await assertOwnedServices(serviceIds, providerId))) {
    throw new HttpError(400, "One or more services are invalid");
  }

  return prisma.$transaction(async (tx) => {
    await tx.staffService.deleteMany({ where: { staffId: existing.id } });
    const updated = await tx.staffMember.update({
      where: { id: existing.id },
      data: {
        name,
        role,
        staffServices: { create: serviceIds.map((serviceId) => ({ serviceId })) },
      },
      include: { staffServices: { include: { service: true } } },
    });
    await writeAudit(tx, {
      tableName: "staff_members",
      recordId: existing.id,
      action: "UPDATE",
      changedBy: providerId,
      oldValues: existing,
      newValues: updated,
    });
    return updated;
  });
}

export async function setStaffActive(id: string, providerId: string, isActive: boolean) {
  const existing = await loadOwnedStaffMember(id, providerId);
  if (!existing) throw new HttpError(404, "Staff member not found");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.staffMember.update({ where: { id: existing.id }, data: { isActive } });
    await writeAudit(tx, {
      tableName: "staff_members",
      recordId: existing.id,
      action: "UPDATE",
      changedBy: providerId,
      oldValues: { isActive: existing.isActive },
      newValues: { isActive },
    });
    return updated;
  });
}

export async function deleteStaffMember(id: string, providerId: string) {
  const existing = await loadOwnedStaffMember(id, providerId);
  if (!existing) throw new HttpError(404, "Staff member not found");

  const hasBookings = await prisma.booking.findFirst({ where: { staffId: existing.id } });
  if (hasBookings) {
    throw new HttpError(409, "This staff member has booking history — deactivate instead of deleting");
  }

  await prisma.$transaction(async (tx) => {
    await tx.staffMember.delete({ where: { id: existing.id } });
    await writeAudit(tx, {
      tableName: "staff_members",
      recordId: existing.id,
      action: "DELETE",
      changedBy: providerId,
      oldValues: existing,
    });
  });
}

// ---- Slots ----

async function loadOwnedStaff(staffId: string, providerId: string) {
  return prisma.staffMember.findFirst({ where: { id: staffId, providerId } });
}

export async function listStaffSlots(staffId: string, providerId: string) {
  const staff = await loadOwnedStaff(staffId, providerId);
  if (!staff) throw new HttpError(404, "Staff member not found");

  return prisma.timeSlot.findMany({
    where: { staffId: staff.id, startDatetime: { gte: new Date() } },
    orderBy: { startDatetime: "asc" },
  });
}

export async function createSlotsInBulk(staffId: string, providerId: string, data: z.infer<typeof bulkSlotSchema>) {
  const staff = await loadOwnedStaff(staffId, providerId);
  if (!staff) throw new HttpError(404, "Staff member not found");

  const { startDate, endDate, dailyStart, dailyEnd, slotMinutes, daysOfWeek } = data;
  const allowedDays = new Set(daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6]);

  const [startH, startM] = dailyStart.split(":").map(Number);
  const [endH, endM] = dailyEnd.split(":").map(Number);
  const dailyStartMinutes = startH * 60 + startM;
  const dailyEndMinutes = endH * 60 + endM;
  if (dailyEndMinutes <= dailyStartMinutes) throw new HttpError(400, "dailyEnd must be after dailyStart");

  const day = new Date(`${startDate}T00:00:00`);
  const last = new Date(`${endDate}T00:00:00`);
  if (last < day) throw new HttpError(400, "endDate must be on or after startDate");

  const candidates: { start: Date; end: Date }[] = [];
  while (day <= last) {
    if (allowedDays.has(day.getDay())) {
      for (let m = dailyStartMinutes; m + slotMinutes <= dailyEndMinutes; m += slotMinutes) {
        const start = new Date(day);
        start.setHours(0, m, 0, 0);
        const end = new Date(start.getTime() + slotMinutes * 60 * 1000);
        candidates.push({ start, end });
      }
    }
    day.setDate(day.getDate() + 1);
  }

  if (candidates.length === 0) throw new HttpError(400, "No slots would be generated for this range");

  const existing = await prisma.timeSlot.findMany({
    where: {
      staffId: staff.id,
      startDatetime: { in: candidates.map((c) => c.start) },
    },
    select: { startDatetime: true },
  });
  const existingTimes = new Set(existing.map((e) => e.startDatetime.getTime()));
  const toCreate = candidates.filter((c) => !existingTimes.has(c.start.getTime()));

  if (toCreate.length > 0) {
    await prisma.timeSlot.createMany({
      data: toCreate.map((c) => ({
        staffId: staff.id,
        startDatetime: c.start,
        endDatetime: c.end,
      })),
    });
  }

  return { created: toCreate.length, skipped: candidates.length - toCreate.length };
}

export async function deleteSlot(slotId: string, providerId: string) {
  const slot = await prisma.timeSlot.findFirst({
    where: { id: slotId },
    include: { staff: true },
  });
  if (!slot || slot.staff.providerId !== providerId) throw new HttpError(404, "Slot not found");
  if (slot.status !== "AVAILABLE") throw new HttpError(409, "Only available slots can be removed");
  await prisma.timeSlot.delete({ where: { id: slot.id } });
}

// A pet only becomes a "client" once an appointment with it has actually
// happened — matches the requested flow (client list populates after
// completion, not the moment a booking is made).
export async function listMyClients(providerId: string) {
  const bookings = await prisma.booking.findMany({
    where: { providerId, status: "COMPLETED" },
    include: {
      pet: true,
      service: true,
      slot: true,
      petParent: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
    orderBy: { slot: { startDatetime: "desc" } },
  });

  const clientsByPet = new Map<string, any>();
  for (const booking of bookings) {
    if (!clientsByPet.has(booking.petId)) {
      clientsByPet.set(booking.petId, {
        pet: booking.pet,
        owner: {
          name: booking.petParent.user.name,
          email: booking.petParent.user.email,
          phoneNo: booking.petParent.phoneNo,
        },
        appointments: [],
      });
    }
    clientsByPet.get(booking.petId).appointments.push({
      id: booking.id,
      serviceName: booking.service.name,
      startDatetime: booking.slot.startDatetime,
    });
  }

  return Array.from(clientsByPet.values());
}
