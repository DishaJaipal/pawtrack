import type { Prisma, PrismaClient } from "@prisma/client";

type TxClient = PrismaClient | Prisma.TransactionClient;

// Reminders are created at booking time but stay invisible (sentAt null)
// until their scheduledFor passes — the cron in cron.ts flips sentAt, which
// is what makes them show up in GET /api/notifications. Firing at 8am local
// on the appointment's own calendar date is what makes this a "day of"
// reminder rather than an immediate "booking created" notice.
export async function scheduleAppointmentReminders(
  tx: TxClient,
  params: {
    petParentId: string;
    providerId: string;
    appointmentStart: Date;
    payload: Record<string, unknown>;
  }
) {
  const reminderAt = new Date(params.appointmentStart);
  reminderAt.setHours(8, 0, 0, 0);

  const payload = JSON.stringify(params.payload);
  await tx.notification.createMany({
    data: [
      { userId: params.petParentId, type: "BOOKING_REMINDER", payload, scheduledFor: reminderAt },
      { userId: params.providerId, type: "BOOKING_REMINDER", payload, scheduledFor: reminderAt },
    ],
  });
}
