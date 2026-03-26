import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET, PUBLIC_URL, type VideoMeta } from "@/lib/r2";

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

    const video = JSON.parse(body) as VideoMeta;
    return NextResponse.json({
      ...video,
      expiresAt: video.expiresAt ?? null,
      videoUrl: `${PUBLIC_URL}/videos/${video.filename}`,
    });
  } catch {
    return NextResponse.json({ error: "Video nao encontrado" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    // Busca metadata pra saber o filename do vídeo
    const res = await r2.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: `meta/${slug}.json` })
    );
    const body = await res.Body?.transformToString();
    if (!body) throw new Error("Meta não encontrado");

    const video = JSON.parse(body) as VideoMeta;

    // Exclui o vídeo e o metadata em paralelo
    await Promise.all([
      r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: `videos/${video.filename}` })),
      r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: `meta/${slug}.json` })),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Delete error:", msg);
    return NextResponse.json({ error: `Falha ao excluir: ${msg}` }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const { title } = (await req.json()) as { title?: string };
    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: "Titulo obrigatorio" }, { status: 400 });
    }

    // Busca metadata atual
    const res = await r2.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: `meta/${slug}.json` })
    );
    const body = await res.Body?.transformToString();
    if (!body) throw new Error("Meta não encontrado");

    const video = JSON.parse(body) as VideoMeta;
    video.title = title.trim();

    // Salva metadata atualizada
    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: `meta/${slug}.json`,
        Body: JSON.stringify(video),
        ContentType: "application/json",
      })
    );

    return NextResponse.json({ ok: true, video });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Patch error:", msg);
    return NextResponse.json({ error: `Falha ao atualizar: ${msg}` }, { status: 500 });
  }
}
