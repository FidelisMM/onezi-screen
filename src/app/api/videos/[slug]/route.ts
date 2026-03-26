import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

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
    const data = await readFile(META_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const videos = await loadMeta();
  const video = videos.find((v) => v.slug === slug);

  if (!video) {
    return NextResponse.json({ error: "Video nao encontrado" }, { status: 404 });
  }

  const r2Url = process.env.R2_PUBLIC_URL;
  const videoUrl = r2Url
    ? `${r2Url}/videos/${video.filename}`
    : `/videos/${video.filename}`;

  return NextResponse.json({
    ...video,
    videoUrl,
  });
}
