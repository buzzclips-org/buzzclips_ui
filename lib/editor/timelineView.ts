/** Pure layout helpers for drawing the timeline (lanes, waveforms, filmstrips, ticks). */

/** Greedy lane assignment so overlapping ranges are stacked instead of hidden. */
export function assignLanes<T extends { id: string; start: number; end: number }>(
  items: T[]
): { lanes: Record<string, number>; count: number } {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);
  const laneEnds: number[] = [];
  const lanes: Record<string, number> = {};
  for (const item of sorted) {
    let lane = laneEnds.findIndex((end) => end <= item.start + 1e-6);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.end);
    } else {
      laneEnds[lane] = item.end;
    }
    lanes[item.id] = lane;
  }
  return { lanes, count: Math.max(1, laneEnds.length) };
}

/**
 * SVG path (viewBox 0 0 bars 100, mirrored around the middle) for the waveform
 * of source range [from, to].
 */
export function waveformPath(peaks: number[], peaksPerSecond: number, from: number, to: number, bars: number): string {
  const n = Math.max(1, Math.floor(bars));
  if (!peaks.length || to <= from || peaksPerSecond <= 0) return "";
  const parts: string[] = [];
  const span = to - from;
  for (let i = 0; i < n; i++) {
    const a = Math.floor((from + (i / n) * span) * peaksPerSecond);
    const b = Math.max(a + 1, Math.floor((from + ((i + 1) / n) * span) * peaksPerSecond));
    let max = 0;
    for (let j = a; j < b && j < peaks.length; j++) if (j >= 0 && peaks[j] > max) max = peaks[j];
    const h = Math.max(1.5, max * 48);
    parts.push(`M${i + 0.15} ${50 - h}h0.7v${h * 2}h-0.7z`);
  }
  return parts.join("");
}

/** Picks filmstrip frames to tile across a clip of `widthPx`, sampling source time for each tile. */
export function filmstripTiles<F extends { t: number }>(
  frames: F[],
  opts: { widthPx: number; tileWidth: number; pps: number; sourceIn: number; speed: number }
): { frame: F; left: number }[] {
  if (!frames.length || opts.widthPx <= 0 || opts.tileWidth <= 0) return [];
  const count = Math.min(200, Math.ceil(opts.widthPx / opts.tileWidth));
  const tiles: { frame: F; left: number }[] = [];
  for (let i = 0; i < count; i++) {
    const left = i * opts.tileWidth;
    const t = opts.sourceIn + ((left + opts.tileWidth / 2) / opts.pps) * opts.speed;
    let best = frames[0];
    for (const f of frames) if (Math.abs(f.t - t) < Math.abs(best.t - t)) best = f;
    tiles.push({ frame: best, left });
  }
  return tiles;
}

/** Major tick spacing (seconds) so labels are at least `minPx` apart, plus minor subdivisions. */
export function tickSpacing(pps: number, minPx = 80): { major: number; minor: number } {
  const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800];
  const major = steps.find((s) => s * pps >= minPx) ?? 1800;
  const minor = major / (major === 2 || major === 120 ? 4 : 5);
  return { major, minor };
}
