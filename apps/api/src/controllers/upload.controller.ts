import type { Request, Response } from "express";
import { persistUpload, buildFileName } from "../lib/storage.js";

export async function uploadFile(req: Request, res: Response) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ status: "error", message: "No file provided" });
    }

    const type = file.mimetype.startsWith("video/") ? "video" : "image";

    // diskStorage sets `filename`, memoryStorage (S3 mode) does not.
    const filename = file.filename || buildFileName(file.originalname);

    // Local disk by default, S3 compatible bucket when S3_* is configured.
    const url = await persistUpload({
      filename,
      mimetype: file.mimetype,
      buffer: file.buffer,
    });

    return res.json({ status: "success", data: { url, type, filename } });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return res.status(500).json({ status: "error", message: "Upload failed" });
  }
}
