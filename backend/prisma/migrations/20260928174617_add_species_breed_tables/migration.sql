-- CreateTable
CREATE TABLE "species" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "breeds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "species_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "breeds_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_pets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "breed" TEXT,
    "dob" DATETIME,
    "age_months" INTEGER,
    "weight_kg" REAL,
    "gender" TEXT,
    "alerts" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "pets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "pet_parent_profiles" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_pets" ("alerts", "breed", "created_at", "deleted_at", "dob", "gender", "id", "name", "owner_id", "species", "updated_at", "weight_kg") SELECT "alerts", "breed", "created_at", "deleted_at", "dob", "gender", "id", "name", "owner_id", "species", "updated_at", "weight_kg" FROM "pets";
DROP TABLE "pets";
ALTER TABLE "new_pets" RENAME TO "pets";
CREATE INDEX "pets_owner_id_idx" ON "pets"("owner_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "species_name_key" ON "species"("name");

-- CreateIndex
CREATE UNIQUE INDEX "breeds_species_id_name_key" ON "breeds"("species_id", "name");

