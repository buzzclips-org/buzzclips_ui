"use client";

import {
  AlignVerticalJustifyCenter,
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  FlipHorizontal2,
  FlipVertical2,
  Film,
  Music,
  Plus,
  RotateCcw,
  RotateCw,
  Settings2,
  Trash2,
  Type,
  Volume2,
  VolumeX,
  Wand2,
} from "lucide-react";
import type {
  AspectRatio,
  Clip,
  FrameRate,
  MediaAsset,
  MusicTrack,
  Project,
  ProjectSettings,
  Resolution,
  TextOverlay,
} from "@/lib/editor/types";
import { DEFAULT_FILTERS, MAX_SPEED, MIN_CLIP_DURATION, MIN_SPEED } from "@/lib/editor/types";
import {
  FILTER_PRESETS,
  TEXT_POSITIONS,
  clipDuration,
  clipStarts,
  estimateExportBytes,
  formatBytes,
  formatTime,
  outputSize,
  rotateBy,
  round3,
} from "@/lib/editor/timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ColorField, PanelSection, Segmented, SliderField } from "./controls";
import type { Selection } from "./Timeline";

export type InspectorTab = "clip" | "text" | "audio" | "project";

interface InspectorProps {
  project: Project;
  assets: Map<string, MediaAsset>;
  selection: Selection;
  tab: InspectorTab;
  onTabChange: (t: InspectorTab) => void;
  getTime: () => number;
  onSelect: (s: Selection) => void;
  onUpdateClip: (id: string, patch: Partial<Clip>, group?: string) => void;
  onTrimClip: (id: string, patch: { in?: number; out?: number }) => void;
  onApplyToAllClips: (patch: Partial<Clip>) => void;
  onUpdateText: (id: string, patch: Partial<TextOverlay>, group?: string) => void;
  onUpdateMusic: (patch: Partial<MusicTrack>, group?: string) => void;
  onRemoveMusic: () => void;
  onUpdateSettings: (patch: Partial<ProjectSettings>, group?: string) => void;
  onGestureEnd: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddText: () => void;
  onRequestImport: () => void;
}

const TABS: { id: InspectorTab; label: string; icon: typeof Film }[] = [
  { id: "clip", label: "Clip", icon: Film },
  { id: "text", label: "Text", icon: Type },
  { id: "audio", label: "Audio", icon: Music },
  { id: "project", label: "Project", icon: Settings2 },
];

export function Inspector(props: InspectorProps) {
  const { tab, onTabChange } = props;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div role="tablist" aria-label="Editor panels" className="grid grid-cols-4 border-b border-border/50">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => onTabChange(id)}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors border-b-2",
              tab === id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {tab === "clip" && <ClipPanel {...props} />}
        {tab === "text" && <TextPanel {...props} />}
        {tab === "audio" && <AudioPanel {...props} />}
        {tab === "project" && <ProjectPanel {...props} />}
      </div>
    </div>
  );
}

function EmptyHint({ icon: Icon, title, body, action }: { icon: typeof Film; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/70 px-4 py-8 text-center">
      <Icon className="h-6 w-6 text-muted-foreground" />
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}

function NumberField({
  label,
  value,
  step = 0.1,
  min,
  max,
  onChange,
  suffix = "s",
}: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? round3(value) : 0}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onChange(v);
          }}
          className="h-8 pr-6 font-mono text-xs"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}

/* ----------------------------- Clip ----------------------------- */

