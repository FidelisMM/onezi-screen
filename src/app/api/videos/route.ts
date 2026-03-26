import { NextResponse } from "next/server";
import { ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET, type VideoMeta } from "@/lib/r2";

export async function GET() {
  try {
    // Lista todos os meta/*.json no R2
    const listRes = await r2.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: "meta/",
      })
    );

    const contents = listRes.Contents || [];
    // Filtra apenas arquivos .json individuais (ignora videos.json legado)
    const metaKeys = contents
      .map((obj) => obj.Key)
      .filter((key): key is string => !!key && key.endsWith(".json") && key !== "meta/videos.json");

    // Busca cada metadata em paralelo
    const metaPromises = metaKeys.map(async (key) => {
      try {
        const res = await r2.send(
          new GetObjectCommand({ Bucket: BUCKET, Key: key })
        );
        const body = await res.Body?.transformToString();
        if (!body) return null;
        return JSON.parse(body) as VideoMeta;
      } catch {
        return null;
      }
    });

    const allMeta = await Promise.all(metaPromises);

    // Filtra nulos e vídeos expirados
    const now = new Date();
    const videos = allMeta
      .filter((v): v is VideoMeta => v !== null)
      .map((v) => ({
        ...v,
        expiresAt: v.expiresAt ?? null,
        expired: v.expiresAt ? new Date(v.expiresAt) < now : false,
        views: (v as VideoMeta & { views?: number }).views || 0,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ videos });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("List videos error:", msg);
    return NextResponse.json({ error: `Falha ao listar vídeos: ${msg}` }, { status: 500 });
  }
}
