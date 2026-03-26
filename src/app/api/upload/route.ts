import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const r2 = process.env.R2_ACCOUNT_ID
  ? new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

const BUCKET = process.env.R2_BUCKET || "onezi-screen";
const DATA_DIR = join(process.cwd(), "data");
const META_FILE = join(DATA_DIR, "videos.json");

interface VideoMeta {
  slug: string;
  title: string;
  author: string;
  filename: string;
  createdAt: string;
  size: number;
}

async function loadMeta(): Promise<VideoMeta[]> {
  try {
    const { readFile } = await import("fs/promises");
    const data = await readFile(META_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveMeta(videos: VideoMeta[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(META_FILE, JSON.stringify(videos, null, 2));
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const slug = formData.get("slug") as string;

    if (!file || !slug) {
      return NextResponse.json({ error: "Arquivo e slug obrigatorios" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "mp4";
    const filename = `${slug}.${ext}`;

    if (r2) {
      // Upload para Cloudflare R2
      await r2.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: `videos/${filename}`,
          Body: buffer,
          ContentType: file.type,
        })
      );
    } else {
      // Fallback: salvar localmente
      const videosDir = join(process.cwd(), "public", "videos");
      await mkdir(videosDir, { recursive: true });
      await writeFile(join(videosDir, filename), buffer);
    }

    // Salvar metadata
    const videos = await loadMeta();
    videos.push({
      slug,
      title,
      author: "Matheus",
      filename,
      createdAt: new Date().toISOString(),
      size: file.size,
    });
    await saveMeta(videos);

    return NextResponse.json({
      url: `/${slug}`,
      slug,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Falha no upload" }, { status: 500 });
  }
}
