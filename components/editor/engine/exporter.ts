/**
 * Client-side export pipeline (WebCodecs via mediabunny):
 *   1. Mix all audio (clip audio with speed/volume + background music + fades) in an OfflineAudioContext.
 *   2. Render every output frame onto a canvas with the same drawFrame() used by the preview.
 *   3. Encode to H.264/AAC (or the best available codecs) inside an MP4 container.
 */
import type { Clip, MediaAsset, Project } from "@/lib/editor/types";
import { clipDuration, clipStarts, fitRect, outputSize, totalDuration } from "@/lib/editor/timeline";
import { drawFrame } from "@/lib/editor/render";

export interface ExportProgress {
  phase: "preparing" | "audio" | "video" | "finalizing";
  /** 0 – 1 */
  progress: number;
  message: string;
}

export interface ExportResult {
  blob: Blob;
  width: number;
  height: number;
  duration: number;
  videoCodec: string;
  audioCodec: string | null;
}

const SAMPLE_RATE = 48000;

function abortError() {
  return new DOMException("Export cancelled", "AbortError");
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

export async function exportProject(
  project: Project,
  getBlob: (assetId: string) => Blob | undefined,
  onProgress: (p: ExportProgress) => void,
  signal?: AbortSignal
): Promise<ExportResult> {
  const mb = await import("mediabunny");
  const { settings, clips, texts, music } = project;
  if (clips.length === 0) throw new Error("Add at least one clip to the timeline before exporting.");

  const assets = new Map<string, MediaAsset>(project.assets.map((a) => [a.id, a]));
  const { width, height } = outputSize(settings.aspect, settings.resolution);
  const fps = settings.fps;
  const total = totalDuration(clips);
  const starts = clipStarts(clips);

  onProgress({ phase: "preparing", progress: 0, message: "Checking your browser's encoders…" });

  const videoCodec = await mb.getFirstEncodableVideoCodec(["avc", "hevc", "vp9", "av1"], { width, height });
  if (!videoCodec) {
    throw new Error(
      `Your browser can't encode video at ${width}×${height}. Try a lower resolution or the latest Chrome/Edge.`
    );
  }

  const needsAudio =
    clips.some((c) => !c.muted && c.volume > 0 && assets.get(c.assetId)?.hasAudio) ||
    (music != null && music.volume > 0 && assets.has(music.assetId));
  const audioCodec = needsAudio
    ? await mb.getFirstEncodableAudioCodec(["aac", "opus"], { numberOfChannels: 2, sampleRate: SAMPLE_RATE })
    : null;

  // ---------- 1. Audio mixdown ----------
  let mixed: AudioBuffer | null = null;
  if (audioCodec) {
    onProgress({ phase: "audio", progress: 0.02, message: "Mixing audio…" });
    mixed = await mixAudio(project, assets, getBlob, starts, total, mb, signal);
  }
  if (signal?.aborted) throw abortError();

  // ---------- 2. Set up output ----------
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Couldn't create a drawing surface for export.");

  const output = new mb.Output({
    format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }),
    target: new mb.BufferTarget(),
  });
  const videoSource = new mb.CanvasSource(canvas, {
    codec: videoCodec,
    bitrate: mb.QUALITY_HIGH,
    keyFrameInterval: 2,
  });
  output.addVideoTrack(videoSource, { frameRate: fps });

  let audioSource: InstanceType<typeof mb.AudioBufferSource> | null = null;
  if (audioCodec && mixed) {
    audioSource = new mb.AudioBufferSource({ codec: audioCodec, bitrate: mb.QUALITY_HIGH });
    output.addAudioTrack(audioSource);
  }

  const inputs: { dispose: () => void }[] = [];
  const cleanup = () => inputs.forEach((i) => i.dispose());

  try {
    await output.start();

    // ---------- 3. Video frames ----------
    const totalFrames = Math.max(1, Math.round(total * fps));
    let frameIndex = 0;

    for (let ci = 0; ci < clips.length; ci++) {
      const clip = clips[ci];
      const asset = assets.get(clip.assetId);
      const blob = getBlob(clip.assetId);
      if (!asset || !blob) throw new Error("A clip's media file is missing. Re-import it and try again.");

      const clipEndFrame = ci === clips.length - 1 ? totalFrames : Math.round((starts[ci] + clipDuration(clip)) * fps);
      const frameTimes: number[] = [];
      for (let f = frameIndex; f < clipEndFrame; f++) frameTimes.push(f);
      if (frameTimes.length === 0) continue;

      const sourceTimes = frameTimes.map((f) =>
        Math.min(clip.out - 0.001, clip.in + Math.max(0, f / fps - starts[ci]) * clip.speed)
      );

      const emit = async (image: CanvasImageSource | null, w: number, h: number, f: number) => {
        const t = f / fps;
        drawFrame(ctx, width, height, settings, { image, width: w, height: h, clip }, texts, t, total);
        await videoSource.add(t, 1 / fps);
        if (f % 15 === 0) {
          onProgress({
            phase: "video",
            progress: 0.1 + 0.85 * (f / totalFrames),
            message: `Rendering frame ${f + 1} of ${totalFrames}…`,
          });
          await tick();
        }
        if (signal?.aborted) throw abortError();
      };

      if (asset.kind === "image") {
        const bitmap = await createImageBitmap(blob);
        try {
          for (const f of frameTimes) await emit(bitmap, bitmap.width, bitmap.height, f);
        } finally {
          bitmap.close();
        }
      } else {
        const input = new mb.Input({ source: new mb.BlobSource(blob), formats: mb.ALL_FORMATS });
        inputs.push(input);
        const track = await input.getPrimaryVideoTrack();
        if (!track) throw new Error(`"${asset.name}" has no video track.`);

        // Decode at the size we actually draw (saves lots of memory/time for 4K sources).
        const rect = fitRect(track.displayWidth, track.displayHeight, clip.rotation, width, height, clip.fit);
        const swapped = clip.rotation === 90 || clip.rotation === 270;
        const drawW = swapped ? rect.height : rect.width;
        const sinkOptions: { poolSize: number; width?: number } = { poolSize: 2 };
        if (drawW < track.displayWidth) sinkOptions.width = even(drawW);
        const sink = new mb.CanvasSink(track, sinkOptions);

        let last: { canvas: HTMLCanvasElement | OffscreenCanvas } | null = null;
        let i = 0;
        for await (const wrapped of sink.canvasesAtTimestamps(sourceTimes)) {
          if (wrapped) last = wrapped;
          const c = last?.canvas ?? null;
          await emit(c as CanvasImageSource | null, c?.width ?? 0, c?.height ?? 0, frameTimes[i]);
          i++;
        }
        // Pad if the decoder ran out of frames early (e.g. truncated files).
        for (; i < frameTimes.length; i++) {
          const c = last?.canvas ?? null;
          await emit(c as CanvasImageSource | null, c?.width ?? 0, c?.height ?? 0, frameTimes[i]);
        }
        input.dispose();
      }
      frameIndex = clipEndFrame;
    }

    if (audioSource && mixed) {
      onProgress({ phase: "finalizing", progress: 0.96, message: "Encoding audio…" });
      await audioSource.add(mixed);
    }
    videoSource.close();
    audioSource?.close();

    onProgress({ phase: "finalizing", progress: 0.98, message: "Finalizing MP4…" });
    await output.finalize();
    const buffer = output.target.buffer;
    if (!buffer) throw new Error("Export produced no data.");
    onProgress({ phase: "finalizing", progress: 1, message: "Done" });

    return {
      blob: new Blob([buffer], { type: "video/mp4" }),
      width,
      height,
      duration: total,
      videoCodec,
      audioCodec,
    };
  } catch (err) {
    if (output.state !== "finalized" && output.state !== "canceled") {
      await output.cancel().catch(() => {});
    }
    throw err;
  } finally {
    cleanup();
  }
}

