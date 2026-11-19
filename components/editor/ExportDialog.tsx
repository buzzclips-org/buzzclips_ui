"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Loader2, LogIn, UploadCloud, X } from "lucide-react";
import type { Project } from "@/lib/editor/types";
import { cleanFileName, estimateExportBytes, formatBytes, formatTime, outputSize, totalDuration } from "@/lib/editor/timeline";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { exportProject, type ExportProgress, type ExportResult } from "./engine/exporter";

type Status =
  | { kind: "idle" }
  | { kind: "running"; progress: ExportProgress; startedAt: number }
  | { kind: "done"; result: ExportResult; url: string; seconds: number }
  | { kind: "error"; message: string };

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  getBlob: (assetId: string) => Blob | undefined;
  isAuthenticated: boolean;
  onPublish: (blob: Blob, fileName: string) => void;
}

export function ExportDialog({ open, onOpenChange, project, getBlob, isAuthenticated, onPublish }: ExportDialogProps) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);
  const exportedFor = useRef<Project | null>(null);

  const total = totalDuration(project.clips);
  const size = outputSize(project.settings.aspect, project.settings.resolution);
  const fileName = `${cleanFileName(project.name)}.mp4`;

  // Reset when reopened; free memory of a previous export.
  useEffect(() => {
    if (!open || status.kind === "running") return;
    if (status.kind !== "done" || exportedFor.current !== project) setStatus({ kind: "idle" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  // Warn before leaving mid-export.
  useEffect(() => {
    if (status.kind !== "running") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status.kind]);

  const start = async () => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    exportedFor.current = project;
    const startedAt = performance.now();
    setStatus({ kind: "running", startedAt, progress: { phase: "preparing", progress: 0, message: "Starting…" } });

    let wakeLock: { release: () => Promise<void> } | null = null;
    try {
      wakeLock = await (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock
        ?.request("screen")
        .catch(() => null) ?? null;
    } catch {
      wakeLock = null;
    }

    try {
      const result = await exportProject(
        project,
        getBlob,
        (progress) => setStatus((s) => (s.kind === "running" ? { ...s, progress } : s)),
        controller.signal
      );
      const url = URL.createObjectURL(result.blob);
      urlRef.current = url;
      setStatus({ kind: "done", result, url, seconds: (performance.now() - startedAt) / 1000 });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus({ kind: "idle" });
      } else {
        console.error("Export failed", err);
        setStatus({ kind: "error", message: err instanceof Error ? err.message : "Export failed unexpectedly." });
      }
    } finally {
      wakeLock?.release().catch(() => {});
      abortRef.current = null;
    }
  };

  const cancel = () => abortRef.current?.abort();

  const download = () => {
    if (status.kind !== "done") return;
    const a = document.createElement("a");
    a.href = status.url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const running = status.kind === "running";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && running) return; // must cancel explicitly
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => running && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {status.kind === "done" ? "Your video is ready" : status.kind === "error" ? "Export failed" : "Export video"}
          </DialogTitle>
          <DialogDescription>
            {status.kind === "done"
              ? `Rendered in ${formatTime(status.seconds, false)} on your device.`
              : "Rendering happens entirely in your browser. Nothing is uploaded."}
          </DialogDescription>
        </DialogHeader>

        {status.kind === "idle" && (
          <div className="space-y-3">
            <dl className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["Format", "MP4 (H.264 + AAC)"],
                ["Resolution", `${size.width}×${size.height}`],
                ["Frame rate", `${project.settings.fps} fps`],
                ["Duration", formatTime(total)],
                ["Clips", String(project.clips.length)],
                ["Estimated size", `~${formatBytes(estimateExportBytes(project.settings, total))}`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2">
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-[11px] text-muted-foreground">
              Keep this tab open and visible while exporting. Longer and higher-resolution videos take more time; change
              quality in the Project tab.
            </p>
          </div>
        )}

        {status.kind === "running" && (
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {status.progress.message}
              </span>
              <span className="font-mono tabular-nums">{Math.round(status.progress.progress * 100)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(status.progress.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-[width] duration-200" style={{ width: `${status.progress.progress * 100}%` }} />
            </div>
            <EtaLine startedAt={status.startedAt} progress={status.progress.progress} />
          </div>
        )}

        {status.kind === "done" && (
          <div className="space-y-3">
            <video src={status.url} controls playsInline className="max-h-[45vh] w-full rounded-lg bg-black" />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {fileName} · {formatBytes(status.result.blob.size)} · {status.result.width}×{status.result.height}
              {status.result.audioCodec ? "" : " · no audio"}
            </p>
          </div>
        )}

        {status.kind === "error" && (
          <div className="flex gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
            <div className="space-y-1">
              <p>{status.message}</p>
              <p className="text-muted-foreground">Try a lower resolution or frame rate, or use the latest Chrome or Edge.</p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {status.kind === "idle" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button onClick={start} disabled={project.clips.length === 0} className="gap-1.5">
                <Download className="h-4 w-4" /> Start export
              </Button>
            </>
          )}
          {status.kind === "running" && (
            <Button variant="outline" onClick={cancel} className="gap-1.5">
              <X className="h-4 w-4" /> Cancel export
            </Button>
          )}
          {status.kind === "done" && (
            <>
              <Button variant="outline" onClick={download} className="gap-1.5">
                <Download className="h-4 w-4" /> Download MP4
              </Button>
              <Button onClick={() => onPublish(status.result.blob, fileName)} className="gap-1.5">
                {isAuthenticated ? <UploadCloud className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                Publish to BuzzClips
              </Button>
            </>
          )}
          {status.kind === "error" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button onClick={start}>Try again</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EtaLine({ startedAt, progress }: { startedAt: number; progress: number }) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsed = (now - startedAt) / 1000;
  const remaining = progress > 0.05 ? (elapsed / progress) * (1 - progress) : null;
  return (
    <p className="text-[11px] text-muted-foreground">
      Elapsed {formatTime(elapsed, false)}
      {remaining !== null && ` · about ${formatTime(remaining, false)} left`}
    </p>
  );
}
