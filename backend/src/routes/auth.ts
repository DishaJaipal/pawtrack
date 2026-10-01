import type { Response } from "express";
import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import * as authService from "../services/auth.service";

const router = Router();

// Frontend and backend sit on different domains in production (e.g. Vercel +
// Render), so the auth cookie needs SameSite=None to be sent on cross-site
// fetch calls — which browsers only allow when Secure is also set. Locally,
// both run on localhost so Lax (and no HTTPS) works fine.
const isProd = process.env.NODE_ENV === "production";
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: (isProd ? "none" : "lax") as "none" | "lax",
  secure: isProd,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

function setAuthCookie(res: Response, token: string) {
  res.cookie("token", token, COOKIE_OPTIONS);
}

router.post("/register", asyncHandler(async (req, res) => {
  const parsed = authService.registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
    return;
  }
  const { user, profile, token } = await authService.registerUser(parsed.data);
  setAuthCookie(res, token);
  res.status(201).json({ user, profile });
}));

router.post("/login", asyncHandler(async (req, res) => {
  const parsed = authService.loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }
  const { user, profile, token } = await authService.loginUser(parsed.data.email, parsed.data.password);
  setAuthCookie(res, token);
  res.json({ user, profile });
}));

router.post("/logout", (_req, res) => {
  res.clearCookie("token", { ...COOKIE_OPTIONS, maxAge: undefined });
  res.status(204).send();
});

router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const { user, profile } = await authService.getCurrentUser(req.user!.userId);
  res.json({ user, profile });
}));

router.patch("/me", requireAuth, asyncHandler(async (req, res) => {
  const parsed = authService.updateMeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });
    return;
  }
  const { user, profile } = await authService.updateCurrentUser(req.user!.userId, req.user!.role, parsed.data);
  res.json({ user, profile });
}));

router.delete("/me", requireAuth, asyncHandler(async (req, res) => {
  await authService.deleteCurrentUser(req.user!.userId);
  res.clearCookie("token", { ...COOKIE_OPTIONS, maxAge: undefined });
  res.status(204).send();
}));

export default router;
