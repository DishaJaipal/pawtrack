import crypto from "crypto";
import fs from "fs";
import multer from "multer";
import path from "path";

// Files live outside any statically-served directory — the only way to read
// one back is the authenticated /api/pets/records/:id/file route, which
// checks pet ownership before streaming it. No public bucket, no signed URLs
// needed yet since everything is same-origin for now.
const UPLOAD_ROOT = path.join(__dirname, "..", "..", "uploads");

function ensureUploadDir(petId: string) {
  const dir = path.join(UPLOAD_ROOT, petId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    cb(null, ensureUploadDir(req.params.petId));
  },
  filename: (_req, file, cb) => {
    cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`);
  },
});

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/heic", "application/pdf"]);

export const uploadRecordFile = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error("Unsupported file type — use an image or PDF"));
  },
});

export function absolutePathForRecord(petId: string, storedFilename: string) {
  return path.join(UPLOAD_ROOT, petId, storedFilename);
}
