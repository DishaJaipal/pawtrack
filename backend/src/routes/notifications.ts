import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

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
