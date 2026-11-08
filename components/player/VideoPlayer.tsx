"use client";

import React, {
  forwardRef,
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  useCallback,
} from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  PictureInPicture2,
  RotateCcw,
  RotateCw,
  Settings,
  Check,
  Radio,
  Sliders,
  SkipBack,
  SkipForward,
  RefreshCw,
  Languages,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import clsx from "clsx";
import { normalizeS3Url } from "@/utility/s3";

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  vttUrl?: string;
  storyboardUrl?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlay?: (currentTime: number, duration: number) => void;
  onPause?: (currentTime: number, duration: number) => void;
  initialTime?: number;
  isLive?: boolean;
  onPrevChannel?: () => void;
  onNextChannel?: () => void;
  channelName?: string;
  channelNumber?: string;
  countryFlag?: string;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const VideoPlayer = forwardRef<any, VideoPlayerProps>(
  (
    {
      src,
      poster,
      onTimeUpdate,
      onPlay,
      onPause,
      initialTime,
      isLive = false,
      onPrevChannel,
      onNextChannel,
      channelName,
      channelNumber,
      countryFlag,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const seekRippleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const initialSeekDone = useRef(false);

    // Player State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [bufferedEnd, setBufferedEnd] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [seekRipple, setSeekRipple] = useState<"forward" | "backward" | null>(null);
    const [centerPulse, setCenterPulse] = useState<"play" | "pause" | null>(null);
    const [isReloading, setIsReloading] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);

    // Live DVR Sliding Window State
    const [liveRange, setLiveRange] = useState<{ start: number; end: number; window: number }>({
      start: 0,
      end: 0,
      window: 0,
    });

    // Quality levels from HLS
    const [qualityLevels, setQualityLevels] = useState<{ id: number; height: number; bitrate: number }[]>([]);
    const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto

    // Audio tracks from HLS
    const [audioTracks, setAudioTracks] = useState<{ id: number; name: string; lang?: string }[]>([]);
    const [currentAudioTrack, setCurrentAudioTrack] = useState<number>(-1);

    // Hover tooltip state
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverPos, setHoverPos] = useState<number>(0);
    const [liveHoverBehind, setLiveHoverBehind] = useState<number | null>(null);

    // Optimized source resolution: only proxy if external cross-origin m3u8
    const proxySrc = React.useMemo(() => {
      if (!src) return "";
      const normalized = normalizeS3Url(src);
      if (normalized.startsWith("/proxy")) return normalized;

      // Relative URLs never need proxying
      if (normalized.startsWith("/") && !normalized.startsWith("//")) return normalized;

      try {
        const parsed = new URL(normalized);
        const host = parsed.hostname.toLowerCase();
        // Same-origin, direct AWS S3, or known CORS-enabled BuzzClips domains stream directly
        if (
          host === "localhost" ||
          host === "127.0.0.1" ||
          host.endsWith(".buzzclips.app") ||
          host.endsWith(".bideo.tech") ||
          host.includes("amazonaws.com")
        ) {
          return normalized;
        }
      } catch {
        // Not a standard URL, fallback
      }

      // External streams (e.g. FTA Live TV without permissive CORS) go through proxy
      return `/proxy/proxy-m3u8?url=${encodeURIComponent(normalized)}`;
    }, [src]);

    // Reset buffering indicator whenever stream source changes
    useEffect(() => {
      setIsBuffering(true);
    }, [proxySrc]);

    // Calculate live DVR seekable range
    const getLiveRange = useCallback(() => {
      const video = videoRef.current;
      if (!video) return { start: 0, end: 0, window: 0 };
      try {
        if (video.seekable && video.seekable.length > 0) {
          const start = video.seekable.start(0);
          const end = video.seekable.end(video.seekable.length - 1);
          return { start, end, window: Math.max(0, end - start) };
        }
      } catch {
        // ignore
      }
      const end = hlsRef.current?.liveSyncPosition || video.duration || 0;
      const start = Math.max(0, end - 120);
      return { start, end, window: Math.max(0, end - start) };
    }, []);

    // How far behind the live broadcast edge are we?
    const currentLiveEnd =
      liveRange.end > 0
        ? liveRange.end
        : hlsRef.current?.liveSyncPosition || duration || currentTime;
    const behindSeconds = isLive ? Math.max(0, currentLiveEnd - currentTime) : 0;
    const isAtLiveEdge = isLive ? behindSeconds <= 6 : false;

    // Expose imperative API for parent components
    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = seconds;
          setCurrentTime(seconds);
        }
      },
      getCurrentTime: () => videoRef.current?.currentTime || 0,
      getDuration: () => videoRef.current?.duration || 0,
      play: () => videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
      getInternalPlayer: () => videoRef.current,
    }));

    // Auto-seek to initial saved playback progress once metadata loads
    useEffect(() => {
      if (
        !isLive &&
        initialTime &&
        initialTime > 5 &&
        !initialSeekDone.current &&
        videoRef.current &&
        videoRef.current.readyState >= 1
      ) {
        initialSeekDone.current = true;
        videoRef.current.currentTime = initialTime;
        setCurrentTime(initialTime);
      }
    }, [initialTime, isLive]);

    // Format seconds into MM:SS or HH:MM:SS
    const formatTime = (seconds: number) => {
      if (isNaN(seconds) || seconds < 0) return "0:00";
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      if (h > 0) {
        return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
      }
      return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    // Initialize Hls.js or native video
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !proxySrc) return;

      if (Hls.isSupported()) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: isLive,
          testBandwidth: false, // Prevents downloading test fragments across multiple renditions!
          startFragPrefetch: true, // Immediately prefetch chunk 0 of the chosen rendition
          capLevelToPlayerSize: true, // Don't download higher resolutions than container viewport
          abrEwmaDefaultEstimate: 2500000, // 2.5 Mbps sensible start estimate (clean ~720p without probing)
          backBufferLength: isLive ? 300 : 60,
          maxBufferLength: isLive ? 30 : 20,
          maxMaxBufferLength: isLive ? 60 : 40,
          maxBufferSize: 30 * 1000 * 1000,
          liveDurationInfinity: isLive,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 15,
        });

        hls.loadSource(proxySrc);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          const levels = data.levels.map((lvl, index) => ({
            id: index,
            height: lvl.height,
            bitrate: lvl.bitrate,
          }));
          setQualityLevels(levels);
          setCurrentQuality(hls.currentLevel);

          if (isLive) {
            setLiveRange(getLiveRange());
          }
        });

        // Track fragment and buffer progress for seamless loading indicator
        hls.on(Hls.Events.FRAG_LOADING, () => {
          if (video.readyState < 3) {
            setIsBuffering(true);
          }
        });

        hls.on(Hls.Events.FRAG_LOADED, () => {
          if (video.readyState >= 3) {
            setIsBuffering(false);
          }
        });

        hls.on(Hls.Events.BUFFER_APPENDED, () => {
          if (video.readyState >= 3) {
            setIsBuffering(false);
          }
        });

        // Multi-audio track discovery
        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
          if (data.audioTracks && data.audioTracks.length > 0) {
            setAudioTracks(
              data.audioTracks.map((t, idx) => ({
                id: idx,
                name: t.name || t.lang || `Track ${idx + 1}`,
                lang: t.lang,
              }))
            );
            setCurrentAudioTrack(hls.audioTrack);
          }
        });

        hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
          setCurrentAudioTrack(data.id);
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          setCurrentQuality(hls.autoLevelEnabled ? -1 : data.level);
        });

        hls.on(Hls.Events.ERROR, (_, err) => {
          if (err.fatal) {
            switch (err.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setIsBuffering(true);
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                break;
            }
          }
        });

        hlsRef.current = hls;

        return () => {
          hls.destroy();
          hlsRef.current = null;
        };
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native Safari HLS
        video.src = proxySrc;
      }
    }, [proxySrc, isLive, getLiveRange]);

    // Handle Controls Visibility on Mouse Activity
    const handleActivity = useCallback(() => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 3000);
    }, [isPlaying]);

    useEffect(() => {
      if (!isPlaying) {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      }
    }, [isPlaying]);

    // Play / Pause Toggle
    const togglePlay = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;

      if (video.paused) {
        video.play().catch(() => {});
        setCenterPulse("play");
      } else {
        video.pause();
        setCenterPulse("pause");
      }
      setTimeout(() => setCenterPulse(null), 500);
    }, []);

    // Seek Helper (Supports Live DVR time-shifting)
    const seekRelative = useCallback(
      (deltaSeconds: number) => {
        const video = videoRef.current;
        if (!video) return;

        if (isLive) {
          const range = getLiveRange();
          const minTime = range.start;
          const maxTime = range.end > 0 ? range.end - 0.5 : video.currentTime;
          const target = Math.max(minTime, Math.min(maxTime, video.currentTime + deltaSeconds));
          video.currentTime = target;
          setCurrentTime(target);
        } else {
          video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + deltaSeconds));
        }

        setSeekRipple(deltaSeconds > 0 ? "forward" : "backward");
        if (seekRippleTimeoutRef.current) clearTimeout(seekRippleTimeoutRef.current);
        seekRippleTimeoutRef.current = setTimeout(() => setSeekRipple(null), 600);
      },
      [isLive, getLiveRange]
    );

    // Jump to real-time live edge
    const jumpToLive = useCallback(() => {
      const video = videoRef.current;
      if (!video || !isLive) return;
      const range = getLiveRange();
      const target = hlsRef.current?.liveSyncPosition || (range.end > 1 ? range.end - 0.5 : video.duration);
      if (target > 0) {
        video.currentTime = target;
        setCurrentTime(target);
        video.play().catch(() => {});
      }
    }, [isLive, getLiveRange]);

    // Reload stream / Reconnect
    const reloadStream = useCallback(() => {
      setIsReloading(true);
      const video = videoRef.current;
      if (hlsRef.current) {
        hlsRef.current.stopLoad();
        hlsRef.current.startLoad();
        if (video) video.play().catch(() => {});
      } else if (video) {
        video.load();
        video.play().catch(() => {});
      }
      setTimeout(() => setIsReloading(false), 900);
    }, []);

    // Fullscreen Toggle
    const toggleFullscreen = useCallback(() => {
      const container = containerRef.current as any;
      const video = videoRef.current as any;
      const doc = document as any;

      const isFs = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement ||
        (video && video.webkitDisplayingFullscreen)
      );

      if (!isFs) {
        if (container?.requestFullscreen) {
          container.requestFullscreen().catch(() => {
            if (video?.webkitEnterFullscreen) {
              video.webkitEnterFullscreen();
            }
          });
          setIsFullscreen(true);
        } else if (container?.webkitRequestFullscreen) {
          container.webkitRequestFullscreen();
          setIsFullscreen(true);
        } else if (video?.webkitEnterFullscreen) {
          video.webkitEnterFullscreen();
          setIsFullscreen(true);
        } else if (video?.requestFullscreen) {
          video.requestFullscreen().catch(() => {});
          setIsFullscreen(true);
        }
      } else {
        if (doc.exitFullscreen) {
          doc.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (video?.webkitExitFullscreen) {
          video.webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    }, []);

    // Sync fullscreen state
    useEffect(() => {
      const handleFullscreenChange = () => {
        const doc = document as any;
        const video = videoRef.current as any;
        const fsActive = !!(
          doc.fullscreenElement ||
          doc.webkitFullscreenElement ||
          doc.mozFullScreenElement ||
          doc.msFullscreenElement ||
          (video && video.webkitDisplayingFullscreen)
        );
        setIsFullscreen(fsActive);
      };

      document.addEventListener("fullscreenchange", handleFullscreenChange);
      document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.addEventListener("mozfullscreenchange", handleFullscreenChange);
      document.addEventListener("MSFullscreenChange", handleFullscreenChange);

      const video = videoRef.current as any;
      const onWebkitBegin = () => setIsFullscreen(true);
      const onWebkitEnd = () => setIsFullscreen(false);

      if (video) {
        video.addEventListener("webkitbeginfullscreen", onWebkitBegin);
        video.addEventListener("webkitendfullscreen", onWebkitEnd);
      }

      return () => {
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
        document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
        document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
        document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
        if (video) {
          video.removeEventListener("webkitbeginfullscreen", onWebkitBegin);
          video.removeEventListener("webkitendfullscreen", onWebkitEnd);
        }
      };
    }, []);

    // PiP Toggle
    const togglePip = useCallback(async () => {
      const video = videoRef.current;
      if (!video) return;

      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
          await video.requestPictureInPicture();
        }
      } catch {
        // ignore
      }
    }, []);

    // Volume Change
    const handleVolumeChange = useCallback((newVol: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.volume = newVol;
      setVolume(newVol);
      setIsMuted(newVol === 0);
    }, []);

    const toggleMute = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;
      setIsMuted((prev) => {
        const nextMuted = !prev;
        video.muted = nextMuted;
        return nextMuted;
      });
    }, []);

    // Quality selection
    const handleQualityChange = (levelIndex: number) => {
      if (!hlsRef.current) return;
      hlsRef.current.currentLevel = levelIndex;
      setCurrentQuality(levelIndex);
    };

    // Audio track selection
    const handleAudioTrackChange = (trackIndex: number) => {
      if (!hlsRef.current) return;
      hlsRef.current.audioTrack = trackIndex;
      setCurrentAudioTrack(trackIndex);
    };

    // Playback rate selection
    const handleRateChange = (rate: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.playbackRate = rate;
      setPlaybackRate(rate);
    };

    // Scrubber Scrubbing (Supports Live DVR)
    const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
      const video = videoRef.current;
      if (!video) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

      if (isLive) {
        const range = getLiveRange();
        if (range.window > 0) {
          const targetTime = range.start + pos * range.window;
          video.currentTime = targetTime;
          setCurrentTime(targetTime);
        }
      } else if (video.duration) {
        video.currentTime = pos * video.duration;
        setCurrentTime(video.currentTime);
      }
    };

    const handleScrubHover = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setHoverPos(e.clientX - rect.left);

      if (isLive) {
        const range = getLiveRange();
        const hoverTimeTarget = range.start + pos * range.window;
        const hoverBehind = Math.max(0, range.end - hoverTimeTarget);
        setLiveHoverBehind(hoverBehind);
        setHoverTime(hoverTimeTarget);
      } else if (duration > 0) {
        setHoverTime(pos * duration);
      }
    };

    // Keyboard Shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        const activeTag = (document.activeElement?.tagName || "").toLowerCase();
        if (activeTag === "input" || activeTag === "textarea") return;

        switch (e.key.toLowerCase()) {
          case " ":
          case "k":
            e.preventDefault();
            togglePlay();
            break;
          case "j":
          case "arrowleft":
            e.preventDefault();
            seekRelative(-10);
            break;
          case "arrowright":
            e.preventDefault();
            seekRelative(10);
            break;
          case "l":
            e.preventDefault();
            if (isLive) {
              jumpToLive();
            } else {
              seekRelative(10);
            }
            break;
          case "arrowup":
            e.preventDefault();
            setVolume((prevVol) => {
              const newVol = Math.min(1, Number((prevVol + 0.1).toFixed(2)));
              if (videoRef.current) videoRef.current.volume = newVol;
              setIsMuted(newVol === 0);
              return newVol;
            });
            break;
          case "arrowdown":
            e.preventDefault();
            setVolume((prevVol) => {
              const newVol = Math.max(0, Number((prevVol - 0.1).toFixed(2)));
              if (videoRef.current) videoRef.current.volume = newVol;
              setIsMuted(newVol === 0);
              return newVol;
            });
            break;
          case "m":
            e.preventDefault();
            toggleMute();
            break;
          case "f":
            e.preventDefault();
            toggleFullscreen();
            break;
          case "p":
            e.preventDefault();
            togglePip();
            break;
          case "r":
            if (isLive) {
              e.preventDefault();
              reloadStream();
            }
            break;
          case "[":
            if (onPrevChannel) {
              e.preventDefault();
              onPrevChannel();
            }
            break;
          case "]":
            if (onNextChannel) {
              e.preventDefault();
              onNextChannel();
            }
            break;
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
      togglePlay,
      seekRelative,
      jumpToLive,
      reloadStream,
      toggleFullscreen,
      toggleMute,
      togglePip,
      isLive,
      onPrevChannel,
      onNextChannel,
    ]);

    // Sync Video Events
    const handleTimeUpdate = () => {
      const video = videoRef.current;
      if (!video) return;
      const cur = video.currentTime;
      const dur = video.duration || 0;
      setCurrentTime(cur);
      if (video.buffered.length > 0) {
        setBufferedEnd(video.buffered.end(video.buffered.length - 1));
      }
      if (isLive) {
        setLiveRange(getLiveRange());
      }
      onTimeUpdate?.(cur, dur);
    };

    // Calculate percentage played and buffered
    const playedPercent = isLive
      ? liveRange.window > 0
        ? Math.max(0, Math.min(100, ((currentTime - liveRange.start) / liveRange.window) * 100))
        : 100
      : duration > 0
      ? (currentTime / duration) * 100
      : 0;

    const bufferedPercent = isLive
      ? liveRange.window > 0
        ? Math.max(0, Math.min(100, ((bufferedEnd - liveRange.start) / liveRange.window) * 100))
        : 100
      : duration > 0
      ? (bufferedEnd / duration) * 100
      : 0;

    return (
      <div
        ref={containerRef}
        onMouseMove={handleActivity}
        onMouseEnter={handleActivity}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden select-none group shadow-2xl ring-1 ring-border/40 focus:outline-none"
        tabIndex={0}
      >
        {/* Native Video Element */}
        <video
          ref={videoRef}
          poster={poster ? normalizeS3Url(poster) : undefined}
          playsInline
          onClick={togglePlay}
          onDoubleClick={toggleFullscreen}
          onPlay={() => {
            setIsPlaying(true);
            setIsBuffering(false);
            if (videoRef.current) {
              onPlay?.(videoRef.current.currentTime, videoRef.current.duration || 0);
            }
          }}
          onPause={() => {
            setIsPlaying(false);
            if (videoRef.current) {
              onPause?.(videoRef.current.currentTime, videoRef.current.duration || 0);
            }
          }}
          onLoadStart={() => setIsBuffering(true)}
          onWaiting={() => setIsBuffering(true)}
          onSeeking={() => setIsBuffering(true)}
          onCanPlay={() => setIsBuffering(false)}
          onPlaying={() => {
            setIsPlaying(true);
            setIsBuffering(false);
          }}
          onSeeked={() => setIsBuffering(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              const dur = videoRef.current.duration;
              setDuration(dur);
              if (isLive) setLiveRange(getLiveRange());
              if (!isLive && initialTime && initialTime > 5 && !initialSeekDone.current) {
                initialSeekDone.current = true;
                videoRef.current.currentTime = initialTime;
                setCurrentTime(initialTime);
              }
            }
          }}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Buffering & First Chunk Loading Overlay */}
        {isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 transition-opacity duration-300">
            <div className="flex flex-col items-center gap-3 px-6 py-4 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping opacity-30" />
                <Loader2 className="w-9 h-9 text-primary animate-spin" />
              </div>
              <div className="flex flex-col items-center text-center select-none">
                <span className="text-xs font-semibold text-white tracking-wide">
                  {isLive ? "Connecting to live stream..." : "Loading video..."}
                </span>
                <span className="text-[10px] text-zinc-400 mt-0.5">
                  Waiting for first chunk
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Center Ripple Icons for Tap / Playback Feedback */}
        {centerPulse && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white scale-110 animate-ping">
              {centerPulse === "play" ? (
                <Play className="w-8 h-8 fill-current ml-1" />
              ) : (
                <Pause className="w-8 h-8 fill-current" />
              )}
            </div>
          </div>
        )}

        {/* Seek Animations Feedback */}
        {seekRipple && (
          <div
            className={clsx(
              "absolute inset-y-0 w-1/3 flex items-center justify-center pointer-events-none z-20 bg-white/5 backdrop-blur-xs",
              seekRipple === "backward" ? "left-0" : "right-0"
            )}
          >
            <div className="flex flex-col items-center gap-1 text-white font-bold text-xs animate-bounce">
              {seekRipple === "backward" ? (
                <>
                  <RotateCcw className="w-7 h-7" />
                  <span>-10s</span>
                </>
              ) : (
                <>
                  <RotateCw className="w-7 h-7" />
                  <span>+10s</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Floating Top Bar (Channel Brand, Live Badge, and Reload) */}
        <div
          className={clsx(
            "absolute top-0 left-0 right-0 p-3 sm:p-4 flex items-center justify-between z-30 transition-opacity duration-300 pointer-events-none",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Top Left: Channel Quick Info */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {channelNumber && (
              <span className="font-mono bg-red-600/90 text-white px-2 py-0.5 rounded-lg text-xs font-black shadow-md">
                CH {channelNumber}
              </span>
            )}
            {channelName && (
              <span className="text-xs sm:text-sm font-bold text-white drop-shadow-md flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-white/10">
                <span>{countryFlag}</span>
                <span>{channelName}</span>
              </span>
            )}
          </div>

          {/* Top Right: Status Badge & Reload Stream button */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {isLive && (
              <button
                onClick={jumpToLive}
                className={clsx(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer backdrop-blur-md border",
                  isAtLiveEdge
                    ? "bg-red-600/90 text-white border-red-500/30 shadow-lg shadow-red-600/20"
                    : "bg-zinc-800/90 hover:bg-zinc-700 text-white border-white/20"
                )}
                title={isAtLiveEdge ? "Watching Live" : "Behind Live — Click to Go Live (L)"}
              >
                <Radio className={clsx("w-3.5 h-3.5", isAtLiveEdge && "animate-pulse")} />
                <span>{isAtLiveEdge ? "LIVE" : `-${formatTime(Math.round(behindSeconds))}`}</span>
              </button>
            )}

            {isLive && (
              <Button
                variant="ghost"
                size="icon"
                onClick={reloadStream}
                className="h-7 w-7 text-white/90 hover:text-white bg-black/40 hover:bg-black/60 rounded-full border border-white/10 backdrop-blur-md cursor-pointer"
                title="Reload Live Stream (r)"
              >
                <RefreshCw className={clsx("w-3.5 h-3.5", isReloading && "animate-spin")} />
              </Button>
            )}
          </div>
        </div>

        {/* Browser Autoplay Muted Notification Prompt */}
        {isLive && isMuted && isPlaying && (
          <button
            onClick={toggleMute}
            className="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/85 hover:bg-black text-white text-xs font-semibold border border-white/20 shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          >
            <VolumeX className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Audio is muted — Click to Unmute</span>
          </button>
        )}

        {/* Bottom Floating Control Bar */}
        <div
          className={clsx(
            "absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent z-30 transition-all duration-300 space-y-2",
            showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
          )}
        >
          {/* Precision Scrubber Bar (Supports both VOD & Live DVR time-shifting) */}
          <div
            onClick={handleScrub}
            onMouseMove={handleScrubHover}
            onMouseLeave={() => {
              setHoverTime(null);
              setLiveHoverBehind(null);
            }}
            className="relative w-full py-2 -my-2 cursor-pointer group/scrub"
          >
            <div className="relative w-full h-1.5 group-hover/scrub:h-2.5 bg-white/25 rounded-full transition-all duration-150 overflow-hidden">
              {/* Buffer Bar */}
              <div
                style={{ width: `${bufferedPercent}%` }}
                className="absolute top-0 left-0 bottom-0 bg-white/40 rounded-full transition-all duration-200"
              />
              {/* Played Bar */}
              <div
                style={{ width: `${playedPercent}%` }}
                className={clsx(
                  "absolute top-0 left-0 bottom-0 rounded-full transition-all duration-75",
                  isLive && isAtLiveEdge ? "bg-red-500" : "bg-red-600"
                )}
              />
            </div>
            {/* Scrubber Thumb */}
            <div
              style={{ left: `${playedPercent}%` }}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-red-600 shadow-md scale-0 group-hover/scrub:scale-100 transition-transform pointer-events-none"
            />
            {/* Hover Tooltip (DVR Relative or VOD timestamp) */}
            {hoverTime !== null && (
              <div
                style={{ left: `${hoverPos}px` }}
                className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-black/95 text-white border border-white/25 shadow-lg pointer-events-none whitespace-nowrap"
              >
                {isLive ? (
                  liveHoverBehind !== null && liveHoverBehind <= 5 ? (
                    <span className="text-red-400 font-bold">🔴 LIVE</span>
                  ) : (
                    `-${formatTime(Math.round(liveHoverBehind || 0))}`
                  )
                ) : (
                  formatTime(hoverTime)
                )}
              </div>
            )}
          </div>

          {/* Control Buttons Row */}
          <div className="flex items-center justify-between text-white select-none gap-1 sm:gap-2 overflow-x-hidden">
            {/* Left Controls: Channel Switch, Play/Pause, Rewind/Forward, Volume, Live Badge */}
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 shrink">
              {/* Previous Channel (when available) */}
              {onPrevChannel && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPrevChannel}
                  className="h-8 w-8 text-white/90 hover:text-white hover:bg-white/15 rounded-full transition-transform active:scale-90 shrink-0 cursor-pointer"
                  title="Previous Channel ([)"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
              )}

              {/* Play / Pause Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="h-8 w-8 sm:h-9 sm:w-9 text-white hover:text-white hover:bg-white/15 rounded-full transition-transform active:scale-90 shrink-0 cursor-pointer"
                title={isPlaying ? "Pause (k / space)" : "Play (k / space)"}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                ) : (
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
                )}
              </Button>

              {/* Next Channel (when available) */}
              {onNextChannel && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNextChannel}
                  className="h-8 w-8 text-white/90 hover:text-white hover:bg-white/15 rounded-full transition-transform active:scale-90 shrink-0 cursor-pointer"
                  title="Next Channel (])"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              )}

              {/* Rewind -10s (Enabled for both Live DVR & VOD) */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => seekRelative(-10)}
                className="h-8 w-8 text-white/90 hover:text-white hover:bg-white/15 rounded-full inline-flex shrink-0 cursor-pointer"
                title="Rewind 10s (j / left arrow)"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>

              {/* Forward +10s (Enabled for both Live DVR & VOD) */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => seekRelative(10)}
                disabled={isLive && isAtLiveEdge}
                className="h-8 w-8 text-white/90 hover:text-white hover:bg-white/15 rounded-full inline-flex shrink-0 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                title="Forward 10s (right arrow)"
              >
                <RotateCw className="w-4 h-4" />
              </Button>

              {/* Volume Slider Group */}
              <div className="flex items-center gap-1 group/vol shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="h-8 w-8 text-white/90 hover:text-white hover:bg-white/15 rounded-full transition-transform active:scale-90 shrink-0 cursor-pointer"
                  title={isMuted ? "Unmute (m)" : "Mute (m)"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, #ef4444 ${
                      isMuted ? 0 : Math.round(volume * 100)
                    }%, rgba(255,255,255,0.25) ${isMuted ? 0 : Math.round(volume * 100)}%)`,
                  }}
                  className="hidden sm:inline-block w-14 sm:w-20 hover:w-24 transition-all duration-200 h-1.5 rounded-full accent-red-500 cursor-pointer shadow-xs focus:outline-none"
                  title={`Volume: ${isMuted ? 0 : Math.round(volume * 100)}% (Up/Down arrow)`}
                  aria-label="Volume slider"
                />
              </div>

              {/* Time Display & DVR Live Status Button */}
              <div className="text-[11px] sm:text-xs font-mono text-white/90 shrink-0">
                {isLive ? (
                  <button
                    onClick={jumpToLive}
                    className={clsx(
                      "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border transition-all cursor-pointer whitespace-nowrap",
                      isAtLiveEdge
                        ? "text-red-500 font-bold bg-red-500/10 border-red-500/20"
                        : "text-zinc-200 bg-zinc-800/90 hover:bg-zinc-700/90 border-white/20"
                    )}
                    title={isAtLiveEdge ? "You are watching live" : "Click to jump to live edge (L)"}
                  >
                    <span
                      className={clsx(
                        "w-2 h-2 rounded-full",
                        isAtLiveEdge ? "bg-red-500 animate-pulse" : "bg-zinc-400"
                      )}
                    />
                    <span>{isAtLiveEdge ? "LIVE" : `-${formatTime(Math.round(behindSeconds))}`}</span>
                    {!isAtLiveEdge && (
                      <span className="text-[10px] text-red-400 font-bold uppercase hidden sm:inline">
                        • GO LIVE
                      </span>
                    )}
                  </button>
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-black/40 whitespace-nowrap">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                )}
              </div>
            </div>

            {/* Right Controls: Audio Tracks, Quality, Speed, PiP, Fullscreen */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Multi-language Audio Track Menu (when broadcast contains multiple audio streams) */}
              {audioTracks.length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-1.5 sm:px-2 text-xs font-semibold text-white/90 hover:text-white hover:bg-white/10 rounded-full gap-1 shrink-0 cursor-pointer"
                      title="Audio Language"
                    >
                      <Languages className="w-3.5 h-3.5 text-primary" />
                      <span className="hidden md:inline">Audio</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    container={containerRef.current}
                    align="end"
                    className="w-40 bg-zinc-900/95 border-zinc-800 text-white text-xs z-[9999]"
                  >
                    <DropdownMenuLabel className="text-[11px] text-zinc-400">Audio Track</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    {audioTracks.map((track) => (
                      <DropdownMenuItem
                        key={track.id}
                        onClick={() => handleAudioTrackChange(track.id)}
                        className="justify-between cursor-pointer focus:bg-zinc-800"
                      >
                        <span>{track.name}</span>
                        {currentAudioTrack === track.id && <Check className="w-3.5 h-3.5 text-primary" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Stream Quality Selector Menu */}
              {qualityLevels.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-1.5 sm:px-2 text-xs font-semibold text-white/90 hover:text-white hover:bg-white/10 rounded-full gap-1 shrink-0 cursor-pointer"
                      title="Quality"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">
                        {currentQuality === -1 ? "Auto" : `${qualityLevels[currentQuality]?.height}p`}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    container={containerRef.current}
                    align="end"
                    className="w-36 bg-zinc-900/95 border-zinc-800 text-white text-xs z-[9999]"
                  >
                    <DropdownMenuLabel className="text-[11px] text-zinc-400">Stream Quality</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem
                      onClick={() => handleQualityChange(-1)}
                      className="justify-between cursor-pointer focus:bg-zinc-800"
                    >
                      <span>Auto</span>
                      {currentQuality === -1 && <Check className="w-3.5 h-3.5 text-primary" />}
                    </DropdownMenuItem>
                    {qualityLevels.map((lvl) => (
                      <DropdownMenuItem
                        key={lvl.id}
                        onClick={() => handleQualityChange(lvl.id)}
                        className="justify-between cursor-pointer focus:bg-zinc-800"
                      >
                        <span>{lvl.height}p</span>
                        {currentQuality === lvl.id && <Check className="w-3.5 h-3.5 text-primary" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Playback Speed Menu (Available for VOD and Live DVR mode) */}
              {(!isLive || !isAtLiveEdge) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-1.5 sm:px-2 text-xs font-semibold text-white/90 hover:text-white hover:bg-white/10 rounded-full gap-1 shrink-0 cursor-pointer"
                      title="Playback Speed"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{playbackRate}x</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    container={containerRef.current}
                    align="end"
                    className="w-32 bg-zinc-900/95 border-zinc-800 text-white text-xs z-[9999]"
                  >
                    <DropdownMenuLabel className="text-[11px] text-zinc-400">
                      {isLive ? "Catch-up Speed" : "Playback Speed"}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    {PLAYBACK_RATES.map((rate) => (
                      <DropdownMenuItem
                        key={rate}
                        onClick={() => handleRateChange(rate)}
                        className="justify-between cursor-pointer focus:bg-zinc-800"
                      >
                        <span>{rate === 1 ? "Normal" : `${rate}x`}</span>
                        {playbackRate === rate && <Check className="w-3.5 h-3.5 text-primary" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Picture in Picture */}
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePip}
                className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10 rounded-full hidden sm:inline-flex shrink-0 cursor-pointer"
                title="Picture in Picture (p)"
              >
                <PictureInPicture2 className="w-4 h-4" />
              </Button>

              {/* Fullscreen Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10 rounded-full shrink-0 flex items-center justify-center p-0 cursor-pointer"
                title={isFullscreen ? "Exit Fullscreen (f)" : "Fullscreen (f)"}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";
export default VideoPlayer;
