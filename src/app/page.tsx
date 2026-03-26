"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setUploadedFile(file);
    const name = file.name.replace(/\.[^.]+$/, "").replace(/[_\s]+/g, "-").toLowerCase();
    setTitle(file.name.replace(/\.[^.]+$/, ""));
    setSlug(name);
  };

  const handleUpload = async () => {
    if (!uploadedFile || !slug) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", uploadedFile);
    formData.append("title", title);
    formData.append("slug", slug);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setUploadedUrl(data.url);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex flex-col items-center justify-center px-4">
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl font-bold text-ink">
          <span className="text-royal">OneZi</span> Screen
        </h1>
        <p className="text-ink/50 mt-2">
          Grave, suba e compartilhe seus screen recordings.
        </p>
      </div>

      {!uploadedUrl ? (
        <div className="w-full max-w-lg">
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files[0];
              if (file?.type.startsWith("video/")) handleFile(file);
            }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-royal bg-royal/5 scale-[1.02]"
                : uploadedFile
                ? "border-teal bg-teal/5"
                : "border-ink/15 hover:border-royal/40 hover:bg-white"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />

            {uploadedFile ? (
              <div>
                <div className="text-4xl mb-3">🎬</div>
                <p className="font-medium text-ink">{uploadedFile.name}</p>
                <p className="text-sm text-ink/40 mt-1">
                  {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3">📹</div>
                <p className="font-medium text-ink">
                  Arraste um video aqui ou clique pra selecionar
                </p>
                <p className="text-sm text-ink/40 mt-1">MP4, MOV, WebM</p>
              </div>
            )}
          </div>

          {/* Form */}
          {uploadedFile && (
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-ink/60 block mb-1">
                  Titulo
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-ink/10 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-royal/30"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-ink/60 block mb-1">
                  Slug (URL)
                </label>
                <div className="flex items-center gap-0 rounded-xl border border-ink/10 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-royal/30">
                  <span className="text-sm text-ink/30 pl-4 shrink-0">
                    screen.onezi.com.br/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) =>
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "-")
                      )
                    }
                    className="w-full px-2 py-2.5 bg-transparent text-ink focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full py-3 rounded-xl bg-royal text-white font-medium hover:bg-royal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? "Enviando..." : "Publicar video"}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Success state */
        <div className="w-full max-w-lg bg-white rounded-2xl p-8 shadow-sm border border-ink/5 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="font-display text-xl font-semibold text-ink">
            Video publicado!
          </h2>
          <div className="mt-4 flex items-center gap-2 bg-[#f5f5f0] rounded-xl px-4 py-3">
            <span className="text-sm text-ink/60 font-mono truncate flex-1">
              screen.onezi.com.br/{slug}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(`https://screen.onezi.com.br/${slug}`)}
              className="text-royal text-sm font-medium hover:underline shrink-0"
            >
              Copiar
            </button>
          </div>
          <div className="mt-4 flex gap-3">
            <a
              href={`/${slug}`}
              className="flex-1 py-2.5 rounded-xl bg-royal text-white text-sm font-medium hover:bg-royal/90 transition-colors text-center"
            >
              Assistir
            </a>
            <button
              onClick={() => {
                setUploadedFile(null);
                setUploadedUrl(null);
                setTitle("");
                setSlug("");
              }}
              className="flex-1 py-2.5 rounded-xl border border-ink/10 text-ink text-sm font-medium hover:bg-ink/5 transition-colors"
            >
              Novo upload
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="mt-12 text-ink/20 text-xs">
        OneZi Screen — open source video sharing
      </p>
    </div>
  );
}
