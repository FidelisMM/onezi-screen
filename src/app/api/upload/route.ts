import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, BUCKET, type VideoMeta } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, slug, author, filename, contentType, size, expiresInDays } = body as {
      title?: string;
      slug?: string;
      author?: string;
      filename?: string;
      contentType?: string;
      size?: number;
      expiresInDays?: number | null;
    };

    if (!slug || !filename) {
      return NextResponse.json({ error: "Slug e filename obrigatórios" }, { status: 400 });
    }

    const key = `videos/${filename}`;

    // Gera URL assinada (válida por 10 min) — isso é local, não chama R2
    const presignedUrl = await getSignedUrl(
      r2,
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType || "video/mp4",
      }),
      { expiresIn: 600 }
    );

    // Calcula data de expiração
    let expiresAt: string | null = null;
    if (expiresInDays && expiresInDays > 0) {
      const expires = new Date();
      expires.setDate(expires.getDate() + expiresInDays);
      expiresAt = expires.toISOString();
    }

    // Salva metadata como objeto JSON individual no R2
    const meta: VideoMeta = {
      slug,
      title: title || slug,
      author: author || "Matheus",
      filename,
      createdAt: new Date().toISOString(),
      size: size || 0,
      expiresAt,
    };

    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: `meta/${slug}.json`,
        Body: JSON.stringify(meta),
        ContentType: "application/json",
      })
    );

    return NextResponse.json({ presignedUrl, url: `/${slug}`, slug });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Upload error:", msg);
    return NextResponse.json({ error: `Falha: ${msg}` }, { status: 500 });
  }
}
