import type { MediaAsset, MediaKind } from "@/lib/editor/types";
import { createId } from "@/lib/editor/timeline";

const THUMB_WIDTH = 160;

export const ACCEPTED_TYPES = "video/*,image/*,audio/*,.mkv,.mov,.m4a,.flac";

export function detectKind(file: File): MediaKind | null {
  const type = file.type || "";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("audio/")) return "audio";
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (["mp4", "mov", "webm", "mkv", "m4v", "avi"].includes(ext)) return "video";
  if (["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp"].includes(ext)) return "image";
  if (["mp3", "wav", "ogg", "m4a", "aac", "flac", "opus"].includes(ext)) return "audio";
  return null;
}

async function canvasToDataUrl(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<string | undefined> {
  try {
    if ("toDataURL" in canvas) return canvas.toDataURL("image/jpeg", 0.7);
    const blob = await (canvas as OffscreenCanvas).convertToBlob({ type: "image/jpeg", quality: 0.7 });
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

function thumbnailFromSource(source: CanvasImageSource, w: number, h: number): string | undefined {
  if (!w || !h) return undefined;
  const canvas = document.createElement("canvas");
  canvas.width = THUMB_WIDTH;
  canvas.height = Math.max(1, Math.round((THUMB_WIDTH * h) / w));
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  try {
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return undefined;
  }
}

/**
 * Reads metadata (duration, size, audio presence) and a thumbnail from an imported file.
 * Throws a user-friendly Error if the browser cannot decode it.
 */
export async function probeFile(file: File): Promise<MediaAsset> {
  const kind = detectKind(file);
  if (!kind) throw new Error(`"${file.name}" isn't a supported video, image or audio file.`);

  const base = {
    id: createId("asset"),
    kind,
    name: file.name,
    size: file.size,
    mimeType: file.type || "",
  };

  if (kind === "image") {
    const bitmap = await createImageBitmap(file).catch(() => {
      throw new Error(`Couldn't read the image "${file.name}".`);
    });
    const asset: MediaAsset = {
      ...base,
      duration: 0,
      width: bitmap.width,
      height: bitmap.height,
      hasAudio: false,
      thumbnail: thumbnailFromSource(bitmap, bitmap.width, bitmap.height),
    };
    bitmap.close();
    return asset;
  }

  const { Input, ALL_FORMATS, BlobSource, CanvasSink } = await import("mediabunny");
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const videoTrack = kind === "video" ? await input.getPrimaryVideoTrack() : null;
    const audioTrack = await input.getPrimaryAudioTrack();

    if (kind === "video" && !videoTrack) {
      if (audioTrack) return probeAsAudio(file, base, input, audioTrack);
      throw new Error(`"${file.name}" has no video track.`);
    }
    if (kind === "audio" || !videoTrack) {
      if (!audioTrack) throw new Error(`"${file.name}" has no audio track.`);
      return probeAsAudio(file, base, input, audioTrack);
    }

    if (!(await videoTrack.canDecode())) {
      throw new Error(
        `Your browser can't decode the video codec in "${file.name}" (${videoTrack.codec ?? "unknown"}). Try an MP4 (H.264) or WebM file.`
      );
    }
    const duration = await input.computeDuration();
    const audioOk = audioTrack ? await audioTrack.canDecode() : false;

    let thumbnail: string | undefined;
    try {
      const sink = new CanvasSink(videoTrack, { width: THUMB_WIDTH, poolSize: 1 });
      const firstTs = await videoTrack.getFirstTimestamp();
      const frame = await sink.getCanvas(Math.min(firstTs + Math.min(1, duration / 3), duration));
      if (frame) thumbnail = await canvasToDataUrl(frame.canvas);
    } catch {
      thumbnail = undefined;
    }

    return {
      ...base,
      kind: "video",
      duration,
      width: videoTrack.displayWidth,
      height: videoTrack.displayHeight,
      hasAudio: audioOk,
      thumbnail,
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes(file.name)) throw err;
    throw new Error(`Couldn't open "${file.name}". The format may not be supported by your browser.`);
  } finally {
    input.dispose();
  }
}

async function probeAsAudio(
  file: File,
  base: Omit<MediaAsset, "duration" | "width" | "height" | "hasAudio" | "kind"> & { kind: MediaKind },
  input: { computeDuration: () => Promise<number> },
  audioTrack: { canDecode: () => Promise<boolean>; codec: string | null }
): Promise<MediaAsset> {
  if (!(await audioTrack.canDecode())) {
    throw new Error(`Your browser can't decode the audio in "${file.name}" (${audioTrack.codec ?? "unknown"}).`);
  }
  const duration = await input.computeDuration();
  return { ...base, kind: "audio", duration, width: 0, height: 0, hasAudio: true };
}

/** Feature detection for the export pipeline (WebCodecs). */
export function getBrowserSupport(): { ok: boolean; reason?: string } {
  if (typeof window === "undefined") return { ok: false, reason: "Not running in a browser." };
  if (!("VideoEncoder" in window) || !("VideoDecoder" in window)) {
    return {
      ok: false,
      reason:
        "Your browser doesn't support WebCodecs, which the editor needs for fast in-browser export. Please use the latest Chrome, Edge, Safari (16.4+) or Firefox (130+).",
    };
  }
  if (typeof OfflineAudioContext === "undefined") {
    return { ok: false, reason: "Your browser doesn't support the Web Audio API." };
  }
  return { ok: true };
}
