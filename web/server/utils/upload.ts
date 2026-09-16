import multer from "multer";
import fs from "fs";
import path from "path";

export function createMultiUploader(folderName: string, fields: { name: string; maxCount: number }[]) {
  const uploadPath = path.join(process.cwd(), "uploads", folderName);

  // Create folder if not exists
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2)}${ext}`;
      cb(null, uniqueName);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  });

  return upload.fields(fields);
}
