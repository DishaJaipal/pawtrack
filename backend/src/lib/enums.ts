// SQLite has no native enum type — these are the allowed values for the
// String columns that were Postgres enums in the original DDL, enforced
// here with zod at the API boundary instead of by the database.
import { z } from "zod";

export const UserRole = z.enum(["PET_PARENT", "PROVIDER"]);
export const ProviderType = z.enum([
  "VET_CLINIC",
  "INDEPENDENT_VET",
  "GROOMER",
  "TRAINER",
  "PET_SITTER",
]);
export const StaffRole = z.enum([
  "VET",
  "GROOMER",
  "TRAINER",
  "ASSISTANT",
  "RECEPTIONIST",
]);
export const ServiceCategory = z.enum([
  "CHECKUP",
  "VACCINATION",
  "SURGERY",
  "GROOMING",
  "BOARDING",
  "TRAINING",
  "EMERGENCY",
]);
export const SlotStatus = z.enum(["AVAILABLE", "BOOKED", "BLOCKED"]);
export const BookingStatus = z.enum([
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
]);
export const RecordType = z.enum([
  "VACCINATION",
  "DEWORMING",
  "LAB_RESULT",
  "PRESCRIPTION",
  "VISIT_SUMMARY",
  "IMAGING",
  "OTHER",
]);
export const NotificationType = z.enum([
  "BOOKING_REMINDER",
  "BOOKING_STATUS",
  "RECORD_UPLOADED",
  "COMMUNITY_REPLY",
  "SYSTEM",
]);
