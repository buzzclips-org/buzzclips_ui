"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Film, Loader2, LogIn, UploadCloud, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/store/auth-context";
import type { TranscodeProgress, VideoVisibility } from "@/types/video";
import { formatBytes } from "@/lib/editor/timeline";
import {
  MAX_UPLOAD_SIZE_MB,
  VIDEO_CATEGORIES,
  isCancelError,
  subscribeTranscodeProgress,
  uploadVideo,
} from "@/utility/videoUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Segmented } from "./controls";
import {
  clearPendingExport,
  clearPublishDraft,
  loadPublishDraft,
  savePublishDraft,
  type PublishDraft,
} from "./engine/storage";

export interface PublishVideo {
  blob: Blob;
  fileName: string;
}

type Phase =
  | { kind: "form" }
  | { kind: "uploading"; percent: number; fallback: boolean }
  | { kind: "published"; videoId?: number; processId?: string; progress: TranscodeProgress | null }
  | { kind: "error"; message: string };

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: PublishVideo | null;
  defaultTitle: string;
  /** Persist editor state before leaving for login/sign-up. */
  beforeAuthRedirect: () => Promise<void>;
  onPublished: () => void;
}

/** Where login/sign-up should send the user back to: the editor, reopening this dialog. */
export const PUBLISH_RETURN_PATH = "/?publish=1";

const CATEGORY_LABEL = (c: string) => c.charAt(0) + c.slice(1).toLowerCase();

