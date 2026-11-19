"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Gauge,
  ImageIcon,
  Music,
  Scissors,
  Trash2,
  Type,
  VolumeX,
  ZoomIn,
  ZoomOut,
  Maximize,
} from "lucide-react";
import type { Clip, MediaAsset, MusicTrack, TextOverlay } from "@/lib/editor/types";
import { MIN_CLIP_DURATION } from "@/lib/editor/types";
import { clamp, clipDuration, clipStarts, formatTime, round3 } from "@/lib/editor/timeline";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TimeStore, useTime } from "./usePreviewPlayer";

export type Selection = { type: "clip" | "text" | "music"; id: string } | null;

interface TimelineProps {
  clips: Clip[];
  texts: TextOverlay[];
  music: MusicTrack | null;
  assets: Map<string, MediaAsset>;
  total: number;
  store: TimeStore;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onSeek: (t: number) => void;
  onMoveClip: (from: number, to: number) => void;
  onInsertAsset: (assetId: string, index: number) => void;
  onTrimClip: (id: string, patch: { in?: number; out?: number }) => void;
  onUpdateText: (id: string, patch: Partial<TextOverlay>) => void;
  onUpdateMusic: (patch: Partial<MusicTrack>) => void;
  onGestureEnd: () => void;
  onSplit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddText: () => void;
}

const TRACK_PADDING = 12;
const SNAP_PX = 6;

