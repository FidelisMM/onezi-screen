"use client";

import { useState, useRef } from "react";
import { LogoScreen, LogoIcon } from "@/components/Logo";

const AUTHORS = [
  { name: "Matheus", avatar: "/avatars/matheus.jpg" },
  { name: "Caroll", avatar: "/avatars/caroll.jpg" },
];

const UPLOAD_PASSWORD = "22051995";

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [author, setAuthor] = useState("Matheus");
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const toSlug = (text: string) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const handleFile = (file: File) => {
    setUploadedFile(file);
    const name = file.name.replace(/\.[^.]+$/, "");
    setTitle(name);
    setSlug(toSlug(name));
  };

  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpload = async () => {
    if (!uploadedFile || !slug) return;
    setUploading(true);
    setUploadProgress(0);

    try {
      const ext = uploadedFile.name.split(".").pop() || "mp4";
      const filename = `${slug}.${ext}`;

      // 1. Pega presigned URL da API
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          author,
          filename,
          contentType: uploadedFile.type,
          size: uploadedFile.size,
        }),
      });
      const data = await res.json();
      if (!data.presignedUrl) throw new Error(data.error || "Falha ao gerar URL");

      // 2. Upload direto pro R2 via XHR (pra ter progresso)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload falhou: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Erro de rede"));
        xhr.open("PUT", data.presignedUrl);
        xhr.setRequestHeader("Content-Type", uploadedFile.type);
        xhr.send(uploadedFile);
      });

      setUploadedUrl(data.url);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Falha no upload. Tente novamente.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="w-full px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <LogoScreen size="sm" />
        <div className="flex items-center gap-4">
          <span className="text-white/20 text-xs hidden sm:block">Compartilhe seus screen recordings</span>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        {!authenticated ? (
          <div className="w-full max-w-sm text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="font-display text-xl font-bold text-white">Acesso restrito</h2>
            <p className="text-white/30 text-sm mt-1">Digite a senha pra fazer upload</p>
            <form
              className="mt-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (password === UPLOAD_PASSWORD) {
                  setAuthenticated(true);
                  setPasswordError(false);
                } else {
                  setPasswordError(true);
                }
              }}
            >
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(false); }}
                placeholder="Senha"
                className={`w-full px-4 py-3 rounded-xl bg-white/[0.04] border text-white placeholder-white/15 text-center focus:outline-none transition-colors ${
                  passwordError ? "border-pink" : "border-white/[0.06] focus:border-lavender/40"
                }`}
                autoFocus
              />
              {passwordError && <p className="text-pink text-xs mt-2">Senha incorreta</p>}
              <button type="submit" className="w-full mt-3 py-3 rounded-xl bg-neon text-ink font-semibold text-sm hover:brightness-105 active:scale-[0.99] transition-all">
                Entrar
              </button>
            </form>
          </div>
        ) : !uploadedUrl ? (
          <div className="w-full max-w-xl">
            {/* Hero text */}
            <div className="text-center mb-8">
              <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white leading-tight">
                Grave. Suba. Compartilhe.
              </h1>
              <p className="text-white/35 mt-2">
                Seus screen recordings com link profissional
              </p>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file?.type.startsWith("video/")) handleFile(file);
              }}
              onClick={() => fileRef.current?.click()}
              className={`relative rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 border ${
                isDragging
                  ? "border-neon bg-neon/5 scale-[1.01]"
                  : uploadedFile
                  ? "border-teal/30 bg-teal/[0.03]"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
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
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal/10 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-semibold text-white truncate">{uploadedFile.name}</p>
                    <p className="text-sm text-white/25 mt-0.5">
                      {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="font-medium text-white/70">Arraste um vídeo aqui</p>
                  <p className="text-sm text-white/25 mt-1">ou clique pra selecionar · MP4, MOV, WebM</p>
                </div>
              )}
            </div>

            {/* Form */}
            {uploadedFile && (
              <div className="mt-5 space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-white/25 block mb-1.5 uppercase tracking-widest">Título</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setSlug(toSlug(e.target.value)); }}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white placeholder-white/15 focus:outline-none focus:border-lavender/40 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-white/25 block mb-1.5 uppercase tracking-widest">Link</label>
                  <div className="flex items-center rounded-xl bg-white/[0.04] border border-white/[0.06] overflow-hidden focus-within:border-lavender/40 transition-colors">
                    <span className="text-xs text-white/15 pl-4 shrink-0">screen.onezi.com.br/</span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                      className="w-full px-1 py-3 bg-transparent text-white text-sm focus:outline-none"
                    />
                  </div>
                </div>

                {/* Author selector */}
                <div>
                  <label className="text-[11px] font-semibold text-white/25 block mb-1.5 uppercase tracking-widest">Quem gravou</label>
                  <div className="flex gap-2">
                    {AUTHORS.map((a) => (
                      <button
                        key={a.name}
                        type="button"
                        onClick={() => setAuthor(a.name)}
                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all ${
                          author === a.name
                            ? "border-lavender/40 bg-lavender/10"
                            : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                        }`}
                      >
                        <img src={a.avatar} alt={a.name} className="w-7 h-7 rounded-full object-cover" />
                        <span className={`text-sm font-medium ${author === a.name ? "text-white" : "text-white/40"}`}>{a.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-neon text-ink hover:brightness-105 active:scale-[0.99]"
                >
                  {uploading ? `Enviando... ${uploadProgress}%` : "Publicar"}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Success */
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 rounded-2xl bg-neon/10 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-bold text-white">Publicado!</h2>
            <p className="text-white/30 mt-1 text-sm">Seu vídeo está pronto pra compartilhar</p>

            <div className="mt-6 flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3">
              <span className="text-sm text-white/35 truncate flex-1">
                screen.onezi.com.br/{slug}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(`https://screen.onezi.com.br/${slug}`)}
                className="text-neon text-xs font-semibold hover:text-neon-dark transition-colors shrink-0"
              >
                Copiar
              </button>
            </div>

            <div className="mt-4 flex gap-3">
              <a
                href={`/${slug}`}
                className="flex-1 py-3 rounded-xl bg-neon text-ink text-sm font-semibold text-center hover:brightness-105 active:scale-[0.99] transition-all"
              >
                Assistir
              </a>
              <button
                onClick={() => { setUploadedFile(null); setUploadedUrl(null); setTitle(""); setSlug(""); }}
                className="flex-1 py-3 rounded-xl border border-white/[0.06] text-white/50 text-sm font-semibold hover:text-white/70 hover:bg-white/[0.02] transition-all"
              >
                Novo upload
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-6 flex items-center justify-center gap-2">
        <LogoIcon size={18} />
        <span className="text-white/15 text-xs">One.Zi Screen</span>
      </footer>
    </div>
  );
}