export function PublishDialog({ open, onOpenChange, video, defaultTitle, beforeAuthRedirect, onPublished }: PublishDialogProps) {
  const { isAuthenticated, isLoaded, token, user } = useAuth();
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const [draft, setDraft] = useState<PublishDraft>({
    videoTitle: defaultTitle.slice(0, 100),
    description: "",
    category: "OTHER",
    visibility: "PUBLIC",
    tags: "",
    resume: false,
  });
  const [touched, setTouched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const draftLoaded = useRef(false);

  const previewUrl = useMemo(() => (video ? URL.createObjectURL(video.blob) : null), [video]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // Restore a saved draft (e.g. after coming back from login), otherwise prefill the title.
  useEffect(() => {
    if (!open || draftLoaded.current) return;
    draftLoaded.current = true;
    loadPublishDraft().then((saved) => {
      if (saved) setDraft({ ...saved, resume: false });
      else setDraft((d) => ({ ...d, videoTitle: d.videoTitle || defaultTitle.slice(0, 100) }));
    });
  }, [open, defaultTitle]);

  // Keep the draft saved while typing so nothing is lost on reload or login.
  useEffect(() => {
    if (!draftLoaded.current || phase.kind === "published") return;
    const id = setTimeout(() => savePublishDraft({ ...draft, resume: false }), 400);
    return () => clearTimeout(id);
  }, [draft, phase.kind]);

  // Reset to the form whenever a new video is handed in.
  useEffect(() => {
    if (open && phase.kind !== "uploading" && phase.kind !== "published") setPhase({ kind: "form" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, video]);

  // Follow transcoding after publishing.
  const publishedIds = phase.kind === "published" ? `${phase.videoId ?? ""}|${phase.processId ?? ""}` : "";
  useEffect(() => {
    if (phase.kind !== "published") return;
    return subscribeTranscodeProgress({
      videoId: phase.videoId,
      processId: phase.processId,
      onUpdate: (progress) => setPhase((p) => (p.kind === "published" ? { ...p, progress } : p)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publishedIds]);

  // Warn before closing the tab mid-upload.
  useEffect(() => {
    if (phase.kind !== "uploading") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase.kind]);

  const sizeMb = video ? video.blob.size / (1024 * 1024) : 0;
  const tooLarge = sizeMb > MAX_UPLOAD_SIZE_MB;
  const titleError = !draft.videoTitle.trim() ? "Title is required" : draft.videoTitle.length > 100 ? "Max 100 characters" : "";
  const descError = draft.description.length > 2000 ? "Max 2000 characters" : "";
  const canSubmit = Boolean(video) && !titleError && !descError && !tooLarge;

  const goToAuth = async (path: "/auth/login" | "/auth/signup") => {
    await savePublishDraft({ ...draft, resume: true });
    await beforeAuthRedirect();
    window.location.assign(`${path}?next=${encodeURIComponent(PUBLISH_RETURN_PATH)}`);
  };

  const publish = async () => {
    setTouched(true);
    if (!video || !canSubmit || !token) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase({ kind: "uploading", percent: 0, fallback: false });
    try {
      const file = new File([video.blob], video.fileName, { type: video.blob.type || "video/mp4" });
      const result = await uploadVideo({
        file,
        meta: { ...draft, visibility: draft.visibility as VideoVisibility },
        token,
        userId: user?.userId || "",
        signal: controller.signal,
        onProgress: (percent) => setPhase((p) => (p.kind === "uploading" ? { ...p, percent } : p)),
        onFallback: () => setPhase((p) => (p.kind === "uploading" ? { ...p, fallback: true } : p)),
      });
      await Promise.all([clearPendingExport(), clearPublishDraft()]);
      setPhase({ kind: "published", videoId: result.videoId, processId: result.processId, progress: null });
      toast.success("Published! BuzzClips is now processing your video.");
      onPublished();
    } catch (err) {
      if (isCancelError(err) || controller.signal.aborted) {
        setPhase({ kind: "form" });
        toast("Upload cancelled. Your video and details are still here.");
      } else {
        console.error("Publish failed", err);
        setPhase({
          kind: "error",
          message: "The upload didn't go through. Check your connection and try again. Your edit and exported video are safe.",
        });
      }
    } finally {
      abortRef.current = null;
    }
  };

  const uploading = phase.kind === "uploading";
  const update = (patch: Partial<PublishDraft>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && uploading) return;
        onOpenChange(o);
        if (!o && phase.kind === "published") setPhase({ kind: "form" });
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl" onInteractOutside={(e) => uploading && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{phase.kind === "published" ? "Your video is on BuzzClips" : "Publish to BuzzClips"}</DialogTitle>
          <DialogDescription>
            {phase.kind === "published"
              ? "We're preparing it for smooth streaming on every device. You can keep editing meanwhile."
              : "Share your edited video with the BuzzClips community. Your project stays open in the editor."}
          </DialogDescription>
        </DialogHeader>

        {!video && phase.kind !== "published" && (
          <p className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground">
            Export your video first, then publish it from here.
          </p>
        )}

        {video && (phase.kind === "form" || phase.kind === "error") && (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-xl border border-border/60 bg-muted/30 p-2">
              {previewUrl ? (
                <video src={previewUrl} muted playsInline className="h-20 w-32 shrink-0 rounded-md bg-black object-contain" />
              ) : (
                <div className="flex h-20 w-32 items-center justify-center rounded-md bg-muted">
                  <Film className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 self-center text-xs">
                <p className="truncate font-medium">{video.fileName}</p>
                <p className={tooLarge ? "text-red-500" : "text-muted-foreground"}>
                  {formatBytes(video.blob.size)}
                  {tooLarge && ` · over the ${MAX_UPLOAD_SIZE_MB} MB limit. Export at a lower resolution.`}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="publish-title">Title *</Label>
              <Input
                id="publish-title"
                value={draft.videoTitle}
                maxLength={100}
                onChange={(e) => update({ videoTitle: e.target.value })}
                placeholder="Give your video a catchy title"
                aria-invalid={touched && !!titleError}
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span className="text-red-500">{touched ? titleError : ""}</span>
                <span>{draft.videoTitle.length}/100</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="publish-description">Description</Label>
              <Textarea
                id="publish-description"
                rows={3}
                value={draft.description}
                maxLength={2000}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="What's this video about?"
              />
              <p className="text-right text-[11px] text-muted-foreground">{draft.description.length}/2000</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="publish-category">Category</Label>
                <select
                  id="publish-category"
                  value={draft.category}
                  onChange={(e) => update({ category: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs dark:bg-input/30"
                >
                  {VIDEO_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="publish-tags">Tags</Label>
                <Input id="publish-tags" value={draft.tags} onChange={(e) => update({ tags: e.target.value })} placeholder="travel, vlog, goa" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <Segmented
                value={draft.visibility}
                options={[
                  { value: "PUBLIC", label: "Public", title: "Anyone can find and watch" },
                  { value: "UNLISTED", label: "Unlisted", title: "Only people with the link" },
                  { value: "PRIVATE", label: "Private", title: "Only you" },
                ]}
                onChange={(v) => update({ visibility: v })}
              />
            </div>

            {isLoaded && !isAuthenticated && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs leading-relaxed">
                <p className="font-medium text-foreground">Sign in to publish. Your work is safe.</p>
                <p className="text-muted-foreground">
                  Your project, exported video and these details are saved in this browser. After you sign in (or
                  create a free account) you&apos;ll come right back here to finish publishing.
                </p>
              </div>
            )}

            {phase.kind === "error" && (
              <div className="flex gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{phase.message}</span>
              </div>
            )}
          </div>
        )}

        {phase.kind === "uploading" && (
          <div className="space-y-3 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <Loader2 className="h-4 w-4 animate-spin" />
                {phase.fallback ? "Uploading via BuzzClips servers…" : "Uploading your video…"}
              </span>
              <span className="font-mono tabular-nums">{phase.percent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={phase.percent} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-[width]" style={{ width: `${phase.percent}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">Keep this tab open until the upload finishes.</p>
          </div>
        )}

        {phase.kind === "published" && <PublishedStatus phase={phase} />}

        <DialogFooter className="gap-2 sm:gap-2">
          {(phase.kind === "form" || phase.kind === "error") && video && (
            <>
              {!isLoaded ? (
                <Button disabled className="gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking account…
                </Button>
              ) : isAuthenticated ? (
                <>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Not now
                  </Button>
                  <Button onClick={publish} disabled={touched && !canSubmit} className="gap-1.5">
                    <UploadCloud className="h-4 w-4" /> {phase.kind === "error" ? "Try again" : "Publish"}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => goToAuth("/auth/signup")} className="gap-1.5">
                    <UserPlus className="h-4 w-4" /> Create account
                  </Button>
                  <Button onClick={() => goToAuth("/auth/login")} className="gap-1.5">
                    <LogIn className="h-4 w-4" /> Sign in & publish
                  </Button>
                </>
              )}
            </>
          )}
          {phase.kind === "uploading" && (
            <Button variant="outline" onClick={() => abortRef.current?.abort()} className="gap-1.5">
              <X className="h-4 w-4" /> Cancel upload
            </Button>
          )}
          {phase.kind === "published" && (
            <>
              <Button variant="outline" asChild>
                <Link href="/my-videos">My videos</Link>
              </Button>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  setPhase({ kind: "form" });
                }}
              >
                Keep editing
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PublishedStatus({ phase }: { phase: Extract<Phase, { kind: "published" }> }) {
  const p = phase.progress;
  const done = p?.status === "COMPLETED";
  const failed = p?.status === "FAILED";
  const percent = done ? 100 : Math.max(5, Math.min(99, p?.percent ?? 10));
  return (
    <div className="space-y-3 py-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        {done ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : failed ? (
          <AlertTriangle className="h-5 w-5 text-red-500" />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        )}
        {done
          ? "Your video is live!"
          : failed
            ? "Processing failed. Try exporting again at 720p, then re-publish."
            : `Processing for streaming${p?.stage ? ` · ${p.stage.toLowerCase().replace(/_/g, " ")}` : ""}…`}
      </div>
      {!failed && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${percent}%` }} />
        </div>
      )}
      {done && phase.videoId && (
        <Link href={`/video/${phase.videoId}/view`} className="inline-flex text-sm font-medium text-primary hover:underline">
          Watch your video →
        </Link>
      )}
      {!done && !failed && (
        <p className="text-xs text-muted-foreground">
          This usually takes a minute or two. It continues even if you close this dialog. Find it anytime in My videos.
        </p>
      )}
    </div>
  );
}