export function Timeline(props: TimelineProps) {
  const {
    clips,
    texts,
    music,
    assets,
    total,
    store,
    selection,
    onSelect,
    onSeek,
    onMoveClip,
    onInsertAsset,
    onTrimClip,
    onUpdateText,
    onUpdateMusic,
    onGestureEnd,
    onSplit,
    onDuplicate,
    onDelete,
    onAddText,
  } = props;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewWidth, setViewWidth] = useState(800);
  const [zoom, setZoom] = useState(1);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewWidth(el.clientWidth));
    ro.observe(el);
    setViewWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const fitPps = (viewWidth - TRACK_PADDING * 2) / Math.max(total, 5);
  const pps = Math.max(2, fitPps * zoom);
  const contentWidth = Math.max(viewWidth, total * pps + TRACK_PADDING * 2 + 40);
  const starts = useMemo(() => clipStarts(clips), [clips]);
  const snapPoints = useMemo(() => [0, ...starts, total], [starts, total]);

  const xToTime = (clientX: number) => {
    const el = scrollRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return clamp((clientX - rect.left + el.scrollLeft - TRACK_PADDING) / pps, 0, total);
  };

  const snap = (t: number, extra: number[] = []) => {
    const threshold = SNAP_PX / pps;
    let best = t;
    let bestDist = threshold;
    for (const p of [...snapPoints, ...extra]) {
      const d = Math.abs(p - t);
      if (d < bestDist) {
        best = p;
        bestDist = d;
      }
    }
    return best;
  };

  // Scrubbing on the ruler.
  const scrubbing = useRef(false);
  const startScrub = (e: React.PointerEvent) => {
    scrubbing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    onSeek(xToTime(e.clientX));
  };

  const dropIndexFromX = (clientX: number) => {
    const t = xToTime(clientX);
    for (let i = 0; i < clips.length; i++) {
      if (t < starts[i] + clipDuration(clips[i]) / 2) return i;
    }
    return clips.length;
  };

  const tickStep = useMemo(() => {
    const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
    return steps.find((s) => s * pps >= 70) ?? 600;
  }, [pps]);

  const selectedClip = selection?.type === "clip" ? clips.find((c) => c.id === selection.id) : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border/50 px-2 py-1.5 overflow-x-auto">
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={onSplit} disabled={clips.length === 0} title="Split clip at playhead (S)">
          <Scissors className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Split</span>
        </Button>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={onDuplicate} disabled={!selection || selection.type === "music"} title="Duplicate selection (D)">
          <Copy className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Duplicate</span>
        </Button>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs hover:text-red-500" onClick={onDelete} disabled={!selection} title="Delete selection (Del)">
          <Trash2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Delete</span>
        </Button>
        <div className="mx-1 h-4 w-px bg-border" />
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={onAddText} disabled={clips.length === 0} title="Add text at playhead (T)">
          <Type className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Add text</span>
        </Button>
        <div className="ml-auto flex items-center gap-0.5">
          <span className="mr-2 hidden text-[11px] text-muted-foreground md:inline">
            {clips.length} clip{clips.length === 1 ? "" : "s"} · {formatTime(total)}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(1, z / 1.5))} disabled={zoom <= 1} title="Zoom out" aria-label="Zoom out">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(60, z * 1.5))} title="Zoom in" aria-label="Zoom in">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(1)} title="Fit timeline" aria-label="Fit timeline">
            <Maximize className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="relative flex-1 min-h-0 overflow-x-auto overflow-y-hidden select-none"
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom((z) => clamp(z * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 1, 60));
          }
        }}
      >
        <div className="relative h-full" style={{ width: contentWidth }}>
          {/* Ruler */}
          <div
            className="relative h-6 cursor-pointer border-b border-border/50 bg-muted/30"
            onPointerDown={startScrub}
            onPointerMove={(e) => scrubbing.current && onSeek(xToTime(e.clientX))}
            onPointerUp={() => (scrubbing.current = false)}
          >
            {Array.from({ length: Math.floor(total / tickStep) + 1 }).map((_, i) => {
              const t = i * tickStep;
              return (
                <div key={i} className="absolute top-0 h-full" style={{ left: TRACK_PADDING + t * pps }}>
                  <div className="h-2 w-px bg-muted-foreground/50" />
                  <span className="absolute left-1 top-1.5 font-mono text-[9px] text-muted-foreground">{formatTime(t, false)}</span>
                </div>
              );
            })}
          </div>

          {/* Video track */}
          <div
            className="relative mt-1.5 h-14"
            style={{ paddingLeft: TRACK_PADDING }}
            onDragOver={(e) => {
              const types = e.dataTransfer.types;
              if (types.includes("application/x-buzzclips-clip") || types.includes("application/x-buzzclips-asset")) {
                e.preventDefault();
                setDropIndex(dropIndexFromX(e.clientX));
              }
            }}
            onDragLeave={() => setDropIndex(null)}
            onDrop={(e) => {
              e.preventDefault();
              const idx = dropIndexFromX(e.clientX);
              setDropIndex(null);
              const fromRaw = e.dataTransfer.getData("application/x-buzzclips-clip");
              const assetId = e.dataTransfer.getData("application/x-buzzclips-asset");
              if (fromRaw !== "") {
                const from = Number(fromRaw);
                onMoveClip(from, idx > from ? idx - 1 : idx);
              } else if (assetId) {
                onInsertAsset(assetId, idx);
              }
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) onSelect(null);
            }}
          >
            {clips.length === 0 && (
              <div className="absolute inset-y-0 left-3 right-3 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60 text-xs text-muted-foreground">
                Drag media here or click a file in the library
              </div>
            )}
            {clips.map((clip, i) => (
              <ClipBlock
                key={clip.id}
                clip={clip}
                index={i}
                asset={assets.get(clip.assetId)}
                left={TRACK_PADDING + starts[i] * pps}
                width={clipDuration(clip) * pps}
                pps={pps}
                selected={selectedClip?.id === clip.id}
                onSelect={() => onSelect({ type: "clip", id: clip.id })}
                onTrim={(patch) => onTrimClip(clip.id, patch)}
                onTrimEnd={onGestureEnd}
              />
            ))}
            {dropIndex !== null && (
              <div
                className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-primary shadow-[0_0_6px] shadow-primary"
                style={{ left: TRACK_PADDING + (dropIndex < clips.length ? starts[dropIndex] : total) * pps - 1 }}
              />
            )}
          </div>

          {/* Text track */}
          <div className="relative mt-1.5 h-7" onClick={(e) => e.target === e.currentTarget && onSelect(null)}>
            {texts.map((text) => (
              <RangeBlock
                key={text.id}
                kind="text"
                label={text.text || "Text"}
                start={text.start}
                end={text.end}
                pps={pps}
                total={total}
                selected={selection?.type === "text" && selection.id === text.id}
                onSelect={() => onSelect({ type: "text", id: text.id })}
                onChange={(start, end) => onUpdateText(text.id, { start: round3(start), end: round3(end) })}
                onEnd={onGestureEnd}
                snap={(t) => snap(t, [store.get()])}
              />
            ))}
            {texts.length === 0 && clips.length > 0 && (
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/70">
                Text track: press T to add a title
              </span>
            )}
          </div>

          {/* Music track */}
          <div className="relative mt-1 h-7" onClick={(e) => e.target === e.currentTarget && onSelect(null)}>
            {music && assets.get(music.assetId) ? (
              <MusicBlock
                music={music}
                asset={assets.get(music.assetId)!}
                pps={pps}
                total={total}
                selected={selection?.type === "music"}
                onSelect={() => onSelect({ type: "music", id: music.assetId })}
                onMove={(offset) => onUpdateMusic({ offset: round3(snap(offset)) })}
                onEnd={onGestureEnd}
              />
            ) : (
              clips.length > 0 && (
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/70">
                  Music track: import an audio file to add background music
                </span>
              )
            )}
          </div>

          <Playhead store={store} pps={pps} scrollRef={scrollRef} />
        </div>
      </div>
    </div>
  );
}

