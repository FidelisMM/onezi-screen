"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { LogoScreen, LogoIcon } from "@/components/Logo";

/* ─── Constants ─── */

const AUTHORS = [
  { name: "Matheus", avatar: "/avatars/matheus.jpg" },
  { name: "Caroll", avatar: "/avatars/caroll.jpg" },
];

const AVATARS: Record<string, string> = {
  Matheus: "/avatars/matheus.jpg",
  Caroll: "/avatars/caroll.jpg",
};

const UPLOAD_PASSWORD = "22051995";

const EXPIRY_OPTIONS = [
  { label: "7 dias", value: 7 },
  { label: "15 dias", value: 15 },
  { label: "30 dias", value: 30 },
  { label: "Permanente", value: null },
] as const;

/* ─── Types ─── */

interface VideoItem {
  slug: string;
  title: string;
  author: string;
  filename: string;
  createdAt: string;
  size: number;
  expiresAt: string | null;
  expired: boolean;
  views: number;
}

type View = "login" | "dashboard" | "upload" | "success";

/* ─── Helpers ─── */

function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getExpiryBadge(expiresAt: string | null, expired: boolean): { label: string; color: string } {
  if (!expiresAt) return { label: "Permanente", color: "bg-teal/15 text-teal" };
  if (expired) return { label: "Expirado", color: "bg-pink/15 text-pink" };

  const now = new Date();
  const exp = new Date(expiresAt);
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft <= 3) return { label: `${daysLeft}d restante${daysLeft > 1 ? "s" : ""}`, color: "bg-pink/15 text-pink" };
  if (daysLeft <= 7) return { label: `${daysLeft}d restantes`, color: "bg-yellow/15 text-yellow" };
  return { label: `${daysLeft}d restantes`, color: "bg-teal/15 text-teal" };
}

/* ─── Main Component ─── */

