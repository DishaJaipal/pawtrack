import { HttpError } from "../lib/httpError";
import { prisma } from "../lib/prisma";

function withParsedPayload<T extends { payload: string | null }>(notification: T) {
  return { ...notification, payload: notification.payload ? JSON.parse(notification.payload) : null };
}

export async function listNotifications(userId: string) {
  // No separate background job: whoever happens to poll delivers their
  // own due reminders right here, the moment they ask — flip sentAt on
  // anything of theirs whose scheduledFor has passed, then read the list.
  await prisma.notification.updateMany({
    where: { userId, scheduledFor: { lte: new Date() }, sentAt: null },
    data: { sentAt: new Date() },
  });

  const notifications = await prisma.notification.findMany({
    where: { userId, sentAt: { not: null } },
    orderBy: { sentAt: "desc" },
    take: 50,
  });
  return notifications.map(withParsedPayload);
}

export async function markNotificationRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!notification) throw new HttpError(404, "Notification not found");

  const updated = await prisma.notification.update({ where: { id: notification.id }, data: { isRead: true } });
  return withParsedPayload(updated);
}