function ClipPanel({
  project,
  assets,
  selection,
  getTime,
  onUpdateClip,
  onTrimClip,
  onApplyToAllClips,
  onGestureEnd,
  onDuplicate,
  onDelete,
  onRequestImport,
}: InspectorProps) {
  const index = selection?.type === "clip" ? project.clips.findIndex((c) => c.id === selection.id) : -1;
  const clip = index >= 0 ? project.clips[index] : null;

  if (!clip) {
    return (
      <EmptyHint
        icon={Film}
        title={project.clips.length ? "Select a clip" : "No clips yet"}
        body={
          project.clips.length
            ? "Click a clip on the timeline to trim it, change speed, rotate, add filters and more."
            : "Import videos or photos and they'll be added to the timeline."
        }
        action={
          !project.clips.length && (
            <Button size="sm" onClick={onRequestImport} className="mt-1 gap-1">
              <Plus className="h-3.5 w-3.5" /> Import media
            </Button>
          )
        }
      />
    );
  }

  const asset = assets.get(clip.assetId);
  const isImage = asset?.kind === "image";
  const sourceDuration = isImage ? Infinity : asset?.duration ?? clip.out;
  const g = (field: string) => `clip:${clip.id}:${field}`;
  const update = (patch: Partial<Clip>, field: string) => onUpdateClip(clip.id, patch, g(field));
  const start = clipStarts(project.clips)[index];

  const playheadSource = () => {
    const local = getTime() - start;
    return clip.in + Math.max(0, local) * clip.speed;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" title={asset?.name}>
            {asset?.name ?? "Missing media"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Clip {index + 1} of {project.clips.length} · {formatTime(clipDuration(clip))} on timeline
          </p>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate} title="Duplicate (D)" aria-label="Duplicate clip">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-500" onClick={onDelete} title="Delete (Del)" aria-label="Delete clip">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isImage ? (
        <PanelSection title="Duration">
          <SliderField
            label="Show photo for"
            value={clip.out}
            min={0.5}
            max={30}
            step={0.1}
            format={(v) => `${v.toFixed(1)}s`}
            onChange={(v) => update({ out: v }, "duration")}
            onCommit={onGestureEnd}
          />
        </PanelSection>
      ) : (
        <PanelSection title="Trim">
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Start" value={clip.in} step={0.1} min={0} onChange={(v) => onTrimClip(clip.id, { in: v })} />
            <NumberField label="End" value={clip.out} step={0.1} max={sourceDuration} onChange={(v) => onTrimClip(clip.id, { out: v })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]" onClick={() => onTrimClip(clip.id, { in: playheadSource() })} title="Trim the start of this clip to the playhead">
              <ArrowUpToLine className="h-3 w-3 rotate-90" /> Start at playhead
            </Button>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]" onClick={() => onTrimClip(clip.id, { out: playheadSource() })} title="Trim the end of this clip to the playhead">
              <ArrowDownToLine className="h-3 w-3 -rotate-90" /> End at playhead
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Source length {formatTime(asset?.duration ?? 0)}. Drag clip edges on the timeline to trim visually.
          </p>
          {(clip.in > 0 || clip.out < (asset?.duration ?? clip.out)) && (
            <Button variant="link" size="sm" className="h-auto p-0 text-[11px]" onClick={() => onTrimClip(clip.id, { in: 0, out: sourceDuration })}>
              Reset trim
            </Button>
          )}
        </PanelSection>
      )}

      {!isImage && (
        <PanelSection title="Speed">
          <Segmented
            size="sm"
            value={clip.speed}
            options={[0.25, 0.5, 1, 1.5, 2, 4].map((s) => ({ value: s, label: `${s}×` }))}
            onChange={(v) => onUpdateClip(clip.id, { speed: v })}
          />
          <SliderField
            label="Custom speed"
            value={clip.speed}
            min={MIN_SPEED}
            max={MAX_SPEED}
            step={0.05}
            format={(v) => `${v.toFixed(2)}×`}
            onChange={(v) => update({ speed: v }, "speed")}
            onCommit={onGestureEnd}
            onReset={() => onUpdateClip(clip.id, { speed: 1 })}
          />
        </PanelSection>
      )}

      {!isImage && (
        <PanelSection title="Volume">
          {asset?.hasAudio ? (
            <>
              <div className="flex items-center gap-2">
                <Button
                  variant={clip.muted ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => onUpdateClip(clip.id, { muted: !clip.muted })}
                  title={clip.muted ? "Unmute" : "Mute"}
                  aria-label={clip.muted ? "Unmute clip" : "Mute clip"}
                >
                  {clip.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <div className="flex-1">
                  <SliderField
                    label="Clip volume"
                    value={Math.round(clip.volume * 100)}
                    min={0}
                    max={100}
                    format={(v) => `${v}%`}
                    disabled={clip.muted}
                    onChange={(v) => update({ volume: v / 100 }, "volume")}
                    onCommit={onGestureEnd}
                    onReset={() => onUpdateClip(clip.id, { volume: 1 })}
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Speed changes also change pitch, like a tape.</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">This clip has no audio track.</p>
          )}
        </PanelSection>
      )}

      <PanelSection title="Transform">
        <div className="grid grid-cols-4 gap-1.5">
          <Button variant="outline" size="sm" className="h-8" onClick={() => onUpdateClip(clip.id, { rotation: rotateBy(clip.rotation, -90) })} title="Rotate left" aria-label="Rotate left">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => onUpdateClip(clip.id, { rotation: rotateBy(clip.rotation, 90) })} title="Rotate right" aria-label="Rotate right">
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button variant={clip.flipH ? "default" : "outline"} size="sm" className="h-8" onClick={() => onUpdateClip(clip.id, { flipH: !clip.flipH })} title="Flip horizontally (mirror)" aria-label="Flip horizontally">
            <FlipHorizontal2 className="h-4 w-4" />
          </Button>
          <Button variant={clip.flipV ? "default" : "outline"} size="sm" className="h-8" onClick={() => onUpdateClip(clip.id, { flipV: !clip.flipV })} title="Flip vertically" aria-label="Flip vertically">
            <FlipVertical2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Framing</Label>
          <Segmented
            value={clip.fit}
            options={[
              { value: "contain", label: "Fit (show all)", title: "Show the whole picture with bars if needed" },
              { value: "cover", label: "Fill (crop)", title: "Fill the frame, cropping the edges" },
            ]}
            onChange={(v) => onUpdateClip(clip.id, { fit: v })}
          />
        </div>
        {clip.rotation !== 0 && <p className="text-[10px] text-muted-foreground">Rotated {clip.rotation}°</p>}
      </PanelSection>

      <PanelSection
        title="Filters"
        action={
          <Button variant="link" size="sm" className="h-auto p-0 text-[11px]" onClick={() => onUpdateClip(clip.id, { filters: { ...DEFAULT_FILTERS } })}>
            Reset
          </Button>
        }
      >
        <div className="grid grid-cols-4 gap-1.5">
          {FILTER_PRESETS.map((preset) => {
            const active = JSON.stringify(preset.filters) === JSON.stringify(clip.filters);
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => onUpdateClip(clip.id, { filters: { ...preset.filters } })}
                className={cn(
                  "overflow-hidden rounded-md border text-[10px] font-medium",
                  active ? "border-primary ring-1 ring-primary" : "border-border/60 hover:border-foreground/40"
                )}
              >
                <div
                  className="aspect-square w-full bg-muted bg-cover bg-center"
                  style={{
                    backgroundImage: asset?.thumbnail ? `url(${asset.thumbnail})` : "linear-gradient(135deg,#60a5fa,#f472b6)",
                    filter: [
                      `brightness(${preset.filters.brightness}%)`,
                      `contrast(${preset.filters.contrast}%)`,
                      `saturate(${preset.filters.saturation}%)`,
                      `grayscale(${preset.filters.grayscale}%)`,
                      `sepia(${preset.filters.sepia}%)`,
                    ].join(" "),
                  }}
                />
                <span className="block truncate px-0.5 py-0.5">{preset.name}</span>
              </button>
            );
          })}
        </div>
        {(
          [
            ["brightness", "Brightness", 0, 200, "%"],
            ["contrast", "Contrast", 0, 200, "%"],
            ["saturation", "Saturation", 0, 200, "%"],
            ["grayscale", "Black & white", 0, 100, "%"],
            ["sepia", "Sepia", 0, 100, "%"],
            ["blur", "Blur", 0, 20, "px"],
          ] as const
        ).map(([key, label, min, max, unit]) => (
          <SliderField
            key={key}
            label={label}
            value={clip.filters[key]}
            min={min}
            max={max}
            step={key === "blur" ? 0.5 : 1}
            format={(v) => `${v}${unit}`}
            onChange={(v) => update({ filters: { ...clip.filters, [key]: v } }, `filter-${key}`)}
            onCommit={onGestureEnd}
            onReset={() => onUpdateClip(clip.id, { filters: { ...clip.filters, [key]: DEFAULT_FILTERS[key] } })}
          />
        ))}
        {project.clips.length > 1 && (
          <Button variant="outline" size="sm" className="h-7 w-full gap-1 text-[11px]" onClick={() => onApplyToAllClips({ filters: { ...clip.filters }, fit: clip.fit })}>
            <Wand2 className="h-3 w-3" /> Apply this look & framing to all clips
          </Button>
        )}
      </PanelSection>
    </div>
  );
}

