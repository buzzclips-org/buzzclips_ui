/**
 * Visual helpers for the timeline: filmstrip thumbnails and audio waveform peaks.
 * Computed lazily after import (off the critical path) and cached in IndexedDB.
 */
import type { MediaAsset } from "@/lib/editor/types";
import { loadInsightCache, saveInsightCache } from "./storage";

export interface FilmstripFrame {
  /** Source time in seconds. */
  t: number;
  url: string;
}

export interface MediaInsight {
  filmstrip?: FilmstripFrame[];
  /** Normalised 0–1 peak per bucket. */
  peaks?: number[];
  /** Buckets per second of source media. */
  peaksPerSecond?: number;
}

const FILMSTRIP_HEIGHT = 56;
const MAX_FRAMES = 24;
const MAX_PEAKS = 6000;

async function canvasToUrl(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<string | null> {
  try {
    if ("toDataURL" in canvas) return canvas.toDataURL("image/jpeg", 0.6);
    const blob = await (canvas as OffscreenCanvas).convertToBlob({ type: "image/jpeg", quality: 0.6 });
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function computeFilmstrip(blob: Blob, duration: number): Promise<FilmstripFrame[]> {
  const mb = await import("mediabunny");
  const input = new mb.Input({ source: new mb.BlobSource(blob), formats: mb.ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track || !(await track.canDecode())) return [];
    const count = Math.max(2, Math.min(MAX_FRAMES, Math.ceil(duration / 2)));
    const first = await track.getFirstTimestamp();
    const times = Array.from({ length: count }, (_, i) => first + ((i + 0.5) / count) * Math.max(0.01, duration - first));
    const sink = new mb.CanvasSink(track, { height: FILMSTRIP_HEIGHT, poolSize: 1 });
    const frames: FilmstripFrame[] = [];
    let i = 0;
    for await (const wrapped of sink.canvasesAtTimestamps(times)) {
      if (wrapped) {
        const url = await canvasToUrl(wrapped.canvas);
        if (url) frames.push({ t: times[i], url });
      }
      i++;
    }
    return frames;
  } finally {
    input.dispose();
  }
}

async function computePeaks(blob: Blob, duration: number): Promise<{ peaks: number[]; peaksPerSecond: number } | null> {
  const mb = await import("mediabunny");
  const input = new mb.Input({ source: new mb.BlobSource(blob), formats: mb.ALL_FORMATS });
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track || !(await track.canDecode())) return null;
    const peaksPerSecond = Math.max(2, Math.min(50, Math.floor(MAX_PEAKS / Math.max(1, duration))));
    const buckets = new Float32Array(Math.ceil(duration * peaksPerSecond) + 1);
    const sink = new mb.AudioBufferSink(track);
    for await (const { buffer, timestamp } of sink.buffers()) {
      const data = buffer.getChannelData(0);
      const rate = buffer.sampleRate;
      // Sample sparsely for speed: ~200 reads per bucket is plenty for a visual.
      const samplesPerBucket = rate / peaksPerSecond;
      const step = Math.max(1, Math.floor(samplesPerBucket / 200));
      for (let s = 0; s < data.length; s += step) {
        const b = Math.floor((timestamp + s / rate) * peaksPerSecond);
        if (b < 0 || b >= buckets.length) continue;
        const v = Math.abs(data[s]);
        if (v > buckets[b]) buckets[b] = v;
      }
    }
    let max = 0;
    for (const v of buckets) if (v > max) max = v;
    const norm = max > 0 ? 1 / max : 0;
    return { peaks: Array.from(buckets, (v) => Math.round(Math.sqrt(v * norm) * 100) / 100), peaksPerSecond };
  } finally {
    input.dispose();
  }
}

/** Returns cached insight or computes it. Never throws. */
export async function getMediaInsight(asset: MediaAsset, blob: Blob): Promise<MediaInsight> {
  const cached = await loadInsightCache<MediaInsight>(asset.id);
  if (cached) return cached;
  const insight: MediaInsight = {};
  try {
    if (asset.kind === "video") insight.filmstrip = await computeFilmstrip(blob, asset.duration);
  } catch (err) {
    console.warn("Editor: filmstrip failed", err);
  }
  try {
    if (asset.hasAudio) {
      const p = await computePeaks(blob, asset.duration);
      if (p) Object.assign(insight, p);
    }
  } catch (err) {
    console.warn("Editor: waveform failed", err);
  }
  await saveInsightCache(asset.id, insight);
  return insight;
}
