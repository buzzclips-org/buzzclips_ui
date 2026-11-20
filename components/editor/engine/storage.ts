/**
 * Editor persistence.
 *  - Large binaries (imported media, exported MP4s) go to OPFS when available: streamed to disk,
 *    read back as disk-backed Files, so they don't occupy tab memory. IndexedDB is the fallback.
 *  - "kv" (IndexedDB): project JSON, pending export metadata, publish draft, timeline visual cache.
 * All functions fail soft so the editor still works in private mode.
 */
import type { Project } from "@/lib/editor/types";
import { deleteOpfsFile, estimateStorage, opfsSupported, pruneOpfs, readOpfsFile, writeOpfsFile } from "./opfs";

const DB_NAME = "buzzclips-editor";
const DB_VERSION = 1;
const MEDIA = "media";
const KV = "kv";

export interface PendingExport {
  blob: Blob;
  fileName: string;
  title: string;
  createdAt: number;
  /** When set, the video lives in OPFS under this name and `blob` is a disk-backed File. */
  opfsName?: string;
}

export type SaveResult = { ok: true } | { ok: false; reason: "quota" | "unavailable" | "error"; message: string };

const mediaFileName = (id: string) => `media-${id}`;

/** Turns a storage failure into a precise, user-readable reason. */
export async function describeStorageError(err: unknown): Promise<SaveResult> {
  const name = (err as { name?: string } | null)?.name ?? "";
  if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") {
    const est = await estimateStorage();
    const mb = (n: number) => `${Math.round(n / (1024 * 1024))} MB`;
    return {
      ok: false,
      reason: "quota",
      message: est
        ? `Browser storage is full (${mb(est.usage)} of ${mb(est.quota)} used). Free up disk space or clear site data.`
        : "Browser storage is full. Free up disk space or clear site data.",
    };
  }
  if (name === "InvalidStateError" || name === "SecurityError" || String(err).includes("unavailable")) {
    return { ok: false, reason: "unavailable", message: "This browser window doesn't allow saving files (private mode?)." };
  }
  return { ok: false, reason: "error", message: `Couldn't save to browser storage${name ? ` (${name})` : ""}.` };
}

