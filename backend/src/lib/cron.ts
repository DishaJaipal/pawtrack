import cron from "node-cron";
import { prisma } from "./prisma";
import { pushToUser } from "./sse";

// Runs every 5 minutes, delivering any notification whose scheduledFor has
// arrived (sentAt is what GET /api/notifications checks to decide what's
// visible) and pushing it over SSE to anyone with the app open right now —
// this is what turns a "day of" or "2 hours before" reminder, created back
// at booking time, into something that actually appears on schedule.
export function startNotificationCron() {
  cron.schedule("*/5 * * * *", async () => {
    const due = await prisma.notification.findMany({
      where: { scheduledFor: { lte: new Date() }, sentAt: null },
    });
    if (due.length === 0) return;

    for (const notification of due) {
      await prisma.notification.update({ where: { id: notification.id }, data: { sentAt: new Date() } });
      pushToUser(notification.userId, {
        ...notification,
        payload: notification.payload ? JSON.parse(notification.payload) : null,
      });
    }
    console.log(`[cron] delivered ${due.length} due notification(s)`);
  });
}
