"use client";

import React, { useRef, useState, useEffect } from "react";
import ReactPlayer from "react-player";
import { VideoDTO } from "@/types/video";
import { useAuth } from "@/store/auth-context";
import { recordWatchProgress } from "@/utility/requests";
import { ReelActionRail } from "./ReelActionRail";
import { ReelBottomOverlay } from "./ReelBottomOverlay";
import { ReelCommentsDrawer } from "./ReelCommentsDrawer";
import { SaveToPlaylistModal } from "@/components/video/SaveToPlaylistModal";
import { Play, Pause, Heart, Volume2, VolumeX } from "lucide-react";
import clsx from "clsx";

interface ReelItemProps {
  video: VideoDTO;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
}

export function ReelItem({ video, isActive, isMuted, onToggleMute }: ReelItemProps) {
  const { token } = useAuth();
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [showMuteFeedback, setShowMuteFeedback] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const prevMutedRef = useRef(isMuted);

  // Modals state
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  // Track watch history when reel plays
  useEffect(() => {
    if (isActive && isPlaying && video?.videoId) {
      recordWatchProgress(video.videoId, 0, undefined, token || undefined);
    }
  }, [isActive, isPlaying, video?.videoId, token]);

  // Flash mute indicator whenever user toggles sound while active
  useEffect(() => {
    if (prevMutedRef.current !== isMuted && isActive) {
      setShowMuteFeedback(true);
      const timer = setTimeout(() => setShowMuteFeedback(false), 900);
      prevMutedRef.current = isMuted;
      return () => clearTimeout(timer);
    }
    prevMutedRef.current = isMuted;
  }, [isMuted, isActive]);

  // Sync play/pause with isActive
  useEffect(() => {
    if (isActive) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
      setProgressPercent(0);
      if (playerRef.current?.seekTo) {
        playerRef.current.seekTo(0);
      }
    }
  }, [isActive]);

  const handleProgress = (state: any) => {
    if (state && typeof state.played === "number") {
      setProgressPercent(state.played * 100);
    } else if (state && state.target && state.target.currentTime && state.target.duration) {
      setProgressPercent((state.target.currentTime / state.target.duration) * 100);
    }
  };

  const handleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap < DOUBLE_TAP_DELAY) {
      // Double tap -> Like heart burst
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 800);
    } else {
      // Single tap -> Play / Pause
      const nextPlay = !isPlaying;
      setIsPlaying(nextPlay);
      setShowPlayIcon(true);
      setTimeout(() => setShowPlayIcon(false), 500);
    }
    setLastTap(now);
  };

  const videoSrc = React.useMemo(() => {
    if (!video.m3u8Url) return "";
    const raw = video.m3u8Url;
    if (raw.startsWith("/proxy")) return raw;
    if (raw.startsWith("/") && !raw.startsWith("//")) return raw;

    try {
      const parsed = new URL(raw);
      const host = parsed.hostname.toLowerCase();
      // Direct streaming for AWS S3, BuzzClips domains, and local dev
      if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host.endsWith(".buzzclips.app") ||
        host.endsWith(".bideo.tech") ||
        host.includes("amazonaws.com")
      ) {
        return raw;
      }
    } catch {
      // fallback
    }

    return `/proxy/proxy-m3u8?url=${encodeURIComponent(raw)}`;
  }, [video.m3u8Url]);

  return (
    <div
      onClick={handleTap}
      className="relative w-full h-full bg-black select-none flex items-center justify-center overflow-hidden cursor-pointer"
    >
      {/* 9:16 Video Player with Audio */}
      {videoSrc ? (
        <div className="w-full h-full flex items-center justify-center relative pointer-events-none">
          <ReactPlayer
            ref={playerRef}
            src={videoSrc}
            playing={isPlaying && isActive}
            muted={isMuted}
            volume={1}
            loop={true}
            playsInline={true}
            width="100%"
            height="100%"
            onProgress={handleProgress as any}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              objectFit: "cover",
            }}
          />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-500 text-xs">
          Loading clip...
        </div>
      )}

      {/* Floating Audio Toggle Button (Top Right) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleMute();
        }}
        className={clsx(
          "absolute top-4 right-4 z-40 px-3 py-1.5 rounded-full backdrop-blur-md border text-white flex items-center gap-1.5 shadow-lg active:scale-95 transition-all select-none focus:outline-none",
          isMuted
            ? "bg-red-500/85 hover:bg-red-500 border-red-400 text-white animate-pulse"
            : "bg-black/60 hover:bg-black/80 border-white/20 text-white"
        )}
        aria-label={isMuted ? "Unmute audio" : "Mute audio"}
      >
        {isMuted ? (
          <>
            <VolumeX className="w-4 h-4 text-white" />
            <span className="text-xs font-bold tracking-tight">Tap for Audio</span>
          </>
        ) : (
          <>
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold">Sound On</span>
          </>
        )}
      </button>

      {/* Center Sound Notification Feedback */}
      {showMuteFeedback && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="px-4 py-2 rounded-2xl bg-black/75 backdrop-blur-md text-white border border-white/20 flex items-center gap-2 shadow-2xl animate-out fade-out duration-300">
            {isMuted ? (
              <>
                <VolumeX className="w-5 h-5 text-red-400" />
                <span className="text-sm font-bold">Audio Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-bold">Audio Playing</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Play/Pause Central Tap Indicator */}
      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center shadow-2xl animate-out fade-out zoom-out duration-300">
            {isPlaying ? (
              <Play className="w-8 h-8 fill-white ml-1" />
            ) : (
              <Pause className="w-8 h-8 fill-white" />
            )}
          </div>
        </div>
      )}

      {/* Double Tap Heart Burst Animation */}
      {showHeartBurst && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <Heart className="w-24 h-24 fill-red-500 text-red-500 drop-shadow-2xl animate-ping duration-500" />
        </div>
      )}

      {/* Right Side Action Rail */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute right-3 sm:right-4 bottom-14 sm:bottom-20 z-30"
      >
        <ReelActionRail
          video={video}
          isMuted={isMuted}
          onToggleMute={onToggleMute}
          onOpenComments={() => setCommentsOpen(true)}
          onOpenSaveModal={() => setSaveModalOpen(true)}
        />
      </div>

      {/* Bottom Info Overlay */}
      <div onClick={(e) => e.stopPropagation()}>
        <ReelBottomOverlay video={video} progressPercent={progressPercent} />
      </div>

      {/* Slide-Up Comments Drawer */}
      <div onClick={(e) => e.stopPropagation()}>
        <ReelCommentsDrawer
          videoId={video.videoId}
          videoTitle={video.video_title}
          isOpen={commentsOpen}
          onClose={() => setCommentsOpen(false)}
        />
      </div>

      {/* Save to Playlist Modal */}
      <div onClick={(e) => e.stopPropagation()}>
        <SaveToPlaylistModal
          videoId={video.videoId}
          videoTitle={video.video_title}
          isOpen={saveModalOpen}
          onClose={() => setSaveModalOpen(false)}
        />
      </div>
    </div>
  );
}
export default ReelItem;
