import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { requireAuthOrAdmin } from "../lib/middleware";

const router = Router();

const uploadDir = path.join(process.cwd(), "uploads", "general");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

const imageUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error("Only image files are allowed"));
      return;
    }

    cb(null, true);
  },
});

router.post("/", requireAuthOrAdmin, (req: Request, res: Response) => {
  imageUpload.single("image")(req, res, (error: any) => {
    if (error) {
      const message =
        error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
          ? "Image must be 10MB or smaller"
          : error.message || "Failed to upload image";

      return res.status(400).json({
        success: false,
        message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    const fileUrl = `/uploads/general/${req.file.filename}`;

    return res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      fileUrl,
      data: {
        fileUrl,
      },
    });
  });
});

export default router;
