import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET, type VideoMeta } from "@/lib/r2";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const { watchTime } = body as { watchTime?: number };

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const referer = req.headers.get("referer") || "";

    const now = new Date();
    const viewId = `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;

    // Salva evento de view
    const viewData = {
      slug,
      ip,
      userAgent,
      referer,
      watchTime: watchTime || 0,
      viewedAt: now.toISOString(),
    };

    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: `analytics/${slug}/${viewId}.json`,
        Body: JSON.stringify(viewData),
        ContentType: "application/json",
      })
    );

    // Incrementa contador no metadata
    try {
      const metaRes = await r2.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: `meta/${slug}.json` })
      );
      const metaBody = await metaRes.Body?.transformToString();
      if (metaBody) {
        const meta = JSON.parse(metaBody) as VideoMeta & { views?: number };
        meta.views = (meta.views || 0) + 1;
        await r2.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: `meta/${slug}.json`,
            Body: JSON.stringify(meta),
            ContentType: "application/json",
          })
        );
      }
    } catch {
      // Não falha se não conseguir atualizar o contador
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("View track error:", msg);
    return NextResponse.json({ ok: true }); // Nunca falha pro usuário
  }
}
