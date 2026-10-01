import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import * as providersService from "../services/providers.service";

const router = Router();

// ---- Public discovery (no auth) — registered before the requireAuth
// middleware below, which Express only applies to routes registered after
// it on this router, so these stay public while /me/* stays protected. ----

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : undefined;
    // Plain substring match on the address field — no distance search.
    const location = typeof req.query.location === "string" ? req.query.location.trim().toLowerCase() : undefined;
    const results = await providersService.searchProviders({ category, search, location });
    res.json(results);
  })
);

router.get(
  "/:providerId",
  asyncHandler(async (req, res) => {
    const provider = await providersService.getProviderProfile(req.params.providerId);
    res.json(provider);
  })
);

router.get(
  "/:providerId/services/:serviceId/slots",
  asyncHandler(async (req, res) => {
    const slots = await providersService.listPublicSlots(req.params.providerId, req.params.serviceId);
    res.json(slots);
  })
);

router.use(requireAuth, requireRole("PROVIDER"));

// ---- Services ----

router.get(
  "/me/services",
  asyncHandler(async (req, res) => {
    const services = await providersService.listMyServices(req.user!.userId);
    res.json(services);
  })
);

router.post(
  "/me/services",
  asyncHandler(async (req, res) => {
    const parsed = providersService.serviceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
      return;
    }
    const service = await providersService.createService(req.user!.userId, parsed.data);
    res.status(201).json(service);
  })
);

router.put(
  "/me/services/:id",
  asyncHandler(async (req, res) => {
    const parsed = providersService.serviceSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
      return;
    }
    const service = await providersService.updateService(req.params.id, req.user!.userId, parsed.data);
    res.json(service);
  })
);

router.patch(
  "/me/services/:id/:action(activate|deactivate)",
  asyncHandler(async (req, res) => {
    const isActive = req.params.action === "activate";
    const service = await providersService.setServiceActive(req.params.id, req.user!.userId, isActive);
    res.json(service);
  })
);

router.delete(
  "/me/services/:id",
  asyncHandler(async (req, res) => {
    await providersService.deleteService(req.params.id, req.user!.userId);
    res.status(204).send();
  })
);

// ---- Staff ----

router.get(
  "/me/staff",
  asyncHandler(async (req, res) => {
    const staff = await providersService.listMyStaff(req.user!.userId);
    res.json(staff);
  })
);

router.post(
  "/me/staff",
  asyncHandler(async (req, res) => {
    const parsed = providersService.staffSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
      return;
    }
    const staff = await providersService.createStaffMember(req.user!.userId, parsed.data);
    res.status(201).json(staff);
  })
);

router.put(
  "/me/staff/:id",
  asyncHandler(async (req, res) => {
    const parsed = providersService.staffSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
      return;
    }
    const staff = await providersService.updateStaffMember(req.params.id, req.user!.userId, parsed.data);
    res.json(staff);
  })
);

router.patch(
  "/me/staff/:id/:action(activate|deactivate)",
  asyncHandler(async (req, res) => {
    const isActive = req.params.action === "activate";
    const staff = await providersService.setStaffActive(req.params.id, req.user!.userId, isActive);
    res.json(staff);
  })
);

router.delete(
  "/me/staff/:id",
  asyncHandler(async (req, res) => {
    await providersService.deleteStaffMember(req.params.id, req.user!.userId);
    res.status(204).send();
  })
);

// ---- Slots ----

router.get(
  "/me/staff/:staffId/slots",
  asyncHandler(async (req, res) => {
    const slots = await providersService.listStaffSlots(req.params.staffId, req.user!.userId);
    res.json(slots);
  })
);

router.post(
  "/me/staff/:staffId/slots",
  asyncHandler(async (req, res) => {
    const parsed = providersService.bulkSlotSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
      return;
    }
    const result = await providersService.createSlotsInBulk(req.params.staffId, req.user!.userId, parsed.data);
    res.status(201).json(result);
  })
);

router.delete(
  "/me/slots/:slotId",
  asyncHandler(async (req, res) => {
    await providersService.deleteSlot(req.params.slotId, req.user!.userId);
    res.status(204).send();
  })
);

router.get(
  "/me/clients",
  asyncHandler(async (req, res) => {
    const clients = await providersService.listMyClients(req.user!.userId);
    res.json(clients);
  })
);

export default router;