export interface PublishDraft {
  videoTitle: string;
  description: string;
  category: string;
  visibility: "PUBLIC" | "UNLISTED" | "PRIVATE";
  tags: string;
  /** Set right before redirecting to login, so the editor reopens the publish dialog on return. */
  resume: boolean;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB unavailable"));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(MEDIA)) db.createObjectStore(MEDIA);
        if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error || req.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

/** Persists an imported file so the project can be restored after a reload. */
export async function saveMedia(id: string, blob: Blob): Promise<SaveResult> {
  try {
    if (opfsSupported()) {
      await writeOpfsFile(mediaFileName(id), blob);
    } else {
      await run(MEDIA, "readwrite", (s) => s.put(blob, id));
    }
    return { ok: true };
  } catch (err) {
    console.warn("Editor: failed to persist media", err);
    if (opfsSupported()) await deleteOpfsFile(mediaFileName(id));
    return describeStorageError(err);
  }
}

export async function loadMedia(id: string): Promise<Blob | null> {
  if (opfsSupported()) {
    const file = await readOpfsFile(mediaFileName(id));
    if (file) return file;
  }
  try {
    const blob = await run<Blob | undefined>(MEDIA, "readonly", (s) => s.get(id));
    return blob ?? null;
  } catch {
    return null;
  }
}

export async function deleteMedia(id: string): Promise<void> {
  if (opfsSupported()) await deleteOpfsFile(mediaFileName(id));
  try {
    await run(MEDIA, "readwrite", (s) => s.delete(id));
  } catch {
    // ignore
  }
}

/** Deletes stored media that is no longer referenced by the project. */
export async function pruneMedia(keep: Set<string>): Promise<void> {
  if (opfsSupported()) {
    await pruneOpfs((name) => name.startsWith("media-") && !keep.has(name.slice("media-".length)));
  }
  try {
    const keys = await run<IDBValidKey[]>(MEDIA, "readonly", (s) => s.getAllKeys());
    await Promise.all(keys.filter((k) => !keep.has(String(k))).map((k) => deleteMedia(String(k))));
  } catch {
    // ignore
  }
}

/** Removes old exported MP4s from OPFS, keeping the given names. */
export async function pruneExports(keep: (string | undefined)[]): Promise<void> {
  if (!opfsSupported()) return;
  const keepSet = new Set(keep.filter(Boolean));
  await pruneOpfs((name) => name.startsWith("export-") && !keepSet.has(name));
}

export async function clearMedia(): Promise<void> {
  try {
    const keys = await run<IDBValidKey[]>(KV, "readonly", (s) => s.getAllKeys());
    await Promise.all(
      keys
        .filter((k) => String(k).startsWith("insight:"))
        .map((k) => run(KV, "readwrite", (s) => s.delete(k)))
    );
  } catch {
    // ignore
  }
  if (opfsSupported()) {
    const pending = await loadPendingExport();
    await pruneOpfs((name) => name.startsWith("media-") || (name.startsWith("export-") && name !== pending?.opfsName));
  }
  try {
    await run(MEDIA, "readwrite", (s) => s.clear());
  } catch {
    // ignore
  }
}

export async function saveProject(project: Project): Promise<boolean> {
  try {
    await run(KV, "readwrite", (s) => s.put(project, "project"));
    return true;
  } catch (err) {
    console.warn("Editor: failed to autosave project", err);
    return false;
  }
}

export async function loadProject(): Promise<Project | null> {
  try {
    const p = await run<Project | undefined>(KV, "readonly", (s) => s.get("project"));
    return p && p.version === 1 ? p : null;
  } catch {
    return null;
  }
}

/**
 * Remembers an exported video so it survives a login round-trip. OPFS-backed exports are stored
 * by reference (no copy); otherwise the Blob is copied into IndexedDB.
 */
export async function savePendingExport(pending: PendingExport): Promise<boolean> {
  try {
    const record = pending.opfsName ? { ...pending, blob: undefined } : pending;
    await run(KV, "readwrite", (s) => s.put(record, "pendingExport"));
    return true;
  } catch (err) {
    console.warn("Editor: failed to store exported video", err);
    return false;
  }
}

export async function loadPendingExport(): Promise<PendingExport | null> {
  try {
    const p = await run<(Omit<PendingExport, "blob"> & { blob?: Blob }) | undefined>(KV, "readonly", (s) =>
      s.get("pendingExport")
    );
    if (!p) return null;
    if (p.opfsName) {
      const file = await readOpfsFile(p.opfsName);
      return file ? { ...p, blob: file } : null;
    }
    return p.blob ? (p as PendingExport) : null;
  } catch {
    return null;
  }
}

export async function clearPendingExport(): Promise<void> {
  try {
    await run(KV, "readwrite", (s) => s.delete("pendingExport"));
  } catch {
    // ignore
  }
}

export async function savePublishDraft(draft: PublishDraft): Promise<boolean> {
  try {
    await run(KV, "readwrite", (s) => s.put(draft, "publishDraft"));
    return true;
  } catch {
    return false;
  }
}

export async function loadPublishDraft(): Promise<PublishDraft | null> {
  try {
    const d = await run<PublishDraft | undefined>(KV, "readonly", (s) => s.get("publishDraft"));
    return d ?? null;
  } catch {
    return null;
  }
}

export async function clearPublishDraft(): Promise<void> {
  try {
    await run(KV, "readwrite", (s) => s.delete("publishDraft"));
  } catch {
    // ignore
  }
}

/** Cached timeline visuals (filmstrip, waveform) per asset. */
export async function saveInsightCache(assetId: string, value: unknown): Promise<void> {
  try {
    await run(KV, "readwrite", (s) => s.put(value, `insight:${assetId}`));
  } catch {
    // ignore: cache only
  }
}

export async function loadInsightCache<T>(assetId: string): Promise<T | null> {
  try {
    const v = await run<T | undefined>(KV, "readonly", (s) => s.get(`insight:${assetId}`));
    return v ?? null;
  } catch {
    return null;
  }
}
