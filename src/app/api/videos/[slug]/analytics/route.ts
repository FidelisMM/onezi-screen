import { NextRequest, NextResponse } from "next/server";
import { ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";

interface ViewEvent {
  slug: string;
  ip: string;
  userAgent: string;
  referer: string;
  watchTime: number;
  viewedAt: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const listRes = await r2.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: `analytics/${slug}/` })
    );

    const keys = (listRes.Contents || []).map((o) => o.Key!).filter(Boolean);

    // Busca os últimos 50 eventos
    const recentKeys = keys.slice(-50);
    const events: ViewEvent[] = [];

    for (const key of recentKeys) {
      try {
        const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
        const body = await res.Body?.transformToString();
        if (body) events.push(JSON.parse(body));
      } catch {
        // ignora eventos corrompidos
      }
    }

    // Resumo
    const uniqueIps = new Set(events.map((e) => e.ip)).size;
    const totalViews = keys.length;
    const avgWatchTime = events.length > 0
      ? Math.round(events.reduce((sum, e) => sum + (e.watchTime || 0), 0) / events.length)
      : 0;

    return NextResponse.json({
      totalViews,
      uniqueVisitors: uniqueIps,
      avgWatchTime,
      recentViews: events.slice(-20).reverse().map((e) => ({
        ip: e.ip,
        viewedAt: e.viewedAt,
        watchTime: e.watchTime,
        device: /Mobile|Android|iPhone/i.test(e.userAgent) ? "mobile" : "desktop",
      })),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
