import type { Prisma, PrismaClient } from "@prisma/client";

type TxClient = PrismaClient | Prisma.TransactionClient;

// Reminders are created at booking time but stay invisible (sentAt null)
// until their scheduledFor passes — GET /api/notifications flips sentAt on
// any of the requesting user's due rows the moment they next poll, which is
// what makes them show up. Two are scheduled per side: one at 8am on the
// appointment's own calendar date ("day of"), one 2 hours before the actual
// start time.
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
// booking/record upload) — writes the notification already marked "sent".
// That's the entire job: the affected user's next poll (within ~20s) picks
// it up via the ordinary GET /api/notifications fetch, same as any other
// notification.
export async function notifyNow(
  tx: TxClient,
  params: { userId: string; type: string; payload: Record<string, unknown> }
) {
  await tx.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      payload: JSON.stringify(params.payload),
      sentAt: new Date(),
    },
  });
}