type Mediabunny = typeof import("mediabunny");

async function extractClipAudio(
  clip: Clip,
  blob: Blob,
  ctx: OfflineAudioContext,
  mb: Mediabunny,
  signal?: AbortSignal
): Promise<AudioBuffer | null> {
  const input = new mb.Input({ source: new mb.BlobSource(blob), formats: mb.ALL_FORMATS });
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track || !(await track.canDecode())) return null;
    const sink = new mb.AudioBufferSink(track);
    const span = clip.out - clip.in;
    let channels: Float32Array[] | null = null;
    let rate = 0;
    for await (const { buffer, timestamp } of sink.buffers(clip.in, clip.out)) {
      if (signal?.aborted) throw abortError();
      if (!channels) {
        rate = buffer.sampleRate;
        const len = Math.max(1, Math.ceil(span * rate));
        channels = Array.from({ length: Math.min(2, buffer.numberOfChannels) }, () => new Float32Array(len));
      }
      const offset = Math.round((timestamp - clip.in) * rate);
      for (let ch = 0; ch < channels.length; ch++) {
        const src = buffer.getChannelData(Math.min(ch, buffer.numberOfChannels - 1));
        const dst = channels[ch];
        const srcStart = Math.max(0, -offset);
        const dstStart = Math.max(0, offset);
        const count = Math.min(src.length - srcStart, dst.length - dstStart);
        if (count > 0) dst.set(src.subarray(srcStart, srcStart + count), dstStart);
      }
    }
    if (!channels) return null;
    const out = ctx.createBuffer(channels.length, channels[0].length, rate);
    channels.forEach((data, ch) => out.copyToChannel(data as Float32Array<ArrayBuffer>, ch));
    return out;
  } finally {
    input.dispose();
  }
}

