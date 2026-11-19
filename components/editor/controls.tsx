"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  /** Called when the user releases the slider – used to close an undo group. */
  onCommit?: () => void;
  onReset?: () => void;
  disabled?: boolean;
}

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
  onCommit,
  onReset,
  disabled,
}: SliderFieldProps) {
  const id = `slider-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className={cn("space-y-1.5", disabled && "opacity-50")}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </Label>
        <button
          type="button"
          onClick={onReset}
          disabled={!onReset || disabled}
          title={onReset ? "Double-click to reset" : undefined}
          onDoubleClick={onReset}
          className="text-xs font-mono tabular-nums text-foreground/80 disabled:cursor-default"
        >
          {format ? format(value) : value}
        </button>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        onBlur={onCommit}
        onDoubleClick={onReset}
        className="w-full h-1.5 cursor-pointer accent-primary disabled:cursor-not-allowed"
      />
    </div>
  );
}

export function PanelSection({
  title,
  children,
  action,
  className,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

interface SegmentedProps<T extends string | number> {
  value: T;
  options: { value: T; label: React.ReactNode; title?: string }[];
  onChange: (v: T) => void;
  className?: string;
  size?: "sm" | "md";
}

export function Segmented<T extends string | number>({ value, options, onChange, className, size = "md" }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" className={cn("flex rounded-lg bg-muted/60 p-0.5 gap-0.5", className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-md font-medium transition-colors inline-flex items-center justify-center gap-1",
            size === "sm" ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs",
            o.value === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ColorField({
  label,
  value,
  onChange,
  allowNone,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allowNone?: boolean;
}) {
  const swatches = ["#ffffff", "#000000", "#facc15", "#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1.5 flex-wrap">
        {allowNone && (
          <button
            type="button"
            title="None"
            aria-label="No colour"
            onClick={() => onChange("")}
            className={cn(
              "h-6 w-6 rounded-md border border-border bg-[linear-gradient(135deg,transparent_45%,#ef4444_45%,#ef4444_55%,transparent_55%)]",
              value === "" && "ring-2 ring-primary ring-offset-1 ring-offset-background"
            )}
          />
        )}
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            aria-label={`Colour ${c}`}
            onClick={() => onChange(c)}
            style={{ backgroundColor: c }}
            className={cn(
              "h-6 w-6 rounded-md border border-border",
              value.toLowerCase() === c && "ring-2 ring-primary ring-offset-1 ring-offset-background"
            )}
          />
        ))}
        <label
          className="relative h-6 w-6 rounded-md border border-dashed border-border overflow-hidden cursor-pointer"
          title="Custom colour"
        >
          <input
            type="color"
            value={value && value.startsWith("#") && value.length === 7 ? value : "#ffffff"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={`Custom ${label}`}
          />
          <span className="absolute inset-0 bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)] opacity-70" />
        </label>
      </div>
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}
