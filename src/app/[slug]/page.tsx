"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

interface VideoData {
  title: string;
  author: string;
  videoUrl: string;
  slug: string;
  createdAt: string;
}

const REACTIONS = [
  { emoji: "😂", label: "haha" },
  { emoji: "😍", label: "love" },
  { emoji: "🥺", label: "wow" },
  { emoji: "🙌", label: "celebrate" },
  { emoji: "👍", label: "like" },
  { emoji: "🔥", label: "fire" },
];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora mesmo";
  if (mins < 60) return `ha ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `ha ${hours}h`;
  const days = Math.floor(hours / 24);
  return `ha ${days}d`;
}

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
  const [reactions, setReactions] = useState<Record<string, number>>(
    Object.fromEntries(REACTIONS.map((r) => [r.label, 0]))
  );
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch(`/api/videos/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setVideo(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const skip = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += seconds;
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.querySelector(".video-container")?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!videoRef.current || !progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * duration;
    },
    [duration]
  );

  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleReaction = useCallback(
    (label: string) => {
      setReactions((prev) => {
        const next = { ...prev };
        if (userReaction === label) {
          next[label] = Math.max(0, next[label] - 1);
          setUserReaction(null);
        } else {
          if (userReaction) next[userReaction] = Math.max(0, next[userReaction] - 1);
          next[label] = next[label] + 1;
          setUserReaction(label);
        }
        return next;
      });
    },
    [userReaction]
  );

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      }
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
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-royal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex flex-col items-center justify-center">
        <p className="text-6xl mb-4">📼</p>
        <h1 className="font-display text-2xl font-semibold text-ink">Video nao encontrado</h1>
        <p className="text-ink/50 mt-2">Esse link pode ter expirado ou nao existe.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex flex-col items-center px-4 py-8">
      {/* Header */}
      <div className="w-full max-w-[960px] mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">
              {video.title}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-8 h-8 rounded-full bg-royal flex items-center justify-center text-white text-sm font-medium">
                {video.author[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-ink">{video.author}</p>
                <p className="text-xs text-ink/50">{timeAgo(video.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Copy link */}
          <button
            onClick={copyLink}
            className="flex items-center gap-2 bg-white border border-ink/10 rounded-full px-4 py-2 text-sm text-ink/70 hover:bg-ink/5 transition-all"
          >
            <span className="text-ink/40 text-xs font-mono truncate max-w-[200px]">
              screen.onezi.com.br/{video.slug}
            </span>
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  copied
                    ? "M5 13l4 4L19 7"
                    : "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                }
              />
            </svg>
            {copied && (
              <span className="text-teal text-xs font-medium">Copiado!</span>
            )}
          </button>
        </div>
      </div>

      {/* Video Player */}
      <div
        className="video-container w-full max-w-[960px] rounded-2xl overflow-hidden bg-black relative group cursor-pointer shadow-2xl shadow-ink/20"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest(".controls")) return;
          togglePlay();
        }}
      >
        <video
          ref={videoRef}
          className="w-full aspect-video"
          src={video.videoUrl}
          preload="metadata"
          onTimeUpdate={() =>
            setCurrentTime(videoRef.current?.currentTime || 0)
          }
          onLoadedMetadata={() =>
            setDuration(videoRef.current?.duration || 0)
          }
          onEnded={() => setIsPlaying(false)}
          playsInline
        />

        {/* Play overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center backdrop-blur-sm hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-ink ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Controls bar */}
        <div
          className={`controls absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 pb-4 px-4 transition-opacity duration-300 ${
            showControls || !isPlaying ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-3 group/progress hover:h-2 transition-all"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-white rounded-full relative transition-all"
              style={{
                width: duration ? `${(currentTime / duration) * 100}%` : "0%",
              }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md opacity-0 group-hover/progress:opacity-100 transition-opacity" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="w-8 h-8 flex items-center justify-center text-white hover:text-neon transition-colors"
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Rewind */}
              <button
                onClick={() => skip(-10)}
                className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
                </svg>
              </button>

              {/* Forward */}
              <button
                onClick={() => skip(10)}
                className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4 scale-x-[-1]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
                </svg>
              </button>

              {/* Volume */}
              <button
                onClick={toggleMute}
                className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  {isMuted ? (
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  ) : (
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  )}
                </svg>
              </button>

              {/* Time */}
              <span className="text-white/80 text-xs font-mono ml-1">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  {isFullscreen ? (
                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                  ) : (
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Emoji reactions */}
      <div className="mt-6 flex items-center gap-2">
        <div className="flex items-center gap-1 bg-white rounded-full px-2 py-1.5 shadow-sm border border-ink/5">
          {REACTIONS.map((r) => (
            <button
              key={r.label}
              onClick={() => handleReaction(r.label)}
              className={`relative flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xl transition-all hover:scale-110 active:scale-95 ${
                userReaction === r.label
                  ? "bg-royal/10 ring-1 ring-royal/30"
                  : "hover:bg-ink/5"
              }`}
            >
              {r.emoji}
              {reactions[r.label] > 0 && (
                <span className="text-[11px] font-medium text-ink/60">
                  {reactions[r.label]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center gap-2 text-ink/30 text-sm">
        <span>Gravado com</span>
        <span className="font-display font-semibold text-royal">
          OneZi Screen
        </span>
      </div>
    </div>
  );
}