/* ----------------------------- Text ----------------------------- */

function TextPanel({ project, selection, getTime, onSelect, onUpdateText, onGestureEnd, onDuplicate, onDelete, onAddText }: InspectorProps) {
  const text = selection?.type === "text" ? project.texts.find((t) => t.id === selection.id) : undefined;
  const total = project.clips.reduce((s, c) => s + clipDuration(c), 0);

  return (
    <div className="space-y-5">
      <PanelSection
        title={`Text overlays (${project.texts.length})`}
        action={
          <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onAddText} disabled={project.clips.length === 0}>
            <Plus className="h-3.5 w-3.5" /> Add text
          </Button>
        }
      >
        {project.texts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {project.clips.length
              ? "Add titles, captions or call-to-actions. They appear at the playhead for 3 seconds by default."
              : "Add a clip first, then add text on top of it."}
          </p>
        ) : (
          <ul className="space-y-1">
            {project.texts.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onSelect({ type: "text", id: t.id })}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-xs",
                    t.id === text?.id ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted/50"
                  )}
                >
                  <span className="truncate font-medium">{t.text || "(empty)"}</span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {formatTime(t.start)}–{formatTime(t.end)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PanelSection>

      {text && (
        <>
          <PanelSection
            title="Edit text"
            action={
              <div className="flex gap-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate} title="Duplicate" aria-label="Duplicate text">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-500" onClick={onDelete} title="Delete" aria-label="Delete text">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            }
          >
            <Textarea
              value={text.text}
              rows={2}
              maxLength={200}
              onChange={(e) => onUpdateText(text.id, { text: e.target.value }, `text:${text.id}:text`)}
              onBlur={onGestureEnd}
              placeholder="Type your text…"
              className="text-sm"
              aria-label="Overlay text"
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Appears at"
                value={text.start}
                min={0}
                onChange={(v) => onUpdateText(text.id, { start: Math.max(0, Math.min(v, text.end - MIN_CLIP_DURATION)) })}
              />
              <NumberField
                label="Disappears at"
                value={text.end}
                max={total}
                onChange={(v) => onUpdateText(text.id, { end: Math.min(total, Math.max(v, text.start + MIN_CLIP_DURATION)) })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => {
                  const t = getTime();
                  const len = text.end - text.start;
                  const start = Math.min(t, Math.max(0, total - MIN_CLIP_DURATION));
                  onUpdateText(text.id, { start: round3(start), end: round3(Math.min(total, start + len)) });
                }}
              >
                Move to playhead
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => onUpdateText(text.id, { start: 0, end: round3(total) })}
              >
                Show whole video
              </Button>
            </div>
          </PanelSection>

          <PanelSection title="Style">
            <Segmented
              value={text.font}
              options={[
                { value: "sans", label: <span className="font-sans">Sans</span> },
                { value: "serif", label: <span className="font-serif">Serif</span> },
                { value: "mono", label: <span className="font-mono">Mono</span> },
              ]}
              onChange={(v) => onUpdateText(text.id, { font: v })}
            />
            <SliderField
              label="Size"
              value={Math.round(text.size * 100)}
              min={2}
              max={25}
              format={(v) => `${v}%`}
              onChange={(v) => onUpdateText(text.id, { size: v / 100 }, `text:${text.id}:size`)}
              onCommit={onGestureEnd}
            />
            <div className="flex items-center justify-between">
              <Label htmlFor="text-bold" className="text-xs text-muted-foreground">Bold</Label>
              <Switch id="text-bold" checked={text.bold} onCheckedChange={(v) => onUpdateText(text.id, { bold: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="text-outline" className="text-xs text-muted-foreground">Outline (easier to read)</Label>
              <Switch id="text-outline" checked={text.outline} onCheckedChange={(v) => onUpdateText(text.id, { outline: v })} />
            </div>
            <ColorField label="Text colour" value={text.color} onChange={(v) => onUpdateText(text.id, { color: v })} />
            <ColorField label="Background box" value={text.background} allowNone onChange={(v) => onUpdateText(text.id, { background: v })} />
          </PanelSection>

          <PanelSection title="Position">
            <div className="grid grid-cols-3 gap-1.5">
              {(["top", "center", "bottom"] as const).map((pos) => (
                <Button key={pos} variant="outline" size="sm" className="h-8 gap-1 text-[11px] capitalize" onClick={() => onUpdateText(text.id, TEXT_POSITIONS[pos])}>
                  {pos === "top" ? <ArrowUpToLine className="h-3 w-3" /> : pos === "center" ? <AlignVerticalJustifyCenter className="h-3 w-3" /> : <ArrowDownToLine className="h-3 w-3" />}
                  {pos}
                </Button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">Tip: drag the dashed box on the preview to place text anywhere.</p>
          </PanelSection>
        </>
      )}
    </div>
  );
}

/* ----------------------------- Audio ----------------------------- */

function AudioPanel({ project, assets, onUpdateMusic, onRemoveMusic, onGestureEnd, onApplyToAllClips, onRequestImport, onSelect }: InspectorProps) {
  const music = project.music;
  const asset = music ? assets.get(music.assetId) : undefined;
  const audioAssets = project.assets.filter((a) => a.kind === "audio");
  const total = project.clips.reduce((s, c) => s + clipDuration(c), 0);
  const clipsWithAudio = project.clips.filter((c) => assets.get(c.assetId)?.hasAudio);
  const allMuted = clipsWithAudio.length > 0 && clipsWithAudio.every((c) => c.muted);

  return (
    <div className="space-y-5">
      <PanelSection title="Background music">
        {music && asset ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2">
              <Music className="h-4 w-4 shrink-0 text-emerald-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{asset.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatTime(asset.duration)}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-500" onClick={onRemoveMusic} title="Remove music" aria-label="Remove music">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <SliderField
              label="Music volume"
              value={Math.round(music.volume * 100)}
              min={0}
              max={100}
              format={(v) => `${v}%`}
              onChange={(v) => onUpdateMusic({ volume: v / 100 }, "music:volume")}
              onCommit={onGestureEnd}
            />
            <SliderField
              label="Start music at (timeline)"
              value={music.offset}
              min={0}
              max={Math.max(0.1, total)}
              step={0.1}
              format={(v) => formatTime(v)}
              onChange={(v) => onUpdateMusic({ offset: v }, "music:offset")}
              onCommit={onGestureEnd}
            />
            <SliderField
              label="Skip into song"
              value={music.trimStart}
              min={0}
              max={Math.max(0.1, asset.duration - 1)}
              step={0.1}
              format={(v) => formatTime(v)}
              onChange={(v) => onUpdateMusic({ trimStart: v }, "music:trim")}
              onCommit={onGestureEnd}
            />
            <div className="flex items-center justify-between">
              <Label htmlFor="music-loop" className="text-xs text-muted-foreground">Loop until the video ends</Label>
              <Switch id="music-loop" checked={music.loop} onCheckedChange={(v) => onUpdateMusic({ loop: v })} />
            </div>
          </div>
        ) : (
          <EmptyHint
            icon={Music}
            title="No background music"
            body="Import an MP3, WAV or M4A file and click it in the media library to use it as a soundtrack."
            action={
              <Button size="sm" variant="outline" onClick={onRequestImport} className="mt-1 gap-1">
                <Plus className="h-3.5 w-3.5" /> Import audio
              </Button>
            }
          />
        )}
        {audioAssets.length > 1 && (
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Switch track</Label>
            {audioAssets.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  onUpdateMusic({ assetId: a.id, trimStart: 0 });
                  onSelect({ type: "music", id: a.id });
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md border px-2 py-1 text-left text-[11px]",
                  music?.assetId === a.id ? "border-emerald-500 bg-emerald-500/10" : "border-border/60 hover:bg-muted/50"
                )}
              >
                <Music className="h-3 w-3" />
                <span className="truncate">{a.name}</span>
              </button>
            ))}
          </div>
        )}
      </PanelSection>

      <PanelSection title="Clip audio">
        {clipsWithAudio.length === 0 ? (
          <p className="text-xs text-muted-foreground">None of your clips have sound.</p>
        ) : (
          <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => onApplyToAllClips({ muted: !allMuted })}>
            {allMuted ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            {allMuted ? "Unmute all clips" : "Mute all clips (music only)"}
          </Button>
        )}
        <p className="text-[10px] text-muted-foreground">Fine-tune individual clip volume in the Clip tab.</p>
      </PanelSection>
    </div>
  );
}

