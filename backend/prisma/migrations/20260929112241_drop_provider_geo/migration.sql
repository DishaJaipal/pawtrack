-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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

