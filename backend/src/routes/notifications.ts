import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import * as notificationsService from "../services/notifications.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const notifications = await notificationsService.listNotifications(req.user!.userId);
    res.json(notifications);
  })
);

router.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const notification = await notificationsService.markNotificationRead(req.params.id, req.user!.userId);
    res.json(notification);
  })
);

export default router;
