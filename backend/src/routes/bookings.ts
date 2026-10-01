import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import * as bookingsService from "../services/bookings.service";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const bookings = await bookingsService.listBookings(req.user!.userId, req.user!.role, status);
    res.json(bookings);
  })
);

router.post(
  "/",
  requireAuth,
  requireRole("PET_PARENT"),
  asyncHandler(async (req, res) => {
    const parsed = bookingsService.createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
      return;
    }
    const booking = await bookingsService.createBooking(req.user!.userId, parsed.data);
    res.status(201).json(booking);
  })
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const booking = await bookingsService.getBookingById(req.params.id, req.user!.userId);
    res.json(booking);
  })
);

router.patch(
  "/:id/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    const updated = await bookingsService.cancelBooking(req.params.id, req.user!.userId);
    res.json(updated);
  })
);

router.patch(
  "/:id/reschedule",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = bookingsService.rescheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input" });
      return;
    }
    const updated = await bookingsService.rescheduleBooking(req.params.id, req.user!.userId, parsed.data.newSlotId);
    res.json(updated);
  })
);

router.patch(
  "/:id/complete",
  requireAuth,
  requireRole("PROVIDER"),
  asyncHandler(async (req, res) => {
    const updated = await bookingsService.completeBooking(req.params.id, req.user!.userId);
    res.json(updated);
  })
);

export default router;
