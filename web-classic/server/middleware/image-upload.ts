import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

const uploadsDir = path.join(process.cwd(), "uploads");
const regionsDir = path.join(uploadsDir, "regions");
const countriesDir = path.join(uploadsDir, "countries");
const profilesDir = path.join(uploadsDir, "profiles");
const resellerLogosDir = path.join(uploadsDir, "reseller-logos");

if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
}

if (!fs.existsSync(resellerLogosDir)) {
  fs.mkdirSync(resellerLogosDir, { recursive: true });
}

if (!fs.existsSync(regionsDir)) {
  fs.mkdirSync(regionsDir, { recursive: true });
}
if (!fs.existsSync(countriesDir)) {
  fs.mkdirSync(countriesDir, { recursive: true });
}

const createStorage = (subDir: string) => multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(uploadsDir, subDir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const imageFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
  
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("Only image files (JPG, PNG, GIF, WebP, SVG) are allowed"));
  }
  
  cb(null, true);
};

export const regionImageUpload = multer({
  storage: createStorage("regions"),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFilter,
});


export const profileImageUpload = multer({
  storage: createStorage("profiles"),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFilter,
});

export const resellerLogoUpload = multer({
  storage: createStorage("reseller-logos"),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFilter,
});

export const countryImageUpload = multer({
  storage: createStorage("countries"),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFilter,
});
