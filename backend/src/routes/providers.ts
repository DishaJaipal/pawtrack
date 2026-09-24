import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { writeAudit } from "../lib/audit";
import { ServiceCategory, StaffRole } from "../lib/enums";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// ---- Public discovery (no auth) — registered before the requireAuth
// middleware below, which Express only applies to routes registered after
// it on this router, so these stay public while /me/* stays protected. ----

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : undefined;
    // Plain substring match on the free-text address field — there's no
    // structured street/city/zip breakdown to geocode accurately against,
    // so this is "does the typed text appear in the address" rather than
    // a real distance search.
    const location = typeof req.query.location === "string" ? req.query.location.trim().toLowerCase() : undefined;

    const providers = await prisma.providerProfile.findMany({
      where: category ? { providerType: category } : {},
      include: { user: { select: { id: true, name: true } }, services: { where: { isActive: true } } },
    });
    let filtered = search ? providers.filter((p) => p.user.name.toLowerCase().includes(search)) : providers;
    if (location) {
      filtered = filtered.filter((p) => p.address?.toLowerCase().includes(location));
    }

    const results = filtered.map((p) => ({
      id: p.userId,
      name: p.user.name,
      providerType: p.providerType,
      address: p.address,
      services: p.services,
    }));

    res.json(results);
  })
);

router.get(
  "/:providerId",
  asyncHandler(async (req, res) => {
    const provider = await prisma.providerProfile.findUnique({
      where: { userId: req.params.providerId },
      include: { user: { select: { id: true, name: true } }, services: { where: { isActive: true } } },
    });
    if (!provider) {
      res.status(404).json({ message: "Provider not found" });
      return;
    }
    res.json({
      id: provider.userId,
      name: provider.user.name,
      providerType: provider.providerType,
      address: provider.address,
      phoneNo: provider.phoneNo,
      services: provider.services,
    });
  })
);

router.get(
  "/:providerId/services/:serviceId/slots",
  asyncHandler(async (req, res) => {
    const service = await prisma.service.findFirst({
      where: { id: req.params.serviceId, providerId: req.params.providerId, isActive: true },
    });
    if (!service) {
      res.status(404).json({ message: "Service not found" });
      return;
    }
    const qualified = await prisma.staffService.findMany({
      where: { serviceId: service.id, staff: { isActive: true } },
      select: { staffId: true },
    });
    const staffIds = qualified.map((q) => q.staffId);
    if (staffIds.length === 0) {
      res.json([]);
      return;
    }
    const slots = await prisma.timeSlot.findMany({
      where: { staffId: { in: staffIds }, status: "AVAILABLE", startDatetime: { gte: new Date() } },
      include: { staff: true },
      orderBy: { startDatetime: "asc" },
    });
    res.json(
      slots.map((s) => ({
        id: s.id,
        staffId: s.staffId,
        staffName: s.staff.name,
        startDatetime: s.startDatetime,
        endDatetime: s.endDatetime,
      }))
    );
  })
);

router.use(requireAuth, requireRole("PROVIDER"));

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

// ---- Services ----