async function mixAudio(
  project: Project,
  assets: Map<string, MediaAsset>,
  getBlob: (id: string) => Blob | undefined,
  starts: number[],
  total: number,
  mb: Mediabunny,
  signal?: AbortSignal
): Promise<AudioBuffer> {
  const { clips, music, settings } = project;
  const length = Math.max(1, Math.ceil(total * SAMPLE_RATE));
  const ctx = new OfflineAudioContext(2, length, SAMPLE_RATE);
  const master = ctx.createGain();
  master.connect(ctx.destination);

  if (settings.fadeIn > 0) {
    master.gain.setValueAtTime(0, 0);
    master.gain.linearRampToValueAtTime(1, Math.min(settings.fadeIn, total));
  }
  if (settings.fadeOut > 0) {
    const fadeStart = Math.max(settings.fadeIn, total - settings.fadeOut);
    master.gain.setValueAtTime(1, fadeStart);
    master.gain.linearRampToValueAtTime(0, total);
  }

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const asset = assets.get(clip.assetId);
    if (!asset?.hasAudio || clip.muted || clip.volume <= 0) continue;
    const blob = getBlob(clip.assetId);
    if (!blob) continue;
    const buffer = await extractClipAudio(clip, blob, ctx, mb, signal);
    if (!buffer) continue;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = clip.speed;
    const gain = ctx.createGain();
    gain.gain.value = clip.volume;
    src.connect(gain).connect(master);
    src.start(starts[i]);
    src.stop(starts[i] + clipDuration(clip));
  }

  if (music && music.volume > 0) {
    const blob = getBlob(music.assetId);
    if (blob && music.offset < total) {
      try {
        const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
        const src = ctx.createBufferSource();
        src.buffer = decoded;
        const trimStart = Math.min(music.trimStart, Math.max(0, decoded.duration - 0.05));
        if (music.loop) {
          src.loop = true;
          src.loopStart = trimStart;
          src.loopEnd = decoded.duration;
        }
        const gain = ctx.createGain();
        gain.gain.value = music.volume;
        src.connect(gain).connect(master);
        src.start(music.offset, trimStart);
        src.stop(total);
      } catch (err) {
        console.warn("Editor: background music could not be decoded", err);
      }
    }
  }

  if (signal?.aborted) throw abortError();
  return ctx.startRendering();
}
