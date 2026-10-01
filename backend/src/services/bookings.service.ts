import { z } from "zod";
import { writeAudit } from "../lib/audit";
import { HttpError } from "../lib/httpError";
import { notifyNow, scheduleAppointmentReminders } from "../lib/notifications";
import { prisma } from "../lib/prisma";

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

export const createBookingSchema = z.object({
  petId: z.string().min(1),
  serviceId: z.string().min(1),
  staffId: z.string().min(1),
  slotId: z.string().min(1),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const rescheduleSchema = z.object({ newSlotId: z.string().min(1) });

export async function listBookings(userId: string, role: "PET_PARENT" | "PROVIDER", status?: string) {
  const where =
    role === "PROVIDER"
      ? { providerId: userId, ...(status ? { status } : {}) }
      : { petParentId: userId, ...(status ? { status } : {}) };

  return prisma.booking.findMany({
    where,
    include: bookingInclude,
    orderBy: { slot: { startDatetime: "asc" } },
  });
}

export async function createBooking(petParentId: string, input: CreateBookingInput) {
  const { petId, serviceId, staffId, slotId } = input;

  return prisma.$transaction(async (tx) => {
    const pet = await tx.pet.findFirst({ where: { id: petId, ownerId: petParentId, deletedAt: null } });
    if (!pet) throw new HttpError(404, "Pet not found");

    const service = await tx.service.findFirst({ where: { id: serviceId, isActive: true } });
    if (!service) throw new HttpError(404, "Service not found");

    const staff = await tx.staffMember.findFirst({
      where: { id: staffId, providerId: service.providerId, isActive: true },
    });
    if (!staff) throw new HttpError(404, "Staff member not found");

    const qualified = await tx.staffService.findUnique({
      where: { staffId_serviceId: { staffId, serviceId } },
    });
    if (!qualified) throw new HttpError(400, "This staff member doesn't perform this service");

    const slot = await tx.timeSlot.findFirst({ where: { id: slotId, staffId } });
    if (!slot) throw new HttpError(404, "Time slot not found");
    if (slot.startDatetime < new Date()) throw new HttpError(400, "This slot is in the past");

    // Conditional update doubles as the double-booking guard: only one
    // concurrent request can flip AVAILABLE -> BOOKED for this row.
    const locked = await tx.timeSlot.updateMany({
      where: { id: slotId, status: "AVAILABLE" },
      data: { status: "BOOKED" },
    });
    if (locked.count === 0) throw new HttpError(409, "This slot was just booked by someone else");

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
}

async function loadParticipantBooking(id: string, userId: string) {
  return prisma.booking.findFirst({
    where: { id, OR: [{ petParentId: userId }, { providerId: userId }] },
    include: bookingInclude,
  });
}

export async function getBookingById(id: string, userId: string) {
  const booking = await prisma.booking.findFirst({
    where: { id, OR: [{ petParentId: userId }, { providerId: userId }] },
    include: {
      ...bookingInclude,
      petParent: { include: { user: { select: { id: true, name: true, email: true } } } },
      // Records made during this specific visit — same underlying table as
      // the pet's full history, just filtered down to this one booking's id.
      records: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!booking) throw new HttpError(404, "Appointment not found");
  return booking;
}

export async function cancelBooking(id: string, userId: string) {
  const booking = await loadParticipantBooking(id, userId);
  if (!booking) throw new HttpError(404, "Appointment not found");
  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    throw new HttpError(409, "This appointment can't be cancelled anymore");
  }

  return prisma.$transaction(async (tx) => {
    await tx.timeSlot.update({ where: { id: booking.slotId }, data: { status: "AVAILABLE" } });
    const result = await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", updatedByUserId: userId },
      include: bookingInclude,
    });
    await writeAudit(tx, {
      tableName: "bookings",
      recordId: booking.id,
      action: "UPDATE",
      changedBy: userId,
      oldValues: { status: booking.status },
      newValues: { status: "CANCELLED" },
    });

    // Cancelling updates the one shared booking row, so both sides already
    // see the new status on next load — this just pushes it to the *other*
    // party immediately if they have a tab open right now.
    const otherPartyId = userId === booking.petParentId ? booking.providerId : booking.petParentId;
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
}

export async function rescheduleBooking(id: string, userId: string, newSlotId: string) {
  const booking = await loadParticipantBooking(id, userId);
  if (!booking) throw new HttpError(404, "Appointment not found");
  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    throw new HttpError(409, "This appointment can't be rescheduled anymore");
  }

  return prisma.$transaction(async (tx) => {
    const newSlot = await tx.timeSlot.findFirst({ where: { id: newSlotId, staffId: booking.staffId } });
    if (!newSlot) throw new HttpError(404, "Time slot not found");
    if (newSlot.startDatetime < new Date()) throw new HttpError(400, "This slot is in the past");

    const locked = await tx.timeSlot.updateMany({
      where: { id: newSlotId, status: "AVAILABLE" },
      data: { status: "BOOKED" },
    });
    if (locked.count === 0) throw new HttpError(409, "That slot was just booked by someone else");

    await tx.timeSlot.update({ where: { id: booking.slotId }, data: { status: "AVAILABLE" } });

    const result = await tx.booking.update({
      where: { id: booking.id },
      data: { slotId: newSlotId, updatedByUserId: userId },
      include: bookingInclude,
    });

    await writeAudit(tx, {
      tableName: "bookings",
      recordId: booking.id,
      action: "UPDATE",
      changedBy: userId,
      oldValues: { slotId: booking.slotId },
      newValues: { slotId: newSlotId },
    });

    const otherPartyId = userId === booking.petParentId ? booking.providerId : booking.petParentId;
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
}

export async function completeBooking(id: string, providerId: string) {
  const booking = await prisma.booking.findFirst({ where: { id, providerId } });
  if (!booking) throw new HttpError(404, "Appointment not found");
  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
    throw new HttpError(409, "This appointment is already closed out");
  }

  return prisma.$transaction(async (tx) => {
    const result = await tx.booking.update({
      where: { id: booking.id },
      data: { status: "COMPLETED", updatedByUserId: providerId },
      include: bookingInclude,
    });
    await writeAudit(tx, {
      tableName: "bookings",
      recordId: booking.id,
      action: "UPDATE",
      changedBy: providerId,
      oldValues: { status: booking.status },
      newValues: { status: "COMPLETED" },
    });
    return result;
  });
}