router.get(
  "/me/services",
  asyncHandler(async (req, res) => {
    const services = await prisma.service.findMany({
      where: { providerId: req.user!.userId },
      include: { staffServices: { include: { staff: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(services.map(withEffectiveActive));
  })
);

const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: ServiceCategory,
  basePrice: z.number().min(0),
  durationMinutes: z.number().int().positive(),
});

router.post(
  "/me/services",
  asyncHandler(async (req, res) => {
    const parsed = serviceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
      return;
    }
    const service = await prisma.$transaction(async (tx) => {
      const created = await tx.service.create({ data: { ...parsed.data, providerId: req.user!.userId } });
      await writeAudit(tx, {
        tableName: "services",
        recordId: created.id,
        action: "INSERT",
        changedBy: req.user!.userId,
        newValues: created,
      });
      return created;
    });
    res.status(201).json({ ...service, effectiveActive: false });
  })
);

async function loadOwnedService(id: string, providerId: string) {
  return prisma.service.findFirst({ where: { id, providerId } });
}

router.put(
  "/me/services/:id",
  asyncHandler(async (req, res) => {
    const existing = await loadOwnedService(req.params.id, req.user!.userId);
    if (!existing) {
      res.status(404).json({ message: "Service not found" });
      return;
    }
    const parsed = serviceSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
      return;
    }
    const service = await prisma.$transaction(async (tx) => {
      const updated = await tx.service.update({ where: { id: existing.id }, data: parsed.data });
      await writeAudit(tx, {
        tableName: "services",
        recordId: existing.id,
        action: "UPDATE",
        changedBy: req.user!.userId,
        oldValues: existing,
        newValues: updated,
      });
      return updated;
    });
    res.json(service);
  })
);

router.patch(
  "/me/services/:id/:action(activate|deactivate)",
  asyncHandler(async (req, res) => {
    const existing = await loadOwnedService(req.params.id, req.user!.userId);
    if (!existing) {
      res.status(404).json({ message: "Service not found" });
      return;
    }
    const isActive = req.params.action === "activate";
    const service = await prisma.$transaction(async (tx) => {
      const updated = await tx.service.update({ where: { id: existing.id }, data: { isActive } });
      await writeAudit(tx, {
        tableName: "services",
        recordId: existing.id,
        action: "UPDATE",
        changedBy: req.user!.userId,
        oldValues: { isActive: existing.isActive },
        newValues: { isActive },
      });
      return updated;
    });
    res.json(service);
  })
);

router.delete(
  "/me/services/:id",
  asyncHandler(async (req, res) => {
    const existing = await loadOwnedService(req.params.id, req.user!.userId);
    if (!existing) {
      res.status(404).json({ message: "Service not found" });
      return;
    }
    const hasBookings = await prisma.booking.findFirst({ where: { serviceId: existing.id } });
    if (hasBookings) {
      res.status(409).json({ message: "This service has booking history — deactivate it instead of deleting" });
      return;
    }
    await prisma.$transaction(async (tx) => {
      await tx.service.delete({ where: { id: existing.id } });
      await writeAudit(tx, {
        tableName: "services",
        recordId: existing.id,
        action: "DELETE",
        changedBy: req.user!.userId,
        oldValues: existing,
      });
    });
    res.status(204).send();
  })
);

// ---- Staff ----

router.get(
  "/me/staff",
  asyncHandler(async (req, res) => {
    const staff = await prisma.staffMember.findMany({
      where: { providerId: req.user!.userId },
      include: { staffServices: { include: { service: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(staff);
  })
);

const staffSchema = z.object({
  name: z.string().min(1),
  role: StaffRole,
  serviceIds: z.array(z.string()).min(1, "Select at least one service"),
});

async function assertOwnedServices(serviceIds: string[], providerId: string) {
  const owned = await prisma.service.findMany({ where: { id: { in: serviceIds }, providerId }, select: { id: true } });
  return owned.length === serviceIds.length;
}

router.post(
  "/me/staff",
  asyncHandler(async (req, res) => {
    const parsed = staffSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
      return;
    }
    const { name, role, serviceIds } = parsed.data;

    if (!(await assertOwnedServices(serviceIds, req.user!.userId))) {
      res.status(400).json({ message: "One or more services are invalid" });
      return;
    }

    const staff = await prisma.$transaction(async (tx) => {
      const created = await tx.staffMember.create({
        data: {
          name,
          role,
          providerId: req.user!.userId,
          staffServices: { create: serviceIds.map((serviceId) => ({ serviceId })) },
        },
        include: { staffServices: { include: { service: true } } },
      });
      await writeAudit(tx, {
        tableName: "staff_members",
        recordId: created.id,
        action: "INSERT",
        changedBy: req.user!.userId,
        newValues: created,
      });
      return created;
    });
    res.status(201).json(staff);
  })
);

async function loadOwnedStaffMember(id: string, providerId: string) {
  return prisma.staffMember.findFirst({ where: { id, providerId } });
}

router.put(
  "/me/staff/:id",
  asyncHandler(async (req, res) => {
    const existing = await loadOwnedStaffMember(req.params.id, req.user!.userId);
    if (!existing) {
      res.status(404).json({ message: "Staff member not found" });
      return;
    }
    const parsed = staffSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
      return;
    }
    const { name, role, serviceIds } = parsed.data;
    if (!(await assertOwnedServices(serviceIds, req.user!.userId))) {
      res.status(400).json({ message: "One or more services are invalid" });
      return;
    }

    const staff = await prisma.$transaction(async (tx) => {
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
        changedBy: req.user!.userId,
        oldValues: existing,
        newValues: updated,
      });
      return updated;
    });
    res.json(staff);
  })
);

router.patch(
  "/me/staff/:id/:action(activate|deactivate)",
  asyncHandler(async (req, res) => {
    const existing = await loadOwnedStaffMember(req.params.id, req.user!.userId);
    if (!existing) {
      res.status(404).json({ message: "Staff member not found" });
      return;
    }
    const isActive = req.params.action === "activate";
    const staff = await prisma.$transaction(async (tx) => {
      const updated = await tx.staffMember.update({ where: { id: existing.id }, data: { isActive } });
      await writeAudit(tx, {
        tableName: "staff_members",
        recordId: existing.id,
        action: "UPDATE",
        changedBy: req.user!.userId,
        oldValues: { isActive: existing.isActive },
        newValues: { isActive },
      });
      return updated;
    });
    res.json(staff);
  })
);

router.delete(
  "/me/staff/:id",
  asyncHandler(async (req, res) => {
    const existing = await loadOwnedStaffMember(req.params.id, req.user!.userId);
    if (!existing) {
      res.status(404).json({ message: "Staff member not found" });
      return;
    }
    const hasBookings = await prisma.booking.findFirst({ where: { staffId: existing.id } });
    if (hasBookings) {
      res.status(409).json({ message: "This staff member has booking history — deactivate instead of deleting" });
      return;
    }
    await prisma.$transaction(async (tx) => {
      await tx.staffMember.delete({ where: { id: existing.id } });
      await writeAudit(tx, {
        tableName: "staff_members",
        recordId: existing.id,
        action: "DELETE",
        changedBy: req.user!.userId,
        oldValues: existing,
      });
    });
    res.status(204).send();
  })
);

// ---- Slots ----

async function loadOwnedStaff(staffId: string, providerId: string) {
  return prisma.staffMember.findFirst({ where: { id: staffId, providerId } });
}

router.get(
  "/me/staff/:staffId/slots",
  asyncHandler(async (req, res) => {
    const staff = await loadOwnedStaff(req.params.staffId, req.user!.userId);
    if (!staff) {
      res.status(404).json({ message: "Staff member not found" });
      return;
    }
    const slots = await prisma.timeSlot.findMany({
      where: { staffId: staff.id, startDatetime: { gte: new Date() } },
      orderBy: { startDatetime: "asc" },
    });
    res.json(slots);
  })
);

const bulkSlotSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  dailyStart: z.string().regex(/^\d{2}:\d{2}$/),
  dailyEnd: z.string().regex(/^\d{2}:\d{2}$/),
  slotMinutes: z.number().int().positive(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).optional(),
});

