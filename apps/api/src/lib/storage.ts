/**
 * Media storage.
 *
 * By default files are written to the local `uploads/` folder. That works for
 * local development but Heroku's filesystem is ephemeral - every dyno restart
 * (and every new dyno) wipes the media.
 *
 * When S3 credentials are present the upload is stored in an S3 compatible
 * bucket instead (AWS S3, Cloudflare R2, Supabase Storage, Backblaze B2, MinIO).
 * Set these config vars to enable it:
 *
 *   S3_BUCKET      (required)
 *   S3_REGION      (default "auto")
 *   S3_ENDPOINT    (optional - required for R2 / MinIO / Supabase)
 *   S3_ACCESS_KEY_ID
 *   S3_SECRET_ACCESS_KEY
 *   S3_PUBLIC_URL  (base URL the files are served from, e.g. a CDN or public bucket)
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const bucket = process.env.S3_BUCKET?.trim();

export const isRemoteStorageEnabled = Boolean(
  bucket &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY,
);

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: Boolean(process.env.S3_ENDPOINT),
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

export function buildFileName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase() || ".bin";
  return `${randomUUID()}${ext}`;
}

/**
 * Stores the uploaded file and returns the URL the frontend should use.
 */
export async function persistUpload(file: {
  filename: string;
  mimetype: string;
  buffer?: Buffer;
}): Promise<string> {
  if (!isRemoteStorageEnabled) {
    return `/uploads/${file.filename}`;
  }

  const key = `uploads/${file.filename}`;
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket!,
      Key: key,
      Body: file.buffer!,
      ContentType: file.mimetype,
    }),
  );

  const publicBase =
    process.env.S3_PUBLIC_URL?.replace(/\/$/, "") ??
    `${(process.env.S3_ENDPOINT || "").replace(/\/$/, "")}/${bucket}`;

  return `${publicBase}/${key}`;
}
