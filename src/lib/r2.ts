import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const BUCKET = process.env.R2_BUCKET || "onezi-screen";
export const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

export interface VideoMeta {
  slug: string;
  title: string;
  author: string;
  filename: string;
  createdAt: string;
  size: number;
  expiresAt: string | null;
}
