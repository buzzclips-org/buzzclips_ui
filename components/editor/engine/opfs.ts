/**
 * Origin Private File System helpers.
 *
 * OPFS is a real on-disk file system private to this site. Files written here are streamed
 * to disk (no full in-memory copy), and `getFile()` returns a disk-backed File, so large
 * media and exports don't have to live in the tab's RAM.
 */

const DIR = "buzzclips-editor";

let supportCache: boolean | null = null;

/** True when the browser supports OPFS with streaming writes (Chrome/Edge 86+, Firefox 111+, Safari 18.4+). */
export function opfsSupported(): boolean {
  if (supportCache !== null) return supportCache;
  supportCache =
    typeof navigator !== "undefined" &&
    typeof navigator.storage?.getDirectory === "function" &&
    typeof FileSystemFileHandle !== "undefined" &&
    "createWritable" in FileSystemFileHandle.prototype;
  return supportCache;
}

async function dir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(DIR, { create: true });
}

/** Streams a Blob to OPFS. Never buffers the whole file in memory. */
export async function writeOpfsFile(name: string, blob: Blob): Promise<void> {
  const handle = await (await dir()).getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  try {
    await blob.stream().pipeTo(writable);
  } catch (err) {
    await writable.abort().catch(() => {});
    throw err;
  }
}

/** Opens a writable stream for an OPFS file (used by the exporter to write MP4 straight to disk). */
export async function createOpfsWritable(name: string): Promise<FileSystemWritableFileStream> {
  const handle = await (await dir()).getFileHandle(name, { create: true });
  return handle.createWritable();
}

/** Returns a disk-backed File, or null if it doesn't exist. */
export async function readOpfsFile(name: string): Promise<File | null> {
  try {
    const handle = await (await dir()).getFileHandle(name);
    return await handle.getFile();
  } catch {
    return null;
  }
}

export async function deleteOpfsFile(name: string): Promise<void> {
  try {
    await (await dir()).removeEntry(name);
  } catch {
    // already gone
  }
}

export async function listOpfsFiles(): Promise<string[]> {
  try {
    const names: string[] = [];
    // `keys()` is supported wherever OPFS is.
    for await (const name of (await dir()) as unknown as AsyncIterable<[string, FileSystemHandle]>) {
      names.push(name[0]);
    }
    return names;
  } catch {
    return [];
  }
}

/** Deletes every OPFS file whose name passes `shouldDelete`. */
export async function pruneOpfs(shouldDelete: (name: string) => boolean): Promise<void> {
  const names = await listOpfsFiles();
  await Promise.all(names.filter(shouldDelete).map(deleteOpfsFile));
}

export interface StorageEstimate {
  usage: number;
  quota: number;
}

export async function estimateStorage(): Promise<StorageEstimate | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    if (!e || !e.quota) return null;
    return { usage: e.usage ?? 0, quota: e.quota };
  } catch {
    return null;
  }
}
