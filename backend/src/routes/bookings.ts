import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { writeAudit } from "../lib/audit";
import { notifyNow, scheduleAppointmentReminders } from "../lib/notifications";
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
  // Who last touched this booking (e.g. who cancelled it) — set on
  // cancel/reschedule below. Null until the booking is first modified.
  updatedByUser: { select: { id: true, name: true, role: true } },
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

        const reminderPayload = {
          bookingId: created.id,
          petName: pet.name,
          serviceName: service.name,
          providerName: created.provider.user.name,
          startDatetime: slot.startDatetime,
        };

        await scheduleAppointmentReminders(tx, {
          petParentId,
          providerId: service.providerId,
          appointmentStart: slot.startDatetime,
          payload: reminderPayload,
        });

        await notifyNow(tx, {
          userId: service.providerId,
          type: "BOOKING_STATUS",
          payload: { ...reminderPayload, message: `New booking: ${pet.name} for ${service.name}` },
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

async function loadParticipantBooking(id: string, userId: string) {
  return prisma.booking.findFirst({
    where: { id, OR: [{ petParentId: userId }, { providerId: userId }] },
    include: bookingInclude,
  });
}

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, OR: [{ petParentId: req.user!.userId }, { providerId: req.user!.userId }] },
      include: {
        ...bookingInclude,
        petParent: { include: { user: { select: { id: true, name: true, email: true } } } },
        // Records made during this specific visit — same underlying table as
        // the pet's full history, just filtered down to this one booking's id.
        records: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!booking) {
      res.status(404).json({ message: "Appointment not found" });
      return;
    }
    res.json(booking);
  })
);

router.patch(
  "/:id/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    const booking = await loadParticipantBooking(req.params.id, req.user!.userId);
    if (!booking) {
      res.status(404).json({ message: "Appointment not found" });
      return;
    }
    if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
      res.status(409).json({ message: "This appointment can't be cancelled anymore" });
      return;
    }
    const updated = await prisma.$transaction(async (tx) => {
      await tx.timeSlot.update({ where: { id: booking.slotId }, data: { status: "AVAILABLE" } });
      const result = await tx.booking.update({
        where: { id: booking.id },
        data: { status: "CANCELLED", updatedByUserId: req.user!.userId },
        include: bookingInclude,
      });
      await writeAudit(tx, {
        tableName: "bookings",
        recordId: booking.id,
        action: "UPDATE",
        changedBy: req.user!.userId,
        oldValues: { status: booking.status },
        newValues: { status: "CANCELLED" },
      });

      // Cancelling updates the one shared booking row, so both sides already
      // see the new status on next load — this just pushes it to the *other*
      // party immediately if they have a tab open right now.
      const otherPartyId = req.user!.userId === booking.petParentId ? booking.providerId : booking.petParentId;
      await notifyNow(tx, {
        userId: otherPartyId,
        type: "BOOKING_STATUS",
        payload: {
          bookingId: booking.id,
          petName: result.pet.name,
          serviceName: result.service.name,
          cancelledByName: result.updatedByUser?.name,
          message: `${result.updatedByUser?.name ?? "Someone"} cancelled the ${result.service.name} appointment for ${result.pet.name}`,
        },
      });

      return result;
    });
    res.json(updated);
  })
);

const rescheduleSchema = z.object({ newSlotId: z.string().min(1) });

router.patch(
  "/:id/reschedule",
  requireAuth,
  asyncHandler(async (req, res) => {
    const booking = await loadParticipantBooking(req.params.id, req.user!.userId);
    if (!booking) {
      res.status(404).json({ message: "Appointment not found" });
      return;
    }
    if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
      res.status(409).json({ message: "This appointment can't be rescheduled anymore" });
      return;
    }
    const parsed = rescheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input" });
      return;
    }
    const { newSlotId } = parsed.data;

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const newSlot = await tx.timeSlot.findFirst({ where: { id: newSlotId, staffId: booking.staffId } });
        if (!newSlot) throw new BookingError(404, "Time slot not found");
        if (newSlot.startDatetime < new Date()) throw new BookingError(400, "This slot is in the past");

        const locked = await tx.timeSlot.updateMany({
          where: { id: newSlotId, status: "AVAILABLE" },
          data: { status: "BOOKED" },
        });
        if (locked.count === 0) throw new BookingError(409, "That slot was just booked by someone else");

        await tx.timeSlot.update({ where: { id: booking.slotId }, data: { status: "AVAILABLE" } });

        const result = await tx.booking.update({
          where: { id: booking.id },
          data: { slotId: newSlotId, updatedByUserId: req.user!.userId },
          include: bookingInclude,
        });

        await writeAudit(tx, {
          tableName: "bookings",
          recordId: booking.id,
          action: "UPDATE",
          changedBy: req.user!.userId,
          oldValues: { slotId: booking.slotId },
          newValues: { slotId: newSlotId },
        });

        const otherPartyId = req.user!.userId === booking.petParentId ? booking.providerId : booking.petParentId;
        await notifyNow(tx, {
          userId: otherPartyId,
          type: "BOOKING_STATUS",
          payload: {
            bookingId: booking.id,
            petName: result.pet.name,
            serviceName: result.service.name,
            startDatetime: newSlot.startDatetime,
            message: `${result.updatedByUser?.name ?? "Someone"} rescheduled the ${result.service.name} appointment for ${result.pet.name}`,
          },
        });

        return result;
      });
      res.json(updated);
    } catch (err) {
      if (err instanceof BookingError) {
        res.status(err.status).json({ message: err.message });
        return;
      }
      throw err;
    }
  })
);

router.patch(
  "/:id/complete",
  requireAuth,
  requireRole("PROVIDER"),
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findFirst({ where: { id: req.params.id, providerId: req.user!.userId } });
    if (!booking) {
      res.status(404).json({ message: "Appointment not found" });
      return;
    }
    if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
      res.status(409).json({ message: "This appointment is already closed out" });
      return;
    }
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.booking.update({
        where: { id: booking.id },
        data: { status: "COMPLETED", updatedByUserId: req.user!.userId },
        include: bookingInclude,
      });
      await writeAudit(tx, {
        tableName: "bookings",
        recordId: booking.id,
        action: "UPDATE",
        changedBy: req.user!.userId,
        oldValues: { status: booking.status },
        newValues: { status: "COMPLETED" },
      });
      return result;
    });
    res.json(updated);
  })
);

export default router;