function Playhead({ store, pps, scrollRef }: { store: TimeStore; pps: number; scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const time = useTime(store);
  const x = TRACK_PADDING + time * pps;

  // Keep the playhead in view while playing.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (x > el.scrollLeft + el.clientWidth - 40 || x < el.scrollLeft) {
      el.scrollLeft = Math.max(0, x - 80);
    }
  }, [x, scrollRef]);

  return (
    <div className="pointer-events-none absolute bottom-0 top-0 z-30" style={{ left: x }}>
      <div className="absolute -left-[5px] top-0 h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-red-500" />
      <div className="absolute left-0 top-0 h-full w-px bg-red-500" />
    </div>
  );
}

function useDrag(onMove: (dx: number) => void, onEnd: () => void) {
  const startX = useRef<number | null>(null);
  return {
    onPointerDown: (e: React.PointerEvent) => {
      e.stopPropagation();
      startX.current = e.clientX;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (startX.current === null) return;
      onMove(e.clientX - startX.current);
    },
    onPointerUp: () => {
      if (startX.current !== null) onEnd();
      startX.current = null;
    },
  };
}

function ClipBlock({
  clip,
  index,
  asset,
  left,
  width,
  pps,
  selected,
  onSelect,
  onTrim,
  onTrimEnd,
}: {
  clip: Clip;
  index: number;
  asset?: MediaAsset;
  left: number;
  width: number;
  pps: number;
  selected: boolean;
  onSelect: () => void;
  onTrim: (patch: { in?: number; out?: number }) => void;
  onTrimEnd: () => void;
}) {
  const origin = useRef({ in: clip.in, out: clip.out });
  const trimming = useRef(false);
  const capture = () => {
    trimming.current = true;
    origin.current = { in: clip.in, out: clip.out };
  };
  const endTrim = () => {
    trimming.current = false;
    onTrimEnd();
  };

  const leftHandle = useDrag((dx) => onTrim({ in: origin.current.in + (dx / pps) * clip.speed }), endTrim);
  const rightHandle = useDrag((dx) => onTrim({ out: origin.current.out + (dx / pps) * clip.speed }), endTrim);

  const isImage = asset?.kind === "image";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Clip ${index + 1}: ${asset?.name ?? "missing media"}`}
      aria-pressed={selected}
      draggable
      onDragStart={(e) => {
        if (trimming.current) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData("application/x-buzzclips-clip", String(index));
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={cn(
        "group absolute top-0 h-full overflow-hidden rounded-md border bg-blue-500/20 transition-shadow",
        selected ? "z-10 border-primary ring-2 ring-primary" : "border-blue-500/50 hover:border-blue-400"
      )}
      style={{
        left,
        width: Math.max(4, width - 2),
        backgroundImage: asset?.thumbnail ? `url(${asset.thumbnail})` : undefined,
        backgroundSize: "auto 100%",
        backgroundRepeat: "repeat-x",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/40" />
      {width > 40 && (
        <div className="absolute left-2 right-2 top-1 flex items-center gap-1 text-[10px] font-medium text-white drop-shadow">
          {isImage && <ImageIcon className="h-3 w-3 shrink-0" />}
          <span className="truncate">{asset?.name ?? "Missing media"}</span>
        </div>
      )}
      {width > 50 && (
        <div className="absolute bottom-1 left-2 right-2 flex items-center gap-1 text-[9px] text-white/90">
          <span className="font-mono">{formatTime(clipDuration(clip))}</span>
          {clip.speed !== 1 && (
            <span className="inline-flex items-center gap-0.5 rounded bg-black/50 px-1">
              <Gauge className="h-2.5 w-2.5" />
              {clip.speed}×
            </span>
          )}
          {(clip.muted || clip.volume === 0) && asset?.hasAudio && <VolumeX className="h-2.5 w-2.5" />}
        </div>
      )}
      {/* Trim handles */}
      <div
        {...leftHandle}
        onPointerDown={(e) => {
          capture();
          onSelect();
          leftHandle.onPointerDown(e);
        }}
        title="Drag to trim start"
        className="absolute inset-y-0 left-0 w-2 cursor-ew-resize bg-white/0 hover:bg-white/60 group-hover:bg-white/30 touch-none"
      />
      <div
        {...rightHandle}
        onPointerDown={(e) => {
          capture();
          onSelect();
          rightHandle.onPointerDown(e);
        }}
        title="Drag to trim end"
        className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-white/0 hover:bg-white/60 group-hover:bg-white/30 touch-none"
      />
    </div>
  );
}

function RangeBlock({
  kind,
  label,
  start,
  end,
  pps,
  total,
  selected,
  onSelect,
  onChange,
  onEnd,
  snap,
}: {
  kind: "text";
  label: string;
  start: number;
  end: number;
  pps: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (start: number, end: number) => void;
  onEnd: () => void;
  snap: (t: number) => number;
}) {
  const origin = useRef({ start, end });
  const capture = () => (origin.current = { start, end });
  const len = origin.current.end - origin.current.start;

  const body = useDrag((dx) => {
    const d = dx / pps;
    let s = snap(origin.current.start + d);
    s = clamp(s, 0, Math.max(0, total - len));
    onChange(s, s + len);
  }, onEnd);
  const leftH = useDrag((dx) => {
    const s = clamp(snap(origin.current.start + dx / pps), 0, origin.current.end - MIN_CLIP_DURATION);
    onChange(s, origin.current.end);
  }, onEnd);
  const rightH = useDrag((dx) => {
    const e = clamp(snap(origin.current.end + dx / pps), origin.current.start + MIN_CLIP_DURATION, total);
    onChange(origin.current.start, e);
  }, onEnd);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${kind} overlay: ${label}`}
      aria-pressed={selected}
      {...body}
      onPointerDown={(e) => {
        capture();
        onSelect();
        body.onPointerDown(e);
      }}
      className={cn(
        "absolute top-0 flex h-full cursor-grab items-center overflow-hidden rounded-md border px-2 text-[10px] font-medium touch-none active:cursor-grabbing",
        selected
          ? "z-10 border-amber-400 bg-amber-500/40 ring-2 ring-amber-400"
          : "border-amber-500/60 bg-amber-500/25 hover:bg-amber-500/35"
      )}
      style={{ left: TRACK_PADDING + start * pps, width: Math.max(6, (end - start) * pps) }}
    >
      <Type className="mr-1 h-3 w-3 shrink-0" />
      <span className="truncate">{label}</span>
      <div
        {...leftH}
        onPointerDown={(e) => {
          capture();
          leftH.onPointerDown(e);
        }}
        className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize hover:bg-white/50"
      />
      <div
        {...rightH}
        onPointerDown={(e) => {
          capture();
          rightH.onPointerDown(e);
        }}
        className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize hover:bg-white/50"
      />
    </div>
  );
}

