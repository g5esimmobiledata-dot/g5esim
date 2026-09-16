import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

// =========================
// Upload Directory
// =========================
const uploadDir = path.join(process.cwd(), "uploads", "kyc");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// =========================
// Multer Storage
// =========================
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// =========================
// Optional: File Filter
// =========================
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, and PDF files are allowed"));
  }

  cb(null, true);
};

// =========================
// Multer Instance
// =========================
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter,
});
