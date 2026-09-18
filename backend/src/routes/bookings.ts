import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { writeAudit } from "../lib/audit";
import { scheduleAppointmentReminders } from "../lib/notifications";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

const bookingInclude = {
  pet: true,
  service: true,
  staff: true,
  slot: true,
  // Never `include: { user: true }` here — that would serialize the user's
  // passwordHash straight into the API response. Select only what's needed.
  provider: { include: { user: { select: { id: true, name: true } } } },
};

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const where =
      req.user!.role === "PROVIDER"
        ? { providerId: req.user!.userId, ...(status ? { status } : {}) }
        : { petParentId: req.user!.userId, ...(status ? { status } : {}) };

    const bookings = await prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: { slot: { startDatetime: "asc" } },
    });
    res.json(bookings);
  })
);

const createBookingSchema = z.object({
  petId: z.string().min(1),
  serviceId: z.string().min(1),
  staffId: z.string().min(1),
  slotId: z.string().min(1),
});

class BookingError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

router.post(
  "/",
  requireAuth,
  requireRole("PET_PARENT"),
  asyncHandler(async (req, res) => {
    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
      return;
    }
    const { petId, serviceId, staffId, slotId } = parsed.data;
    const petParentId = req.user!.userId;

    try {
      const booking = await prisma.$transaction(async (tx) => {
        const pet = await tx.pet.findFirst({ where: { id: petId, ownerId: petParentId, deletedAt: null } });
        if (!pet) throw new BookingError(404, "Pet not found");

        const service = await tx.service.findFirst({ where: { id: serviceId, isActive: true } });
        if (!service) throw new BookingError(404, "Service not found");

        const staff = await tx.staffMember.findFirst({
          where: { id: staffId, providerId: service.providerId, isActive: true },
        });
        if (!staff) throw new BookingError(404, "Staff member not found");

        const qualified = await tx.staffService.findUnique({
          where: { staffId_serviceId: { staffId, serviceId } },
        });
        if (!qualified) throw new BookingError(400, "This staff member doesn't perform this service");

        const slot = await tx.timeSlot.findFirst({ where: { id: slotId, staffId } });
        if (!slot) throw new BookingError(404, "Time slot not found");
        if (slot.startDatetime < new Date()) throw new BookingError(400, "This slot is in the past");

        // Conditional update doubles as the double-booking guard: only one
        // concurrent request can flip AVAILABLE -> BOOKED for this row.
        const locked = await tx.timeSlot.updateMany({
          where: { id: slotId, status: "AVAILABLE" },
          data: { status: "BOOKED" },
        });
        if (locked.count === 0) throw new BookingError(409, "This slot was just booked by someone else");

        const created = await tx.booking.create({
          data: {
            petId,
            petParentId,
            providerId: service.providerId,
            serviceId,
            staffId,
            slotId,
          },
          include: bookingInclude,
        });

        await writeAudit(tx, {
          tableName: "bookings",
          recordId: created.id,
          action: "INSERT",
          changedBy: petParentId,
          newValues: created,
        });

        await scheduleAppointmentReminders(tx, {
          petParentId,
          providerId: service.providerId,
          appointmentStart: slot.startDatetime,
          payload: {
            bookingId: created.id,
            petName: pet.name,
            serviceName: service.name,
            providerName: created.provider.user.name,
            startDatetime: slot.startDatetime,
          },
        });

        return created;
      });

      res.status(201).json(booking);
    } catch (err) {
      if (err instanceof BookingError) {
        res.status(err.status).json({ message: err.message });
        return;
      }
      throw err;
    }
  })
);

export default router;
