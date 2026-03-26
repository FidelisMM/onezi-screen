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
}

const META_KEY = "meta/videos.json";

export async function loadMeta(): Promise<VideoMeta[]> {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: META_KEY }));
    const body = await res.Body?.transformToString();
    return body ? JSON.parse(body) : [];
  } catch {
    return [];
  }
}

export async function saveMeta(videos: VideoMeta[]) {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: META_KEY,
      Body: JSON.stringify(videos, null, 2),
      ContentType: "application/json",
    })
  );
}
