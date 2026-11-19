/**
 * Data model for the in-browser video editor.
 * Everything here is plain serialisable JSON so a project can be autosaved
 * to IndexedDB and restored later. Binary media lives separately, keyed by asset id.
 */

export type MediaKind = "video" | "image" | "audio";

export interface MediaAsset {
  id: string;
  kind: MediaKind;
  name: string;
  size: number;
  mimeType: string;
  /** Duration in seconds (0 for images). */
  duration: number;
  /** Display width/height after container rotation (0 for audio). */
  width: number;
  height: number;
  hasAudio: boolean;
  /** Small JPEG data URL used in the media library and timeline. */
  thumbnail?: string;
}

export type Rotation = 0 | 90 | 180 | 270;
export type FitMode = "contain" | "cover";

export interface ClipFilters {
  /** Percentages, 100 = unchanged. */
  brightness: number;
  contrast: number;
  saturation: number;
  /** Percentages, 0 = unchanged. */
  grayscale: number;
  sepia: number;
  /** Blur radius in px relative to a 1080p frame. */
  blur: number;
}

export interface Clip {
  id: string;
  assetId: string;
  /** Source in/out points in seconds. For images `in` is 0 and `out` is the display duration. */
  in: number;
  out: number;
  /** Playback speed multiplier (0.25 – 4). */
  speed: number;
  /** 0 – 1 */
  volume: number;
  muted: boolean;
  rotation: Rotation;
  flipH: boolean;
  flipV: boolean;
  fit: FitMode;
  filters: ClipFilters;
}

export type TextPosition =
  | "top"
  | "center"
  | "bottom"
  | "custom";

export interface TextOverlay {
  id: string;
  text: string;
  /** Timeline start/end in seconds. */
  start: number;
  end: number;
  /** Centre of the text box as a fraction (0–1) of the frame. */
  x: number;
  y: number;
  /** Font size as a fraction of the output frame height. */
  size: number;
  color: string;
  /** Background box colour, or "" for none. */
  background: string;
  bold: boolean;
  /** Draw a dark outline for legibility on busy footage. */
  outline: boolean;
  font: "sans" | "serif" | "mono";
}

export interface MusicTrack {
  assetId: string;
  /** 0 – 1 */
  volume: number;
  /** Where the music starts on the timeline (seconds). */
  offset: number;
  /** Where to start inside the music file (seconds). */
  trimStart: number;
  loop: boolean;
}

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5";
export type Resolution = 480 | 720 | 1080;
export type FrameRate = 24 | 30 | 60;

export interface ProjectSettings {
  aspect: AspectRatio;
  resolution: Resolution;
  fps: FrameRate;
  background: string;
  /** Global fade from/to black in seconds. */
  fadeIn: number;
  fadeOut: number;
}

export interface Project {
  version: 1;
  name: string;
  settings: ProjectSettings;
  assets: MediaAsset[];
  clips: Clip[];
  texts: TextOverlay[];
  music: MusicTrack | null;
}

export const DEFAULT_FILTERS: ClipFilters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
  sepia: 0,
  blur: 0,
};

export const DEFAULT_SETTINGS: ProjectSettings = {
  aspect: "16:9",
  resolution: 720,
  fps: 30,
  background: "#000000",
  fadeIn: 0,
  fadeOut: 0,
};

export const DEFAULT_IMAGE_DURATION = 3;
export const MIN_CLIP_DURATION = 0.1;
export const MIN_SPEED = 0.25;
export const MAX_SPEED = 4;

export function createEmptyProject(name = "Untitled project"): Project {
  return {
    version: 1,
    name,
    settings: { ...DEFAULT_SETTINGS },
    assets: [],
    clips: [],
    texts: [],
    music: null,
  };
}
