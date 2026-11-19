/**
 * Tiny IndexedDB wrapper for editor autosave.
 *  - "media": assetId -> Blob (original imported files)
 *  - "kv":    "project" -> Project JSON, "pendingExport" -> exported video waiting to be published
 * All functions fail soft (resolve to null/false) so the editor still works in private mode.
 */
import type { Project } from "@/lib/editor/types";

const DB_NAME = "buzzclips-editor";
const DB_VERSION = 1;
const MEDIA = "media";
const KV = "kv";

export interface PendingExport {
  blob: Blob;
  fileName: string;
  title: string;
  createdAt: number;
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

export async function saveMedia(id: string, blob: Blob): Promise<boolean> {
  try {
    await run(MEDIA, "readwrite", (s) => s.put(blob, id));
    return true;
  } catch (err) {
    console.warn("Editor: failed to persist media", err);
    return false;
  }
}

export async function loadMedia(id: string): Promise<Blob | null> {
  try {
    const blob = await run<Blob | undefined>(MEDIA, "readonly", (s) => s.get(id));
    return blob ?? null;
  } catch {
    return null;
  }
}

export async function deleteMedia(id: string): Promise<void> {
  try {
    await run(MEDIA, "readwrite", (s) => s.delete(id));
  } catch {
    // ignore
  }
}

/** Deletes stored media that is no longer referenced by the project. */
export async function pruneMedia(keep: Set<string>): Promise<void> {
  try {
    const keys = await run<IDBValidKey[]>(MEDIA, "readonly", (s) => s.getAllKeys());
    await Promise.all(keys.filter((k) => !keep.has(String(k))).map((k) => deleteMedia(String(k))));
  } catch {
    // ignore
  }
}

export async function clearMedia(): Promise<void> {
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

export async function savePendingExport(pending: PendingExport): Promise<boolean> {
  try {
    await run(KV, "readwrite", (s) => s.put(pending, "pendingExport"));
    return true;
  } catch (err) {
    console.warn("Editor: failed to store exported video", err);
    return false;
  }
}

export async function loadPendingExport(): Promise<PendingExport | null> {
  try {
    const p = await run<PendingExport | undefined>(KV, "readonly", (s) => s.get("pendingExport"));
    return p?.blob ? p : null;
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
