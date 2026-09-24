import type { Prisma, PrismaClient } from "@prisma/client";
import { pushToUser } from "./sse";

type TxClient = PrismaClient | Prisma.TransactionClient;

// Reminders are created at booking time but stay invisible (sentAt null)
// until their scheduledFor passes — the cron in cron.ts flips sentAt, which
// is what makes them show up in GET /api/notifications. Two are scheduled
// per side: one at 8am on the appointment's own calendar date ("day of"),
// one 2 hours before the actual start time.
export async function scheduleAppointmentReminders(
  tx: TxClient,
  params: {
    petParentId: string;
    providerId: string;
    appointmentStart: Date;
    payload: Record<string, unknown>;
  }
) {
  const dayOf = new Date(params.appointmentStart);
  dayOf.setHours(8, 0, 0, 0);

  const twoHoursBefore = new Date(params.appointmentStart.getTime() - 2 * 60 * 60 * 1000);

  const payload = JSON.stringify(params.payload);
  await tx.notification.createMany({
    data: [
      { userId: params.petParentId, type: "BOOKING_REMINDER", payload, scheduledFor: dayOf },
      { userId: params.providerId, type: "BOOKING_REMINDER", payload, scheduledFor: dayOf },
      { userId: params.petParentId, type: "BOOKING_REMINDER", payload, scheduledFor: twoHoursBefore },
      { userId: params.providerId, type: "BOOKING_REMINDER", payload, scheduledFor: twoHoursBefore },
    ],
  });
}

// For anything that should show up right away (cancel/reschedule/new
// booking/record upload) — writes the notification as already "sent" and
// pushes it over SSE to that user's open tabs, if any. No queue, no
// polling delay: this is called directly from the route handler that
// caused the event, in the same request.
export async function notifyNow(
  tx: TxClient,
  params: { userId: string; type: string; payload: Record<string, unknown> }
) {
  const notification = await tx.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      payload: JSON.stringify(params.payload),
      sentAt: new Date(),
    },
  });
  pushToUser(params.userId, { ...notification, payload: params.payload });
}
