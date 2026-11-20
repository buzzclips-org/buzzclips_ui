"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Project } from "@/lib/editor/types";
import { clipDuration, fadeAmount, locate, outputSize, totalDuration } from "@/lib/editor/timeline";
import { drawFrame } from "@/lib/editor/render";

/** Minimal external store so only components that need the playhead re-render 60×/s. */
export class TimeStore {
  private time = 0;
  private listeners = new Set<() => void>();
  get = () => this.time;
  set = (t: number) => {
    if (t === this.time) return;
    this.time = t;
    this.listeners.forEach((l) => l());
  };
  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
}

export function useTime(store: TimeStore): number {
  return useSyncExternalStore(store.subscribe, store.get, () => 0);
}

/** Preview canvas size cap. Low-memory devices (navigator.deviceMemory ≤ 4 GB) get a lighter preview. */
const PREVIEW_MAX_EDGE =
  typeof navigator !== "undefined" && ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4 ? 854 : 1280;

type MediaEl = HTMLVideoElement | HTMLImageElement;

export function usePreviewPlayer(
  project: Project,
  mediaUrls: Record<string, string>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  const [store] = useState(() => new TimeStore());
  const [playing, setPlaying] = useState(false);
  const projectRef = useRef(project);
  const playingRef = useRef(false);
  const elementsRef = useRef(new Map<string, MediaEl>());
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const activeClipRef = useRef<string | null>(null);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const lastTickRef = useRef<number>(0);
  /** Redraw needed while paused (seek, edit, media loaded). Avoids re-compositing 60×/s when idle. */
  const dirtyRef = useRef(true);

  if (projectRef.current !== project) dirtyRef.current = true;
  projectRef.current = project;

  // Create/destroy media elements as assets come and go.
  useEffect(() => {
    const els = elementsRef.current;
    for (const asset of project.assets) {
      const url = mediaUrls[asset.id];
      if (!url || els.has(asset.id) || asset.kind === "audio") continue;
      if (asset.kind === "video") {
        const v = document.createElement("video");
        // Only buffer metadata up front; the active/next clip is upgraded to "auto" on demand.
        // Buffering every imported video at once is what used to balloon tab memory.
        v.preload = "metadata";
        v.src = url;
        const markDirty = () => (dirtyRef.current = true);
        v.addEventListener("loadeddata", markDirty);
        v.addEventListener("seeked", markDirty);
        v.playsInline = true;
        (v as HTMLVideoElement & { preservesPitch?: boolean }).preservesPitch = false;
        els.set(asset.id, v);
      } else {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => (dirtyRef.current = true);
        img.src = url;
        els.set(asset.id, img);
      }
    }
    for (const [id, el] of els) {
      if (!project.assets.some((a) => a.id === id) || !mediaUrls[id]) {
        if (el instanceof HTMLVideoElement) {
          el.pause();
          el.removeAttribute("src");
          el.load();
        }
        els.delete(id);
        if (activeVideoRef.current === el) activeVideoRef.current = null;
      }
    }
  }, [project.assets, mediaUrls]);

  // Background music element.
  const musicUrl = project.music ? mediaUrls[project.music.assetId] : undefined;
  useEffect(() => {
    if (!musicUrl) {
      musicRef.current?.pause();
      musicRef.current = null;
      return;
    }
    const a = new Audio(musicUrl);
    a.preload = "auto";
    musicRef.current = a;
    return () => {
      a.pause();
      a.removeAttribute("src");
    };
  }, [musicUrl]);

  const pauseAllMedia = useCallback(() => {
    for (const el of elementsRef.current.values()) {
      if (el instanceof HTMLVideoElement && !el.paused) el.pause();
    }
    musicRef.current?.pause();
  }, []);

  const pause = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    pauseAllMedia();
  }, [pauseAllMedia]);

  const play = useCallback(() => {
    const total = totalDuration(projectRef.current.clips);
    if (total <= 0) return;
    if (store.get() >= total - 0.05) store.set(0);
    activeClipRef.current = null;
    lastTickRef.current = performance.now();
    playingRef.current = true;
    setPlaying(true);
  }, [store]);

  const toggle = useCallback(() => (playingRef.current ? pause() : play()), [pause, play]);

  const seek = useCallback(
    (t: number) => {
      const total = totalDuration(projectRef.current.clips);
      store.set(Math.min(Math.max(0, t), total));
      activeClipRef.current = null;
      dirtyRef.current = true;
    },
    [store]
  );

  // Main render loop.
  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const p = projectRef.current;
      const canvas = canvasRef.current;
      const total = totalDuration(p.clips);
      const dt = Math.min(0.25, (now - (lastTickRef.current || now)) / 1000);
      lastTickRef.current = now;
      let t = Math.min(store.get(), total);

      const hit = locate(p.clips, t);
      const el = hit ? elementsRef.current.get(hit.clip.assetId) : undefined;
      const video = el instanceof HTMLVideoElement ? el : null;

      if (activeVideoRef.current && activeVideoRef.current !== video) {
        activeVideoRef.current.pause();
        dirtyRef.current = true;
      }
      activeVideoRef.current = video;
      if (video && video.preload !== "auto") video.preload = "auto";
      // Warm up the next clip so the cut is seamless, without buffering everything else.
      if (hit && playingRef.current) {
        const next = p.clips[hit.index + 1];
        const nextEl = next ? elementsRef.current.get(next.assetId) : undefined;
        if (nextEl instanceof HTMLVideoElement && nextEl.preload !== "auto") nextEl.preload = "auto";
      }

      const fade = fadeAmount(t, total, p.settings.fadeIn, p.settings.fadeOut);

      if (hit && video) {
        const clipChanged = activeClipRef.current !== hit.clip.id;
        if (clipChanged) {
          activeClipRef.current = hit.clip.id;
          if (Math.abs(video.currentTime - hit.sourceTime) > 0.05) video.currentTime = hit.sourceTime;
        }
        video.playbackRate = hit.clip.speed;
        video.volume = hit.clip.muted ? 0 : Math.min(1, hit.clip.volume * (1 - fade));

        if (playingRef.current) {
          if (video.paused && !video.seeking) video.play().catch(() => pause());
          if (!video.seeking && video.readyState >= 2) {
            t = hit.start + Math.max(0, video.currentTime - hit.clip.in) / hit.clip.speed;
          }
          const clipEnd = hit.start + clipDuration(hit.clip);
          if (video.ended || video.currentTime >= hit.clip.out - 0.015 || t >= clipEnd) {
            t = clipEnd + 1e-4;
            video.pause();
          }
        } else {
          if (!video.paused) video.pause();
          if (!video.seeking && Math.abs(video.currentTime - hit.sourceTime) > 0.04) {
            video.currentTime = hit.sourceTime;
          }
        }
      } else if (playingRef.current) {
        activeClipRef.current = hit?.clip.id ?? null;
        t += dt;
      }

      if (playingRef.current && t >= total) {
        t = total;
        playingRef.current = false;
        setPlaying(false);
        pauseAllMedia();
      }
      store.set(t);

      // Background music sync.
      const music = p.music;
      const audio = musicRef.current;
      if (audio && music) {
        let mt = music.trimStart + (t - music.offset);
        const dur = Number.isFinite(audio.duration) ? audio.duration : Infinity;
        if (music.loop && Number.isFinite(dur) && mt >= dur && dur > music.trimStart) {
          mt = music.trimStart + ((mt - music.trimStart) % (dur - music.trimStart));
        }
        const inRange = t >= music.offset && mt < dur;
        audio.volume = Math.min(1, music.volume * (1 - fade));
        if (playingRef.current && inRange) {
          if (Math.abs(audio.currentTime - mt) > 0.3) audio.currentTime = mt;
          if (audio.paused) audio.play().catch(() => {});
        } else if (!audio.paused) {
          audio.pause();
        }
      }

      // Draw (always while playing; while paused only when something changed).
      const needsDraw = playingRef.current || dirtyRef.current || Boolean(video?.seeking);
      if (canvas && needsDraw) {
        dirtyRef.current = false;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const out = outputSize(p.settings.aspect, p.settings.resolution);
          const scale = Math.min(1, PREVIEW_MAX_EDGE / Math.max(out.width, out.height));
          const w = Math.round(out.width * scale);
          const h = Math.round(out.height * scale);
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
          }
          let image: CanvasImageSource | null = null;
          let iw = 0;
          let ih = 0;
          if (video && video.readyState >= 2) {
            image = video;
            iw = video.videoWidth;
            ih = video.videoHeight;
          } else if (el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0) {
            image = el;
            iw = el.naturalWidth;
            ih = el.naturalHeight;
          }
          drawFrame(
            ctx,
            w,
            h,
            p.settings,
            { image, width: iw, height: ih, clip: hit?.clip ?? null },
            p.texts,
            t,
            total
          );
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [canvasRef, store, pause, pauseAllMedia]);

  // Stop everything on unmount.
  useEffect(() => {
    const els = elementsRef.current;
    return () => {
      for (const el of els.values()) {
        if (el instanceof HTMLVideoElement) {
          el.pause();
          el.removeAttribute("src");
        }
      }
      els.clear();
    };
  }, []);

  return { store, playing, play, pause, toggle, seek };
}
