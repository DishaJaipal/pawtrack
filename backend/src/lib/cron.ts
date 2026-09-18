import cron from "node-cron";
import { prisma } from "./prisma";

// Runs every 15 minutes, delivering any notification whose scheduledFor has
// arrived (sentAt is what GET /api/notifications checks to decide what's
// visible). This is the mechanism that turns a booking-time-created "day of"
// reminder into something that actually appears on the day of.
export function startNotificationCron() {
  cron.schedule("*/15 * * * *", async () => {
    const due = await prisma.notification.updateMany({
      where: { scheduledFor: { lte: new Date() }, sentAt: null },
      data: { sentAt: new Date() },
    });
    if (due.count > 0) {
      console.log(`[cron] delivered ${due.count} due notification(s)`);
    }
  });
}
