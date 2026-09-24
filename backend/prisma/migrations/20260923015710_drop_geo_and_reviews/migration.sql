-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_bookings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pet_id" TEXT NOT NULL,
    "pet_parent_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "slot_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "updated_by_user_id" TEXT,
    CONSTRAINT "bookings_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bookings_pet_parent_id_fkey" FOREIGN KEY ("pet_parent_id") REFERENCES "pet_parent_profiles" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bookings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "provider_profiles" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bookings_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_members" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bookings_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "time_slots" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bookings_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_bookings" ("created_at", "id", "pet_id", "pet_parent_id", "provider_id", "service_id", "slot_id", "staff_id", "status", "updated_at", "updated_by_user_id") SELECT "created_at", "id", "pet_id", "pet_parent_id", "provider_id", "service_id", "slot_id", "staff_id", "status", "updated_at", "updated_by_user_id" FROM "bookings";
DROP TABLE "bookings";
ALTER TABLE "new_bookings" RENAME TO "bookings";
CREATE INDEX "bookings_pet_parent_id_status_idx" ON "bookings"("pet_parent_id", "status");
CREATE INDEX "bookings_provider_id_status_idx" ON "bookings"("provider_id", "status");
CREATE INDEX "bookings_pet_id_idx" ON "bookings"("pet_id");
CREATE TABLE "new_provider_profiles" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "provider_type" TEXT NOT NULL,
    "phone_no" TEXT,
    "address" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "provider_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_provider_profiles" ("address", "created_at", "phone_no", "provider_type", "updated_at", "user_id") SELECT "address", "created_at", "phone_no", "provider_type", "updated_at", "user_id" FROM "provider_profiles";
DROP TABLE "provider_profiles";
ALTER TABLE "new_provider_profiles" RENAME TO "provider_profiles";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