router.post(
  "/me/staff/:staffId/slots",
  asyncHandler(async (req, res) => {
    const staff = await loadOwnedStaff(req.params.staffId, req.user!.userId);
    if (!staff) {
      res.status(404).json({ message: "Staff member not found" });
      return;
    }
    const parsed = bulkSlotSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
      return;
    }
    const { startDate, endDate, dailyStart, dailyEnd, slotMinutes, daysOfWeek } = parsed.data;
    const allowedDays = new Set(daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6]);

    const [startH, startM] = dailyStart.split(":").map(Number);
    const [endH, endM] = dailyEnd.split(":").map(Number);
    const dailyStartMinutes = startH * 60 + startM;
    const dailyEndMinutes = endH * 60 + endM;
    if (dailyEndMinutes <= dailyStartMinutes) {
      res.status(400).json({ message: "dailyEnd must be after dailyStart" });
      return;
    }

    const day = new Date(`${startDate}T00:00:00`);
    const last = new Date(`${endDate}T00:00:00`);
    if (last < day) {
      res.status(400).json({ message: "endDate must be on or after startDate" });
      return;
    }

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

    if (candidates.length === 0) {
      res.status(400).json({ message: "No slots would be generated for this range" });
      return;
    }

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

    res.status(201).json({ created: toCreate.length, skipped: candidates.length - toCreate.length });
  })
);

router.delete(
  "/me/slots/:slotId",
  asyncHandler(async (req, res) => {
    const slot = await prisma.timeSlot.findFirst({
      where: { id: req.params.slotId },
      include: { staff: true },
    });
    if (!slot || slot.staff.providerId !== req.user!.userId) {
      res.status(404).json({ message: "Slot not found" });
      return;
    }
    if (slot.status !== "AVAILABLE") {
      res.status(409).json({ message: "Only available slots can be removed" });
      return;
    }
    await prisma.timeSlot.delete({ where: { id: slot.id } });
    res.status(204).send();
  })
);

// A pet only becomes a "client" once an appointment with it has actually
// happened — matches the requested flow (client list populates after
// completion, not the moment a booking is made).
router.get(
  "/me/clients",
  asyncHandler(async (req, res) => {
    const bookings = await prisma.booking.findMany({
      where: { providerId: req.user!.userId, status: "COMPLETED" },
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

    res.json(Array.from(clientsByPet.values()));
  })
);

export default router;
