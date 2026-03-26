import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, BUCKET, loadMeta, saveMeta } from "@/lib/r2";

// Step 1: Gerar presigned URL pra upload direto ao R2
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, slug, author, filename, contentType, size } = body;

    if (!slug || !filename) {
      return NextResponse.json({ error: "Slug e filename obrigatórios" }, { status: 400 });
    }

    const key = `videos/${filename}`;

    // Gera URL assinada (válida por 10 min)
    const presignedUrl = await getSignedUrl(
      r2,
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType || "video/mp4",
      }),
      { expiresIn: 600 }
    );

    // Salva metadata
    const videos = await loadMeta();
    videos.push({
      slug,
      title: title || slug,
      author: author || "Matheus",
      filename,
      createdAt: new Date().toISOString(),
      size: size || 0,
    });
    await saveMeta(videos);

    return NextResponse.json({
      presignedUrl,
      url: `/${slug}`,
      slug,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Upload error:", msg, error);
    return NextResponse.json({ error: `Falha: ${msg}` }, { status: 500 });
  }
}
