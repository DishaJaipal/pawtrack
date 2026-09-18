import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { startNotificationCron } from "./lib/cron";
import authRouter from "./routes/auth";
import bookingsRouter from "./routes/bookings";
import notificationsRouter from "./routes/notifications";
import petsRouter from "./routes/pets";
import providersRouter from "./routes/providers";
import referenceRouter from "./routes/reference";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/pets", petsRouter);
app.use("/api/providers", providersRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api", referenceRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError || (err instanceof Error && err.message.includes("Unsupported file type"))) {
    res.status(400).json({ message: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

const port = process.env.PORT ?? 4000;
app.listen(port, () => {
  console.log(`PawTrack API listening on port ${port}`);
});

startNotificationCron();
