"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  Copy,
  Film,
  FlipHorizontal2,
  Gauge,
  ImageIcon,
  Magnet,
  Maximize,
  Music,
  Plus,
  Repeat,
  RotateCw,
  Scissors,
  Sparkles,
  Trash2,
  Type,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { Clip, MediaAsset, MusicTrack, TextOverlay } from "@/lib/editor/types";
import { DEFAULT_FILTERS, MIN_CLIP_DURATION } from "@/lib/editor/types";
import { clamp, clipDuration, clipStarts, formatTime, rotateBy, round3 } from "@/lib/editor/timeline";
import { assignLanes, filmstripTiles, tickSpacing, waveformPath } from "@/lib/editor/timelineView";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MediaInsight } from "./engine/insights";
import { TimeStore, useTime } from "./usePreviewPlayer";

export type Selection = { type: "clip" | "text" | "music"; id: string } | null;

interface TimelineProps {
  clips: Clip[];
  texts: TextOverlay[];
  music: MusicTrack | null;
  assets: Map<string, MediaAsset>;
  insights: Record<string, MediaInsight>;
  total: number;
  store: TimeStore;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onSeek: (t: number) => void;
  onMoveClip: (from: number, to: number) => void;
  onInsertAsset: (assetId: string, index: number) => void;
  onTrimClip: (id: string, patch: { in?: number; out?: number }) => void;
  onTrimClipTo: (id: string, edge: "in" | "out", t: number) => void;
  onUpdateClip: (id: string, patch: Partial<Clip>) => void;
  onSetAllClipsMuted: (muted: boolean) => void;
  onUpdateText: (id: string, patch: Partial<TextOverlay>) => void;
  onUpdateMusic: (patch: Partial<MusicTrack>) => void;
  onRemoveMusic: () => void;
  onGestureEnd: () => void;
  onSplitAt: (t: number) => void;
  onTrimToPlayhead: (edge: "in" | "out") => void;
  onDuplicate: (target?: Selection) => void;
  onDelete: (target?: Selection) => void;
  onAddText: () => void;
  onRequestImport: () => void;
}

const PAD = 12;
const SNAP_PX = 8;
const RULER_H = 28;
const VIDEO_H = 80;
const LANE_H = 26;
const MUSIC_H = 44;
const GAP = 6;
const MAX_ZOOM = 80;

type MenuState = { x: number; y: number; t: number; target: NonNullable<Selection> } | null;

function usePersistentBoolean(key: string, initial: boolean) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored !== null) setValue(stored === "1");
  }, [key]);
  const update = (v: boolean) => {
    setValue(v);
    try {
      localStorage.setItem(key, v ? "1" : "0");
    } catch {
      // ignore
    }
  };
  return [value, update] as const;
}

