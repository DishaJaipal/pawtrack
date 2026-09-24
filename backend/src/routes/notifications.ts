import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { prisma } from "../lib/prisma";
import { addClient, removeClient } from "../lib/sse";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Kept open indefinitely — the response is never ended. The browser's
// EventSource reconnects on its own if this drops, so a missed push just
// means the next GET / (page load) picks up whatever was missed anyway.
router.get("/stream", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  const userId = req.user!.userId;
  addClient(userId, res);

  const heartbeat = setInterval(() => res.write(":\n\n"), 20000);
  req.on("close", () => {
    clearInterval(heartbeat);
    removeClient(userId, res);
  });
});

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