export default function Home() {
  const [view, setView] = useState<View>("login");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  // Dashboard state
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [author, setAuthor] = useState("Matheus");
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ─── Fetch videos ─── */

  const fetchVideos = useCallback(async () => {
    setLoadingVideos(true);
    try {
      const res = await fetch("/api/videos");
      const data = await res.json();
      if (data.videos) setVideos(data.videos);
    } catch (err) {
      console.error("Erro ao carregar vídeos:", err);
    } finally {
      setLoadingVideos(false);
    }
  }, []);

  useEffect(() => {
    if (view === "dashboard") fetchVideos();
  }, [view, fetchVideos]);

  /* ─── Handlers ─── */

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === UPLOAD_PASSWORD) {
      setPasswordError(false);
      setView("dashboard");
    } else {
      setPasswordError(true);
    }
  };

  const handleFile = (file: File) => {
    setUploadedFile(file);
    const name = file.name.replace(/\.[^.]+$/, "");
    setTitle(name);
    setSlug(toSlug(name));
  };

  const handleUpload = async () => {
    if (!uploadedFile || !slug) return;
    setUploading(true);
    setUploadProgress(0);

    try {
      const ext = uploadedFile.name.split(".").pop() || "mp4";
      const filename = `${slug}.${ext}`;

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
          expiresInDays,
        }),
      });
      const data = await res.json();
      if (!data.presignedUrl) throw new Error(data.error || "Falha ao gerar URL");

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload falhou: ${xhr.status}`));
        xhr.onerror = () => reject(new Error("Erro de rede"));
        xhr.open("PUT", data.presignedUrl);
        xhr.setRequestHeader("Content-Type", uploadedFile.type);
        xhr.send(uploadedFile);
      });

      setUploadedUrl(data.url);
      setView("success");
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Falha no upload. Tente novamente.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (videoSlug: string) => {
    if (!confirm("Tem certeza que deseja excluir este video?")) return;
    setDeletingSlug(videoSlug);
    try {
      const res = await fetch(`/api/videos/${videoSlug}`, { method: "DELETE" });
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.slug !== videoSlug));
      } else {
        alert("Falha ao excluir video.");
      }
    } catch {
      alert("Erro de rede ao excluir.");
    } finally {
      setDeletingSlug(null);
    }
  };

  const handleEditSave = async (videoSlug: string) => {
    if (!editTitle.trim()) return;
    try {
      const res = await fetch(`/api/videos/${videoSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle }),
      });
      if (res.ok) {
        setVideos((prev) =>
          prev.map((v) => (v.slug === videoSlug ? { ...v, title: editTitle.trim() } : v))
        );
        setEditingSlug(null);
      } else {
        alert("Falha ao atualizar titulo.");
      }
    } catch {
      alert("Erro de rede ao atualizar.");
    }
  };

  const handleCopyLink = async (videoSlug: string) => {
    await navigator.clipboard.writeText(`https://screen.onezi.com.br/${videoSlug}`);
    setCopiedSlug(videoSlug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const resetUpload = () => {
    setUploadedFile(null);
    setUploadedUrl(null);
    setTitle("");
    setSlug("");
    setAuthor("Matheus");
    setExpiresInDays(null);
    setView("dashboard");
  };

  const goToUpload = () => {
    setUploadedFile(null);
    setUploadedUrl(null);
    setTitle("");
    setSlug("");
    setAuthor("Matheus");
    setExpiresInDays(null);
    setView("upload");
  };

  /* ─── Render ─── */

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="w-full px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <button onClick={() => view !== "login" ? setView("dashboard") : undefined}>
          <LogoScreen size="sm" />
        </button>
        <div className="flex items-center gap-4">
          {view === "dashboard" && (
            <button
              onClick={goToUpload}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neon text-ink text-sm font-semibold hover:brightness-105 active:scale-[0.99] transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo upload
            </button>
          )}
          {(view === "upload" || view === "success") && (
            <button
              onClick={() => setView("dashboard")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.06] text-white/50 text-sm font-medium hover:text-white/70 hover:bg-white/[0.02] transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Voltar
            </button>
          )}
          {view !== "login" && (
            <span className="text-white/20 text-xs hidden sm:block">Compartilhe seus videos</span>
          )}
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center px-4 pb-16">
        {/* ═══ LOGIN ═══ */}
        {view === "login" && (
          <div className="flex-1 flex items-center justify-center w-full">
            <div className="w-full max-w-sm text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h2 className="font-display text-xl font-bold text-white">Acesso restrito</h2>
              <p className="text-white/30 text-sm mt-1">Digite a senha pra acessar</p>
              <form className="mt-5" onSubmit={handleLogin}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(false);
                  }}
                  placeholder="Senha"
                  className={`w-full px-4 py-3 rounded-xl bg-white/[0.04] border text-white placeholder-white/15 text-center focus:outline-none transition-colors ${
                    passwordError ? "border-pink" : "border-white/[0.06] focus:border-lavender/40"
                  }`}
                  autoFocus
                />
                {passwordError && <p className="text-pink text-xs mt-2">Senha incorreta</p>}
                <button
                  type="submit"
                  className="w-full mt-3 py-3 rounded-xl bg-neon text-ink font-semibold text-sm hover:brightness-105 active:scale-[0.99] transition-all"
                >
                  Entrar
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ═══ DASHBOARD ═══ */}
        {view === "dashboard" && (
          <div className="w-full max-w-4xl mt-4">
            <div className="mb-6">
              <h1 className="font-display text-2xl md:text-3xl font-extrabold text-white">Seus videos</h1>
              <p className="text-white/30 text-sm mt-1">
                {videos.length} {videos.length === 1 ? "video" : "videos"} publicado{videos.length === 1 ? "" : "s"}
              </p>
            </div>

            {loadingVideos ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-lavender border-t-transparent rounded-full animate-spin" />
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="font-display text-lg font-bold text-white/60">Nenhum video ainda</h3>
                <p className="text-white/25 text-sm mt-1">Clique em &quot;Novo upload&quot; pra comecar</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {videos.map((video) => {
                  const badge = getExpiryBadge(video.expiresAt, video.expired);
                  const isEditing = editingSlug === video.slug;
                  const isDeleting = deletingSlug === video.slug;
                  const isCopied = copiedSlug === video.slug;

                  return (
                    <div
                      key={video.slug}
                      className={`bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 transition-all hover:bg-white/[0.06] hover:border-white/[0.10] ${
                        video.expired ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="shrink-0 mt-0.5">
                          {AVATARS[video.author] ? (
                            <img
                              src={AVATARS[video.author]}
                              alt={video.author}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lavender to-pink flex items-center justify-center text-white text-sm font-bold">
                              {video.author[0]}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isEditing ? (
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleEditSave(video.slug);
                                    if (e.key === "Escape") setEditingSlug(null);
                                  }}
                                  className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-lavender/30 text-white text-sm focus:outline-none focus:border-lavender/50"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleEditSave(video.slug)}
                                  className="px-3 py-1.5 rounded-lg bg-neon text-ink text-xs font-semibold hover:brightness-105 transition-all"
                                >
                                  Salvar
                                </button>
                                <button
                                  onClick={() => setEditingSlug(null)}
                                  className="px-3 py-1.5 rounded-lg border border-white/[0.06] text-white/40 text-xs hover:text-white/60 transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <>
                                <a
                                  href={`/${video.slug}`}
                                  className="font-display font-semibold text-white truncate hover:text-lavender transition-colors"
                                >
                                  {video.title}
                                </a>
                                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.color}`}>
                                  {badge.label}
                                </span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1.5 text-xs text-white/30">
                            <span>{video.author}</span>
                            <span className="text-white/10">·</span>
                            <span>{formatDate(video.createdAt)}</span>
                            <span className="text-white/10">·</span>
                            <span>{formatBytes(video.size)}</span>
                            <span className="text-white/10">·</span>
                            <span className="text-lavender/70">{video.views || 0} view{video.views !== 1 ? "s" : ""}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        {!isEditing && (
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Copiar link */}
                            <button
                              onClick={() => handleCopyLink(video.slug)}
                              title="Copiar link"
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/25 hover:text-neon hover:bg-white/[0.06] transition-all"
                            >
                              {isCopied ? (
                                <svg className="w-4 h-4 text-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                  />
                                </svg>
                              )}
                            </button>

                            {/* Editar */}
                            <button
                              onClick={() => {
                                setEditingSlug(video.slug);
                                setEditTitle(video.title);
                              }}
                              title="Editar titulo"
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/25 hover:text-lavender hover:bg-white/[0.06] transition-all"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>

                            {/* Excluir */}
                            <button
                              onClick={() => handleDelete(video.slug)}
                              disabled={isDeleting}
                              title="Excluir video"
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/25 hover:text-pink hover:bg-pink/[0.06] transition-all disabled:opacity-30"
                            >
                              {isDeleting ? (
                                <div className="w-3.5 h-3.5 border-2 border-pink border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ UPLOAD ═══ */}
        {view === "upload" && (
          <div className="flex-1 flex items-center justify-center w-full">
            <div className="w-full max-w-xl">
              {/* Hero text */}
              <div className="text-center mb-8">
                <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white leading-tight">
                  Grave. Suba. Compartilhe.
                </h1>
                <p className="text-white/35 mt-2">Seus videos com link profissional</p>
              </div>

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
                      <p className="text-sm text-white/25 mt-0.5">{formatBytes(uploadedFile.size)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="py-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                      <svg className="w-7 h-7 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                    </div>
                    <p className="font-medium text-white/70">Arraste um video aqui</p>
                    <p className="text-sm text-white/25 mt-1">ou clique pra selecionar · MP4, MOV, WebM</p>
                  </div>
                )}
              </div>

              {/* Form */}
              {uploadedFile && (
                <div className="mt-5 space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-white/25 block mb-1.5 uppercase tracking-widest">
                      Titulo
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setSlug(toSlug(e.target.value));
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white placeholder-white/15 focus:outline-none focus:border-lavender/40 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-white/25 block mb-1.5 uppercase tracking-widest">
                      Link
                    </label>
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
                    <label className="text-[11px] font-semibold text-white/25 block mb-1.5 uppercase tracking-widest">
                      Quem gravou
                    </label>
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
                          <span className={`text-sm font-medium ${author === a.name ? "text-white" : "text-white/40"}`}>
                            {a.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Expiry selector */}
                  <div>
                    <label className="text-[11px] font-semibold text-white/25 block mb-1.5 uppercase tracking-widest">
                      Validade
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {EXPIRY_OPTIONS.map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => setExpiresInDays(opt.value)}
                          className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                            expiresInDays === opt.value
                              ? "border-lavender/40 bg-lavender/10 text-white"
                              : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:border-white/[0.12]"
                          }`}
                        >
                          {opt.label}
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
          </div>
        )}

        {/* ═══ SUCCESS ═══ */}
        {view === "success" && (
          <div className="flex-1 flex items-center justify-center w-full">
            <div className="w-full max-w-md text-center">
              <div className="w-16 h-16 rounded-2xl bg-neon/10 flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-display text-2xl font-bold text-white">Publicado!</h2>
              <p className="text-white/30 mt-1 text-sm">Seu video esta pronto pra compartilhar</p>

              <div className="mt-6 flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3">
                <span className="text-sm text-white/35 truncate flex-1">screen.onezi.com.br/{slug}</span>
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
                  onClick={resetUpload}
                  className="flex-1 py-3 rounded-xl border border-white/[0.06] text-white/50 text-sm font-semibold hover:text-white/70 hover:bg-white/[0.02] transition-all"
                >
                  Voltar ao dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-6 flex items-center justify-center gap-2">
        <LogoIcon size={18} />
        <span className="text-white/15 text-xs">One.Zi Videos</span>
      </footer>
    </div>
  );
}
