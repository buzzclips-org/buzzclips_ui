import {
  AspectRatio,
  Clip,
  ClipFilters,
  DEFAULT_FILTERS,
  DEFAULT_IMAGE_DURATION,
  MAX_SPEED,
  MediaAsset,
  MIN_CLIP_DURATION,
  MIN_SPEED,
  ProjectSettings,
  Resolution,
  Rotation,
  TextOverlay,
} from "./types";

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

let idCounter = 0;
export function createId(prefix = "id"): string {
  idCounter += 1;
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}${idCounter.toString(36)}`;
}

/** Duration of a clip on the timeline (after speed change). */
export function clipDuration(clip: Pick<Clip, "in" | "out" | "speed">): number {
  return Math.max(0, (clip.out - clip.in) / (clip.speed || 1));
}

export function totalDuration(clips: Clip[]): number {
  return clips.reduce((sum, c) => sum + clipDuration(c), 0);
}

/** Timeline start time of every clip. */
export function clipStarts(clips: Clip[]): number[] {
  const starts: number[] = [];
  let acc = 0;
  for (const c of clips) {
    starts.push(acc);
    acc += clipDuration(c);
  }
  return starts;
}

export interface LocatedClip {
  index: number;
  clip: Clip;
  /** Timeline time at which the clip begins. */
  start: number;
  /** Seconds into the clip on the timeline. */
  offset: number;
  /** Corresponding time inside the source media. */
  sourceTime: number;
}

/** Finds which clip is visible at timeline time `t`. */
export function locate(clips: Clip[], t: number): LocatedClip | null {
  if (clips.length === 0 || t < 0) return null;
  let start = 0;
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const d = clipDuration(clip);
    const isLast = i === clips.length - 1;
    if (t < start + d || (isLast && t <= start + d + 1e-6)) {
      const offset = clamp(t - start, 0, d);
      return {
        index: i,
        clip,
        start,
        offset,
        sourceTime: clamp(clip.in + offset * clip.speed, clip.in, clip.out),
      };
    }
    start += d;
  }
  return null;
}

export function createClipFromAsset(asset: MediaAsset): Clip {
  const out = asset.kind === "image" ? DEFAULT_IMAGE_DURATION : asset.duration;
  return {
    id: createId("clip"),
    assetId: asset.id,
    in: 0,
    out,
    speed: 1,
    volume: 1,
    muted: false,
    rotation: 0,
    flipH: false,
    flipV: false,
    fit: "contain",
    filters: { ...DEFAULT_FILTERS },
  };
}

/** Splits the clip under the playhead into two. Returns the original list if a split isn't possible. */
export function splitAt(clips: Clip[], t: number): { clips: Clip[]; newClipId: string | null } {
  const hit = locate(clips, t);
  if (!hit) return { clips, newClipId: null };
  const { clip, index, sourceTime } = hit;
  const minSource = MIN_CLIP_DURATION * clip.speed;
  if (sourceTime - clip.in < minSource || clip.out - sourceTime < minSource) {
    return { clips, newClipId: null };
  }
  const left: Clip = { ...clip, out: sourceTime };
  const right: Clip = { ...clip, id: createId("clip"), in: sourceTime, filters: { ...clip.filters } };
  const next = [...clips];
  next.splice(index, 1, left, right);
  return { clips: next, newClipId: right.id };
}

/** Clamps trim points so a clip always stays valid. `sourceDuration` is Infinity for images. */
export function trimClip(
  clip: Clip,
  patch: { in?: number; out?: number },
  sourceDuration: number
): Clip {
  const minSource = MIN_CLIP_DURATION * clip.speed;
  let nextIn = patch.in ?? clip.in;
  let nextOut = patch.out ?? clip.out;
  const maxOut = Number.isFinite(sourceDuration) ? sourceDuration : Math.max(nextOut, 3600);
  nextIn = clamp(nextIn, 0, maxOut - minSource);
  nextOut = clamp(nextOut, nextIn + minSource, maxOut);
  if (patch.in !== undefined && patch.out === undefined && nextOut - nextIn < minSource) {
    nextIn = nextOut - minSource;
  }
  return { ...clip, in: round3(nextIn), out: round3(nextOut) };
}

export function setSpeed(clip: Clip, speed: number): Clip {
  return { ...clip, speed: clamp(speed, MIN_SPEED, MAX_SPEED) };
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(clamp(to, 0, next.length), 0, item);
  return next;
}

export function duplicateClip(clips: Clip[], id: string): { clips: Clip[]; newClipId: string | null } {
  const index = clips.findIndex((c) => c.id === id);
  if (index === -1) return { clips, newClipId: null };
  const copy: Clip = { ...clips[index], id: createId("clip"), filters: { ...clips[index].filters } };
  const next = [...clips];
  next.splice(index + 1, 0, copy);
  return { clips: next, newClipId: copy.id };
}

export function rotateBy(rotation: Rotation, delta: 90 | -90): Rotation {
  return (((rotation + delta) % 360) + 360) % 360 as Rotation;
}

const ASPECTS: Record<AspectRatio, [number, number]> = {
  "16:9": [16, 9],
  "9:16": [9, 16],
  "1:1": [1, 1],
  "4:5": [4, 5],
};

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/** Output pixel size. `resolution` refers to the short edge (e.g. 1080p → 1920×1080 or 1080×1920). */
export function outputSize(aspect: AspectRatio, resolution: Resolution): { width: number; height: number } {
  const [aw, ah] = ASPECTS[aspect];
  if (aw >= ah) {
    return { width: even((resolution * aw) / ah), height: even(resolution) };
  }
  return { width: even(resolution), height: even((resolution * ah) / aw) };
}

export function aspectValue(aspect: AspectRatio): number {
  const [aw, ah] = ASPECTS[aspect];
  return aw / ah;
}

export interface DrawRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Size of the media once drawn into a `dstW × dstH` frame, centred.
 * Rotation by 90/270 swaps the source's width and height.
 */
export function fitRect(
  srcW: number,
  srcH: number,
  rotation: Rotation,
  dstW: number,
  dstH: number,
  fit: "contain" | "cover"
): DrawRect {
  if (srcW <= 0 || srcH <= 0) return { x: 0, y: 0, width: dstW, height: dstH };
  const swapped = rotation === 90 || rotation === 270;
  const w = swapped ? srcH : srcW;
  const h = swapped ? srcW : srcH;
  const scale = fit === "contain" ? Math.min(dstW / w, dstH / h) : Math.max(dstW / w, dstH / h);
  const width = w * scale;
  const height = h * scale;
  return { x: (dstW - width) / 2, y: (dstH - height) / 2, width, height };
}

/** CSS/canvas filter string. `scale` adjusts blur for the current output size. */
export function filterString(f: ClipFilters, scale = 1): string {
  const parts: string[] = [];
  if (f.brightness !== 100) parts.push(`brightness(${f.brightness}%)`);
  if (f.contrast !== 100) parts.push(`contrast(${f.contrast}%)`);
  if (f.saturation !== 100) parts.push(`saturate(${f.saturation}%)`);
  if (f.grayscale > 0) parts.push(`grayscale(${f.grayscale}%)`);
  if (f.sepia > 0) parts.push(`sepia(${f.sepia}%)`);
  if (f.blur > 0) parts.push(`blur(${(f.blur * scale).toFixed(2)}px)`);
  return parts.length ? parts.join(" ") : "none";
}

export const FILTER_PRESETS: { name: string; filters: ClipFilters }[] = [
  { name: "Original", filters: { ...DEFAULT_FILTERS } },
  { name: "Vivid", filters: { ...DEFAULT_FILTERS, contrast: 115, saturation: 140 } },
  { name: "Warm", filters: { ...DEFAULT_FILTERS, sepia: 25, saturation: 120, brightness: 105 } },
  { name: "Mono", filters: { ...DEFAULT_FILTERS, grayscale: 100, contrast: 110 } },
  { name: "Vintage", filters: { ...DEFAULT_FILTERS, sepia: 50, contrast: 90, brightness: 105 } },
  { name: "Fade", filters: { ...DEFAULT_FILTERS, contrast: 85, saturation: 80, brightness: 110 } },
  { name: "Dramatic", filters: { ...DEFAULT_FILTERS, contrast: 140, saturation: 90, brightness: 95 } },
];

/** Opacity (0–1) of the black fade overlay at timeline time t. */
export function fadeAmount(t: number, total: number, fadeIn: number, fadeOut: number): number {
  let a = 0;
  if (fadeIn > 0 && t < fadeIn) a = Math.max(a, 1 - t / fadeIn);
  if (fadeOut > 0 && t > total - fadeOut) a = Math.max(a, 1 - (total - t) / fadeOut);
  return clamp(a, 0, 1);
}

export function activeTexts(texts: TextOverlay[], t: number): TextOverlay[] {
  return texts.filter((tx) => t >= tx.start && t < tx.end);
}

export function createTextOverlay(start: number, total: number): TextOverlay {
  const s = clamp(start, 0, Math.max(0, total - 0.5));
  return {
    id: createId("text"),
    text: "Your text here",
    start: round3(s),
    end: round3(Math.min(total > 0 ? total : s + 3, s + 3)) || 3,
    x: 0.5,
    y: 0.85,
    size: 0.07,
    color: "#ffffff",
    background: "",
    bold: true,
    outline: true,
    font: "sans",
  };
}

export const TEXT_POSITIONS: Record<"top" | "center" | "bottom", { x: number; y: number }> = {
  top: { x: 0.5, y: 0.12 },
  center: { x: 0.5, y: 0.5 },
  bottom: { x: 0.5, y: 0.85 },
};

export function formatTime(seconds: number, withFraction = true): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds * 10) % 10);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const base = `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
  return withFraction ? `${base}.${tenths}` : base;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