export function Timeline(props: TimelineProps) {
  const {
    clips,
    texts,
    music,
    assets,
    insights,
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
    onSplitAt,
    onTrimToPlayhead,
    onDuplicate,
    onDelete,
    onAddText,
    onRequestImport,
    onSetAllClipsMuted,
  } = props;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewWidth, setViewWidth] = useState(800);
  const [zoom, setZoom] = useState(1);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [hoverT, setHoverT] = useState<number | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [snapOn, setSnapOn] = usePersistentBoolean("buzzclips-editor-snap", true);
  const dragging = useRef(false);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewWidth(el.clientWidth));
    ro.observe(el);
    setViewWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const fitPps = (viewWidth - PAD * 2 - 24) / Math.max(total, 5);
  const pps = Math.max(1, fitPps * zoom);
  const contentWidth = Math.max(viewWidth, total * pps + PAD * 2 + 120);
  const starts = useMemo(() => clipStarts(clips), [clips]);
  const { lanes, count: laneCount } = useMemo(() => assignLanes(texts), [texts]);
  const textRowH = laneCount * LANE_H + 4;

  /** Zoom keeping the time under `anchorX` (client px) fixed. */
  const zoomTo = useCallback(
    (next: number, anchorClientX?: number) => {
      const el = scrollRef.current;
      const z = clamp(next, 1, MAX_ZOOM);
      if (!el) return setZoom(z);
      const rect = el.getBoundingClientRect();
      const anchor = anchorClientX !== undefined ? anchorClientX - rect.left : el.clientWidth / 2;
      const tAt = (el.scrollLeft + anchor - PAD) / pps;
      const nextPps = Math.max(1, fitPps * z);
      setZoom(z);
      requestAnimationFrame(() => {
        el.scrollLeft = Math.max(0, tAt * nextPps + PAD - anchor);
      });
    },
    [fitPps, pps]
  );

  // Keyboard zoom (+ / - / 0).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey || document.querySelector("[role=dialog], [role=alertdialog]")) return;
      if (e.key === "=" || e.key === "+") zoomTo(zoom * 1.4);
      else if (e.key === "-" || e.key === "_") zoomTo(zoom / 1.4);
      else if (e.key === "0") setZoom(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, zoomTo]);

  // Close the context menu on outside click / escape / scroll.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  const xToTime = (clientX: number) => {
    const el = scrollRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return clamp((clientX - rect.left + el.scrollLeft - PAD) / pps, 0, total);
  };

  const snapPoints = useMemo(
    () => [0, ...starts, total, ...texts.flatMap((t) => [t.start, t.end])],
    [starts, total, texts]
  );
  const snap = (t: number, extra: number[] = []) => {
    if (!snapOn) return t;
    const threshold = SNAP_PX / pps;
    let best = t;
    let bestDist = threshold;
    for (const p of [...snapPoints, store.get(), ...extra]) {
      const d = Math.abs(p - t);
      if (d < bestDist) {
        best = p;
        bestDist = d;
      }
    }
    return best;
  };
  /** Snap used while trimming clips: only playhead and text edges (clip edges move with the ripple). */
  const snapTrim = (t: number) => {
    if (!snapOn) return t;
    const threshold = SNAP_PX / pps;
    const points = [store.get(), ...texts.flatMap((x) => [x.start, x.end])];
    for (const p of points) if (Math.abs(p - t) < threshold) return p;
    return t;
  };

  const scrub = useRef(false);
  const startScrub = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    scrub.current = true;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    onSeek(snap(xToTime(e.clientX)));
  };
  const moveScrub = (e: React.PointerEvent) => scrub.current && onSeek(snap(xToTime(e.clientX)));
  const endScrub = () => {
    scrub.current = false;
    dragging.current = false;
  };

  const dropIndexFromX = (clientX: number) => {
    const t = xToTime(clientX);
    for (let i = 0; i < clips.length; i++) if (t < starts[i] + clipDuration(clips[i]) / 2) return i;
    return clips.length;
  };

  const { major, minor } = tickSpacing(pps);
  const selectedClip = selection?.type === "clip" ? clips.find((c) => c.id === selection.id) : undefined;
  const clipsWithAudio = clips.filter((c) => assets.get(c.assetId)?.hasAudio);
  const allMuted = clipsWithAudio.length > 0 && clipsWithAudio.every((c) => c.muted);
  const lastMusicVolume = useRef(0.6);

  const onEmptyClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    onSelect(null);
    onSeek(snap(xToTime(e.clientX)));
  };

  const openMenu = (e: React.MouseEvent, target: NonNullable<Selection>) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(target);
    setMenu({ x: e.clientX, y: e.clientY, t: xToTime(e.clientX), target });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 overflow-x-auto border-b border-border/50 px-2 py-1">
        <ToolButton icon={Scissors} label="Split" title="Split at playhead (S)" onClick={() => onSplitAt(store.get())} disabled={!clips.length} />
        <ToolButton icon={ArrowLeftToLine} label="Trim start" title="Trim clip start to playhead (Q)" onClick={() => onTrimToPlayhead("in")} disabled={!clips.length} />
        <ToolButton icon={ArrowRightToLine} label="Trim end" title="Trim clip end to playhead (W)" onClick={() => onTrimToPlayhead("out")} disabled={!clips.length} />
        <ToolButton icon={Copy} label="Duplicate" title="Duplicate selection (D)" onClick={() => onDuplicate()} disabled={!selection || selection.type === "music"} />
        <ToolButton icon={Trash2} label="Delete" title="Delete selection (Del)" onClick={() => onDelete()} disabled={!selection} danger />
        <div className="mx-1 h-4 w-px shrink-0 bg-border" />
        <ToolButton icon={Type} label="Text" title="Add text at playhead (T)" onClick={onAddText} disabled={!clips.length} />
        <div className="ml-auto flex shrink-0 items-center gap-0.5 pl-2">
          <span className="mr-2 hidden font-mono text-[11px] text-muted-foreground xl:inline">
            {clips.length} clip{clips.length === 1 ? "" : "s"} · {formatTime(total)}
          </span>
          <Button
            variant={snapOn ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setSnapOn(!snapOn)}
            title={snapOn ? "Snapping on: edges stick to the playhead, clips and text" : "Snapping off"}
            aria-pressed={snapOn}
            aria-label="Toggle snapping"
          >
            <Magnet className={cn("h-3.5 w-3.5", snapOn && "text-primary")} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoomTo(zoom / 1.4)} disabled={zoom <= 1} title="Zoom out (-)" aria-label="Zoom out">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((Math.log(zoom) / Math.log(MAX_ZOOM)) * 100)}
            onChange={(e) => zoomTo(Math.pow(MAX_ZOOM, Number(e.target.value) / 100))}
            className="hidden h-1 w-24 cursor-pointer accent-primary sm:block"
            aria-label="Timeline zoom"
            title="Zoom (Ctrl/⌘ + scroll)"
          />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoomTo(zoom * 1.4)} disabled={zoom >= MAX_ZOOM} title="Zoom in (+)" aria-label="Zoom in">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(1)} title="Fit whole video (0)" aria-label="Fit timeline">
            <Maximize className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="flex min-h-full">
          {/* Track headers */}
          <div className="w-[88px] shrink-0 border-r border-border/50 bg-muted/20 text-[11px] font-medium">
            <div style={{ height: RULER_H }} className="flex items-center border-b border-border/50 px-2 font-mono text-[10px] text-muted-foreground">
              <PlayheadTime store={store} />
            </div>
            <TrackHeader height={VIDEO_H} top={GAP} icon={Film} label="Video">
              {clipsWithAudio.length > 0 && (
                <HeaderButton onClick={() => onSetAllClipsMuted(!allMuted)} title={allMuted ? "Unmute all clips" : "Mute all clip audio"}>
                  {allMuted ? <VolumeX className="h-3.5 w-3.5 text-red-500" /> : <Volume2 className="h-3.5 w-3.5" />}
                </HeaderButton>
              )}
            </TrackHeader>
            <TrackHeader height={textRowH} top={GAP} icon={Type} label="Text">
              <HeaderButton onClick={onAddText} title="Add text at playhead (T)" disabled={!clips.length}>
                <Plus className="h-3.5 w-3.5" />
              </HeaderButton>
            </TrackHeader>
            <TrackHeader height={MUSIC_H} top={GAP} icon={Music} label="Music">
              {music ? (
                <HeaderButton
                  onClick={() => {
                    if (music.volume > 0) {
                      lastMusicVolume.current = music.volume;
                      onUpdateMusic({ volume: 0 });
                    } else onUpdateMusic({ volume: lastMusicVolume.current || 0.6 });
                    onGestureEnd();
                  }}
                  title={music.volume > 0 ? "Mute music" : "Unmute music"}
                >
                  {music.volume > 0 ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5 text-red-500" />}
                </HeaderButton>
              ) : (
                <HeaderButton onClick={onRequestImport} title="Import music">
                  <Plus className="h-3.5 w-3.5" />
                </HeaderButton>
              )}
            </TrackHeader>
          </div>

          {/* Scrollable tracks */}
          <div
            ref={scrollRef}
            className="relative flex-1 min-w-0 select-none overflow-x-auto overflow-y-hidden"
            onWheel={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                zoomTo(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX);
              }
            }}
            onPointerMove={(e) => !dragging.current && setHoverT(xToTime(e.clientX))}
            onPointerLeave={() => setHoverT(null)}
          >
            <div className="relative pb-2" style={{ width: contentWidth }}>
              {/* Ruler */}
              <div
                className="relative cursor-pointer border-b border-border/50 bg-muted/30"
                style={{ height: RULER_H }}
                onPointerDown={startScrub}
                onPointerMove={moveScrub}
                onPointerUp={endScrub}
                title="Click or drag to move the playhead"
              >
                {Array.from({ length: Math.floor(total / minor) + 2 }).map((_, i) => {
                  const t = i * minor;
                  const isMajor = Math.abs(t / major - Math.round(t / major)) < 1e-6;
                  return (
                    <div key={i} className="absolute bottom-0" style={{ left: PAD + t * pps }}>
                      <div className={cn("w-px", isMajor ? "h-2.5 bg-muted-foreground/60" : "h-1.5 bg-muted-foreground/30")} />
                      {isMajor && (
                        <span className="absolute bottom-2.5 left-1 whitespace-nowrap font-mono text-[9px] text-muted-foreground">
                          {formatTime(t, major < 1)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Video track */}
              <div
                className="relative"
                style={{ height: VIDEO_H, marginTop: GAP }}
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
                onClick={onEmptyClick}
              >
                {clips.length === 0 && (
                  <div className="absolute inset-y-0 left-3 right-3 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60 text-xs text-muted-foreground">
                    Drag media here, or click a file in the library
                  </div>
                )}
                {clips.map((clip, i) => (
                  <ClipBlock
                    key={clip.id}
                    clip={clip}
                    index={i}
                    asset={assets.get(clip.assetId)}
                    insight={insights[clip.assetId]}
                    start={starts[i]}
                    left={PAD + starts[i] * pps}
                    width={clipDuration(clip) * pps}
                    pps={pps}
                    selected={selectedClip?.id === clip.id}
                    onSelect={() => onSelect({ type: "clip", id: clip.id })}
                    onTrim={(patch) => onTrimClip(clip.id, patch)}
                    onTrimStart={() => (dragging.current = true)}
                    onTrimEnd={() => {
                      dragging.current = false;
                      onGestureEnd();
                    }}
                    snapTrim={snapTrim}
                    onContextMenu={(e) => openMenu(e, { type: "clip", id: clip.id })}
                    onDoubleClick={(e) => onSeek(xToTime(e.clientX))}
                  />
                ))}
                {dropIndex !== null && (
                  <div
                    className="pointer-events-none absolute -inset-y-1 z-20 w-1 rounded bg-primary shadow-[0_0_8px] shadow-primary"
                    style={{ left: PAD + (dropIndex < clips.length ? starts[dropIndex] : total) * pps - 2 }}
                  />
                )}
              </div>

              {/* Text track (stacked lanes) */}
              <div className="relative" style={{ height: textRowH, marginTop: GAP }} onClick={onEmptyClick}>
                {texts.map((text) => (
                  <RangeBlock
                    key={text.id}
                    label={text.text || "Text"}
                    start={text.start}
                    end={text.end}
                    top={(lanes[text.id] ?? 0) * LANE_H + 2}
                    pps={pps}
                    total={total}
                    selected={selection?.type === "text" && selection.id === text.id}
                    onSelect={() => onSelect({ type: "text", id: text.id })}
                    onChange={(start, end) => onUpdateText(text.id, { start: round3(start), end: round3(end) })}
                    onStart={() => (dragging.current = true)}
                    onEnd={() => {
                      dragging.current = false;
                      onGestureEnd();
                    }}
                    snap={snap}
                    onContextMenu={(e) => openMenu(e, { type: "text", id: text.id })}
                  />
                ))}
                {texts.length === 0 && clips.length > 0 && (
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/70">
                    Press T to add a title at the playhead
                  </span>
                )}
              </div>

              {/* Music track */}
              <div className="relative" style={{ height: MUSIC_H, marginTop: GAP }} onClick={onEmptyClick}>
                {music && assets.get(music.assetId) ? (
                  <MusicBlock
                    music={music}
                    asset={assets.get(music.assetId)!}
                    insight={insights[music.assetId]}
                    pps={pps}
                    total={total}
                    selected={selection?.type === "music"}
                    onSelect={() => onSelect({ type: "music", id: music.assetId })}
                    onMove={(offset) => onUpdateMusic({ offset: round3(snap(offset)) })}
                    onStart={() => (dragging.current = true)}
                    onEnd={() => {
                      dragging.current = false;
                      onGestureEnd();
                    }}
                    onContextMenu={(e) => openMenu(e, { type: "music", id: music.assetId })}
                  />
                ) : (
                  clips.length > 0 && (
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/70">
                      Import an MP3 or WAV to add background music
                    </span>
                  )
                )}
              </div>

              {hoverT !== null && !scrub.current && (
                <div className="pointer-events-none absolute bottom-0 top-0 z-20" style={{ left: PAD + hoverT * pps }}>
                  <div className="h-full w-px border-l border-dashed border-foreground/30" />
                  <span className="absolute left-1 top-0.5 rounded bg-foreground/80 px-1 font-mono text-[9px] text-background">
                    {formatTime(hoverT)}
                  </span>
                </div>
              )}

              <Playhead store={store} pps={pps} scrollRef={scrollRef} onScrubStart={startScrub} onScrubMove={moveScrub} onScrubEnd={endScrub} />
            </div>
          </div>
        </div>
      </div>

      {menu && <ContextMenu menu={menu} {...props} close={() => setMenu(null)} />}
    </div>
  );
}

/* --------------------------------- pieces --------------------------------- */

function ToolButton({
  icon: Icon,
  label,
  title,
  onClick,
  disabled,
  danger,
}: {
  icon: typeof Scissors;
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-7 shrink-0 gap-1.5 px-2 text-xs", danger && "hover:text-red-500")}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden md:inline">{label}</span>
    </Button>
  );
}

function TrackHeader({
  height,
  top,
  icon: Icon,
  label,
  children,
}: {
  height: number;
  top: number;
  icon: typeof Film;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-1 px-2" style={{ height, marginTop: top }}>
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      {children}
    </div>
  );
}

function HeaderButton({ children, onClick, title, disabled }: { children: React.ReactNode; onClick: () => void; title: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function PlayheadTime({ store }: { store: TimeStore }) {
  return <span>{formatTime(useTime(store))}</span>;
}

function Playhead({
  store,
  pps,
  scrollRef,
  onScrubStart,
  onScrubMove,
  onScrubEnd,
}: {
  store: TimeStore;
  pps: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScrubStart: (e: React.PointerEvent) => void;
  onScrubMove: (e: React.PointerEvent) => void;
  onScrubEnd: () => void;
}) {
  const time = useTime(store);
  const x = PAD + time * pps;

  // Keep the playhead in view while playing.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (x > el.scrollLeft + el.clientWidth - 40 || x < el.scrollLeft) el.scrollLeft = Math.max(0, x - 80);
  }, [x, scrollRef]);

  return (
    <div className="pointer-events-none absolute bottom-0 top-0 z-30" style={{ left: x }}>
      <div
        className="pointer-events-auto absolute -left-[7px] top-0 h-4 w-[15px] cursor-ew-resize touch-none"
        onPointerDown={onScrubStart}
        onPointerMove={onScrubMove}
        onPointerUp={onScrubEnd}
        title="Drag to scrub"
      >
        <div className="mx-auto h-3 w-3 rounded-[3px] bg-red-500 shadow" />
        <div className="mx-auto h-0 w-0 border-x-[6px] border-t-[5px] border-x-transparent border-t-red-500" />
      </div>
      <div className="absolute left-0 top-0 h-full w-px bg-red-500" />
    </div>
  );
}

function useDrag(onMove: (dx: number) => void, onEnd: () => void, onStart?: () => void) {
  const startX = useRef<number | null>(null);
  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      startX.current = e.clientX;
      e.currentTarget.setPointerCapture(e.pointerId);
      onStart?.();
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

function Waveform({ insight, from, to, widthPx, className }: { insight?: MediaInsight; from: number; to: number; widthPx: number; className?: string }) {
  const path = useMemo(() => {
    if (!insight?.peaks || !insight.peaksPerSecond) return "";
    return waveformPath(insight.peaks, insight.peaksPerSecond, from, to, Math.min(600, Math.max(4, widthPx / 3)));
  }, [insight, from, to, widthPx]);
  if (!path) return null;
  const bars = Math.min(600, Math.max(4, Math.floor(widthPx / 3)));
  return (
    <svg viewBox={`0 0 ${bars} 100`} preserveAspectRatio="none" className={cn("block h-full w-full", className)} aria-hidden>
      <path d={path} fill="currentColor" />
    </svg>
  );
}

function ClipBlock({
  clip,
  index,
  asset,
  insight,
  start,
  left,
  width,
  pps,
  selected,
  onSelect,
  onTrim,
  onTrimStart,
  onTrimEnd,
  snapTrim,
  onContextMenu,
  onDoubleClick,
}: {
  clip: Clip;
  index: number;
  asset?: MediaAsset;
  insight?: MediaInsight;
  start: number;
  left: number;
  width: number;
  pps: number;
  selected: boolean;
  onSelect: () => void;
  onTrim: (patch: { in?: number; out?: number }) => void;
  onTrimStart: () => void;
  onTrimEnd: () => void;
  snapTrim: (t: number) => number;
  onContextMenu: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
}) {
  const origin = useRef({ in: clip.in, out: clip.out });
  const trimming = useRef(false);
  const [activeEdge, setActiveEdge] = useState<"in" | "out" | null>(null);
  const begin = (edge: "in" | "out") => {
    trimming.current = true;
    origin.current = { in: clip.in, out: clip.out };
    setActiveEdge(edge);
    onTrimStart();
  };
  const end = () => {
    trimming.current = false;
    setActiveEdge(null);
    onTrimEnd();
  };

  const leftHandle = useDrag((dx) => onTrim({ in: origin.current.in + (dx / pps) * clip.speed }), end);
  const rightHandle = useDrag((dx) => {
    let out = origin.current.out + (dx / pps) * clip.speed;
    const endT = snapTrim(start + (out - clip.in) / clip.speed);
    out = clip.in + (endT - start) * clip.speed;
    onTrim({ out });
  }, end);

  const isImage = asset?.kind === "image";
  const hasWave = Boolean(asset?.hasAudio && insight?.peaks);
  const stripH = hasWave ? VIDEO_H - 26 : VIDEO_H - 2;
  const aspect = asset && asset.width && asset.height ? asset.width / asset.height : 16 / 9;
  const tileWidth = Math.max(24, Math.round(stripH * aspect));
  const frames = useMemo(
    () => (insight?.filmstrip?.length ? insight.filmstrip : asset?.thumbnail ? [{ t: 0, url: asset.thumbnail }] : []),
    [insight?.filmstrip, asset?.thumbnail]
  );
  const tiles = useMemo(
    () => filmstripTiles(frames, { widthPx: width, tileWidth, pps, sourceIn: clip.in, speed: clip.speed }),
    [frames, width, tileWidth, pps, clip.in, clip.speed]
  );
  const filtered = JSON.stringify(clip.filters) !== JSON.stringify(DEFAULT_FILTERS);
  const muted = clip.muted || clip.volume === 0;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Clip ${index + 1}: ${asset?.name ?? "missing media"}, ${formatTime(clipDuration(clip))}`}
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
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={cn(
        "group absolute top-0 h-full overflow-hidden rounded-lg border-2 bg-slate-800 transition-shadow",
        selected ? "z-10 border-primary shadow-lg shadow-primary/20" : "border-blue-500/40 hover:border-blue-400/80"
      )}
      style={{ left, width: Math.max(6, width - 2) }}
    >
      {/* Filmstrip */}
      <div className="absolute inset-x-0 top-0 overflow-hidden bg-slate-900" style={{ height: stripH }}>
        {tiles.map(({ frame, left: x }, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={frame.url}
            alt=""
            draggable={false}
            className="absolute top-0 h-full object-cover opacity-90"
            style={{ left: x, width: tileWidth, filter: filtered ? "saturate(1.2)" : undefined }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />
      </div>
      {/* Waveform */}
      {hasWave && (
        <div className={cn("absolute inset-x-0 bottom-0 h-[24px] border-t border-black/30 bg-blue-950/80 px-0.5", muted ? "text-red-400/40" : "text-sky-300/90")}>
          <Waveform insight={insight} from={clip.in} to={clip.out} widthPx={width} />
        </div>
      )}
      {/* Labels */}
      {width > 36 && (
        <div className="absolute left-2 right-2 top-1 flex items-center gap-1 text-[10px] font-semibold text-white drop-shadow">
          {isImage && <ImageIcon className="h-3 w-3 shrink-0" />}
          <span className="truncate">{asset?.name ?? "Missing media"}</span>
        </div>
      )}
      {width > 56 && (
        <div className="absolute left-1.5 flex items-center gap-1 text-[9px] text-white" style={{ top: stripH - 17 }}>
          <span className="rounded bg-black/60 px-1 font-mono">{formatTime(clipDuration(clip))}</span>
          {clip.speed !== 1 && (
            <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/90 px-1 text-black">
              <Gauge className="h-2.5 w-2.5" />
              {clip.speed}×
            </span>
          )}
          {muted && asset?.hasAudio && (
            <span className="rounded bg-red-500/90 px-0.5">
              <VolumeX className="h-2.5 w-2.5" />
            </span>
          )}
          {filtered && (
            <span className="rounded bg-fuchsia-500/90 px-0.5" title="Filters applied">
              <Sparkles className="h-2.5 w-2.5" />
            </span>
          )}
          {clip.rotation !== 0 && (
            <span className="rounded bg-black/60 px-0.5" title={`Rotated ${clip.rotation}°`}>
              <RotateCw className="h-2.5 w-2.5" />
            </span>
          )}
          {(clip.flipH || clip.flipV) && (
            <span className="rounded bg-black/60 px-0.5" title="Flipped">
              <FlipHorizontal2 className="h-2.5 w-2.5" />
            </span>
          )}
        </div>
      )}
      {/* Trim handles */}
      {(["in", "out"] as const).map((edge) => {
        const h = edge === "in" ? leftHandle : rightHandle;
        return (
          <div
            key={edge}
            {...h}
            onPointerDown={(e) => {
              begin(edge);
              onSelect();
              h.onPointerDown(e);
            }}
            title={edge === "in" ? "Drag to trim the start" : "Drag to trim the end"}
            className={cn(
              "absolute inset-y-0 z-10 flex w-2.5 cursor-ew-resize touch-none items-center justify-center transition-colors",
              edge === "in" ? "left-0 rounded-l-md" : "right-0 rounded-r-md",
              selected || activeEdge === edge ? "bg-primary" : "bg-white/0 group-hover:bg-white/50"
            )}
          >
            <span className={cn("h-5 w-0.5 rounded-full", selected || activeEdge === edge ? "bg-primary-foreground" : "bg-transparent group-hover:bg-black/40")} />
          </div>
        );
      })}
      {activeEdge && (
        <span className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[10px] text-white">
          {formatTime(clipDuration(clip))}
        </span>
      )}
    </div>
  );
}

function RangeBlock({
  label,
  start,
  end,
  top,
  pps,
  total,
  selected,
  onSelect,
  onChange,
  onStart,
  onEnd,
  snap,
  onContextMenu,
}: {
  label: string;
  start: number;
  end: number;
  top: number;
  pps: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (start: number, end: number) => void;
  onStart: () => void;
  onEnd: () => void;
  snap: (t: number) => number;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const origin = useRef({ start, end });
  const capture = () => (origin.current = { start, end });
  const len = () => origin.current.end - origin.current.start;

  const body = useDrag(
    (dx) => {
      const d = dx / pps;
      let s = snap(origin.current.start + d);
      const e = snap(origin.current.end + d);
      if (e !== origin.current.end + d && s === origin.current.start + d) s = e - len();
      s = clamp(s, 0, Math.max(0, total - len()));
      onChange(s, s + len());
    },
    onEnd,
    onStart
  );
  const leftH = useDrag(
    (dx) => onChange(clamp(snap(origin.current.start + dx / pps), 0, origin.current.end - MIN_CLIP_DURATION), origin.current.end),
    onEnd,
    onStart
  );
  const rightH = useDrag(
    (dx) => onChange(origin.current.start, clamp(snap(origin.current.end + dx / pps), origin.current.start + MIN_CLIP_DURATION, total)),
    onEnd,
    onStart
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Text: ${label}`}
      aria-pressed={selected}
      {...body}
      onPointerDown={(e) => {
        capture();
        onSelect();
        body.onPointerDown(e);
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={onContextMenu}
      className={cn(
        "group absolute flex cursor-grab items-center overflow-hidden rounded-md border px-2 text-[10px] font-medium touch-none active:cursor-grabbing",
        selected ? "z-10 border-amber-400 bg-amber-500/45 ring-1 ring-amber-400" : "border-amber-500/60 bg-amber-500/25 hover:bg-amber-500/35"
      )}
      style={{ left: PAD + start * pps, width: Math.max(8, (end - start) * pps), top, height: LANE_H - 4 }}
    >
      <Type className="mr-1 h-3 w-3 shrink-0" />
      <span className="truncate">{label}</span>
      {(["l", "r"] as const).map((side) => {
        const h = side === "l" ? leftH : rightH;
        return (
          <div
            key={side}
            {...h}
            onPointerDown={(e) => {
              capture();
              h.onPointerDown(e);
            }}
            className={cn("absolute inset-y-0 w-2 cursor-ew-resize group-hover:bg-white/40", side === "l" ? "left-0" : "right-0")}
          />
        );
      })}
    </div>
  );
}

function MusicBlock({
  music,
  asset,
  insight,
  pps,
  total,
  selected,
  onSelect,
  onMove,
  onStart,
  onEnd,
  onContextMenu,
}: {
  music: MusicTrack;
  asset: MediaAsset;
  insight?: MediaInsight;
  pps: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onMove: (offset: number) => void;
  onStart: () => void;
  onEnd: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const origin = useRef(music.offset);
  const playable = Math.max(0.01, asset.duration - music.trimStart);
  const visible = Math.max(0, total - music.offset);
  const length = music.loop ? visible : Math.min(playable, visible);
  const drag = useDrag((dx) => onMove(clamp(origin.current + dx / pps, 0, Math.max(0, total - 0.5))), onEnd, onStart);

  const segments: { from: number; to: number; width: number }[] = [];
  for (let s = 0; s < length - 1e-6 && segments.length < 50; s += playable) {
    const segLen = Math.min(playable, length - s);
    segments.push({ from: music.trimStart, to: music.trimStart + segLen, width: segLen * pps });
  }

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
      onClick={(e) => e.stopPropagation()}
      onContextMenu={onContextMenu}
      className={cn(
        "absolute top-0 flex h-full cursor-grab overflow-hidden rounded-lg border-2 touch-none active:cursor-grabbing",
        selected ? "z-10 border-emerald-400 bg-emerald-600/40" : "border-emerald-500/50 bg-emerald-600/25 hover:bg-emerald-600/35",
        music.volume === 0 && "opacity-50"
      )}
      style={{ left: PAD + music.offset * pps, width: Math.max(10, length * pps) }}
    >
      {segments.map((seg, i) => (
        <div key={i} className={cn("relative h-full shrink-0 text-emerald-300/80", i > 0 && "border-l border-dashed border-emerald-200/50")} style={{ width: seg.width }}>
          <Waveform insight={insight} from={seg.from} to={seg.to} widthPx={seg.width} />
        </div>
      ))}
      <span className="absolute left-2 top-1 flex items-center gap-1 text-[10px] font-semibold text-white drop-shadow">
        <Music className="h-3 w-3" />
        <span className="max-w-[240px] truncate">{asset.name}</span>
        {music.loop && <Repeat className="h-3 w-3" />}
        <span className="font-normal opacity-80">{Math.round(music.volume * 100)}%</span>
      </span>
    </div>
  );
}

/* ------------------------------ context menu ------------------------------ */

function ContextMenu({
  menu,
  close,
  clips,
  texts,
  music,
  assets,
  onSplitAt,
  onTrimClipTo,
  onUpdateClip,
  onDuplicate,
  onDelete,
  onUpdateText,
  onUpdateMusic,
  onRemoveMusic,
  onGestureEnd,
  total,
}: TimelineProps & { menu: NonNullable<MenuState>; close: () => void }) {
  const run = (fn: () => void) => () => {
    fn();
    onGestureEnd();
    close();
  };
  const { target, t } = menu;
  const clip = target.type === "clip" ? clips.find((c) => c.id === target.id) : undefined;
  const text = target.type === "text" ? texts.find((x) => x.id === target.id) : undefined;
  const asset = clip ? assets.get(clip.assetId) : undefined;

  const items: { label: string; icon?: typeof Scissors; onClick: () => void; danger?: boolean; hint?: string }[] = [];
  if (clip) {
    items.push({ label: "Split here", icon: Scissors, hint: "S", onClick: run(() => onSplitAt(t)) });
    items.push({ label: "Trim start to here", icon: ArrowLeftToLine, hint: "Q", onClick: run(() => props_trim("in")) });
    items.push({ label: "Trim end to here", icon: ArrowRightToLine, hint: "W", onClick: run(() => props_trim("out")) });
    items.push({ label: "Duplicate", icon: Copy, hint: "D", onClick: run(() => onDuplicate(target)) });
    if (asset?.hasAudio) {
      items.push({ label: clip.muted ? "Unmute clip" : "Mute clip", icon: clip.muted ? Volume2 : VolumeX, onClick: run(() => onUpdateClip(clip.id, { muted: !clip.muted })) });
    }
    items.push({ label: "Rotate 90°", icon: RotateCw, onClick: run(() => onUpdateClip(clip.id, { rotation: rotateBy(clip.rotation, 90) })) });
    items.push({ label: clip.fit === "contain" ? "Fill frame (crop)" : "Fit frame (show all)", icon: Maximize, onClick: run(() => onUpdateClip(clip.id, { fit: clip.fit === "contain" ? "cover" : "contain" })) });
    items.push({ label: "Delete", icon: Trash2, hint: "Del", danger: true, onClick: run(() => onDelete(target)) });
  } else if (text) {
    items.push({ label: "Duplicate", icon: Copy, onClick: run(() => onDuplicate(target)) });
    items.push({ label: "Show for whole video", icon: Maximize, onClick: run(() => onUpdateText(text.id, { start: 0, end: round3(total) })) });
    items.push({ label: "Delete", icon: Trash2, danger: true, onClick: run(() => onDelete(target)) });
  } else if (music) {
    items.push({ label: music.loop ? "Stop looping" : "Loop until end", icon: Repeat, onClick: run(() => onUpdateMusic({ loop: !music.loop })) });
    items.push({ label: "Start at beginning", icon: ArrowLeftToLine, onClick: run(() => onUpdateMusic({ offset: 0 })) });
    items.push({ label: "Remove music", icon: Trash2, danger: true, onClick: run(onRemoveMusic) });
  }

  function props_trim(edge: "in" | "out") {
    if (clip) onTrimClipTo(clip.id, edge, t);
  }

  const x = typeof window !== "undefined" ? Math.min(menu.x, window.innerWidth - 220) : menu.x;
  const y = typeof window !== "undefined" ? Math.min(menu.y, window.innerHeight - (items.length * 32 + 56)) : menu.y;

  return (
    <div
      role="menu"
      className="fixed z-[60] w-52 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl"
      style={{ left: x, top: y }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {clip && (
        <div className="flex items-center gap-1 border-b border-border/60 px-2 pb-1.5 pt-1">
          <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
          {[0.5, 1, 1.5, 2].map((s) => (
            <button
              key={s}
              type="button"
              onClick={run(() => onUpdateClip(clip.id, { speed: s }))}
              className={cn("flex-1 rounded px-1 py-0.5 text-[11px] font-medium", clip.speed === s ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              {s}×
            </button>
          ))}
        </div>
      )}
      {items.map(({ label, icon: Icon, onClick, danger, hint }) => (
        <button
          key={label}
          type="button"
          role="menuitem"
          onClick={onClick}
          className={cn("flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted", danger && "text-red-500")}
        >
          {Icon && <Icon className="h-3.5 w-3.5" />}
          <span className="flex-1">{label}</span>
          {hint && <span className="font-mono text-[10px] text-muted-foreground">{hint}</span>}
        </button>
      ))}
    </div>
  );
}