function MusicBlock({
  music,
  asset,
  pps,
  total,
  selected,
  onSelect,
  onMove,
  onEnd,
}: {
  music: MusicTrack;
  asset: MediaAsset;
  pps: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onMove: (offset: number) => void;
  onEnd: () => void;
}) {
  const origin = useRef(music.offset);
  const playable = Math.max(0, asset.duration - music.trimStart);
  const length = music.loop ? Math.max(0, total - music.offset) : Math.min(playable, Math.max(0, total - music.offset));
  const drag = useDrag((dx) => onMove(clamp(origin.current + dx / pps, 0, Math.max(0, total - 0.5))), onEnd);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Background music: ${asset.name}`}
      aria-pressed={selected}
      {...drag}
      onPointerDown={(e) => {
        origin.current = music.offset;
        onSelect();
        drag.onPointerDown(e);
      }}
      className={cn(
        "absolute top-0 flex h-full cursor-grab items-center overflow-hidden rounded-md border px-2 text-[10px] font-medium touch-none active:cursor-grabbing",
        selected
          ? "z-10 border-emerald-400 bg-emerald-500/40 ring-2 ring-emerald-400"
          : "border-emerald-500/60 bg-emerald-500/25 hover:bg-emerald-500/35"
      )}
      style={{
        left: TRACK_PADDING + music.offset * pps,
        width: Math.max(8, length * pps),
        backgroundImage:
          "repeating-linear-gradient(90deg, transparent 0 3px, rgba(16,185,129,0.35) 3px 4px, transparent 4px 7px, rgba(16,185,129,0.2) 7px 8px)",
      }}
    >
      <Music className="mr-1 h-3 w-3 shrink-0" />
      <span className="truncate">{asset.name}</span>
      {music.loop && <span className="ml-1 rounded bg-black/30 px-1 text-[9px]">loop</span>}
    </div>
  );
}