/** Rough MP4 size estimate used to warn users before exporting. */
export function estimateExportBytes(settings: Pick<ProjectSettings, "aspect" | "resolution" | "fps">, duration: number): number {
  const { width, height } = outputSize(settings.aspect, settings.resolution);
  const videoBps = width * height * settings.fps * 0.1; // ~0.1 bits per pixel per frame
  const audioBps = 128_000;
  return Math.round(((videoBps + audioBps) * duration) / 8);
}

/** Removes clips/music referencing a deleted asset. */
export function removeAssetReferences<T extends { clips: Clip[]; music: { assetId: string } | null }>(
  project: T,
  assetId: string
): T {
  return {
    ...project,
    clips: project.clips.filter((c) => c.assetId !== assetId),
    music: project.music?.assetId === assetId ? null : project.music,
  };
}

/** Keeps text overlays within the timeline after clips change length. */
export function clampTexts(texts: TextOverlay[], total: number): TextOverlay[] {
  if (total <= 0) return texts;
  return texts.map((t) => {
    if (t.start < total && t.end <= total) return t;
    const end = Math.min(t.end, total);
    const start = Math.min(t.start, Math.max(0, end - MIN_CLIP_DURATION));
    return { ...t, start: round3(start), end: round3(end) };
  });
}

export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function cleanFileName(name: string): string {
  const base = name.replace(/\.[^/.]+$/, "").replace(/[^\w\- ]+/g, "").trim();
  return base.replace(/\s+/g, "-").slice(0, 80) || "buzzclips-video";
}
