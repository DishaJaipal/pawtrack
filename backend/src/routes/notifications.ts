import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    // Only notifications whose scheduledFor has passed (sentAt set by the
    // cron in cron.ts) are visible — one still waiting for its "day of" is
    // not shown yet.
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId, sentAt: { not: null } },
      orderBy: { sentAt: "desc" },
      take: 50,
    });
    res.json(
      notifications.map((n) => ({ ...n, payload: n.payload ? JSON.parse(n.payload) : null }))
    );
  })
);

router.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!notification) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }
    const updated = await prisma.notification.update({ where: { id: notification.id }, data: { isRead: true } });
    res.json({ ...updated, payload: updated.payload ? JSON.parse(updated.payload) : null });
  })
);

export default router;
