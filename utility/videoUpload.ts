/**
 * Shared video publishing pipeline used by the Upload page and the in-editor
 * "Publish to BuzzClips" dialog.
 *
 *  1. Direct-to-S3 presigned PUT (fast, supports large files) → complete-presigned.
 *  2. Falls back to the legacy multipart `/vid/upload` endpoint if the direct path fails.
 *  3. `subscribeTranscodeProgress` follows server-side HLS transcoding via SSE with REST polling fallback.
 */
import axios from "axios";
import { api_instance } from "@/global";
import type { TranscodeProgress, VideoCategory, VideoVisibility } from "@/types/video";
import {
  abortPresignedUpload,
  completePresignedUpload,
  requestPresignedUpload,
} from "@/utility/requests";

export const MAX_UPLOAD_SIZE_MB = 1000;

export const VIDEO_CATEGORIES: VideoCategory[] = [
  "OTHER",
  "TECH",
  "EDUCATION",
  "GAMING",
  "ENTERTAINMENT",
  "MUSIC",
  "NEWS",
  "SPORTS",
  "LIFESTYLE",
];

export interface VideoMetadataInput {
  videoTitle: string;
  description?: string;
  category?: string;
  visibility?: VideoVisibility;
  /** Comma-separated tags as typed by the user. */
  tags?: string;
}

export interface UploadResult {
  videoId?: number;
  processId?: string;
  via: "direct" | "legacy";
}

export function parseTags(tags?: string): string[] {
  return tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
}

const percentOf = (loaded: number, total?: number, fallback = 1) =>
  Math.round((loaded * 100) / (total || fallback || 1));

/** Direct S3 presigned upload. Aborts the server-side process if the PUT/complete fails. */
export async function uploadVideoDirect(
  file: File,
  meta: VideoMetadataInput,
  token: string,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
): Promise<UploadResult> {
  const contentType = file.type || "video/mp4";
  const { uploadUrl, s3Key, processId } = await requestPresignedUpload(file.name, contentType, token);
  try {
    await axios.put(uploadUrl, file, {
      headers: { "Content-Type": contentType },
      signal,
      onUploadProgress: (e) => onProgress(percentOf(e.loaded, e.total, file.size)),
    });
    const result = await completePresignedUpload(
      {
        s3Key,
        processId,
        videoTitle: meta.videoTitle,
        description: meta.description,
        tags: parseTags(meta.tags),
        category: meta.category as VideoCategory,
        visibility: meta.visibility,
      },
      token
    );
    return { videoId: result?.videoId, processId: processId || result?.processId, via: "direct" };
  } catch (err) {
    if (processId) await abortPresignedUpload(processId, token).catch(() => {});
    throw err;
  }
}

/** Legacy multipart upload through the API server. */
export async function uploadVideoLegacy(
  file: File,
  meta: VideoMetadataInput,
  token: string,
  userId: string,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("videoTitle", meta.videoTitle);
  formData.append("file", file);
  formData.append("userId", userId);
  if (meta.description) formData.append("description", meta.description);
  if (meta.category) formData.append("category", meta.category);
  if (meta.visibility) formData.append("visibility", meta.visibility);
  if (meta.tags) formData.append("tags", meta.tags);

  const res = await axios.post(`${api_instance}/vid/upload`, formData, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
    signal,
    onUploadProgress: (e) => {
      if (e.total) onProgress(percentOf(e.loaded, e.total));
    },
  });
  return { videoId: res?.data?.id || res?.data?.videoId, via: "legacy" };
}

export function isCancelError(err: unknown): boolean {
  return axios.isCancel(err) || (err instanceof DOMException && err.name === "AbortError");
}

/**
 * Uploads with the direct path first, then the legacy path.
 * `onFallback` lets callers tell the user that the slower path is being used.
 */
export async function uploadVideo(opts: {
  file: File;
  meta: VideoMetadataInput;
  token: string;
  userId: string;
  onProgress: (percent: number) => void;
  onFallback?: (error: unknown) => void;
  signal?: AbortSignal;
}): Promise<UploadResult> {
  const { file, meta, token, userId, onProgress, onFallback, signal } = opts;
  try {
    return await uploadVideoDirect(file, meta, token, onProgress, signal);
  } catch (err) {
    if (isCancelError(err) || signal?.aborted) throw err;
    onFallback?.(err);
    onProgress(0);
    return uploadVideoLegacy(file, meta, token, userId, onProgress, signal);
  }
}

export function isNetworkError(err: unknown): boolean {
  const e = err as { message?: string; code?: string } | null;
  return Boolean(e?.message?.includes("Network Error") || e?.code === "ERR_NETWORK");
}

/**
 * Follows transcoding progress. Uses SSE (by processId, else videoId) and falls back to
 * polling `/vid/{id}/status` every 3s if the stream fails. Returns an unsubscribe function.
 * Stops automatically on COMPLETED/FAILED.
 */
export function subscribeTranscodeProgress(opts: {
  videoId?: number | null;
  processId?: string | null;
  onUpdate: (p: TranscodeProgress) => void;
  pollMs?: number;
}): () => void {
  const { videoId, processId, onUpdate, pollMs = 3000 } = opts;
  let eventSource: EventSource | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  const stop = () => {
    stopped = true;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    eventSource?.close();
    eventSource = null;
  };

  const emit = (p: TranscodeProgress) => {
    if (stopped) return;
    onUpdate(p);
    if (p.status === "COMPLETED" || p.status === "FAILED") stop();
  };

  const poll = async () => {
    if (!videoId || stopped) return;
    try {
      const res = await fetch(`${api_instance}/vid/${videoId}/status`);
      if (!res.ok) return;
      const data = await res.json();
      const status = data.videoStatus || data.status || "PROCESSING";
      emit({
        videoId,
        processId: processId || undefined,
        stage: data.stage || (status === "COMPLETED" ? "COMPLETED" : "PROCESSING"),
        percent: data.percent ?? (status === "COMPLETED" ? 100 : 50),
        status,
      });
    } catch (err) {
      console.error("Polling status error", err);
    }
  };

  const startPolling = () => {
    if (!videoId || pollTimer || stopped) return;
    poll();
    pollTimer = setInterval(poll, pollMs);
  };

  if (!videoId && !processId) return stop;

  try {
    const url = processId
      ? `${api_instance}/vid/upload/process/${encodeURIComponent(processId)}/progress`
      : `${api_instance}/vid/${videoId}/transcode-progress`;
    eventSource = new EventSource(url);
    eventSource.addEventListener("progress", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        const percent = typeof data.percent === "number" ? data.percent : Number(data.percent || 0);
        emit({
          videoId: videoId || data.videoId,
          processId: processId || data.processId,
          stage: data.stage || (data.status === "COMPLETED" ? "COMPLETED" : "PROCESSING"),
          percent,
          status: data.status || (percent >= 100 ? "COMPLETED" : "PROCESSING"),
        });
      } catch (e) {
        console.error("SSE parse error", e);
      }
    });
    eventSource.onerror = () => {
      eventSource?.close();
      eventSource = null;
      startPolling();
    };
  } catch (e) {
    console.error("Failed to connect to SSE, using polling fallback", e);
    startPolling();
  }

  return stop;
}
