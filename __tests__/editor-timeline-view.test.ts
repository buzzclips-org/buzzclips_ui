import { assignLanes, filmstripTiles, tickSpacing, waveformPath } from "@/lib/editor/timelineView";

describe("timeline view helpers", () => {
  it("stacks overlapping ranges into lanes", () => {
    const { lanes, count } = assignLanes([
      { id: "a", start: 0, end: 3 },
      { id: "b", start: 1, end: 2 },
      { id: "c", start: 3, end: 4 },
      { id: "d", start: 1.5, end: 5 },
    ]);
    expect(lanes.a).toBe(0);
    expect(lanes.b).toBe(1);
    expect(lanes.c).toBe(0);
    expect(lanes.d).toBe(2);
    expect(count).toBe(3);
    expect(assignLanes([]).count).toBe(1);
  });

  it("builds a mirrored waveform path", () => {
    const peaks = [0, 0.5, 1, 0.25];
    const path = waveformPath(peaks, 2, 0, 2, 4);
    expect(path.match(/M/g)).toHaveLength(4);
    expect(path).toContain("M2.15 2");
    expect(waveformPath([], 2, 0, 1, 4)).toBe("");
    expect(waveformPath(peaks, 2, 1, 1, 4)).toBe("");
    expect(waveformPath(peaks, 0, 0, 1, 4)).toBe("");
    // out-of-range buckets render as minimum-height bars
    expect(waveformPath(peaks, 2, 10, 11, 2).match(/M/g)).toHaveLength(2);
  });

  it("tiles filmstrip frames by source time", () => {
    const frames = [
      { t: 0, url: "a" },
      { t: 5, url: "b" },
      { t: 10, url: "c" },
    ];
    const tiles = filmstripTiles(frames, { widthPx: 300, tileWidth: 100, pps: 30, sourceIn: 0, speed: 1 });
    expect(tiles.map((t) => t.frame.url)).toEqual(["a", "b", "c"]);
    expect(tiles.map((t) => t.left)).toEqual([0, 100, 200]);
    const fast = filmstripTiles(frames, { widthPx: 100, tileWidth: 50, pps: 10, sourceIn: 0, speed: 2 });
    expect(fast.map((t) => t.frame.url)).toEqual(["b", "c"]);
    expect(filmstripTiles([], { widthPx: 100, tileWidth: 50, pps: 10, sourceIn: 0, speed: 1 })).toEqual([]);
    expect(filmstripTiles(frames, { widthPx: 0, tileWidth: 50, pps: 10, sourceIn: 0, speed: 1 })).toEqual([]);
  });

  it("chooses readable tick spacing", () => {
    expect(tickSpacing(100)).toEqual({ major: 1, minor: 0.2 });
    expect(tickSpacing(50).major).toBe(2);
    expect(tickSpacing(50).minor).toBe(0.5);
    expect(tickSpacing(1000).major).toBe(0.1);
    expect(tickSpacing(0.001).major).toBe(1800);
  });
});
