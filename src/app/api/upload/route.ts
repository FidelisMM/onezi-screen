import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET, loadMeta, saveMeta } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const slug = formData.get("slug") as string;
    const author = (formData.get("author") as string) || "Matheus";

    if (!file || !slug) {
      return NextResponse.json({ error: "Arquivo e slug obrigatórios" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "mp4";
    const filename = `${slug}.${ext}`;

    // Upload vídeo pro R2
    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: `videos/${filename}`,
        Body: buffer,
        ContentType: file.type,
      })
    );

    // Salvar metadata no R2
    const videos = await loadMeta();
    videos.push({
      slug,
      title,
      author,
      filename,
      createdAt: new Date().toISOString(),
      size: file.size,
    });
    await saveMeta(videos);

    return NextResponse.json({ url: `/${slug}`, slug });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Falha no upload" }, { status: 500 });
  }
}
