"use client";

import { useRef, useState } from "react";
import { FileVideo, ImageIcon, Loader2, Music, Plus, Trash2, UploadCloud } from "lucide-react";
import type { MediaAsset } from "@/lib/editor/types";
import { formatBytes, formatTime } from "@/lib/editor/timeline";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ACCEPTED_TYPES } from "./engine/probe";

interface MediaLibraryProps {
  assets: MediaAsset[];
  usedIds: Set<string>;
  musicAssetId: string | null;
  importing: number;
  onImport: (files: File[]) => void;
  onAddToTimeline: (asset: MediaAsset) => void;
  onSetMusic: (asset: MediaAsset) => void;
  onRemove: (asset: MediaAsset) => void;
}

const KIND_ICON = { video: FileVideo, image: ImageIcon, audio: Music } as const;

export function MediaLibrary({
  assets,
  usedIds,
  musicAssetId,
  importing,
  onImport,
  onAddToTimeline,
  onSetMusic,
  onRemove,
}: MediaLibraryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDragging(false);
        onImport(Array.from(e.dataTransfer.files));
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2.5">
        <h2 className="text-sm font-semibold">Media</h2>
        <Button size="sm" onClick={() => inputRef.current?.click()} className="h-7 gap-1 px-2 text-xs">
          <Plus className="h-3.5 w-3.5" /> Import
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="hidden"
          data-testid="editor-file-input"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) onImport(files);
            e.target.value = "";
          }}
        />
      </div>

      <div className={cn("flex-1 min-h-0 overflow-y-auto p-2", dragging && "bg-primary/5 ring-2 ring-inset ring-primary/40")}>
        {importing > 0 && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing {importing} file{importing > 1 ? "s" : ""}…
          </div>
        )}

        {assets.length === 0 && importing === 0 ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-full min-h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/70 p-4 text-center text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <UploadCloud className="h-7 w-7" />
            <span className="text-xs font-medium">Drop videos, photos or music here</span>
            <span className="text-[11px]">MP4, MOV, WebM, JPG, PNG, MP3, WAV…</span>
          </button>
        ) : (
          <ul className="grid grid-cols-2 gap-2 lg:grid-cols-1 xl:grid-cols-2">
            {assets.map((asset) => {
              const Icon = KIND_ICON[asset.kind];
              const isMusic = musicAssetId === asset.id;
              const used = usedIds.has(asset.id) || isMusic;
              return (
                <li key={asset.id} className="group relative overflow-hidden rounded-lg border border-border/60 bg-card/60">
                  <button
                    type="button"
                    onClick={() => (asset.kind === "audio" ? onSetMusic(asset) : onAddToTimeline(asset))}
                    title={asset.kind === "audio" ? "Use as background music" : "Add to end of timeline"}
                    className="block w-full text-left"
                    draggable={asset.kind !== "audio"}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/x-buzzclips-asset", asset.id);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                  >
                    <div className="relative aspect-video w-full bg-muted/60">
                      {asset.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={asset.thumbnail} alt="" className="h-full w-full object-cover" draggable={false} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Icon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 font-mono text-[10px] text-white">
                        {asset.kind === "image" ? "Photo" : formatTime(asset.duration, false)}
                      </span>
                      {used && (
                        <span className="absolute left-1 top-1 rounded bg-primary px-1 py-0.5 text-[9px] font-semibold uppercase text-primary-foreground">
                          {isMusic ? "Music" : "In use"}
                        </span>
                      )}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-black">
                          {asset.kind === "audio" ? <Music className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                          {asset.kind === "audio" ? "Use as music" : "Add"}
                        </span>
                      </span>
                    </div>
                    <div className="px-2 py-1.5">
                      <p className="truncate text-[11px] font-medium" title={asset.name}>
                        {asset.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {asset.kind !== "audio" && asset.width ? `${asset.width}×${asset.height} · ` : ""}
                        {formatBytes(asset.size)}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(asset)}
                    aria-label={`Remove ${asset.name}`}
                    title="Remove from project"
                    className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100 focus:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="border-t border-border/50 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
        Files stay on your device. Nothing is uploaded unless you choose to publish.
      </p>
    </div>
  );
}
