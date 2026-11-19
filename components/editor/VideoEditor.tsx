"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Cloud,
  CloudOff,
  Download,
  FilePlus2,
  Keyboard,
  Loader2,
  Redo2,
  Undo2,
  UploadCloud,
  X,
} from "lucide-react";
import { useAuth } from "@/store/auth-context";
import type { AspectRatio, Clip, MediaAsset, MusicTrack, Project, ProjectSettings, TextOverlay } from "@/lib/editor/types";
import { createEmptyProject, MAX_SPEED, MIN_SPEED } from "@/lib/editor/types";
import { historyReducer, initHistory } from "@/lib/editor/history";
import {
  clamp,
  clampTexts,
  createClipFromAsset,
  createId,
  createTextOverlay,
  duplicateClip,
  moveItem,
  removeAssetReferences,
  splitAt,
  totalDuration,
  trimClip,
} from "@/lib/editor/timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { MediaLibrary } from "./MediaLibrary";
import { PreviewPanel } from "./PreviewPanel";
import { Timeline, type Selection } from "./Timeline";
import { Inspector, type InspectorTab } from "./Inspector";
import { ExportDialog } from "./ExportDialog";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { usePreviewPlayer } from "./usePreviewPlayer";
import { ACCEPTED_TYPES, getBrowserSupport, probeFile } from "./engine/probe";
import {
  clearMedia,
  clearPendingExport,
  loadMedia,
  loadPendingExport,
  loadProject,
  pruneMedia,
  saveMedia,
  savePendingExport,
  saveProject,
  type PendingExport,
} from "./engine/storage";

const UPLOAD_HANDOFF_PATH = "/video/upload?source=editor";
const MAX_IMPORT_BYTES = 4 * 1024 * 1024 * 1024;
type SaveState = "idle" | "saving" | "saved" | "error";

export interface EditorPreset {
  /** Canvas shape for a fresh project (e.g. 9:16 on the Reels landing page). */
  aspect?: AspectRatio;
  /** Panel to open first. */
  panel?: InspectorTab;
  /** Short task-specific tip shown above the editor. */
  hint?: string;
}

