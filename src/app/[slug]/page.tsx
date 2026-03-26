"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { LogoScreen, LogoIcon } from "@/components/Logo";

interface VideoData {
  title: string;
  author: string;
  videoUrl: string;
  slug: string;
  createdAt: string;
}


function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const AVATARS: Record<string, string> = {
  Matheus: "/avatars/matheus.jpg",
  Caroll: "/avatars/caroll.jpg",
};

export default function PlayerPage() {
  const params = useParams();
  const slug = params.slug as string;
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch(`/api/videos/${slug}`)
      .then((r) => r.json())
      .then((data) => { if (!data.error) setVideo(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  // Track view on load
  useEffect(() => {
    if (video) {
      fetch(`/api/videos/${slug}/view`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {});
    }
  }, [video, slug]);

  // Track watch time on unload
  useEffect(() => {
    const sendWatchTime = () => {
      if (videoRef.current && videoRef.current.currentTime > 0) {
        navigator.sendBeacon(
          `/api/videos/${slug}/view`,
          JSON.stringify({ watchTime: Math.round(videoRef.current.currentTime) })
        );
      }
    };
    window.addEventListener("beforeunload", sendWatchTime);
    return () => window.removeEventListener("beforeunload", sendWatchTime);
  }, [slug]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); }
    else { videoRef.current.pause(); setIsPlaying(false); }
  }, []);

  const skip = useCallback((s: number) => {
    if (videoRef.current) videoRef.current.currentTime += s;
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted((v) => !v);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = document.querySelector(".video-wrapper");
    if (!document.fullscreenElement && el) { el.requestFullscreen(); setIsFullscreen(true); }
    else if (document.fullscreenElement) { document.exitFullscreen(); setIsFullscreen(false); }
  }, []);

  const getProgressFromEvent = useCallback((clientX: number) => {
    if (!progressRef.current) return 0;
    const rect = progressRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const seekTo = useCallback((fraction: number) => {
    if (videoRef.current) videoRef.current.currentTime = fraction * duration;
  }, [duration]);

  const handleProgressMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    seekTo(getProgressFromEvent(e.clientX));
    const wasPlaying = !videoRef.current?.paused;
    if (wasPlaying) videoRef.current?.pause();
    const onMove = (ev: MouseEvent) => seekTo(getProgressFromEvent(ev.clientX));
    const onUp = () => {
      setIsDragging(false);
      if (wasPlaying) videoRef.current?.play();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [getProgressFromEvent, seekTo]);

  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);


  const onMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => { if (isPlaying) setShowControls(false); }, 2500);
  }, [isPlaying]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      if (e.code === "ArrowLeft") skip(-5);
      if (e.code === "ArrowRight") skip(5);
      if (e.code === "KeyM") toggleMute();
      if (e.code === "KeyF") toggleFullscreen();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [togglePlay, skip, toggleMute, toggleFullscreen]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-lavender border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-white/[0.04] flex items-center justify-center text-4xl">{"\u{1F4FC}"}</div>
        <h1 className="font-display text-2xl font-bold text-white">Vídeo não encontrado</h1>
        <p className="text-white/35">Esse link pode ter expirado ou não existe.</p>
        <a href="/" className="mt-2 px-5 py-2.5 rounded-xl bg-white/[0.06] text-white/60 text-sm font-medium hover:bg-white/[0.1] transition-colors">
          Voltar ao início
        </a>
      </div>
    );
  }

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const avatarUrl = AVATARS[video.author];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="w-full px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <a href="/">
          <LogoScreen size="sm" />
        </a>
        <button
          onClick={copyLink}
          className="flex items-center gap-2 rounded-full px-3.5 py-2 bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] transition-all group"
        >
          <span className="text-[11px] text-white/25 truncate max-w-[160px] group-hover:text-white/40 transition-colors">
            screen.onezi.com.br/{video.slug}
          </span>
          {copied ? (
            <svg className="w-3.5 h-3.5 text-neon shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </nav>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center px-4 pb-8">
        {/* Video meta */}
        <div className="w-full max-w-[960px] mb-4">
          <h1 className="font-display text-lg md:text-xl font-bold text-white">{video.title}</h1>
          <div className="flex items-center gap-2.5 mt-2">
            {avatarUrl ? (
              <img src={avatarUrl} alt={video.author} className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-lavender to-pink flex items-center justify-center text-white text-xs font-bold shrink-0">
                {video.author[0]}
              </div>
            )}
            <span className="text-sm text-white/50">{video.author}</span>
            <span className="text-white/10">·</span>
            <span className="text-sm text-white/25">{formatDate(video.createdAt)}</span>
          </div>
        </div>

        {/* Video Player */}
        <div
          className="video-wrapper w-full max-w-[960px] rounded-xl overflow-hidden relative group cursor-pointer"
          style={{ boxShadow: "0 4px 40px rgba(0,0,0,0.4)" }}
          onMouseMove={onMouseMove}
          onMouseLeave={() => isPlaying && setShowControls(false)}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest(".controls-bar")) return;
            togglePlay();
          }}
        >
          <video
            ref={videoRef}
            className="w-full block"
            src={video.videoUrl}
            preload="metadata"
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
            onEnded={() => setIsPlaying(false)}
            playsInline
          />

          {/* Play overlay */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10 hover:bg-white/15 hover:scale-105 transition-all">
                <svg className="w-7 h-7 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}

          {/* Controls */}
          <div
            className={`controls-bar absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-14 pb-3.5 px-4 transition-opacity duration-300 ${
              showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Progress bar */}
            <div
              ref={progressRef}
              className="w-full relative cursor-pointer mb-3 group/prog select-none"
              style={{ height: "16px", display: "flex", alignItems: "center" }}
              onMouseDown={handleProgressMouseDown}
              onMouseMove={(e) => setHoverProgress(getProgressFromEvent(e.clientX))}
              onMouseLeave={() => setHoverProgress(null)}
            >
              <div className={`absolute left-0 right-0 bg-white/[0.12] rounded-full transition-all duration-100 ${isDragging ? "h-[5px]" : "h-[3px] group-hover/prog:h-[5px]"}`}>
                {hoverProgress !== null && !isDragging && (
                  <div className="absolute top-0 left-0 h-full bg-white/[0.08] rounded-full" style={{ width: `${hoverProgress * 100}%` }} />
                )}
                <div className="absolute top-0 left-0 h-full rounded-full" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #8d9cf9, #d6ff7b)" }} />
              </div>
              <div
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white transition-all duration-100 ${isDragging ? "w-3.5 h-3.5" : "w-0 h-0 group-hover/prog:w-3 group-hover/prog:h-3"}`}
                style={{ left: `${progress}%`, boxShadow: "0 0 6px rgba(0,0,0,0.3)" }}
              />
              {hoverProgress !== null && duration > 0 && (
                <div className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/80 text-white text-[10px] tabular-nums pointer-events-none" style={{ left: `${hoverProgress * 100}%` }}>
                  {formatTime(hoverProgress * duration)}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-0.5">
                <button onClick={togglePlay} className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10">
                  {isPlaying ? (
                    <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                  ) : (
                    <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </button>
                <button onClick={() => skip(-10)} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/10">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" /></svg>
                </button>
                <button onClick={() => skip(10)} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/10">
                  <svg className="w-3.5 h-3.5 scale-x-[-1]" fill="currentColor" viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" /></svg>
                </button>
                <button onClick={toggleMute} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/10">
                  {isMuted ? (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
                  )}
                </button>
                <span className="text-white/40 text-xs tabular-nums ml-2">
                  {formatTime(currentTime)}<span className="text-white/15"> / </span>{formatTime(duration)}
                </span>
              </div>
              <button onClick={toggleFullscreen} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/10">
                {isFullscreen ? (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" /></svg>
                )}
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-6 flex items-center justify-center gap-2">
        <LogoIcon size={16} />
        <span className="text-white/15 text-xs">Gravado com One.Zi</span>
      </footer>
    </div>
  );
}