/* ----------------------------- Project ----------------------------- */

const ASPECT_OPTIONS: { value: AspectRatio; label: string; hint: string }[] = [
  { value: "16:9", label: "16:9", hint: "YouTube, landscape" },
  { value: "9:16", label: "9:16", hint: "Reels, Shorts, TikTok" },
  { value: "1:1", label: "1:1", hint: "Square posts" },
  { value: "4:5", label: "4:5", hint: "Instagram portrait" },
];

function ProjectPanel({ project, onUpdateSettings, onApplyToAllClips, onGestureEnd }: InspectorProps) {
  const s = project.settings;
  const total = project.clips.reduce((sum, c) => sum + clipDuration(c), 0);
  const size = outputSize(s.aspect, s.resolution);

  return (
    <div className="space-y-5">
      <PanelSection title="Canvas size">
        <div className="grid grid-cols-2 gap-1.5">
          {ASPECT_OPTIONS.map((o) => {
            const [w, h] = o.value.split(":").map(Number);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onUpdateSettings({ aspect: o.value })}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-2 text-left",
                  s.aspect === o.value ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted/50"
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center">
                  <span className="block rounded-sm border-2 border-current" style={{ width: (w / Math.max(w, h)) * 24, height: (h / Math.max(w, h)) * 24 }} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold">{o.label}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{o.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
        {project.clips.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5">
            <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => onApplyToAllClips({ fit: "contain" })}>
              Fit all clips
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => onApplyToAllClips({ fit: "cover" })}>
              Fill all clips
            </Button>
          </div>
        )}
      </PanelSection>

      <PanelSection title="Export quality">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Resolution</Label>
          <Segmented<Resolution>
            value={s.resolution}
            options={[
              { value: 480, label: "480p" },
              { value: 720, label: "720p" },
              { value: 1080, label: "1080p" },
            ]}
            onChange={(v) => onUpdateSettings({ resolution: v })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Frame rate</Label>
          <Segmented<FrameRate>
            value={s.fps}
            options={[
              { value: 24, label: "24 fps" },
              { value: 30, label: "30 fps" },
              { value: 60, label: "60 fps" },
            ]}
            onChange={(v) => onUpdateSettings({ fps: v })}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          Output {size.width}×{size.height} · ~{formatBytes(estimateExportBytes(s, total))} for {formatTime(total, false)}
        </p>
      </PanelSection>

      <PanelSection title="Background">
        <ColorField label="Bar / background colour" value={s.background} onChange={(v) => onUpdateSettings({ background: v || "#000000" })} />
      </PanelSection>

      <PanelSection title="Fades">
        <SliderField
          label="Fade in from black"
          value={s.fadeIn}
          min={0}
          max={3}
          step={0.1}
          format={(v) => (v ? `${v.toFixed(1)}s` : "Off")}
          onChange={(v) => onUpdateSettings({ fadeIn: v }, "settings:fadeIn")}
          onCommit={onGestureEnd}
        />
        <SliderField
          label="Fade out to black"
          value={s.fadeOut}
          min={0}
          max={3}
          step={0.1}
          format={(v) => (v ? `${v.toFixed(1)}s` : "Off")}
          onChange={(v) => onUpdateSettings({ fadeOut: v }, "settings:fadeOut")}
          onCommit={onGestureEnd}
        />
        <p className="text-[10px] text-muted-foreground">Fades apply to both picture and sound.</p>
      </PanelSection>
    </div>
  );
}