export default function VideoEditor({ preset }: { preset?: EditorPreset } = {}) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [history, dispatch] = useReducer(historyReducer, undefined, () => initHistory(createEmptyProject()));
  const project = history.present;
  const projectRef = useRef(project);
  projectRef.current = project;

  const blobsRef = useRef(new Map<string, Blob>());
  const urlsRef = useRef<Record<string, string>>({});
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [selection, setSelection] = useState<Selection>(null);
  const [tab, setTab] = useState<InspectorTab>(preset?.panel ?? "project");
  const [showHint, setShowHint] = useState(Boolean(preset?.hint));
  const [importing, setImporting] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [pending, setPending] = useState<PendingExport | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"media" | "edit">("media");
  const [support, setSupport] = useState<{ ok: boolean; reason?: string }>({ ok: true });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const storageWarned = useRef(false);

  const player = usePreviewPlayer(project, mediaUrls, canvasRef);
  const { store, seek, pause } = player;

  const assets = useMemo(() => new Map(project.assets.map((a) => [a.id, a])), [project.assets]);
  const total = useMemo(() => totalDuration(project.clips), [project.clips]);
  const usedIds = useMemo(() => new Set(project.clips.map((c) => c.assetId)), [project.clips]);

  useEffect(() => setSupport(getBrowserSupport()), []);

  /* ------------------------------ history ------------------------------ */

  const commit = useCallback((next: Project | ((p: Project) => Project), group?: string) => {
    const prev = projectRef.current;
    let value = typeof next === "function" ? next(prev) : next;
    if (value === prev) return;
    if (value.clips !== prev.clips && value.texts.length) {
      value = { ...value, texts: clampTexts(value.texts, totalDuration(value.clips)) };
    }
    projectRef.current = value;
    dispatch({ type: "set", project: value, group });
  }, []);

  const endGroup = useCallback(() => dispatch({ type: "endGroup" }), []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);

  // Keep the playhead inside the timeline when it shrinks.
  useEffect(() => {
    if (store.get() > total) seek(total);
  }, [total, store, seek]);

  /* --------------------------- media registry --------------------------- */

  const registerBlob = useCallback((id: string, blob: Blob) => {
    blobsRef.current.set(id, blob);
    const url = URL.createObjectURL(blob);
    urlsRef.current = { ...urlsRef.current, [id]: url };
    setMediaUrls(urlsRef.current);
  }, []);

  const releaseAllMedia = useCallback(() => {
    Object.values(urlsRef.current).forEach((u) => URL.revokeObjectURL(u));
    urlsRef.current = {};
    blobsRef.current.clear();
    setMediaUrls({});
  }, []);

  useEffect(() => () => Object.values(urlsRef.current).forEach((u) => URL.revokeObjectURL(u)), []);

  const getBlob = useCallback((id: string) => blobsRef.current.get(id), []);

  /* ------------------------- restore & autosave ------------------------- */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [saved, pendingExport] = await Promise.all([loadProject(), loadPendingExport()]);
      if (cancelled) return;
      if (pendingExport) setPending(pendingExport);
      if (saved && (saved.assets.length || saved.clips.length || saved.texts.length)) {
        let restored: Project = { ...saved, assets: [] };
        const missing: MediaAsset[] = [];
        for (const asset of saved.assets) {
          const blob = await loadMedia(asset.id);
          if (cancelled) return;
          if (blob) {
            registerBlob(asset.id, blob);
            restored.assets.push(asset);
          } else {
            missing.push(asset);
          }
        }
        for (const m of missing) restored = removeAssetReferences(restored, m.id);
        projectRef.current = restored;
        dispatch({ type: "replace", project: restored });
        pruneMedia(new Set(restored.assets.map((a) => a.id)));
        if (restored.clips.length) {
          toast.success("Welcome back! Your last project was restored.", {
            description: "Everything is saved in this browser automatically.",
          });
        }
        if (missing.length) {
          toast.warning(`${missing.length} media file${missing.length > 1 ? "s" : ""} couldn't be restored. Please re-import.`);
        }
      }
      const current = projectRef.current;
      if (preset?.aspect && current.clips.length === 0 && current.settings.aspect !== preset.aspect) {
        const withPreset = { ...current, settings: { ...current.settings, aspect: preset.aspect } };
        projectRef.current = withPreset;
        dispatch({ type: "replace", project: withPreset });
      }
      setRestoring(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerBlob]);

  useEffect(() => {
    if (restoring) return;
    setSaveState("saving");
    const id = setTimeout(async () => {
      const ok = await saveProject(project);
      setSaveState(ok ? "saved" : "error");
    }, 600);
    return () => clearTimeout(id);
  }, [project, restoring]);

  /* ------------------------------- import ------------------------------- */

  const importFiles = useCallback(
    async (files: File[]) => {
      if (!support.ok) {
        toast.error(support.reason);
        return;
      }
      setImporting((n) => n + files.length);
      const added: MediaAsset[] = [];
      for (const file of files) {
        try {
          if (file.size > MAX_IMPORT_BYTES) throw new Error(`"${file.name}" is larger than 4 GB, which is too big to edit in a browser.`);
          const asset = await probeFile(file);
          registerBlob(asset.id, file);
          saveMedia(asset.id, file).then((ok) => {
            if (!ok && !storageWarned.current) {
              storageWarned.current = true;
              toast.warning("Browser storage is full, so media won't be restored after a reload. Your edits still work.");
            }
          });
          added.push(asset);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : `Couldn't import "${file.name}".`);
        } finally {
          setImporting((n) => n - 1);
        }
      }
      if (!added.length) return;

      let aspectNote: string | null = null;
      commit((p) => {
        const clips = [...p.clips];
        let music = p.music;
        const hasClipAudio = [...p.assets, ...added].some((a) => a.kind === "video" && a.hasAudio);
        for (const a of added) {
          if (a.kind === "audio") {
            if (!music) music = { assetId: a.id, volume: hasClipAudio ? 0.6 : 1, offset: 0, trimStart: 0, loop: true };
          } else {
            clips.push(createClipFromAsset(a));
          }
        }
        let settings = p.settings;
        let name = p.name;
        const firstVisual = added.find((a) => a.kind !== "audio");
        if (!preset?.aspect && p.clips.length === 0 && firstVisual && firstVisual.width && firstVisual.height) {
          const r = firstVisual.width / firstVisual.height;
          const aspect = r < 0.7 ? "9:16" : r < 0.9 ? "4:5" : r <= 1.1 ? "1:1" : "16:9";
          if (aspect !== settings.aspect) {
            settings = { ...settings, aspect };
            aspectNote = aspect;
          }
        }
        if (p.name === "Untitled project" && firstVisual) {
          name = firstVisual.name.replace(/\.[^/.]+$/, "").slice(0, 60) || name;
        }
        return { ...p, name, settings, assets: [...p.assets, ...added], clips, music };
      });

      const visual = added.filter((a) => a.kind !== "audio").length;
      const audio = added.length - visual;
      const parts = [visual && `${visual} clip${visual > 1 ? "s" : ""} added to the timeline`, audio && `${audio} audio file${audio > 1 ? "s" : ""} imported`].filter(Boolean);
      toast.success(parts.join(", "), aspectNote ? { description: `Canvas set to ${aspectNote} to match your media. Change it in the Project tab.` } : undefined);
    },
    [commit, registerBlob, support, preset?.aspect]
  );

  // Paste files from clipboard.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files || []);
      if (files.length) importFiles(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [importFiles]);

  const requestImport = useCallback(() => importInputRef.current?.click(), []);

  /* ---------------------------- clip actions ---------------------------- */

  const select = useCallback((s: Selection) => {
    setSelection(s);
    if (s?.type === "clip") setTab("clip");
    else if (s?.type === "text") setTab("text");
    else if (s?.type === "music") setTab("audio");
  }, []);

  const updateClip = useCallback(
    (id: string, patch: Partial<Clip>, group?: string) => {
      commit(
        (p) => ({
          ...p,
          clips: p.clips.map((c) => {
            if (c.id !== id) return c;
            const next = { ...c, ...patch };
            if (patch.speed !== undefined) next.speed = clamp(patch.speed, MIN_SPEED, MAX_SPEED);
            if (patch.out !== undefined && p.assets.find((a) => a.id === c.assetId)?.kind === "image") {
              next.out = clamp(patch.out, 0.5, 600);
            }
            return next;
          }),
        }),
        group
      );
    },
    [commit]
  );

  const trim = useCallback(
    (id: string, patch: { in?: number; out?: number }) => {
      commit((p) => {
        return {
          ...p,
          clips: p.clips.map((c) => {
            if (c.id !== id) return c;
            const asset = p.assets.find((a) => a.id === c.assetId);
            const sourceDuration = asset?.kind === "image" ? Infinity : asset?.duration ?? c.out;
            return trimClip(c, patch, sourceDuration);
          }),
        };
      }, `trim:${id}`);
    },
    [commit]
  );

  const applyToAllClips = useCallback(
    (patch: Partial<Clip>) => {
      commit((p) => ({
        ...p,
        clips: p.clips.map((c) => ({ ...c, ...patch, filters: patch.filters ? { ...patch.filters } : c.filters })),
      }));
      toast.success("Applied to all clips");
    },
    [commit]
  );

  const split = useCallback(() => {
    const { clips, newClipId } = splitAt(projectRef.current.clips, store.get());
    if (!newClipId) {
      toast.info("Move the playhead inside a clip (away from its edges) to split it.");
      return;
    }
    commit((p) => ({ ...p, clips }));
    select({ type: "clip", id: newClipId });
  }, [commit, select, store]);

  const deleteSelection = useCallback(() => {
    const s = selection;
    if (!s) return;
    if (s.type === "clip") {
      const clips = projectRef.current.clips;
      const idx = clips.findIndex((c) => c.id === s.id);
      if (idx === -1) return;
      const remaining = clips.filter((c) => c.id !== s.id);
      commit((p) => ({ ...p, clips: remaining }));
      const neighbour = remaining[Math.min(idx, remaining.length - 1)];
      select(neighbour ? { type: "clip", id: neighbour.id } : null);
    } else if (s.type === "text") {
      commit((p) => ({ ...p, texts: p.texts.filter((t) => t.id !== s.id) }));
      setSelection(null);
    } else {
      commit((p) => ({ ...p, music: null }));
      setSelection(null);
    }
  }, [commit, select, selection]);

  const duplicate = useCallback(() => {
    const s = selection;
    if (!s) return;
    if (s.type === "clip") {
      const { clips, newClipId } = duplicateClip(projectRef.current.clips, s.id);
      if (!newClipId) return;
      commit((p) => ({ ...p, clips }));
      select({ type: "clip", id: newClipId });
    } else if (s.type === "text") {
      const src = projectRef.current.texts.find((t) => t.id === s.id);
      if (!src) return;
      const len = src.end - src.start;
      const start = src.end + len <= total ? src.end : src.start;
      const copy: TextOverlay = { ...src, id: createId("text"), start, end: start + len, y: start === src.start ? clamp(src.y - 0.1, 0.05, 0.95) : src.y };
      commit((p) => ({ ...p, texts: [...p.texts, copy] }));
      select({ type: "text", id: copy.id });
    }
  }, [commit, select, selection, total]);

  const moveClip = useCallback((from: number, to: number) => commit((p) => ({ ...p, clips: moveItem(p.clips, from, to) })), [commit]);

  const insertAsset = useCallback(
    (assetId: string, index: number) => {
      const asset = projectRef.current.assets.find((a) => a.id === assetId);
      if (!asset || asset.kind === "audio") return;
      const clip = createClipFromAsset(asset);
      commit((p) => {
        const clips = [...p.clips];
        clips.splice(index, 0, clip);
        return { ...p, clips };
      });
      select({ type: "clip", id: clip.id });
    },
    [commit, select]
  );

  const addToTimeline = useCallback(
    (asset: MediaAsset) => {
      insertAsset(asset.id, projectRef.current.clips.length);
      toast.success(`Added "${asset.name}" to the end of the timeline`);
    },
    [insertAsset]
  );

  /* ---------------------------- text & music ---------------------------- */

  const addText = useCallback(() => {
    if (!projectRef.current.clips.length) {
      toast.info("Add a clip first, then put text on top of it.");
      return;
    }
    const overlay = createTextOverlay(store.get(), total);
    commit((p) => ({ ...p, texts: [...p.texts, overlay] }));
    select({ type: "text", id: overlay.id });
    setMobilePanel("edit");
  }, [commit, select, store, total]);

  const updateText = useCallback(
    (id: string, patch: Partial<TextOverlay>, group?: string) =>
      commit((p) => ({ ...p, texts: p.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)) }), group ?? (patch.x !== undefined && patch.start === undefined ? `text:${id}:pos` : `text:${id}:range`)),
    [commit]
  );

  const updateMusic = useCallback(
    (patch: Partial<MusicTrack>, group?: string) => commit((p) => (p.music ? { ...p, music: { ...p.music, ...patch } } : p), group ?? "music:drag"),
    [commit]
  );

  const setMusic = useCallback(
    (asset: MediaAsset) => {
      const hasClipAudio = projectRef.current.clips.some((c) => assets.get(c.assetId)?.hasAudio);
      commit((p) => ({
        ...p,
        music: { assetId: asset.id, volume: hasClipAudio ? 0.6 : 1, offset: 0, trimStart: 0, loop: true },
      }));
      select({ type: "music", id: asset.id });
      toast.success(`"${asset.name}" is now your background music`);
    },
    [assets, commit, select]
  );

  const removeAsset = useCallback(
    (asset: MediaAsset) => {
      const uses = projectRef.current.clips.filter((c) => c.assetId === asset.id).length;
      if (uses > 0 && !window.confirm(`Remove "${asset.name}"? ${uses} clip${uses > 1 ? "s" : ""} using it will also be removed.`)) {
        return;
      }
      // Keep the blob in memory so Undo can bring the asset back.
      commit((p) => ({ ...removeAssetReferences(p, asset.id), assets: p.assets.filter((a) => a.id !== asset.id) }));
      setSelection(null);
      toast(`Removed "${asset.name}"`, { action: { label: "Undo", onClick: undo } });
    },
    [commit, undo]
  );

  const updateSettings = useCallback(
    (patch: Partial<ProjectSettings>, group?: string) => commit((p) => ({ ...p, settings: { ...p.settings, ...patch } }), group),
    [commit]
  );

  /* ------------------------------ project ------------------------------ */

  const newProject = useCallback(async () => {
    pause();
    releaseAllMedia();
    await clearMedia();
    const fresh = createEmptyProject();
    projectRef.current = fresh;
    dispatch({ type: "replace", project: fresh });
    setSelection(null);
    setTab("project");
    seek(0);
    toast.success("Started a new project");
  }, [pause, releaseAllMedia, seek]);

  // Keep tool-page presets for brand-new projects too.
  const newProjectWithPreset = useCallback(async () => {
    await newProject();
    if (preset?.aspect) {
      const fresh = { ...projectRef.current, settings: { ...projectRef.current.settings, aspect: preset.aspect } };
      projectRef.current = fresh;
      dispatch({ type: "replace", project: fresh });
    }
    if (preset?.panel) setTab(preset.panel);
  }, [newProject, preset?.aspect, preset?.panel]);

  /* ------------------------------ publish ------------------------------ */

  const publish = useCallback(
    async (blob: Blob, fileName: string) => {
      const ok = await savePendingExport({ blob, fileName, title: projectRef.current.name, createdAt: Date.now() });
      if (!ok) {
        toast.error("Couldn't hand the video over to the uploader. Download it and upload it from the Upload page.");
        return;
      }
      if (isAuthenticated) {
        router.push(UPLOAD_HANDOFF_PATH);
      } else {
        toast.info("Sign in to publish. Your exported video is saved and will be waiting for you.");
        router.push(`/auth/login?next=${encodeURIComponent(UPLOAD_HANDOFF_PATH)}`);
      }
    },
    [isAuthenticated, router]
  );

  const downloadPending = () => {
    if (!pending) return;
    const url = URL.createObjectURL(pending.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pending.fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  /* ----------------------------- shortcuts ----------------------------- */

  const actionsRef = useRef({ split, deleteSelection, duplicate, addText, undo, redo, toggle: player.toggle });
  actionsRef.current = { split, deleteSelection, duplicate, addText, undo, redo, toggle: player.toggle };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) {
        if (!(target instanceof HTMLInputElement && target.type === "range")) return;
      }
      if (document.querySelector("[role=dialog], [role=alertdialog]")) return;
      const a = actionsRef.current;
      const mod = e.metaKey || e.ctrlKey;
      const fps = projectRef.current.settings.fps;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) a.redo();
        else a.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        a.redo();
        return;
      }
      if (mod || e.altKey) return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          a.toggle();
          break;
        case "s":
        case "S":
          e.preventDefault();
          a.split();
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          a.deleteSelection();
          break;
        case "d":
          a.duplicate();
          break;
        case "t":
          e.preventDefault();
          a.addText();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seek(store.get() - (e.shiftKey ? 1 : 1 / fps));
          break;
        case "ArrowRight":
          e.preventDefault();
          seek(store.get() + (e.shiftKey ? 1 : 1 / fps));
          break;
        case "j":
          seek(store.get() - 5);
          break;
        case "l":
          seek(store.get() + 5);
          break;
        case "Home":
          e.preventDefault();
          seek(0);
          break;
        case "End":
          e.preventDefault();
          seek(totalDuration(projectRef.current.clips));
          break;
        case "Escape":
          setSelection(null);
          break;
        case "?":
          setHelpOpen(true);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [seek, store]);

  /* -------------------------------- view -------------------------------- */

  const selectedText = selection?.type === "text" ? project.texts.find((t) => t.id === selection.id) ?? null : null;

  const library = (
    <MediaLibrary
      assets={project.assets}
      usedIds={usedIds}
      musicAssetId={project.music?.assetId ?? null}
      importing={importing}
      onImport={importFiles}
      onAddToTimeline={addToTimeline}
      onSetMusic={setMusic}
      onRemove={removeAsset}
    />
  );

  const inspector = (
    <Inspector
      project={project}
      assets={assets}
      selection={selection}
      tab={tab}
      onTabChange={setTab}
      getTime={store.get}
      onSelect={select}
      onUpdateClip={updateClip}
      onTrimClip={trim}
      onApplyToAllClips={applyToAllClips}
      onUpdateText={updateText}
      onUpdateMusic={updateMusic}
      onRemoveMusic={() => {
        commit((p) => ({ ...p, music: null }));
        setSelection(null);
      }}
      onUpdateSettings={updateSettings}
      onGestureEnd={endGroup}
      onDuplicate={duplicate}
      onDelete={deleteSelection}
      onAddText={addText}
      onRequestImport={requestImport}
    />
  );

  return (
    <div
      className="flex w-full flex-col bg-background/60 pb-20 md:pb-0 lg:h-[calc(100dvh-61px-var(--editor-offset,0px))] lg:min-h-[640px]"
      onDragOver={(e) => e.dataTransfer.types.includes("Files") && e.preventDefault()}
      onDrop={(e) => {
        if (e.dataTransfer.files.length && !e.defaultPrevented) {
          e.preventDefault();
          importFiles(Array.from(e.dataTransfer.files));
        }
      }}
    >
      <input
        ref={importInputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) importFiles(files);
          e.target.value = "";
        }}
      />

      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/50 bg-background/80 px-3 py-2 backdrop-blur">
        <Input
          value={project.name}
          onChange={(e) => commit((p) => ({ ...p, name: e.target.value.slice(0, 80) }), "name")}
          onBlur={endGroup}
          aria-label="Project name"
          className="h-8 w-full max-w-[240px] border-transparent bg-transparent px-2 text-sm font-semibold hover:border-border focus-visible:border-border"
        />
        <SaveIndicator state={restoring ? "saving" : saveState} restoring={restoring} />
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={!history.past.length} title="Undo (Ctrl/⌘+Z)" aria-label="Undo">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={!history.future.length} title="Redo (Ctrl/⌘+Shift+Z)" aria-label="Redo">
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden h-8 w-8 sm:inline-flex" onClick={() => setHelpOpen(true)} title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">
            <Keyboard className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs" onClick={() => setConfirmNew(true)} title="Start a new project">
            <FilePlus2 className="h-4 w-4" /> <span className="hidden sm:inline">New</span>
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white hover:opacity-90"
            onClick={() => {
              pause();
              setExportOpen(true);
            }}
            disabled={project.clips.length === 0 || !support.ok}
          >
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {showHint && preset?.hint && (
        <div className="flex items-center gap-2 border-b border-border/50 bg-muted/40 px-4 py-1.5 text-xs">
          <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span className="flex-1">{preset.hint}</span>
          <button type="button" onClick={() => setShowHint(false)} aria-label="Dismiss tip" className="rounded p-0.5 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {!support.ok && (
        <div className="flex items-start gap-2 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>{support.reason}</span>
        </div>
      )}

      {pending && (
        <div className="flex flex-wrap items-center gap-2 border-b border-primary/30 bg-primary/10 px-4 py-2 text-xs">
          <UploadCloud className="h-4 w-4 shrink-0 text-primary" />
          <span className="flex-1 min-w-[200px]">
            Your exported video <strong>{pending.fileName}</strong> is ready to publish.
          </span>
          <Button size="sm" className="h-7 text-xs" onClick={() => publish(pending.blob, pending.fileName)}>
            {isAuthenticated ? "Publish now" : "Sign in to publish"}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={downloadPending}>
            Download
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            aria-label="Dismiss"
            onClick={async () => {
              await clearPendingExport();
              setPending(null);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)_minmax(280px,320px)] lg:grid-rows-[minmax(0,1fr)_minmax(180px,230px)]">
        <aside className="hidden min-h-0 border-r border-border/50 lg:block" aria-label="Media library">
          {library}
        </aside>

        <section className="h-[48vh] min-h-[260px] lg:h-auto lg:min-h-0" aria-label="Preview">
          <PreviewPanel
            canvasRef={canvasRef}
            aspect={project.settings.aspect}
            store={store}
            playing={player.playing}
            total={total}
            fps={project.settings.fps}
            onToggle={player.toggle}
            onSeek={seek}
            selectedText={selectedText}
            onMoveText={(id, x, y) => updateText(id, { x, y }, `text:${id}:pos`)}
            onMoveTextEnd={endGroup}
            hasClips={project.clips.length > 0}
          />
        </section>

        <aside className="hidden min-h-0 border-l border-border/50 lg:block" aria-label="Edit panel">
          {inspector}
        </aside>

        <section className="h-[220px] border-t border-border/50 lg:col-span-3 lg:h-auto lg:min-h-0" aria-label="Timeline">
          <Timeline
            clips={project.clips}
            texts={project.texts}
            music={project.music}
            assets={assets}
            total={total}
            store={store}
            selection={selection}
            onSelect={select}
            onSeek={seek}
            onMoveClip={moveClip}
            onInsertAsset={insertAsset}
            onTrimClip={trim}
            onUpdateText={(id, patch) => updateText(id, patch, `text:${id}:range`)}
            onUpdateMusic={(patch) => updateMusic(patch, "music:drag")}
            onGestureEnd={endGroup}
            onSplit={split}
            onDuplicate={duplicate}
            onDelete={deleteSelection}
            onAddText={addText}
          />
        </section>

        {/* Mobile / tablet panels */}
        <section className="border-t border-border/50 lg:hidden">
          <div className="grid grid-cols-2 border-b border-border/50">
            {(["media", "edit"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setMobilePanel(p)}
                className={cn(
                  "py-2 text-xs font-semibold border-b-2",
                  mobilePanel === p ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
                )}
              >
                {p === "media" ? "Media" : "Edit"}
              </button>
            ))}
          </div>
          <div className="h-[460px]">{mobilePanel === "media" ? library : inspector}</div>
        </section>
      </div>

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        project={project}
        getBlob={getBlob}
        isAuthenticated={isAuthenticated}
        onPublish={publish}
      />
      <ShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <AlertDialog open={confirmNew} onOpenChange={setConfirmNew}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a new project?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears the current timeline and imported media from this browser. Export or download anything you want to keep first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={newProjectWithPreset}>Start new project</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SaveIndicator({ state, restoring }: { state: SaveState; restoring: boolean }) {
  if (restoring) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading…
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="flex items-center gap-1 text-[11px] text-amber-500" title="Autosave failed: browser storage may be full or disabled">
        <CloudOff className="h-3 w-3" /> Not saved
      </span>
    );
  }
  if (state === "saving") {
    return (
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Cloud className="h-3 w-3" /> Saving…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground" title="Saved in this browser">
        <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Saved
      </span>
    );
  }
  return null;
}
