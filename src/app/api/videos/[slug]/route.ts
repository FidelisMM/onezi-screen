import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET, PUBLIC_URL } from "@/lib/r2";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const res = await r2.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: `meta/${slug}.json` })
    );
    const body = await res.Body?.transformToString();
    if (!body) throw new Error("empty");

    const video = JSON.parse(body);
    video.videoUrl = `${PUBLIC_URL}/videos/${video.filename}`;

    return NextResponse.json(video);
  } catch {
    return NextResponse.json({ error: "Vídeo não encontrado" }, { status: 404 });
  }
}
