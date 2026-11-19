"use client";

import { useMemo, useRef } from "react";
import { Maximize2, Pause, Play, SkipBack, SkipForward, StepBack, StepForward } from "lucide-react";
import type { AspectRatio, TextOverlay } from "@/lib/editor/types";
import { aspectValue, clamp, formatTime } from "@/lib/editor/timeline";
import { measureText } from "@/lib/editor/render";
import { Button } from "@/components/ui/button";
import { TimeStore, useTime } from "./usePreviewPlayer";

interface PreviewPanelProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  aspect: AspectRatio;
  store: TimeStore;
  playing: boolean;
  total: number;
  fps: number;
  onToggle: () => void;
  onSeek: (t: number) => void;
  selectedText: TextOverlay | null;
  onMoveText: (id: string, x: number, y: number) => void;
  onMoveTextEnd: () => void;
  hasClips: boolean;
}

export function PreviewPanel({
  canvasRef,
  aspect,
  store,
  playing,
  total,
  fps,
  onToggle,
  onSeek,
  selectedText,
  onMoveText,
  onMoveTextEnd,
  hasClips,
}: PreviewPanelProps) {
  const time = useTime(store);
  const stageRef = useRef<HTMLDivElement>(null);
  const ratio = aspectValue(aspect);
  const frame = 1 / fps;

  const showTextHandle = selectedText && time >= selectedText.start && time < selectedText.end;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative flex flex-1 min-h-0 items-center justify-center bg-[radial-gradient(circle_at_center,hsl(var(--muted)/0.4),transparent)] p-3">
        <div
          ref={stageRef}
          className="relative max-h-full max-w-full overflow-hidden rounded-lg bg-black shadow-xl ring-1 ring-border/40"
          style={{ aspectRatio: `${ratio}`, height: ratio >= 1 ? "auto" : "100%", width: ratio >= 1 ? "100%" : "auto" }}
        >
          <canvas
            ref={canvasRef}
            className="block h-full w-full cursor-pointer"
            onClick={onToggle}
            aria-label="Video preview. Click to play or pause."
          />
          {!hasClips && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-center text-white/70">
              <Play className="h-10 w-10 opacity-60" />
              <p className="text-sm font-medium">Your preview appears here</p>
              <p className="text-xs opacity-80">Import media to get started</p>
            </div>
          )}
          {showTextHandle && selectedText && (
            <TextHandle text={selectedText} stageRef={stageRef} canvasRef={canvasRef} onMove={onMoveText} onEnd={onMoveTextEnd} />
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 border-t border-border/50 px-2 py-1.5 sm:gap-2 sm:px-3">
        <span className="min-w-[92px] font-mono text-xs tabular-nums text-foreground/90">
          {formatTime(time)} <span className="text-muted-foreground">/ {formatTime(total)}</span>
        </span>
        <div className="flex flex-1 items-center justify-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onSeek(0)} title="Go to start (Home)" aria-label="Go to start">
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onSeek(time - frame)} title="Previous frame (←)" aria-label="Previous frame">
            <StepBack className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={onToggle}
            disabled={!hasClips}
            title={playing ? "Pause (Space)" : "Play (Space)"}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onSeek(time + frame)} title="Next frame (→)" aria-label="Next frame">
            <StepForward className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onSeek(total)} title="Go to end (End)" aria-label="Go to end">
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Fullscreen preview"
          aria-label="Fullscreen preview"
          onClick={() => stageRef.current?.requestFullscreen?.().catch(() => {})}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function TextHandle({
  text,
  stageRef,
  canvasRef,
  onMove,
  onEnd,
}: {
  text: TextOverlay;
  stageRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onMove: (id: string, x: number, y: number) => void;
  onEnd: () => void;
}) {
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  const box = useMemo(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !canvas.width) return null;
    const b = measureText(ctx, canvas.width, canvas.height, text);
    return {
      left: (b.x / canvas.width) * 100,
      top: (b.y / canvas.height) * 100,
      width: (b.width / canvas.width) * 100,
      height: (b.height / canvas.height) * 100,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text.text, text.size, text.x, text.y, text.bold, text.font, canvasRef.current?.width, canvasRef.current?.height]);

  if (!box) return null;

  return (
    <div
      role="button"
      tabIndex={-1}
      aria-label="Drag to move text"
      title="Drag to reposition"
      className="absolute cursor-move rounded border-2 border-dashed border-primary bg-primary/10 touch-none"
      style={{ left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%` }}
      onPointerDown={(e) => {
        const rect = stageRef.current?.getBoundingClientRect();
        if (!rect) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = {
          dx: (e.clientX - rect.left) / rect.width - text.x,
          dy: (e.clientY - rect.top) / rect.height - text.y,
        };
      }}
      onPointerMove={(e) => {
        const rect = stageRef.current?.getBoundingClientRect();
        if (!dragRef.current || !rect) return;
        const x = clamp((e.clientX - rect.left) / rect.width - dragRef.current.dx, 0, 1);
        const y = clamp((e.clientY - rect.top) / rect.height - dragRef.current.dy, 0, 1);
        onMove(text.id, Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000);
      }}
      onPointerUp={() => {
        dragRef.current = null;
        onEnd();
      }}
    />
  );
}
