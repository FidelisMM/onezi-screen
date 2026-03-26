import { NextRequest, NextResponse } from "next/server";
import { loadMeta, PUBLIC_URL } from "@/lib/r2";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const videos = await loadMeta();
  const video = videos.find((v) => v.slug === slug);

  if (!video) {
    return NextResponse.json({ error: "Vídeo não encontrado" }, { status: 404 });
  }

  const videoUrl = `${PUBLIC_URL}/videos/${video.filename}`;

  return NextResponse.json({ ...video, videoUrl });
}
